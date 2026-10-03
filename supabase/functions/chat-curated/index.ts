import { createClient } from "@supabase/supabase-js";

import { handleCurated } from "./handler.ts";
import { createJevMatcher } from "./jev.ts";
import { createStore } from "./store.ts";

// Alternative to `chat`: same request and response shape, but the reply is picked from a curated
// list by TypeSafe's Jev model instead of being written by a generative model.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Matches the SSE contract of `chat` (delta, then done) so the same client code can read both.
function respondSse(body: Record<string, unknown>): Response {
  const frame = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const text = frame("delta", { text: body.reply }) + frame("done", body);
  return new Response(text, { headers: { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}

const wantsStream = (req: Request, body: unknown) =>
  (typeof body === "object" && body !== null && (body as { stream?: unknown }).stream === true) ||
  (req.headers.get("Accept") ?? "").includes("text/event-stream");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return respond(405, { error: "Method not allowed." });

  const apiKey = Deno.env.get("TYPESAFE_API_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!apiKey || !url || !anonKey || !serviceKey) return respond(500, { error: "Chat is unavailable right now." });

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
    const result = await handleCurated(data.user?.id ?? null, body, {
      store: createStore(user, admin),
      match: createJevMatcher(apiKey),
      now: () => new Date(),
    });
    if (result.status === 200) {
      console.info(JSON.stringify({ event: "curated_reply", answer_id: result.body.answer_id, confidence: result.body.confidence }));
    }
    return result.status === 200 && wantsStream(req, body) ? respondSse(result.body) : respond(result.status, result.body);
  } catch {
    return respond(500, { error: "Something went wrong. Please try again." });
  }
});
