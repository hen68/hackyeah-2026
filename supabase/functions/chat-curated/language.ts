export type Language = "en" | "pl";

const POLISH_LETTERS = /[ąćęłńóśźż]/i;
const POLISH_WORDS = new Set([
  "czy", "jak", "jest", "mam", "się", "nie", "tak", "bardzo", "dzień", "dziś", "dzis", "proszę", "prosze",
  "dziękuję", "dziekuje", "cześć", "czesc", "co", "mnie", "mi", "moje", "mój", "moja", "gdy", "kiedy",
  "dlaczego", "który", "która", "chcę", "chce", "mogę", "moge", "potrzebuję", "boli", "boję", "boje",
]);
const ENGLISH_WORDS = new Set([
  "the", "and", "is", "are", "what", "how", "why", "when", "my", "me", "do", "does", "can", "should",
  "i", "i'm", "im", "have", "has", "feel", "feeling", "hello", "hi", "thanks", "thank", "please", "am",
]);

const words = (text: string) => text.toLowerCase().match(/[\p{L}']+/gu) ?? [];

// Reply in the language the patient wrote in; the profile language settles unclear messages.
export function detectLanguage(message: string, profileLocale: string | null): Language {
  if (POLISH_LETTERS.test(message)) return "pl";
  const tokens = words(message);
  const pl = tokens.filter((w) => POLISH_WORDS.has(w)).length;
  const en = tokens.filter((w) => ENGLISH_WORDS.has(w)).length;
  if (pl > en) return "pl";
  if (en > pl) return "en";
  return (profileLocale ?? "en").toLowerCase().startsWith("pl") ? "pl" : "en";
}
