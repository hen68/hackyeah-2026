import { assertEquals } from "@std/assert";

import { mapObservations, parseTurn, replyText } from "./extract.ts";

const catalog = new Set(["hot_flushes", "sleep", "mood"]);
const today = "2026-10-03";

Deno.test("known codes pass through and clamp bad numbers", () => {
  const out = mapObservations(
    [{ symptom_code: "hot_flushes", severity: 9, duration_days: -2, observed_on: "2026-10-02" }],
    catalog,
    today,
  );
  assertEquals(out, [
    { symptom_code: "hot_flushes", custom_label: null, severity: null, duration_days: null, observed_on: "2026-10-02" },
  ]);
});

Deno.test("unknown codes become a custom label, empty items are dropped", () => {
  const out = mapObservations(
    [{ symptom_code: "scalp_tingling", severity: 3 }, { severity: 2 }, "junk", null],
    catalog,
    today,
  );
  assertEquals(out.length, 1);
  assertEquals(out[0].symptom_code, null);
  assertEquals(out[0].custom_label, "scalp tingling");
  assertEquals(out[0].observed_on, today);
});

Deno.test("future, ancient and malformed dates fall back to local_date", () => {
  const out = mapObservations(
    [
      { symptom_code: "sleep", observed_on: "2026-10-09" },
      { symptom_code: "mood", observed_on: "2020-01-01" },
      { symptom_code: "hot_flushes", observed_on: "not-a-date" },
    ],
    catalog,
    today,
  );
  assertEquals(out.map((o) => o.observed_on), [today, today, today]);
});

Deno.test("duplicates are merged and the list is capped", () => {
  const dup = mapObservations([{ symptom_code: "sleep" }, { symptom_code: "sleep" }], catalog, today);
  assertEquals(dup.length, 1);
  const many = mapObservations(
    Array.from({ length: 25 }, (_, i) => ({ custom_label: `thing ${i}` })),
    catalog,
    today,
  );
  assertEquals(many.length, 10);
});

Deno.test("parseTurn uses the tool input, else plain text, else null", () => {
  const tool = parseTurn(
    { reply: " Hi ", clarifying_question: "When did it start?", observations: [{ symptom_code: "mood" }] },
    "",
    catalog,
    today,
  );
  assertEquals(tool?.reply, "Hi");
  assertEquals(tool?.observations.length, 1);
  assertEquals(replyText(tool!), "Hi When did it start?");
  assertEquals(parseTurn(null, "Just text", catalog, today)?.observations, []);
  assertEquals(parseTurn({ reply: "  " }, "", catalog, today), null);
});
