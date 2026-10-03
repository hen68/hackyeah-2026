import { assert, assertEquals, assertStringIncludes } from "@std/assert";

import {
  buildInsights,
  type CheckinDay,
  type Mention,
  type RulesInput,
  symptomKey,
} from "./rules.ts";

const VISIT = "2026-10-03";
const labels = new Map([
  ["sleep", "Sleep trouble"],
  ["energy", "Low energy"],
  ["hot_flushes", "Hot flushes"],
  ["mood", "Mood swings"],
  ["bleeding", "Bleeding"],
  ["aches", "Aches"],
  ["headache", "Headache"],
]);

const day = (n: number) => new Date(Date.parse(`${VISIT}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);
const checkin = (n: number, entries: [string, number][], note: string | null = null): CheckinDay => ({
  day: day(n),
  note,
  entries: entries.map(([symptom_code, severity]) => ({ symptom_code, custom_label: null, severity })),
});
const input = (over: Partial<RulesInput>): RulesInput => ({
  visitDate: VISIT,
  previousVisitDate: null,
  checkins: [],
  observations: [],
  mentions: [],
  labels,
  ...over,
});
const mention = (code: string, stance: Mention["stance"]): Mention => ({
  symptom_code: code,
  custom_label: null,
  stance,
  quote: "…",
});

Deno.test("missing topic: frequent in the diary, not mentioned", () => {
  const checkins = [1, 3, 5, 7, 9, 11].map((n) => checkin(n, [["sleep", 3]], n === 3 ? "Woke up at 3am again" : null));
  const out = buildInsights(input({ checkins, mentions: [mention("mood", "present")] }));
  const sleep = out.find((i) => i.symptom_code === "sleep")!;
  assertEquals(sleep.kind, "missing_topic");
  assertEquals(sleep.title, "Temat nieporuszony");
  assertEquals(sleep.evidence.entry_count, 6);
  assertEquals(sleep.evidence.sources, ["checkin"]);
  assertEquals(sleep.evidence.excerpts[0].text, "Woke up at 3am again");
  assertStringIncludes(sleep.summary, "Do doprecyzowania");
});

Deno.test("missing topic needs 5 days; a mention of any stance suppresses it", () => {
  const four = [1, 2, 3, 4].map((n) => checkin(n, [["sleep", 3]]));
  assertEquals(buildInsights(input({ checkins: four })).filter((i) => i.kind === "missing_topic"), []);
  const six = [1, 2, 3, 4, 5, 6].map((n) => checkin(n, [["sleep", 3]]));
  assertEquals(buildInsights(input({ checkins: six, mentions: [mention("sleep", "unclear")] })).length, 0);
});

Deno.test("discrepancy: severe in the diary, absent or improved in the interview", () => {
  const checkins = [...Array(14)].map((_, i) => checkin(i + 1, [["sleep", i < 8 ? 4 : 2]]));
  const out = buildInsights(input({ checkins, mentions: [mention("sleep", "improved")] }));
  assertEquals(out[0].kind, "discrepancy");
  assertEquals(out[0].title, "Możliwa rozbieżność");
  assertStringIncludes(out[0].summary, "8/14 ostatnich check-inów");
  assertEquals(out[0].rank, 1);
  assertEquals(out[0].evidence.entry_count, 8);
});

Deno.test("no discrepancy below the share or the minimum number of check-ins", () => {
  const few = [1, 2, 3].map((n) => checkin(n, [["sleep", 5]]));
  assertEquals(buildInsights(input({ checkins: few, mentions: [mention("sleep", "absent")] })).length, 0);
  const rare = [...Array(14)].map((_, i) => checkin(i + 1, [["sleep", i < 6 ? 4 : 1]]));
  assertEquals(buildInsights(input({ checkins: rare, mentions: [mention("sleep", "absent")] })).length, 0);
});

Deno.test("new symptom after the previous visit; none when it was already there", () => {
  const baseline = [25, 26, 27].map((n) => checkin(n, [["mood", 2]]));
  const fresh = [1, 2, 3].map((n) => checkin(n, [["headache", 3]]));
  const mentions = [mention("mood", "present")];
  const out = buildInsights(input({ checkins: [...baseline, ...fresh], previousVisitDate: day(20), mentions }));
  assertEquals(out.find((i) => i.symptom_code === "headache")?.kind, "new_symptom");
  assertStringIncludes(out.find((i) => i.symptom_code === "headache")!.summary, "po raz pierwszy");

  const earlier = [35, 36, 37].map((n) => checkin(n, [["headache", 3]]));
  const old = buildInsights(input({ checkins: [...earlier, ...fresh], previousVisitDate: day(30), mentions }));
  assertEquals(old.filter((i) => i.kind === "new_symptom").length, 0);
});

Deno.test("new symptom without a previous visit uses the prior window and needs tracking in it", () => {
  const recent = [1, 2, 3].map((n) => checkin(n, [["aches", 3]]));
  const tracked = [40, 41, 42].map((n) => checkin(n, [["mood", 1]]));
  const mentions = [mention("mood", "present")];
  const kinds = (c: CheckinDay[]) => buildInsights(input({ checkins: c, mentions })).map((i) => i.kind);
  assertEquals(kinds([...recent, ...tracked]), ["new_symptom"]);
  // Seen in the prior window already: not new.
  assertEquals(kinds([...recent, ...tracked, checkin(45, [["aches", 3]])]).includes("new_symptom"), false);
  // Diary starts inside the window: absence in the prior window proves nothing.
  assertEquals(kinds(recent), []);
});

Deno.test("significant change at exactly 1.0, worded by direction", () => {
  const worse = [
    ...[20, 22, 24].map((n) => checkin(n, [["energy", 2]])),
    ...[2, 4, 6].map((n) => checkin(n, [["energy", 3]])),
  ];
  const out = buildInsights(input({ checkins: worse, mentions: [mention("energy", "present")] }));
  assertEquals(out[0].kind, "significant_change");
  assertStringIncludes(out[0].summary, "wzrosło z 2.0 do 3.0");

  const better = [
    ...[20, 22, 24].map((n) => checkin(n, [["energy", 4]])),
    ...[2, 4, 6].map((n) => checkin(n, [["energy", 3]])),
  ];
  assertStringIncludes(buildInsights(input({ checkins: better, mentions: [mention("energy", "present")] }))[0].summary, "spadło z 4.0 do 3.0");

  const small = [
    ...[20, 22, 24].map((n) => checkin(n, [["energy", 2]])),
    ...[2, 4, 6].map((n) => checkin(n, [["energy", 2], ["energy", 2]])),
  ];
  assertEquals(buildInsights(input({ checkins: small, mentions: [mention("energy", "present")] })).length, 0);
});

Deno.test("ranking: kind, then frequency; capped at 5; one item per symptom", () => {
  const codes = ["sleep", "energy", "hot_flushes", "mood", "bleeding", "aches", "headache"];
  // Symptom i is bad on (12 - i) of 12 days, so all seven qualify and frequency orders them.
  const checkins = [...Array(12)].map((_, k) => checkin(k + 1, codes.map((c, i) => [c, k + 1 <= 12 - i ? 3 : 1] as [string, number])));
  const out = buildInsights(input({ checkins }));
  assertEquals(out.length, 5);
  assertEquals(out.map((i) => i.rank), [1, 2, 3, 4, 5]);
  assertEquals(new Set(out.map((i) => i.symptom_code)).size, 5);
  assertEquals(out[0].symptom_code, "sleep");
});

Deno.test("discrepancy outranks missing topic; chat adds evidence sources", () => {
  const checkins = [...Array(14)].map((_, i) => checkin(i + 1, [["sleep", 4], ["energy", 3]]));
  const out = buildInsights(input({
    checkins,
    mentions: [mention("sleep", "absent")],
    observations: [{ observed_on: day(2), symptom_code: "energy", custom_label: null, severity: 4, excerpt: "so tired all week" }],
  }));
  assertEquals(out.map((i) => i.kind), ["discrepancy", "missing_topic"]);
  const energy = out[1];
  assertEquals(energy.evidence.sources, ["chat", "checkin"]);
  assert(energy.evidence.excerpts.length <= 3);
  assert(energy.evidence.excerpts.some((e) => e.source === "chat" && e.text === "so tired all week"));
});

Deno.test("wording never says error and custom labels are keyed case-insensitively", () => {
  const checkins = [1, 2, 3, 4, 5, 6].map((n) => ({
    day: day(n),
    note: null,
    entries: [{ symptom_code: null, custom_label: "Scalp tingling", severity: 3 }],
  }));
  const out = buildInsights(input({ checkins }));
  assertEquals(out[0].custom_label, "Scalp tingling");
  assertEquals(/błąd/i.test(out[0].summary + out[0].title), false);
  assertEquals(symptomKey(null, " Scalp Tingling "), symptomKey(null, "scalp tingling"));
});
