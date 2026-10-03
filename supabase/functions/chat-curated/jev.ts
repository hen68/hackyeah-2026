// Matches a patient's message to one of the curated answers with TypeSafe's Jev model
// (POST /v1/systemone, a Choice question). Jev picks from the options; it never writes text.

import { ANSWERS, type CuratedAnswer, NONE_ASK, NONE_KEY } from "./answers.ts";

export const JEV_URL = "https://api.typesafe.ai/v1/systemone";
export const JEV_MODEL = "jev-latest";
// Below this the message is treated as "nothing fits" and the fallback reply is used.
export const DEFAULT_MIN_CONFIDENCE = 0.6;
const TIMEOUT_MS = 15_000;
const RETRY_DELAY_MS = 500;
const RETRYABLE = new Set([429, 529]);

export type Match = { answerId: string | null; choice: string; confidence: number | null };
export type Matcher = (message: string) => Promise<Match>;

const INSTRUCTIONS =
  "A woman going through perimenopause or menopause sent this message to a companion app. " +
  "Choose the prepared answer that best fits what she is saying or asking. The message may be in English or Polish. " +
  `Choose '${NONE_KEY}' when no prepared answer clearly fits.`;

export function buildRequest(message: string, answers: readonly CuratedAnswer[] = ANSWERS, model = JEV_MODEL) {
  const criteria: Record<string, string> = {};
  for (const a of answers) criteria[a.id] = a.ask;
  criteria[NONE_KEY] = NONE_ASK;
  return {
    state: message,
    model,
    questions: { answer: { type: "choice", instructions: INSTRUCTIONS, criteria } },
  };
}

type Parsed = { choice: string; confidence: number | null; probabilities: Record<string, number> };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

// The response is untrusted input: check its shape before using any of it.
export function parseResponse(raw: unknown): Parsed {
  const answer = isRecord(raw) && isRecord(raw.answers) ? raw.answers.answer : undefined;
  if (!isRecord(answer) || typeof answer.choice !== "string") throw new Error("unexpected response shape");
  const probabilities: Record<string, number> = {};
  if (isRecord(answer.probabilities)) {
    for (const [key, value] of Object.entries(answer.probabilities)) {
      if (typeof value === "number" && Number.isFinite(value)) probabilities[key] = value;
    }
  }
  const stated = typeof answer.confidence === "number" && Number.isFinite(answer.confidence) ? answer.confidence : null;
  return { choice: answer.choice, confidence: stated ?? probabilities[answer.choice] ?? null, probabilities };
}

// Picks the answer to send, or null for the fallback.
// Safety first: a likely emergency wins even when it is not the top choice, as long as its own
// (lower) bar is met.
export function decide(parsed: Parsed, answers: readonly CuratedAnswer[] = ANSWERS): Match {
  const urgent = answers
    .filter((a) => a.minConfidence !== undefined && (parsed.probabilities[a.id] ?? 0) >= a.minConfidence)
    .sort((a, b) => (parsed.probabilities[b.id] ?? 0) - (parsed.probabilities[a.id] ?? 0))[0];
  if (urgent) return { answerId: urgent.id, choice: parsed.choice, confidence: parsed.probabilities[urgent.id] ?? null };

  const top = answers.find((a) => a.id === parsed.choice);
  if (!top || parsed.confidence === null) return { answerId: null, choice: parsed.choice, confidence: parsed.confidence };
  const bar = top.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  return {
    answerId: parsed.confidence >= bar ? top.id : null,
    choice: parsed.choice,
    confidence: parsed.confidence,
  };
}

type Options = {
  fetch?: typeof fetch;
  url?: string;
  model?: string;
  answers?: readonly CuratedAnswer[];
  sleep?: (ms: number) => Promise<void>;
};

export function createJevMatcher(apiKey: string, options: Options = {}): Matcher {
  const doFetch = options.fetch ?? fetch;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const answers = options.answers ?? ANSWERS;

  return async (message) => {
    const body = JSON.stringify(buildRequest(message, answers, options.model));
    let lastStatus: number | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await sleep(RETRY_DELAY_MS);
      let response: Response;
      try {
        response = await doFetch(options.url ?? JEV_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch {
        lastStatus = null; // network error or timeout: worth one retry
        continue;
      }
      if (response.ok) return decide(parseResponse(await response.json()), answers);
      lastStatus = response.status;
      if (!RETRYABLE.has(response.status)) break;
    }
    // Status only: never the key or the message.
    throw new Error(`jev request failed${lastStatus === null ? "" : ` (${lastStatus})`}`);
  };
}
