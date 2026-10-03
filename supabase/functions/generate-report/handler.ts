import { z } from "zod";

import { buildStats, type ReportInputs, type ReportStats } from "./build-report.ts";
import { languageFor, type Narrative, type NarrateFn, writeNarrative } from "./narrative.ts";

export const RequestSchema = z.object({ appointment_id: z.string().uuid() });

export type AppointmentRow = {
  id: string;
  patient_id: string;
  scheduled_at: string;
  status: string;
  clinician_id: string | null;
  doctor_name: string | null;
};

export type ReportData = ReportStats & { narrative: Narrative };

// Everything runs with the service role: the caller is the database job, not a user.
export interface ReportStore {
  verifySecret(secret: string): Promise<boolean>;
  getAppointment(id: string): Promise<AppointmentRow | null>;
  getReportStatus(appointmentId: string): Promise<string | null>;
  loadInputs(appointment: AppointmentRow, localToday: (timezone: string) => string): Promise<ReportInputs>;
  saveReady(row: {
    appointment_id: string;
    patient_id: string;
    period_start: string;
    period_end: string;
    model: string;
    narrative_source: "llm" | "fallback";
    data: ReportData;
  }): Promise<string>;
  markFailed(appointmentId: string, errorCode: string): Promise<void>;
}

export type ReportDeps = { store: ReportStore; narrate: NarrateFn | null; model: string; now: () => Date };
export type ReportResult = { status: number; body: Record<string, unknown> };

const fail = (status: number, error: string): ReportResult => ({ status, body: { error } });

// The patient's calendar date. Falls back to UTC for an unknown timezone.
export function localDate(now: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export async function handleGenerateReport(secret: string | null, rawBody: unknown, deps: ReportDeps): Promise<ReportResult> {
  const { store } = deps;
  if (!secret || !(await store.verifySecret(secret))) return fail(401, "Not allowed.");

  const parsed = RequestSchema.safeParse(rawBody);
  if (!parsed.success) return fail(400, "appointment_id must be a valid id.");
  const id = parsed.data.appointment_id;

  const appointment = await store.getAppointment(id);
  if (!appointment) return fail(404, "Appointment not found.");
  const now = deps.now();
  if (appointment.status !== "scheduled" || Date.parse(appointment.scheduled_at) <= now.getTime()) {
    return { status: 200, body: { skipped: "not_upcoming" } };
  }
  if ((await store.getReportStatus(id)) === "ready") return { status: 200, body: { skipped: "already_ready" } };

  try {
    const inputs = await store.loadInputs(appointment, (tz) => localDate(now, tz));
    const stats = buildStats(inputs, now.toISOString());
    const narrative = await writeNarrative(stats, languageFor(inputs.profile.locale), deps.narrate);
    const reportId = await store.saveReady({
      appointment_id: id,
      patient_id: appointment.patient_id,
      period_start: stats.period.start,
      period_end: stats.period.end,
      model: deps.model,
      narrative_source: narrative.source,
      data: { ...stats, narrative },
    });
    return { status: 200, body: { report_id: reportId, status: "ready", narrative_source: narrative.source } };
  } catch {
    await store.markFailed(id, "generation_error").catch(() => undefined);
    return fail(500, "The report could not be generated.");
  }
}
