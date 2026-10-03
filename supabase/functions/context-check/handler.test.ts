import { assertEquals } from "@std/assert";

import { type ContextStore, handleContextCheck, type Interview, type SavedCheck } from "./handler.ts";
import type { ExtractMentions } from "./extract-interview.ts";
import type { Mention } from "./rules.ts";

const ID = "6f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const USER = "clinician-1";
const catalog = [{ code: "sleep", label: "Sleep trouble" }];

const interview = (extracted: unknown = null): Interview => ({
  id: ID,
  patient_id: "patient-1",
  visit_at: "2026-10-03T09:00:00Z",
  content: "Pacjentka: śpię dobrze.",
  extracted,
});

function fakeStore(over: { interview?: Interview | null; existing?: SavedCheck | null } = {}) {
  const calls = { extracted: [] as unknown[], replaced: [] as unknown[], history: [] as string[][] };
  const store: ContextStore = {
    getInterview: () => Promise.resolve("interview" in over ? over.interview! : interview()),
    getPreviousVisitDate: () => Promise.resolve(null),
    getExistingCheck: () => Promise.resolve(over.existing ?? null),
    loadCatalog: () => Promise.resolve(catalog),
    loadHistory(_p, from, to) {
      calls.history.push([from, to]);
      const days = [1, 2, 3, 4, 5, 6].map((n) => new Date(Date.parse("2026-10-03T00:00:00Z") - n * 86400000).toISOString().slice(0, 10));
      return Promise.resolve({
        checkins: days.map((day) => ({ day, note: null, entries: [{ symptom_code: "sleep", custom_label: null, severity: 4 }] })),
        observations: [],
      });
    },
    saveExtracted(_id, extracted) {
      calls.extracted.push(extracted);
      return Promise.resolve();
    },
    replaceCheck(row) {
      calls.replaced.push(row);
      return Promise.resolve({
        context_check: { id: "cc-1", period_start: row.period_start, period_end: row.period_end, created_at: "now" },
        insights: row.insights,
      });
    },
  };
  return { store, calls };
}

const mentions = (...m: Mention[]): ExtractMentions => () => Promise.resolve(m);
const neverCalled: ExtractMentions = () => {
  throw new Error("The model must not be called");
};

Deno.test("401 without a user, 400 for a bad id", async () => {
  const { store } = fakeStore();
  assertEquals((await handleContextCheck(null, { interview_id: ID }, { store, extract: neverCalled })).status, 401);
  assertEquals((await handleContextCheck(USER, { interview_id: "nope" }, { store, extract: neverCalled })).status, 400);
  assertEquals((await handleContextCheck(USER, null, { store, extract: neverCalled })).status, 400);
});

Deno.test("a caller outside the care team gets 404 (RLS returns no interview)", async () => {
  const { store, calls } = fakeStore({ interview: null });
  const result = await handleContextCheck(USER, { interview_id: ID }, { store, extract: neverCalled });
  assertEquals(result.status, 404);
  assertEquals(calls.replaced.length, 0);
});

Deno.test("cached extraction is used and the model is not called", async () => {
  const cached = { mentions: [{ symptom_code: "sleep", custom_label: null, stance: "absent", quote: "śpię dobrze" }] };
  const { store, calls } = fakeStore({ interview: interview(cached) });
  const result = await handleContextCheck(USER, { interview_id: ID }, { store, extract: neverCalled });
  assertEquals(result.status, 200);
  assertEquals(calls.extracted.length, 0);
  const insights = result.body.insights as { kind: string }[];
  assertEquals(insights[0].kind, "discrepancy");
});

Deno.test("fresh interview: extracts, caches the mentions, saves the check for the right period", async () => {
  const { store, calls } = fakeStore();
  const extract = mentions({ symptom_code: "sleep", custom_label: null, stance: "present", quote: "śpię źle" });
  const result = await handleContextCheck(USER, { interview_id: ID }, { store, extract });
  assertEquals(result.status, 200);
  assertEquals(calls.extracted.length, 1);
  const saved = calls.replaced[0] as { period_start: string; period_end: string; patient_id: string };
  assertEquals([saved.period_start, saved.period_end, saved.patient_id], ["2026-09-03", "2026-10-02", "patient-1"]);
  assertEquals(calls.history[0], ["2026-08-04", "2026-10-03"]);
});

Deno.test("an existing result is returned unless refresh is set", async () => {
  const existing: SavedCheck = {
    context_check: { id: "cc-old", period_start: "a", period_end: "b", created_at: "c" },
    insights: [{ rank: 1 }],
  };
  const { store, calls } = fakeStore({ existing });
  const again = await handleContextCheck(USER, { interview_id: ID }, { store, extract: neverCalled });
  assertEquals((again.body as unknown as SavedCheck).context_check.id, "cc-old");
  assertEquals(calls.replaced.length, 0);

  const cached = { mentions: [] };
  const refreshed = fakeStore({ existing, interview: interview(cached) });
  const result = await handleContextCheck(USER, { interview_id: ID, refresh: true }, { store: refreshed.store, extract: neverCalled });
  assertEquals((result.body as unknown as SavedCheck).context_check.id, "cc-1");
  assertEquals(refreshed.calls.replaced.length, 1);
});

Deno.test("an extraction failure is a generic 502 and nothing is saved", async () => {
  const { store, calls } = fakeStore();
  const extract: ExtractMentions = () => Promise.reject(new Error("key sk-secret rejected"));
  const result = await handleContextCheck(USER, { interview_id: ID }, { store, extract });
  assertEquals(result.status, 502);
  assertEquals(String(result.body.error).includes("sk-secret"), false);
  assertEquals(calls.extracted.length + calls.replaced.length, 0);
});
