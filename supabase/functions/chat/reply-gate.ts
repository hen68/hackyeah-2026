// Runs the guardrail on the streamed reply before any of it reaches the patient. Only whole words
// are released, so a pattern can never be cut in half at a chunk boundary.

import { checkReply, type GuardrailRule } from "./guardrails.ts";
import { MAX_REPLY_CHARS } from "./extract.ts";

// Whitespace or punctuation ends a word.
const BOUNDARY = /[\s.,!?;:)\]}"'…—–-]/u;

export type ReplyGate = {
  /** Adds decoded reply text; returns the part that is safe to show now ("" while holding back). */
  push(text: string): string;
  /** The rule that tripped, once one has. Nothing is released after that. */
  readonly rule: GuardrailRule | null;
};

function lastBoundary(text: string): number {
  for (let i = text.length - 1; i >= 0; i -= 1) {
    if (BOUNDARY.test(text[i])) return i;
  }
  return -1;
}

export function createReplyGate(userMessage: string, maxChars: number = MAX_REPLY_CHARS): ReplyGate {
  let visible = "";
  let pending = "";
  let rule: GuardrailRule | null = null;

  return {
    get rule() {
      return rule;
    },
    push(text) {
      if (rule) return "";
      // The saved reply is trimmed, so never show leading whitespace.
      pending = visible ? pending + text : (pending + text).trimStart();
      const cut = lastBoundary(pending);
      if (cut < 0) return "";
      const chunk = pending.slice(0, cut + 1).slice(0, Math.max(0, maxChars - visible.length));
      pending = pending.slice(cut + 1);
      if (!chunk) return "";
      const verdict = checkReply(visible + chunk, userMessage);
      if (verdict.tripped) {
        rule = verdict.rule;
        return "";
      }
      visible += chunk;
      return chunk;
    },
  };
}
