import type { SupabaseClient } from "@supabase/supabase-js";

import type { CuratedStore } from "./handler.ts";

// `user` carries the caller's JWT so RLS applies. `admin` only writes the assistant message,
// which patients may not insert themselves.
export function createStore(user: SupabaseClient, admin: SupabaseClient): CuratedStore {
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
      const { data } = check(await user.from("chat_messages").insert({ ...row, role: "user" }).select("id").single());
      return { id: data!.id as string };
    },

    async getLocale(patientId) {
      const { data } = check(await user.from("profiles").select("locale").eq("id", patientId).maybeSingle());
      return (data as { locale: string } | null)?.locale ?? null;
    },

    async saveAssistantMessage({ patient_id, content, local_date }) {
      const { data } = check(
        await admin
          .from("chat_messages")
          .insert({ patient_id, role: "assistant", content: content.slice(0, 4000), input_mode: "text", local_date })
          .select("id")
          .single(),
      );
      return { messageId: data!.id as string };
    },
  };
}
