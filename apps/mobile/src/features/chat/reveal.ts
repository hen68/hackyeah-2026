/** Typing pace for the part of a reply the server held back until it was checked. */
export const REVEAL_MS_PER_CHAR = 30;
/** Long tails speed up so the whole reveal never takes longer than this. */
export const REVEAL_MAX_MS = 2500;

export type RevealStep = {
  /** Full bubble text to show at this step. */
  content: string;
  /** How long this step stays before the next one (or before the reply is finalised). */
  delayMs: number;
};

/**
 * Word-by-word steps that type out the rest of `final` after the already shown text. Returns null
 * when the reply must be swapped at once: it was replaced by the guardrail, or no longer starts
 * with what is on screen. An empty array means there is nothing left to type.
 */
export function revealSteps(shown: string, final: string, isReplaced: boolean): RevealStep[] | null {
  if (isReplaced || !final.startsWith(shown)) return null;
  const tail = final.slice(shown.length);
  if (!tail) return [];
  const msPerChar = Math.min(REVEAL_MS_PER_CHAR, REVEAL_MAX_MS / tail.length);
  const chunks = tail.match(/\s*\S+\s*/g) ?? [tail];
  let content = shown;
  return chunks.map((chunk) => {
    content += chunk;
    return { content, delayMs: chunk.length * msPerChar };
  });
}
