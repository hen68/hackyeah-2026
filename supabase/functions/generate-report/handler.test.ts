import { assertEquals } from "@std/assert";

import type { ReportInputs } from "./build-report.ts";
import { type AppointmentRow, handleGenerateReport, localDate, type ReportStore } from "./handler.ts";
import type { NarrateFn } from "./narrative.ts";

const ID = "6f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const NOW = new Date("2026-10-10T09:00:00Z");
const appt = (over: Partial<AppointmentRow> = {}): AppointmentRow => ({
  id: ID, patient_id: "p1", scheduled_at: "2026-10-10T20:00:00Z", status: "scheduled", clinician_id: null, doctor_name: "Dr. Nowak", ...over,
});

function fakeStore(over: { appointment?: AppointmentRow | null; reportStatus?: string | null; loadFails?: boolean } = {}) {
  const calls = { saved: [] as unknown[], failed: [] as string[], tz: [] as string[] };
  const store: ReportStore = {
    verifySecret: (s) => Promise.resolve(s === "good-secret"),
    getAppointment: () => Promise.resolve("appointment" in over ? over.appointment! : appt()),
    getReportStatus: () => Promise.resolve(over.reportStatus ?? "pending"),
    loadInputs(a, localToday): Promise<ReportInputs> {
      if (over.loadFails) return Promise.reject(new Error("db down"));
      calls.tz.push(localToday("Pacific/Kiritimati"));
      return Promise.resolve({
        periodEnd: "2026-10-10",
        appointment: { id: a.id, scheduled_at: a.scheduled_at, clinician_id: null, doctor_name: a.doctor_name },
        profile: { display_name: null, age_band: "50_54", menopause_stage: "perimenopause", last_period: "3_12m", hrt_status: "no", timezone: "UTC", locale: "pl" },
        planCodes: [],
        catalog: [{ code: "sleep", label: "Sleep trouble" }],
        checkins: [{ day: "2026-10-09", note: null, entries: [{ symptom_code: "sleep", custom_label: null, severity: 4 }] }],
        observations: [],
        nights: [],
        providers: [],
      });
    },
    saveReady(row) {
      calls.saved.push(row);
      return Promise.resolve("report-1");
    },
    markFailed(_id, code) {
      calls.failed.push(code);
      return Promise.resolve();
    },
  };
  return { store, calls };
}

const narrate: NarrateFn = () => Promise.resolve({ summary: "Sleep trouble reported on 1 day.", topics: [{ title: "Sleep", detail: "Severity 4." }] });
const deps = (store: ReportStore, n: NarrateFn | null = narrate) => ({ store, narrate: n, model: "test-model", now: () => NOW });

Deno.test("rejects a missing or wrong job secret before doing anything", async () => {
  const { store, calls } = fakeStore();
  assertEquals((await handleGenerateReport(null, { appointment_id: ID }, deps(store))).status, 401);
  assertEquals((await handleGenerateReport("wrong", { appointment_id: ID }, deps(store))).status, 401);
  assertEquals(calls.saved.length, 0);
});

Deno.test("400 for a bad id, 404 for an unknown appointment", async () => {
  const { store } = fakeStore();
  assertEquals((await handleGenerateReport("good-secret", { appointment_id: "x" }, deps(store))).status, 400);
  assertEquals((await handleGenerateReport("good-secret", null, deps(store))).status, 400);
  const none = fakeStore({ appointment: null });
  assertEquals((await handleGenerateReport("good-secret", { appointment_id: ID }, deps(none.store))).status, 404);
});

Deno.test("cancelled, completed and past appointments are skipped", async () => {
  for (const a of [appt({ status: "cancelled" }), appt({ status: "completed" }), appt({ scheduled_at: "2026-10-10T08:00:00Z" })]) {
    const { store, calls } = fakeStore({ appointment: a });
    const result = await handleGenerateReport("good-secret", { appointment_id: ID }, deps(store));
    assertEquals([result.status, result.body.skipped], [200, "not_upcoming"]);
    assertEquals(calls.saved.length, 0);
  }
});

Deno.test("an already-ready report is not rebuilt", async () => {
  const { store, calls } = fakeStore({ reportStatus: "ready" });
  const result = await handleGenerateReport("good-secret", { appointment_id: ID }, deps(store));
  assertEquals(result.body.skipped, "already_ready");
  assertEquals(calls.saved.length, 0);
});

Deno.test("happy path saves one ready report with the model's narrative", async () => {
  const { store, calls } = fakeStore();
  const result = await handleGenerateReport("good-secret", { appointment_id: ID }, deps(store));
  assertEquals([result.status, result.body.report_id, result.body.narrative_source], [200, "report-1", "llm"]);
  const saved = calls.saved[0] as { period_start: string; period_end: string; model: string; data: { narrative: { language: string }; symptoms: { label: string }[]; version: number } };
  assertEquals([saved.period_start, saved.period_end, saved.model], ["2026-09-11", "2026-10-10", "test-model"]);
  assertEquals(saved.data.symptoms[0].label, "Sleep trouble");
  assertEquals(saved.data.narrative.language, "pl");
  assertEquals(saved.data.version, 1);
});

Deno.test("a model failure still produces a ready report with the template summary", async () => {
  const { store, calls } = fakeStore();
  const boom: NarrateFn = () => Promise.reject(new Error("rate limited"));
  const result = await handleGenerateReport("good-secret", { appointment_id: ID }, deps(store, boom));
  assertEquals([result.status, result.body.narrative_source], [200, "fallback"]);
  assertEquals(calls.saved.length, 1);
  assertEquals((await handleGenerateReport("good-secret", { appointment_id: ID }, deps(fakeStore().store, null))).body.narrative_source, "fallback");
});

Deno.test("a data failure marks the report failed so the job can retry, with a generic 500", async () => {
  const { store, calls } = fakeStore({ loadFails: true });
  const result = await handleGenerateReport("good-secret", { appointment_id: ID }, deps(store));
  assertEquals(result.status, 500);
  assertEquals(String(result.body.error).includes("db down"), false);
  assertEquals(calls.failed, ["generation_error"]);
  assertEquals(calls.saved.length, 0);
});

Deno.test("local date follows the patient's timezone, with a UTC fallback", () => {
  const late = new Date("2026-10-10T23:30:00Z");
  assertEquals(localDate(late, "UTC"), "2026-10-10");
  assertEquals(localDate(late, "Europe/Warsaw"), "2026-10-11");
  assertEquals(localDate(late, "Not/AZone"), "2026-10-10");
});
