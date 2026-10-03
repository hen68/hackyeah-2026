import { createClient } from "@supabase/supabase-js";

import { handleGenerateReport } from "./handler.ts";
import { createNarrateFn, DEFAULT_MODEL } from "./narrative.ts";
import { createStore } from "./store.ts";

// Called by the database job (pg_cron + pg_net), not by the app. There is no user JWT: the job
// proves itself with a shared secret that only the database and this function can check.
const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return respond(405, { error: "Method not allowed." });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return respond(500, { error: "Report generation is unavailable right now." });

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    // handled as a validation error below
  }

  // Without an OpenAI key the report is still produced, with the template summary.
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("OPENAI_MODEL") ?? DEFAULT_MODEL;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  try {
    const result = await handleGenerateReport(req.headers.get("x-job-secret"), body, {
      store: createStore(admin),
      narrate: openaiKey ? createNarrateFn(openaiKey, model) : null,
      model,
      now: () => new Date(),
    });
    return respond(result.status, result.body);
  } catch {
    return respond(500, { error: "Something went wrong." });
  }
});
