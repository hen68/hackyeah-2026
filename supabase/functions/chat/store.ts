import type { SupabaseClient } from "@supabase/supabase-js";

import type { ChatContext, ChatStore } from "./handler.ts";

// `user` carries the caller's JWT so RLS applies. `admin` is the service role and is used only
// for the rows patients may not write: assistant messages, observations and guardrail events.
export function createStore(user: SupabaseClient, admin: SupabaseClient): ChatStore {
  const check = <T extends { error: { message: string } | null }>(result: T): T => {
    if (result.error) throw new Error(result.error.message);
    return result;
  };

  return {
    async countUserMessagesSince(patientId, sinceIso) {
      const { count } = check(
        await user
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("patient_id", patientId)
          .eq("role", "user")
          .gte("created_at", sinceIso),
      );
      return count ?? 0;
    },

    async insertUserMessage(row) {
      const { data } = check(
        await user.from("chat_messages").insert({ ...row, role: "user" }).select("id").single(),
      );
      return { id: data!.id as string };
    },

    async loadContext(patientId, localDate): Promise<ChatContext> {
      const [catalog, plan, checkin, history] = await Promise.all([
        user.from("symptom_catalog").select("code,label").order("sort"),
        user.from("monitoring_plans").select("symptom_codes").eq("patient_id", patientId).maybeSingle(),
        user
          .from("checkins")
          .select("checkin_entries(symptom_code,custom_label,severity)")
          .eq("patient_id", patientId)
          .eq("day", localDate)
          .maybeSingle(),
        user
          .from("chat_messages")
          .select("role,content,created_at")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      check(catalog);
      check(plan);
      check(checkin);
      check(history);
      return {
        catalog: (catalog.data ?? []) as ChatContext["catalog"],
        planCodes: (plan.data?.symptom_codes as string[] | undefined) ?? [],
        today: ((checkin.data as { checkin_entries?: ChatContext["today"] } | null)?.checkin_entries) ?? [],
        history: ((history.data ?? []) as ChatContext["history"]).slice().reverse(),
      };
    },

    async saveAssistantTurn({ patient_id, content, local_date, source_message_id, observations }) {
      const { data } = check(
        await admin
          .from("chat_messages")
          .insert({
            patient_id,
            role: "assistant",
            content: content.slice(0, 4000),
            input_mode: "text",
            local_date,
          })
          .select("id")
          .single(),
      );
      if (observations.length > 0) {
        check(
          await admin.from("observations").insert(
            observations.map((o) => ({ ...o, patient_id, source: "chat", source_message_id })),
          ),
        );
      }
      return { messageId: data!.id as string };
    },

    async recordGuardrail(patientId, rule) {
      // Only the rule name is stored, never the message.
      check(await admin.from("guardrail_events").insert({ patient_id: patientId, rule }));
    },
  };
}
