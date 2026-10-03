import { assertEquals } from "@std/assert";

import { buildStats, dayStatus, type ReportInputs } from "./build-report.ts";

const END = "2026-10-10";
const day = (n: number) => new Date(Date.parse(`${END}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);
const catalog = [
  { code: "hot_flushes", label: "Hot flushes" },
  { code: "sleep", label: "Sleep trouble" },
  { code: "bleeding", label: "Bleeding" },
];
const base = (over: Partial<ReportInputs> = {}): ReportInputs => ({
  periodEnd: END,
  appointment: { id: "a1", scheduled_at: "2026-10-11T08:00:00Z", clinician_id: null, doctor_name: "Dr. Nowak" },
  profile: {
    display_name: "Anna",
    age_band: "50_54",
    menopause_stage: "perimenopause",
    last_period: "3_12m",
    hrt_status: "no",
    timezone: "Europe/Warsaw",
    locale: "en",
  },
  planCodes: ["hot_flushes", "sleep"],
  catalog,
  checkins: [],
  observations: [],
  nights: [],
  providers: ["apple_health"],
  ...over,
});
const ci = (n: number, entries: [string, number][], note: string | null = null) => ({
  day: day(n),
  note,
  entries: entries.map(([symptom_code, severity]) => ({ symptom_code, custom_label: null, severity })),
});

Deno.test("day status follows the shared severity rules", () => {
  assertEquals([null, 1, 2, 3, 4, 5].map(dayStatus), ["none", "good", "good", "okay", "hard", "hard"]);
});

Deno.test("an empty diary still produces a valid report", () => {
  const s = buildStats(base(), "2026-10-10T12:00:00Z");
  assertEquals(s.period, { start: "2026-09-11", end: END, days: 30 });
  assertEquals(s.symptoms, []);
  assertEquals(s.data_quality.coverage, 0);
  assertEquals(s.wearables.avg_sleep_minutes, null);
  assertEquals(s.monitoring_plan.map((p) => p.label), ["Hot flushes", "Sleep trouble"]);
});

Deno.test("per-symptom counts, means, max and last logged", () => {
  const s = buildStats(base({ checkins: [ci(1, [["sleep", 4]]), ci(2, [["sleep", 2]]), ci(3, [["sleep", 1]])] }), "t");
  const sleep = s.symptoms[0];
  assertEquals(sleep.label, "Sleep trouble");
  assertEquals(
    [sleep.days_logged, sleep.days_present, sleep.mean_severity, sleep.max_severity, sleep.last_logged],
    [3, 2, 2.3, 4, day(1)],
  );
  assertEquals(s.data_quality.checkin_days, 3);
  assertEquals(s.data_quality.coverage, 0.1);
});

Deno.test("trend compares the two halves, and needs 3 days in each", () => {
  const worse = [...[28, 26, 24].map((n) => ci(n, [["hot_flushes", 2]])), ...[3, 2, 1].map((n) => ci(n, [["hot_flushes", 4]]))];
  const w = buildStats(base({ checkins: worse }), "t").symptoms[0];
  assertEquals([w.first_half_mean, w.second_half_mean, w.trend], [2, 4, "worse"]);

  const better = [...[28, 26, 24].map((n) => ci(n, [["hot_flushes", 4]])), ...[3, 2, 1].map((n) => ci(n, [["hot_flushes", 3]]))];
  assertEquals(buildStats(base({ checkins: better }), "t").symptoms[0].trend, "better");

  const stable = [...[28, 26, 24].map((n) => ci(n, [["hot_flushes", 3]])), ...[3, 2, 1].map((n) => ci(n, [["hot_flushes", 3]]))];
  assertEquals(buildStats(base({ checkins: stable }), "t").symptoms[0].trend, "stable");

  const thin = [ci(28, [["hot_flushes", 1]]), ci(1, [["hot_flushes", 5]])];
  assertEquals(buildStats(base({ checkins: thin }), "t").symptoms[0].trend, "insufficient_data");
});

Deno.test("change versus the previous 30 days needs 3 prior days", () => {
  const prior = [35, 40, 45].map((n) => ci(n, [["sleep", 2]]));
  const now = [1, 2, 3].map((n) => ci(n, [["sleep", 4]]));
  const s = buildStats(base({ checkins: [...prior, ...now] }), "t").symptoms[0];
  assertEquals([s.prior_period_mean, s.change_vs_prior], [2, 2]);
  assertEquals(buildStats(base({ checkins: [prior[0], ...now] }), "t").symptoms[0].change_vs_prior, null);
});

Deno.test("chat observations count, merge per day and are listed as highlights", () => {
  const s = buildStats(
    base({
      checkins: [ci(2, [["hot_flushes", 2]])],
      observations: [
        { observed_on: day(2), symptom_code: "hot_flushes", custom_label: null, severity: 4, excerpt: "woke up drenched" },
        { observed_on: day(1), symptom_code: null, custom_label: "Scalp tingling", severity: 3, excerpt: null },
      ],
    }),
    "t",
  );
  const flush = s.symptoms.find((x) => x.code === "hot_flushes")!;
  assertEquals([flush.max_severity, flush.days_logged, flush.sources], [4, 1, ["chat", "checkin"]]);
  assertEquals(s.symptoms.find((x) => x.label === "Scalp tingling")?.code, null);
  assertEquals(s.chat_highlights[0], { date: day(2), symptom: "Hot flushes", severity: 4, excerpt: "woke up drenched" });
  assertEquals(s.data_quality.chat_observations, 2);
});

Deno.test("bleeding days, daily timeline and notes", () => {
  const s = buildStats(
    base({ checkins: [ci(5, [["bleeding", 3], ["sleep", 1]], "Heavy bleeding today"), ci(4, [["bleeding", 1]]), ci(3, [])] }),
    "t",
  );
  assertEquals(s.bleeding, { days: 1, dates: [day(5)] });
  assertEquals(s.daily.map((d) => [d.day, d.status]), [[day(5), "okay"], [day(4), "good"], [day(3), "none"]]);
  assertEquals(s.notes, [{ day: day(5), text: "Heavy bleeding today" }]);
});

Deno.test("wearable averages ignore missing values", () => {
  const night = (n: number, sleep: number | null, hr: number | null) => ({
    night_of: day(n), provider: "apple_health", sleep_minutes: sleep, awakenings: 2, resting_hr: hr, skin_temp_delta_c: 0.4, warm_at: null,
  });
  const s = buildStats(base({ nights: [night(1, 360, 60), night(2, 420, null), night(40, 100, 99)] }), "t");
  assertEquals(s.wearables.nights, 2);
  assertEquals([s.wearables.avg_sleep_minutes, s.wearables.avg_resting_hr, s.wearables.avg_awakenings], [390, 60, 2]);
  assertEquals(s.wearables.series.length, 2);
});

Deno.test("data outside the period and the prior window is ignored", () => {
  const s = buildStats(base({ checkins: [ci(100, [["sleep", 5]]), ci(-2, [["sleep", 5]])] }), "t");
  assertEquals(s.symptoms, []);
  assertEquals(s.data_quality.checkin_days, 0);
});
