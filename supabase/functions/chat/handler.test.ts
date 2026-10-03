import { assertEquals, assertStringIncludes } from "@std/assert";

import { type ChatContext, type ChatStore, handleChat, LIMITS, normalizeTurns } from "./handler.ts";
import type { LlmTurn } from "./llm.ts";
import { SAFE_FALLBACK } from "./guardrails.ts";

const NOW = new Date("2026-10-03T12:00:00Z");
const USER = "user-1";
const valid = { message: "I woke up drenched in sweat", input_mode: "text", local_date: "2026-10-03" };

const catalog = [
  { code: "night_sweats", label: "Night sweats" },
  { code: "sleep", label: "Sleep trouble" },
];

function fakeStore(over: Partial<{ recent: number; today: number; history: ChatContext["history"] }> = {}) {
  const calls = { inserted: [] as unknown[], saved: [] as unknown[], guardrails: [] as string[] };
  let countCall = 0;
  const store: ChatStore = {
    countUserMessagesSince() {
      return Promise.resolve(countCall++ === 0 ? over.recent ?? 0 : over.today ?? 0);
    },
    insertUserMessage(row) {
      calls.inserted.push(row);
      return Promise.resolve({ id: "m-user" });
    },
    loadContext() {
      return Promise.resolve({
        catalog,
        planCodes: ["night_sweats"],
        today: [],
        history: over.history ?? [{ role: "user", content: valid.message }],
      });
    },
    saveAssistantTurn(row) {
      calls.saved.push(row);
      return Promise.resolve({ messageId: "m-assistant" });
    },
    recordGuardrail(_patient, rule) {
      calls.guardrails.push(rule);
      return Promise.resolve();
    },
  };
  return { store, calls };
}

const llmReturning = (toolInput: unknown, text = ""): LlmTurn => () => Promise.resolve({ toolInput, text });
const deps = (store: ChatStore, llm: LlmTurn) => ({ store, llm, now: () => NOW });

Deno.test("requires a signed-in user", async () => {
  const { store } = fakeStore();
  assertEquals((await handleChat(null, valid, deps(store, llmReturning(null)))).status, 401);
});

Deno.test("rejects bad requests before touching the database", async () => {
  const { store, calls } = fakeStore();
  for (
    const body of [
      null,
      {},
      { ...valid, message: "   " },
      { ...valid, message: "x".repeat(2001) },
      { ...valid, input_mode: "video" },
      { ...valid, local_date: "03-10-2026" },
      { ...valid, local_date: "2026-02-31" },
      { ...valid, local_date: "2026-11-30" },
    ]
  ) {
    assertEquals((await handleChat(USER, body, deps(store, llmReturning(null)))).status, 400);
  }
  assertEquals(calls.inserted.length, 0);
});

Deno.test("rate limits: 10-minute window and daily cap", async () => {
  const burst = fakeStore({ recent: LIMITS.perWindow });
  assertEquals((await handleChat(USER, valid, deps(burst.store, llmReturning(null)))).status, 429);
  assertEquals(burst.calls.inserted.length, 0);

  const day = fakeStore({ recent: 1, today: LIMITS.perDay });
  assertEquals((await handleChat(USER, valid, deps(day.store, llmReturning(null)))).status, 429);

  const ok = fakeStore({ recent: LIMITS.perWindow - 1, today: LIMITS.perDay - 1 });
  const reply = { reply: "Noted.", observations: [] };
  assertEquals((await handleChat(USER, valid, deps(ok.store, llmReturning(reply)))).status, 200);
});

Deno.test("happy path stores the turn, links observations and returns the reply", async () => {
  const { store, calls } = fakeStore();
  const tool = {
    reply: "That sounds exhausting. I've added this to today: Night sweats.",
    clarifying_question: "How long has this been going on?",
    observations: [{
      symptom_code: "night_sweats",
      custom_label: null,
      severity: 4,
      duration_days: null,
      observed_on: null,
    }],
  };
  const result = await handleChat(USER, valid, deps(store, llmReturning(tool)));
  assertEquals(result.status, 200);
  assertEquals(result.body.message_id, "m-assistant");
  assertEquals(result.body.user_message_id, "m-user");
  assertStringIncludes(String(result.body.reply), "How long has this been going on?");
  const saved = calls.saved[0] as { source_message_id: string; observations: { symptom_code: string; observed_on: string }[] };
  assertEquals(saved.source_message_id, "m-user");
  assertEquals(saved.observations[0].symptom_code, "night_sweats");
  assertEquals(saved.observations[0].observed_on, "2026-10-03");
  assertEquals(calls.guardrails.length, 0);
});

Deno.test("a medication question gets the safe fallback and a rule-only guardrail event", async () => {
  const { store, calls } = fakeStore();
  const tool = { reply: "You should double your HRT dose.", clarifying_question: null, observations: [] };
  const result = await handleChat(
    USER,
    { ...valid, message: "Should I double my HRT dose?" },
    deps(store, llmReturning(tool)),
  );
  assertEquals(result.status, 200);
  assertEquals(result.body.reply, SAFE_FALLBACK);
  assertEquals(calls.guardrails, ["directive"]);
  assertEquals((calls.saved[0] as { content: string }).content, SAFE_FALLBACK);
});

Deno.test("plain-text model output is kept, with no observations", async () => {
  const { store, calls } = fakeStore();
  const result = await handleChat(USER, valid, deps(store, llmReturning(null, "I'm here with you.")));
  assertEquals(result.status, 200);
  assertEquals(result.body.reply, "I'm here with you.");
  assertEquals((calls.saved[0] as { observations: unknown[] }).observations, []);
});

Deno.test("model failure or empty output returns a generic 502", async () => {
  const { store } = fakeStore();
  const boom: LlmTurn = () => Promise.reject(new Error("provider key sk-secret rejected"));
  const failed = await handleChat(USER, valid, deps(store, boom));
  assertEquals(failed.status, 502);
  assertEquals(String(failed.body.error).includes("sk-secret"), false);
  assertEquals((await handleChat(USER, valid, deps(store, llmReturning(null, "")))).status, 502);
});

Deno.test("history is normalised to alternating turns starting with the user", () => {
  assertEquals(
    normalizeTurns([
      { role: "assistant", content: "stale" },
      { role: "user", content: "a" },
      { role: "user", content: "b" },
      { role: "assistant", content: "c" },
    ]),
    [{ role: "user", content: "a\nb" }, { role: "assistant", content: "c" }],
  );
});
