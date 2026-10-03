import { createClient } from "@supabase/supabase-js";

import { createExtractMentions, DEFAULT_MODEL } from "./extract-interview.ts";
import { handleContextCheck } from "./handler.ts";
import { createStore } from "./store.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return respond(405, { error: "Method not allowed." });

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!openaiKey || !url || !anonKey || !serviceKey) return respond(500, { error: "Analysis is unavailable right now." });

  const user = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false },
  });
  const { data } = await user.auth.getUser();
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    // handled as a validation error below
  }

  try {
    const result = await handleContextCheck(data.user?.id ?? null, body, {
      store: createStore(user, admin),
      extract: createExtractMentions(openaiKey, Deno.env.get("OPENAI_MODEL") ?? DEFAULT_MODEL),
    });
    return respond(result.status, result.body);
  } catch {
    return respond(500, { error: "Something went wrong. Please try again." });
  }
});
