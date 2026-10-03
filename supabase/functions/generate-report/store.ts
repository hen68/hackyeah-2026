import type { SupabaseClient } from "@supabase/supabase-js";

import type { CheckinDay, NightRow, ObservationRow, ReportInputs } from "./build-report.ts";
import type { AppointmentRow, ReportStore } from "./handler.ts";
import { PERIOD_DAYS } from "./build-report.ts";

const EXCERPT_CHARS = 300;
const DAY_MS = 24 * 60 * 60 * 1000;
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

export function createStore(admin: SupabaseClient): ReportStore {
  const check = <T extends { error: { message: string } | null }>(result: T): T => {
    if (result.error) throw new Error(result.error.message);
    return result;
  };

  return {
    async verifySecret(secret) {
      const { data, error } = await admin.rpc("verify_report_job_secret", { p_secret: secret });
      return !error && data === true;
    },

    async getAppointment(id) {
      const { data } = check(
        await admin.from("appointments").select("id,patient_id,scheduled_at,status,clinician_id,doctor_name").eq("id", id).maybeSingle(),
      );
      return (data as AppointmentRow | null) ?? null;
    },

    async getReportStatus(appointmentId) {
      const { data } = check(await admin.from("patient_reports").select("status").eq("appointment_id", appointmentId).maybeSingle());
      return (data as { status: string } | null)?.status ?? null;
    },

    async loadInputs(appointment, localToday): Promise<ReportInputs> {
      const patient = appointment.patient_id;
      const profileRes = check(
        await admin
          .from("profiles")
          .select("display_name,age_band,menopause_stage,last_period,hrt_status,timezone,locale")
          .eq("id", patient)
          .single(),
      );
      const profile = profileRes.data as ReportInputs["profile"];
      const periodEnd = localToday(profile.timezone);
      const periodStart = addDays(periodEnd, -(PERIOD_DAYS - 1));
      const from = addDays(periodStart, -PERIOD_DAYS);

      const [plan, catalog, checkins, observations, nights, connections] = await Promise.all([
        admin.from("monitoring_plans").select("symptom_codes").eq("patient_id", patient).maybeSingle(),
        admin.from("symptom_catalog").select("code,label").order("sort"),
        admin
          .from("checkins")
          .select("day,note,checkin_entries(symptom_code,custom_label,severity)")
          .eq("patient_id", patient)
          .gte("day", from)
          .lte("day", periodEnd),
        admin
          .from("observations")
          .select("observed_on,symptom_code,custom_label,severity,source_message_id")
          .eq("patient_id", patient)
          .gte("observed_on", from)
          .lte("observed_on", periodEnd),
        admin
          .from("wearable_nights")
          .select("night_of,provider,sleep_minutes,awakenings,resting_hr,skin_temp_delta_c,warm_at")
          .eq("patient_id", patient)
          .gte("night_of", periodStart)
          .lte("night_of", periodEnd),
        admin.from("wearable_connections").select("provider").eq("patient_id", patient),
      ]);
      check(plan);
      check(catalog);
      check(checkins);
      check(observations);
      check(nights);
      check(connections);

      const obs = (observations.data ?? []) as (Omit<ObservationRow, "excerpt"> & { source_message_id: string | null })[];
      const ids = [...new Set(obs.map((o) => o.source_message_id).filter((id): id is string => !!id))];
      const excerpts = new Map<string, string>();
      if (ids.length > 0) {
        const { data } = check(await admin.from("chat_messages").select("id,content").in("id", ids));
        for (const m of (data ?? []) as { id: string; content: string }[]) excerpts.set(m.id, m.content.slice(0, EXCERPT_CHARS));
      }

      return {
        periodEnd,
        appointment: {
          id: appointment.id,
          scheduled_at: appointment.scheduled_at,
          clinician_id: appointment.clinician_id,
          doctor_name: appointment.doctor_name,
        },
        profile,
        planCodes: ((plan.data as { symptom_codes: string[] } | null)?.symptom_codes) ?? [],
        catalog: (catalog.data ?? []) as { code: string; label: string }[],
        checkins: ((checkins.data ?? []) as (Omit<CheckinDay, "entries"> & { checkin_entries: CheckinDay["entries"] })[])
          .map(({ checkin_entries, ...rest }) => ({ ...rest, entries: checkin_entries })),
        observations: obs.map(({ source_message_id, ...o }) => ({
          ...o,
          excerpt: source_message_id ? excerpts.get(source_message_id) ?? null : null,
        })),
        nights: (nights.data ?? []) as NightRow[],
        providers: ((connections.data ?? []) as { provider: string }[]).map((c) => c.provider),
      };
    },

    async saveReady({ appointment_id, patient_id, period_start, period_end, model, narrative_source, data }) {
      const row = check(
        await admin
          .from("patient_reports")
          .upsert(
            {
              appointment_id,
              patient_id,
              status: "ready",
              period_start,
              period_end,
              generated_at: new Date().toISOString(),
              model,
              narrative_source,
              data,
              error_code: null,
            },
            { onConflict: "appointment_id" },
          )
          .select("id")
          .single(),
      );
      return (row.data as { id: string }).id;
    },

    async markFailed(appointmentId, errorCode) {
      check(
        await admin
          .from("patient_reports")
          .update({ status: "failed", error_code: errorCode })
          .eq("appointment_id", appointmentId),
      );
    },
  };
}
