import { z } from "zod";

import { checkReply, type GuardrailRule, SAFE_FALLBACK } from "./guardrails.ts";
import { type Observation, parseTurn, replyText } from "./extract.ts";
import type { ChatTurnInput, ChatTurnOutput, LlmTurn } from "./llm.ts";
import { buildSystemPrompt } from "./prompt.ts";

export const LIMITS = {
  perWindow: 20,
  windowMs: 10 * 60 * 1000,
  perDay: 100,
  dayMs: 24 * 60 * 60 * 1000,
  historyMessages: 20,
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const RequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  input_mode: z.enum(["text", "voice"]),
  local_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // Opt-in token streaming (SSE). Older clients omit it and get one JSON reply.
  stream: z.boolean().optional(),
});

export type ChatContext = {
  catalog: { code: string; label: string }[];
  planCodes: string[];
  today: { symptom_code: string | null; custom_label: string | null; severity: number }[];
  history: { role: "user" | "assistant"; content: string }[];
};

// Everything the handler needs from the database, so tests can swap in a fake.
export interface ChatStore {
  countUserMessagesSince(patientId: string, sinceIso: string): Promise<number>;
  insertUserMessage(
    row: { patient_id: string; content: string; input_mode: "text" | "voice"; local_date: string },
  ): Promise<{ id: string }>;
  loadContext(patientId: string, localDate: string): Promise<ChatContext>;
  saveAssistantTurn(
    row: { patient_id: string; content: string; local_date: string; source_message_id: string; observations: Observation[] },
  ): Promise<{ messageId: string }>;
  recordGuardrail(patientId: string, rule: GuardrailRule): Promise<void>;
}

export type ChatDeps = { store: ChatStore; llm: LlmTurn; now: () => Date };
export type ChatResult = { status: number; body: Record<string, unknown> };

const fail = (status: number, error: string): ChatResult => ({ status, body: { error } });

function validDay(value: string, now: Date): boolean {
  const time = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== value) return false;
  // Patients in any timezone: allow a couple of days either side of the server's date.
  return Math.abs(time - Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`)) <= 2 * DAY_MS;
}

// The provider needs alternating turns that start with the user.
export function normalizeTurns(history: ChatContext["history"]): ChatContext["history"] {
  const out: ChatContext["history"] = [];
  for (const turn of history) {
    const last = out[out.length - 1];
    if (last && last.role === turn.role) last.content = `${last.content}\n${turn.content}`;
    else if (last || turn.role === "user") out.push({ ...turn });
  }
  return out;
}

export const LLM_FAILED = "Digna could not answer just now. Please try again.";

// A validated request whose user message is stored and whose prompt is ready for the model.
export type PreparedTurn = {
  userId: string;
  message: string;
  localDate: string;
  userMessageId: string;
  catalogCodes: ReadonlySet<string>;
  llmInput: ChatTurnInput;
};

export type TurnReply = {
  reply: string;
  observations: Observation[];
  message_id: string;
  user_message_id: string;
};

/** Auth, validation, rate limits, storing the user message and building the prompt. */
export async function prepareTurn(
  userId: string | null,
  rawBody: unknown,
  deps: Pick<ChatDeps, "store" | "now">,
): Promise<PreparedTurn | ChatResult> {
  if (!userId) return fail(401, "Please sign in again.");

  const parsed = RequestSchema.safeParse(rawBody);
  if (!parsed.success) return fail(400, "That message could not be read.");
  const { message, input_mode, local_date } = parsed.data;
  const now = deps.now();
  if (!validDay(local_date, now)) return fail(400, "That message could not be read.");

  const { store } = deps;
  const recent = await store.countUserMessagesSince(userId, new Date(now.getTime() - LIMITS.windowMs).toISOString());
  if (recent >= LIMITS.perWindow) return fail(429, "You are sending messages very quickly. Please wait a few minutes.");
  const today = await store.countUserMessagesSince(userId, new Date(now.getTime() - LIMITS.dayMs).toISOString());
  if (today >= LIMITS.perDay) return fail(429, "That's enough for today. Let's talk again tomorrow.");

  const saved = await store.insertUserMessage({ patient_id: userId, content: message, input_mode, local_date });
  const ctx = await store.loadContext(userId, local_date);

  const labels = new Map(ctx.catalog.map((s) => [s.code, s.label]));
  const system = buildSystemPrompt({
    localDate: local_date,
    catalog: ctx.catalog,
    planSymptoms: ctx.planCodes.map((code) => ({ code, label: labels.get(code) ?? code })),
    today: ctx.today.map((e) => ({
      symptom: (e.symptom_code ? labels.get(e.symptom_code) : null) ?? e.custom_label ?? "symptom",
      severity: e.severity,
    })),
  });

  // The history already ends with the message we just stored. Add it only if the read raced the write.
  const turns = normalizeTurns(ctx.history);
  const lastTurn = turns[turns.length - 1];
  if (!lastTurn || lastTurn.role !== "user" || !lastTurn.content.endsWith(message)) {
    if (lastTurn?.role === "user") lastTurn.content = `${lastTurn.content}\n${message}`;
    else turns.push({ role: "user", content: message });
  }

  return {
    userId,
    message,
    localDate: local_date,
    userMessageId: saved.id,
    catalogCodes: new Set(labels.keys()),
    llmInput: { system, messages: turns },
  };
}

/**
 * Parses the model output, applies the guardrail and saves the assistant turn. `trippedRule` is a
 * rule the streaming gate already hit. Returns null when the model gave nothing usable.
 */
export async function finishTurn(
  turn: PreparedTurn,
  raw: ChatTurnOutput,
  store: ChatStore,
  trippedRule: GuardrailRule | null = null,
): Promise<{ body: TurnReply; tripped: boolean } | null> {
  const parsed = parseTurn(raw.toolInput, raw.text, turn.catalogCodes, turn.localDate);
  if (!parsed) return null;

  const verdict = checkReply(replyText(parsed), turn.message);
  const rule = trippedRule ?? (verdict.tripped ? verdict.rule : null);
  const reply = rule ? SAFE_FALLBACK : replyText(parsed);

  const assistant = await store.saveAssistantTurn({
    patient_id: turn.userId,
    content: reply,
    local_date: turn.localDate,
    source_message_id: turn.userMessageId,
    observations: parsed.observations,
  });
  if (rule) await store.recordGuardrail(turn.userId, rule);

  return {
    body: {
      reply,
      observations: parsed.observations,
      message_id: assistant.messageId,
      user_message_id: turn.userMessageId,
    },
    tripped: rule !== null,
  };
}

export const isChatResult = (value: PreparedTurn | ChatResult): value is ChatResult => "status" in value;

export async function handleChat(userId: string | null, rawBody: unknown, deps: ChatDeps): Promise<ChatResult> {
  const turn = await prepareTurn(userId, rawBody, deps);
  if (isChatResult(turn)) return turn;

  let raw;
  try {
    raw = await deps.llm(turn.llmInput);
  } catch {
    return fail(502, LLM_FAILED);
  }

  const finished = await finishTurn(turn, raw, deps.store);
  if (!finished) return fail(502, LLM_FAILED);
  return { status: 200, body: finished.body };
}
