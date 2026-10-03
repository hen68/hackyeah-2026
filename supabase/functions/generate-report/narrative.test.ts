import { assert, assertEquals, assertStringIncludes } from "@std/assert";

import { buildStats, type ReportInputs } from "./build-report.ts";
import { fallbackNarrative, languageFor, type NarrateFn, narrativeInput, writeNarrative } from "./narrative.ts";

const END = "2026-10-10";
const day = (n: number) => new Date(Date.parse(`${END}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);
const inputs = (over: Partial<ReportInputs> = {}): ReportInputs => ({
  periodEnd: END,
  appointment: { id: "a", scheduled_at: "2026-10-11T08:00:00Z", clinician_id: null, doctor_name: null },
  profile: { display_name: "Anna", age_band: "50_54", menopause_stage: "perimenopause", last_period: "3_12m", hrt_status: "no", timezone: "UTC", locale: "en" },
  planCodes: [],
  catalog: [{ code: "hot_flushes", label: "Hot flushes" }, { code: "sleep", label: "Sleep trouble" }],
  checkins: [
    ...[28, 26, 24].map((n) => ({ day: day(n), note: null, entries: [{ symptom_code: "hot_flushes", custom_label: null, severity: 2 }] })),
    ...[3, 2, 1].map((n) => ({ day: day(n), note: "I take estradiol patches", entries: [{ symptom_code: "hot_flushes", custom_label: null, severity: 4 }, { symptom_code: "sleep", custom_label: null, severity: 3 }] })),
  ],
  observations: [],
  nights: [],
  providers: [],
  ...over,
});
const stats = (over: Partial<ReportInputs> = {}) => buildStats(inputs(over), "t");

Deno.test("fallback summary lists top symptoms and what got worse (EN + PL)", () => {
  const en = fallbackNarrative(stats(), "en");
  assertEquals(en.source, "fallback");
  assertStringIncludes(en.summary, "Hot flushes (6 days)");
  assertStringIncludes(en.summary, "Severity rose for: Hot flushes");
  assertEquals(en.topics[0].title, "Hot flushes");
  assertStringIncludes(en.topics[0].detail, "rising");

  const pl = fallbackNarrative(stats(), "pl");
  assertStringIncludes(pl.summary, "Najczęściej zgłaszane");
  assertStringIncludes(pl.summary, "Nasilenie wzrosło");
});

Deno.test("an empty diary has a plain fallback and never calls the model", async () => {
  let called = false;
  const narrate: NarrateFn = () => {
    called = true;
    return Promise.resolve({ summary: "x", topics: [] });
  };
  const out = await writeNarrative(stats({ checkins: [] }), "en", narrate);
  assertEquals(called, false);
  assertEquals(out.source, "fallback");
  assertStringIncludes(out.summary, "No check-ins");
});

Deno.test("a good model answer is used and clamped", async () => {
  const narrate: NarrateFn = () =>
    Promise.resolve({
      summary: "The patient reported hot flushes on 6 days, rising from 2.0 to 4.0.",
      topics: [{ title: "Hot flushes", detail: "Rising over the period." }, { title: "", detail: "dropped" }, "junk", ...Array(10).fill({ title: "t", detail: "d" })],
    });
  const out = await writeNarrative(stats(), "en", narrate);
  assertEquals(out.source, "llm");
  assertEquals(out.topics.length, 5);
  assertEquals(out.topics[0].title, "Hot flushes");
});

Deno.test("unsafe topics are dropped; an unsafe summary falls back to the template", async () => {
  const mixed: NarrateFn = () =>
    Promise.resolve({
      summary: "Reported hot flushes on 6 days.",
      topics: [
        { title: "Dose", detail: "You should double your HRT dose." },
        { title: "Cause", detail: "These are caused by low estrogen." },
        { title: "Sleep", detail: "Sleep trouble on 3 days." },
      ],
    });
  const kept = await writeNarrative(stats(), "en", mixed);
  assertEquals(kept.source, "llm");
  assertEquals(kept.topics.map((t) => t.title), ["Sleep"]);

  const unsafeSummary: NarrateFn = () => Promise.resolve({ summary: "You probably have depression.", topics: [{ title: "A", detail: "B" }] });
  const fell = await writeNarrative(stats(), "en", unsafeSummary);
  assertEquals(fell.source, "fallback");
  assert(!fell.summary.includes("depression"));
});

Deno.test("a drug the patient wrote themselves is allowed, one the model adds is not", async () => {
  const echo: NarrateFn = () => Promise.resolve({ summary: "Patient notes mention estradiol patches.", topics: [] });
  assertEquals((await writeNarrative(stats(), "en", echo)).source, "llm");
  const adds: NarrateFn = () => Promise.resolve({ summary: "Consider gabapentin for the flushes.", topics: [] });
  assertEquals((await writeNarrative(stats(), "en", adds)).source, "fallback");
});

Deno.test("a failing or missing model gives the fallback", async () => {
  const boom: NarrateFn = () => Promise.reject(new Error("provider down"));
  assertEquals((await writeNarrative(stats(), "en", boom)).source, "fallback");
  assertEquals((await writeNarrative(stats(), "en", null)).source, "fallback");
});

Deno.test("the model input carries numbers and short text, no identifiers", () => {
  const input = narrativeInput(stats());
  const json = JSON.stringify(input);
  assertEquals(json.includes("Anna"), false);
  assertEquals("display_name" in input.patient, false);
  assertEquals(input.symptoms[0].symptom, "Hot flushes");
  assertEquals(languageFor("pl-PL"), "pl");
  assertEquals(languageFor("en"), "en");
});
