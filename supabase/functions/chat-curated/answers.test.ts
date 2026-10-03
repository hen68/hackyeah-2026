import { assert, assertEquals } from "@std/assert";

import { ANSWERS, FALLBACK, NONE_KEY } from "./answers.ts";
import { checkReply } from "./guardrails.ts";

Deno.test("the base is big enough and fits one Choice question (max 255 options)", () => {
  assert(ANSWERS.length >= 100, `only ${ANSWERS.length} answers`);
  assert(ANSWERS.length + 1 <= 255);
});

Deno.test("ids are unique snake_case and never collide with the 'none' option", () => {
  const ids = ANSWERS.map((a) => a.id);
  assertEquals(new Set(ids).size, ids.length);
  for (const id of ids) assert(/^[a-z][a-z0-9_]*$/.test(id), `bad id ${id}`);
  assert(!ids.includes(NONE_KEY));
});

Deno.test("every answer has a description and both replies, within length limits", () => {
  for (const a of ANSWERS) {
    assert(a.ask.trim().length >= 10, `${a.id}: ask too short`);
    for (const lang of ["en", "pl"] as const) {
      const text = a[lang];
      assert(text.trim().length >= 20, `${a.id}.${lang}: reply too short`);
      assert(text.length <= 600, `${a.id}.${lang}: reply too long (${text.length})`);
    }
  }
  for (const text of Object.values(FALLBACK)) assert(text.length > 20 && text.length <= 600);
});

Deno.test("Polish replies are really Polish, not copies of the English", () => {
  for (const a of ANSWERS) assert(a.pl !== a.en, `${a.id}: pl equals en`);
  const withDiacritics = ANSWERS.filter((a) => /[ąćęłńóśźż]/i.test(a.pl)).length;
  assert(withDiacritics / ANSWERS.length > 0.9, `only ${withDiacritics} Polish replies have diacritics`);
});

Deno.test("no reply trips the safety rules (no diagnosis, dosing, directives, causes or drug names)", () => {
  const tripped: string[] = [];
  for (const a of ANSWERS) {
    for (const lang of ["en", "pl"] as const) {
      const verdict = checkReply(a[lang], "");
      if (verdict.tripped) tripped.push(`${a.id}.${lang}: ${verdict.rule}`);
    }
  }
  for (const [lang, text] of Object.entries(FALLBACK)) {
    const verdict = checkReply(text, "");
    if (verdict.tripped) tripped.push(`fallback.${lang}: ${verdict.rule}`);
  }
  assertEquals(tripped, []);
});

Deno.test("treatment questions always point to the doctor or pharmacist", () => {
  const treatment = ANSWERS.filter((a) => /^(hrt_|supplements_|medicine_|contraception_|alternative_)/.test(a.id));
  assert(treatment.length >= 8);
  for (const a of treatment) {
    assert(/doctor|pharmacist/i.test(a.en), `${a.id}.en has no doctor pointer`);
    assert(/lekarz|farmaceut/i.test(a.pl), `${a.id}.pl has no doctor pointer`);
  }
});

Deno.test("urgent answers have a lower bar and give an emergency route", () => {
  const urgent = ANSWERS.filter((a) => a.id.startsWith("urgent_"));
  assert(urgent.length >= 6);
  for (const a of urgent) {
    assert(a.minConfidence !== undefined && a.minConfidence < 0.6, `${a.id}: bar not lowered`);
    assert(a.en.includes("112") && a.pl.includes("112"), `${a.id}: no emergency number`);
  }
  // Only urgent answers may use a custom bar.
  assertEquals(ANSWERS.filter((a) => a.minConfidence !== undefined).length, urgent.length);
});

Deno.test("descriptions are distinct so the model can tell answers apart", () => {
  const asks = ANSWERS.map((a) => a.ask.trim().toLowerCase());
  assertEquals(new Set(asks).size, asks.length);
});
