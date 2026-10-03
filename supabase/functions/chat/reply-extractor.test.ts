import { assertEquals } from "@std/assert";

import { createReplyExtractor } from "./reply-extractor.ts";

// Feeds `chunks` in order and returns everything the extractor emitted.
function extract(chunks: string[]): string {
  const extractor = createReplyExtractor();
  return chunks.map((chunk) => extractor.push(chunk)).join("");
}

// Every possible single split point of `json`.
function everySplit(json: string): string[][] {
  return Array.from({ length: json.length + 1 }, (_, i) => [json.slice(0, i), json.slice(i)]);
}

const args = (reply: string, extra = { clarifying_question: null, observations: [] }) =>
  JSON.stringify({ reply, ...extra });

Deno.test("streams the reply value as it arrives", () => {
  const extractor = createReplyExtractor();
  assertEquals(extractor.push('{"reply":"That sou'), "That sou");
  assertEquals(extractor.push("nds hard"), "nds hard");
  assertEquals(extractor.push('.","clarifying_question":"How long?","observations":[]}'), ".");
});

Deno.test("decodes escapes, including unicode, at every chunk boundary", () => {
  const reply = 'Line one\nShe said "hi" \\ path/ok\ttab é — 🌸 \u0001';
  const json = args(reply);
  for (const split of everySplit(json)) assertEquals(extract(split), reply);
  assertEquals(extract([...json]), reply);
});

Deno.test("decodes explicit \\u escapes split across chunks", () => {
  assertEquals(extract(['{"reply":"caf\\u00', 'e9 \\u2014 ok"}']), "café — ok");
  assertEquals(extract(['{"reply":"a\\', 'nb"}']), "a\nb");
});

Deno.test("finds the reply when it is not the first property", () => {
  const json = JSON.stringify({
    observations: [{ reply: "nested, ignore" }],
    clarifying_question: "reply",
    reply: "Hi",
  });
  assertEquals(extract([json]), "Hi");
  for (const split of everySplit(json)) assertEquals(extract(split), "Hi");
});

Deno.test("ignores other strings and keys that only look like reply", () => {
  assertEquals(extract([JSON.stringify({ replyx: "no", note: "reply", reply: "yes" })]), "yes");
});

Deno.test("an empty reply emits nothing", () => {
  assertEquals(extract([args("")]), "");
  assertEquals(extract(["{}"]), "");
  assertEquals(extract([""]), "");
});

Deno.test("tolerates whitespace between tokens", () => {
  assertEquals(extract(['{ "reply" :  "spaced" , "observations": [] }']), "spaced");
});
