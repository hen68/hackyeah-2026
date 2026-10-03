import { createClient } from "@supabase/supabase-js";

import { handleChat } from "./handler.ts";
import { createLlmStream, createLlmTurn, DEFAULT_MODEL } from "./llm.ts";
import { type ChatEvent, encodeSse, errorEvent, handleChatStream } from "./stream.ts";
import { createStore } from "./store.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const GENERIC_ERROR = "Something went wrong. Please try again.";

const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Keeps reading events after the client disconnects, so the assistant turn is still saved.
function respondSse(events: AsyncIterable<ChatEvent>): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let isOpen = true;
      const send = (event: ChatEvent) => {
        if (!isOpen) return;
        try {
          controller.enqueue(encoder.encode(encodeSse(event)));
        } catch {
          isOpen = false;
        }
      };
      try {
        for await (const event of events) send(event);
      } catch {
        send(errorEvent(500, GENERIC_ERROR));
      }
      if (isOpen) controller.close();
    },
  });
  return new Response(body, {
    headers: { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}

const wantsStream = (req: Request, body: unknown) =>
  (typeof body === "object" && body !== null && (body as { stream?: unknown }).stream === true) ||
  (req.headers.get("Accept") ?? "").includes("text/event-stream");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return respond(405, { error: "Method not allowed." });

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!openaiKey || !url || !anonKey || !serviceKey) return respond(500, { error: "Chat is unavailable right now." });

  const authHeader = req.headers.get("Authorization") ?? "";
  const user = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
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

  const userId = data.user?.id ?? null;
  const model = Deno.env.get("OPENAI_MODEL") ?? DEFAULT_MODEL;
  const base = { store: createStore(user, admin), now: () => new Date() };
  try {
    if (wantsStream(req, body)) {
      const streamed = await handleChatStream(userId, body, { ...base, llmStream: createLlmStream(openaiKey, model) });
      return streamed.kind === "json"
        ? respond(streamed.result.status, streamed.result.body)
        : respondSse(streamed.events);
    }
    const result = await handleChat(userId, body, { ...base, llm: createLlmTurn(openaiKey, model) });
    return respond(result.status, result.body);
  } catch {
    return respond(500, { error: GENERIC_ERROR });
  }
});
