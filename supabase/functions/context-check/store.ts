import type { SupabaseClient } from "@supabase/supabase-js";

import type { ContextStore, Interview, SavedCheck } from "./handler.ts";
import type { ChatObservation, CheckinDay } from "./rules.ts";

const EXCERPT_CHARS = 200;

export function createStore(user: SupabaseClient, admin: SupabaseClient): ContextStore {
  const check = <T extends { error: { message: string } | null }>(result: T): T => {
    if (result.error) throw new Error(result.error.message);
    return result;
  };

  const shape = (check_: Record<string, unknown>, insights: unknown[]): SavedCheck => ({
    context_check: {
      id: check_.id as string,
      period_start: check_.period_start as string,
      period_end: check_.period_end as string,
      created_at: check_.created_at as string,
    },
    insights,
  });

  return {
    async getInterview(id): Promise<Interview | null> {
      const { data } = check(
        await user.from("interviews").select("id,patient_id,visit_at,content,extracted").eq("id", id).maybeSingle(),
      );
      return (data as Interview | null) ?? null;
    },

    async getPreviousVisitDate(patientId, visitAt) {
      const { data } = check(
        await user
          .from("interviews")
          .select("visit_at")
          .eq("patient_id", patientId)
          .lt("visit_at", visitAt)
          .order("visit_at", { ascending: false })
          .limit(1),
      );
      const found = (data as { visit_at: string }[] | null)?.[0];
      return found ? found.visit_at.slice(0, 10) : null;
    },

    async getExistingCheck(interviewId) {
      const { data } = check(
        await user
          .from("context_checks")
          .select("id,period_start,period_end,created_at,insights(*)")
          .eq("interview_id", interviewId)
          .order("created_at", { ascending: false })
          .limit(1),
      );
      const found = (data as (Record<string, unknown> & { insights: { rank: number }[] })[] | null)?.[0];
      if (!found) return null;
      return shape(found, [...found.insights].sort((a, b) => a.rank - b.rank));
    },

    async loadCatalog() {
      const { data } = check(await user.from("symptom_catalog").select("code,label").order("sort"));
      return (data ?? []) as { code: string; label: string }[];
    },

    async loadHistory(patientId, fromDay, toDay) {
      const [checkins, observations] = await Promise.all([
        user
          .from("checkins")
          .select("day,note,checkin_entries(symptom_code,custom_label,severity)")
          .eq("patient_id", patientId)
          .gte("day", fromDay)
          .lt("day", toDay),
        user
          .from("observations")
          .select("observed_on,symptom_code,custom_label,severity,source_message_id")
          .eq("patient_id", patientId)
          .gte("observed_on", fromDay)
          .lt("observed_on", toDay),
      ]);
      check(checkins);
      check(observations);

      const obs = (observations.data ?? []) as (Omit<ChatObservation, "excerpt"> & { source_message_id: string | null })[];
      const ids = [...new Set(obs.map((o) => o.source_message_id).filter((id): id is string => !!id))];
      const excerpts = new Map<string, string>();
      if (ids.length > 0) {
        const { data } = check(await user.from("chat_messages").select("id,content").in("id", ids));
        for (const m of (data ?? []) as { id: string; content: string }[]) excerpts.set(m.id, m.content.slice(0, EXCERPT_CHARS));
      }

      return {
        checkins: ((checkins.data ?? []) as (Omit<CheckinDay, "entries"> & { checkin_entries: CheckinDay["entries"] })[])
          .map(({ checkin_entries, ...rest }) => ({ ...rest, entries: checkin_entries })),
        observations: obs.map(({ source_message_id, ...o }) => ({
          ...o,
          excerpt: source_message_id ? excerpts.get(source_message_id) ?? null : null,
        })),
      };
    },

    async saveExtracted(interviewId, extracted) {
      check(await admin.from("interviews").update({ extracted }).eq("id", interviewId));
    },

    async replaceCheck({ patient_id, interview_id, period_start, period_end, insights }) {
      check(await admin.from("context_checks").delete().eq("interview_id", interview_id));
      const { data } = check(
        await admin
          .from("context_checks")
          .insert({ patient_id, interview_id, period_start, period_end })
          .select("id,period_start,period_end,created_at")
          .single(),
      );
      const created = data as Record<string, unknown>;
      let rows: unknown[] = [];
      if (insights.length > 0) {
        const inserted = check(
          await admin
            .from("insights")
            .insert(insights.map((i) => ({ ...i, context_check_id: created.id, patient_id })))
            .select("*"),
        );
        rows = (inserted.data ?? []) as unknown[];
        rows.sort((a, b) => (a as { rank: number }).rank - (b as { rank: number }).rank);
      }
      return shape(created, rows);
    },
  };
}
