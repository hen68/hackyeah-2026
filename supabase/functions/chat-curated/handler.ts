import { z } from "zod";

import { ANSWERS, FALLBACK } from "./answers.ts";
import { detectLanguage } from "./language.ts";
import type { Matcher } from "./jev.ts";

// Same limits as the generative chat, so the app can switch between them freely.
export const LIMITS = { perWindow: 20, windowMs: 10 * 60 * 1000, perDay: 100, dayMs: 24 * 60 * 60 * 1000 };
const DAY_MS = 24 * 60 * 60 * 1000;

export const RequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  input_mode: z.enum(["text", "voice"]),
  local_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  stream: z.boolean().optional(),
});

export interface CuratedStore {
  countUserMessagesSince(patientId: string, sinceIso: string): Promise<number>;
  insertUserMessage(
    row: { patient_id: string; content: string; input_mode: "text" | "voice"; local_date: string },
  ): Promise<{ id: string }>;
  getLocale(patientId: string): Promise<string | null>;
  saveAssistantMessage(row: { patient_id: string; content: string; local_date: string }): Promise<{ messageId: string }>;
}

export type CuratedDeps = { store: CuratedStore; match: Matcher; now: () => Date };
export type CuratedResult = { status: number; body: Record<string, unknown> };

const byId = new Map(ANSWERS.map((a) => [a.id, a]));
const fail = (status: number, error: string): CuratedResult => ({ status, body: { error } });

function validDay(value: string, now: Date): boolean {
  const time = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== value) return false;
  return Math.abs(time - Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`)) <= 2 * DAY_MS;
}

export async function handleCurated(userId: string | null, rawBody: unknown, deps: CuratedDeps): Promise<CuratedResult> {
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

  let match;
  try {
    match = await deps.match(message);
  } catch {
    return fail(502, "Digna could not answer just now. Please try again.");
  }

  const language = detectLanguage(message, await store.getLocale(userId));
  const answer = match.answerId ? byId.get(match.answerId) : undefined;
  const reply = answer ? answer[language] : FALLBACK[language];

  const assistant = await store.saveAssistantMessage({ patient_id: userId, content: reply, local_date });
  return {
    status: 200,
    body: {
      reply,
      // Curated answers record no observations; the check-in is where symptoms get logged.
      observations: [],
      message_id: assistant.messageId,
      user_message_id: saved.id,
      // For curating the list: which answer fired (null = fallback) and how sure the model was.
      answer_id: answer?.id ?? null,
      matched: Boolean(answer),
      confidence: match.confidence,
    },
  };
}
