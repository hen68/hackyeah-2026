// Streaming variant of `handleChat`: same checks and saves, but the reply reaches the patient as
// server-sent events while the model writes it. Failures before the stream starts stay JSON.

import {
  type ChatDeps,
  type ChatResult,
  finishTurn,
  isChatResult,
  LLM_FAILED,
  type PreparedTurn,
  prepareTurn,
  type TurnReply,
} from "./handler.ts";
import type { LlmStream } from "./llm.ts";
import { createReplyExtractor } from "./reply-extractor.ts";
import { createReplyGate } from "./reply-gate.ts";

const SAVE_FAILED = "Something went wrong. Please try again.";

export type ChatEvent =
  | { event: "delta"; data: { text: string } }
  | { event: "done"; data: TurnReply & { replace?: true } }
  | { event: "error"; data: { error: string; status: number } };

export type ChatStreamDeps = Omit<ChatDeps, "llm"> & { llmStream: LlmStream };

export type ChatStreamResult =
  | { kind: "json"; result: ChatResult }
  | { kind: "stream"; events: AsyncIterable<ChatEvent> };

export const errorEvent = (status: number, error: string): ChatEvent => ({ event: "error", data: { error, status } });

/** One SSE frame. JSON.stringify never emits raw newlines, so `data` stays on one line. */
export const encodeSse = ({ event, data }: ChatEvent): string => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

export async function handleChatStream(
  userId: string | null,
  rawBody: unknown,
  deps: ChatStreamDeps,
): Promise<ChatStreamResult> {
  const turn = await prepareTurn(userId, rawBody, deps);
  if (isChatResult(turn)) return { kind: "json", result: turn };
  return { kind: "stream", events: streamTurn(turn, deps) };
}

async function* streamTurn(turn: PreparedTurn, deps: ChatStreamDeps): AsyncGenerator<ChatEvent> {
  const extractor = createReplyExtractor();
  const gate = createReplyGate(turn.message);
  let args = "";
  let text = "";
  try {
    for await (const chunk of deps.llmStream(turn.llmInput)) {
      args += chunk.args;
      text += chunk.text;
      const visible = gate.push(extractor.push(chunk.args));
      if (visible) yield { event: "delta", data: { text: visible } };
    }
  } catch {
    // Nothing is saved as the assistant turn, as with the JSON 502.
    yield errorEvent(502, LLM_FAILED);
    return;
  }

  let toolInput: unknown = null;
  try {
    toolInput = args ? JSON.parse(args) : null;
  } catch {
    toolInput = null;
  }

  let finished;
  try {
    finished = await finishTurn(turn, { toolInput, text }, deps.store, gate.rule);
  } catch {
    yield errorEvent(500, SAVE_FAILED);
    return;
  }
  if (!finished) {
    yield errorEvent(502, LLM_FAILED);
    return;
  }
  // The final reply is authoritative (it adds the follow-up question); `replace` flags a swap.
  yield { event: "done", data: finished.tripped ? { ...finished.body, replace: true } : finished.body };
}
