// Pulls the `reply` string out of the streamed `record_turn` arguments as they arrive, so the
// patient sees the answer while the model is still writing it. The arguments are partial JSON:
// this is a tiny character-level scanner that only decodes top-level strings.

const ESCAPES: Record<string, string> = { '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
const HEX_DIGITS = 4;
const REPLY_KEY = "reply";

export type ReplyExtractor = {
  /** Feeds the next chunk of arguments; returns the reply characters decoded from it. */
  push(chunk: string): string;
};

export function createReplyExtractor(): ReplyExtractor {
  let depth = 0;
  let inString = false;
  let escape = false;
  let hex: string | null = null;
  let isKey = false;
  let expectKey = false;
  let key = "";
  let lastKey = "";
  let inReply = false;
  let replyDone = false;

  // Decoded characters of the current string: keys are collected, the reply value is emitted.
  const decoded = (char: string, out: string[]) => {
    if (isKey) key += char;
    else if (inReply) out.push(char);
  };

  const closeString = () => {
    inString = false;
    if (isKey) lastKey = key;
    if (inReply) replyDone = true;
    isKey = false;
    inReply = false;
  };

  const scanString = (char: string, out: string[]) => {
    if (hex !== null) {
      hex += char;
      if (hex.length === HEX_DIGITS) {
        const code = Number.parseInt(hex, 16);
        if (!Number.isNaN(code)) decoded(String.fromCharCode(code), out);
        hex = null;
      }
    } else if (escape) {
      escape = false;
      if (char === "u") hex = "";
      else decoded(ESCAPES[char] ?? char, out);
    } else if (char === "\\") escape = true;
    else if (char === '"') closeString();
    else decoded(char, out);
  };

  const scanStructure = (char: string) => {
    if (char === '"') {
      inString = true;
      isKey = depth === 1 && expectKey;
      key = "";
      inReply = depth === 1 && !isKey && lastKey === REPLY_KEY && !replyDone;
    } else if (char === "{" || char === "[") {
      depth += 1;
      expectKey = char === "{" && depth === 1;
    } else if (char === "}" || char === "]") depth -= 1;
    else if (char === "," && depth === 1) expectKey = true;
    else if (char === ":" && depth === 1) expectKey = false;
  };

  return {
    push(chunk) {
      const out: string[] = [];
      for (const char of chunk) {
        if (inString) scanString(char, out);
        else scanStructure(char);
      }
      return out.join("");
    },
  };
}
