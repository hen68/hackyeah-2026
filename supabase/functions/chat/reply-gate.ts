// Runs the guardrail on the streamed reply before any of it reaches the patient. Text is released
// only once enough complete text follows it that any guardrail match starting in it would already
// be visible to the check, so no word of an unsafe phrase is ever shown. The held tail arrives
// with the final `done` reply, which is checked again in full.

import { checkReply, type GuardrailRule } from "./guardrails.ts";
import { MAX_REPLY_CHARS } from "./extract.ts";

// Longer than the longest guardrail match: the Polish directive (13-char trigger, up to 40 chars
// between, then the target word, ~66 chars) and "you are suffering from an anxiety disorder"
// (7 words, 42 chars).
export const MIN_TAIL_CHARS = 80;
export const MIN_TAIL_WORDS = 8;

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

const wordCount = (text: string) => text.split(/\s+/u).filter(Boolean).length;

// Length of the longest prefix of `complete` that ends on a word boundary and leaves the window behind it.
function releasable(complete: string): number {
  for (let i = complete.length - MIN_TAIL_CHARS - 1; i >= 0; i -= 1) {
    if (BOUNDARY.test(complete[i]) && wordCount(complete.slice(i + 1)) >= MIN_TAIL_WORDS) return i + 1;
  }
  return 0;
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
      // Check every complete word received so far, shown or held; the unfinished last word waits.
      const complete = pending.slice(0, lastBoundary(pending) + 1);
      if (!complete) return "";
      const verdict = checkReply(visible + complete, userMessage);
      if (verdict.tripped) {
        rule = verdict.rule;
        return "";
      }
      const release = releasable(complete);
      const chunk = complete.slice(0, release).slice(0, Math.max(0, maxChars - visible.length));
      pending = pending.slice(release);
      visible += chunk;
      return chunk;
    },
  };
}
