import { assertEquals } from "@std/assert";

import { detectLanguage } from "./language.ts";

Deno.test("Polish letters or words give Polish", () => {
  assertEquals(detectLanguage("Cześć, jak się masz?", "en"), "pl");
  assertEquals(detectLanguage("Czy to normalne", "en"), "pl");
  assertEquals(detectLanguage("bardzo boli mnie glowa", null), "pl");
});

Deno.test("English words give English even with a Polish profile", () => {
  assertEquals(detectLanguage("What is perimenopause?", "pl"), "en");
  assertEquals(detectLanguage("I feel tired and my sleep is bad", "pl-PL"), "en");
});

Deno.test("unclear messages follow the profile language", () => {
  assertEquals(detectLanguage("ok", "pl"), "pl");
  assertEquals(detectLanguage("ok", "en"), "en");
  assertEquals(detectLanguage("???", null), "en");
});
