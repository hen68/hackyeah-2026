import { assert, assertEquals } from "@std/assert";

import { type ChatStore, LIMITS } from "./handler.ts";
import type { LlmStream } from "./llm.ts";
import { SAFE_FALLBACK } from "./guardrails.ts";
import { type ChatEvent, encodeSse, handleChatStream } from "./stream.ts";
import { fakeStore, NOW, USER, valid } from "./test-helpers.ts";

const streamed = { ...valid, stream: true };

// Splits the tool arguments into small chunks, the way the provider streams them.
function llmStreaming(toolInput: unknown, chunkSize = 7, text = ""): LlmStream {
  const json = toolInput === undefined ? "" : JSON.stringify(toolInput);
  return async function* () {
    for (let i = 0; i < json.length; i += chunkSize) yield { args: json.slice(i, i + chunkSize), text: "" };
    if (text) yield { args: "", text };
  };
}

const failingAfter = (args: string): LlmStream =>
  async function* () {
    yield { args, text: "" };
    throw new Error("provider key sk-secret dropped");
  };

const deps = (store: ChatStore, llmStream: LlmStream) => ({ store, llmStream, now: () => NOW });

async function collect(store: ChatStore, llm: LlmStream, body: unknown = streamed): Promise<ChatEvent[]> {
  const result = await handleChatStream(USER, body, deps(store, llm));
  assert(result.kind === "stream");
  const events: ChatEvent[] = [];
  for await (const event of result.events) events.push(event);
  return events;
}

const deltas = (events: ChatEvent[]) => events.flatMap((e) => (e.event === "delta" ? [e.data.text] : [])).join("");

Deno.test("failures before streaming stay JSON with their HTTP status", async () => {
  const { store, calls } = fakeStore({ recent: LIMITS.perWindow });
  const llm = llmStreaming({ reply: "x" });
  const noUser = await handleChatStream(null, streamed, deps(store, llm));
  assertEquals(noUser.kind === "json" && noUser.result.status, 401);
  const bad = await handleChatStream(USER, { ...streamed, message: " " }, deps(store, llm));
  assertEquals(bad.kind === "json" && bad.result.status, 400);
  const limited = await handleChatStream(USER, streamed, deps(store, llm));
  assertEquals(limited.kind === "json" && limited.result.status, 429);
  assertEquals(calls.inserted.length, 0);
});

Deno.test("streams the reply word by word, then a done event matching what was saved", async () => {
  const { store, calls } = fakeStore();
  const tool = {
    reply: 'That sounds exhausting.\nI\'ve added "Night sweats" to today.',
    clarifying_question: "How long has this been going on?",
    observations: [{
      symptom_code: "night_sweats",
      custom_label: null,
      severity: 4,
      duration_days: null,
      observed_on: null,
    }],
  };
  const events = await collect(store, llmStreaming(tool, 3));

  assert(events.filter((e) => e.event === "delta").length > 3);
  assert(tool.reply.startsWith(deltas(events)));
  assert(deltas(events).length > tool.reply.length - 10);

  const done = events[events.length - 1];
  assert(done.event === "done");
  assertEquals(done.data.reply, `${tool.reply} ${tool.clarifying_question}`);
  assertEquals(done.data.message_id, "m-assistant");
  assertEquals(done.data.user_message_id, "m-user");
  assertEquals(done.data.observations[0].symptom_code, "night_sweats");
  assertEquals(done.data.replace, undefined);
  assertEquals((calls.saved[0] as { content: string }).content, done.data.reply);
  assertEquals(calls.guardrails.length, 0);
});

Deno.test("a tripped guardrail stops the stream and replaces the reply", async () => {
  const { store, calls } = fakeStore();
  const tool = {
    reply: "I hear you. You should double your HRT dose today.",
    clarifying_question: null,
    observations: [],
  };
  const events = await collect(store, llmStreaming(tool, 4), { ...streamed, message: "Should I double my HRT dose?" });

  assertEquals(deltas(events).includes("double"), false);
  const done = events[events.length - 1];
  assert(done.event === "done");
  assertEquals(done.data.reply, SAFE_FALLBACK);
  assertEquals(done.data.replace, true);
  assertEquals(calls.guardrails, ["directive"]);
  assertEquals((calls.saved[0] as { content: string }).content, SAFE_FALLBACK);
});

Deno.test("a mid-stream provider failure ends with a 502 error event and saves no reply", async () => {
  const { store, calls } = fakeStore();
  const events = await collect(store, failingAfter('{"reply":"Half an ans'));
  const last = events[events.length - 1];
  assertEquals(last, {
    event: "error",
    data: { error: "Digna could not answer just now. Please try again.", status: 502 },
  });
  assertEquals(JSON.stringify(events).includes("sk-secret"), false);
  assertEquals(calls.saved.length, 0);
});

Deno.test("plain-text output is kept and empty output is a 502", async () => {
  const text = await collect(fakeStore().store, llmStreaming(undefined, 7, "I'm here with you."));
  const done = text[text.length - 1];
  assertEquals(done.event === "done" && done.data.reply, "I'm here with you.");

  const empty = await collect(fakeStore().store, llmStreaming(undefined));
  assertEquals(empty, [{
    event: "error",
    data: { error: "Digna could not answer just now. Please try again.", status: 502 },
  }]);
});

Deno.test("a failed save ends with a 500 error event", async () => {
  const { store } = fakeStore();
  const broken: ChatStore = { ...store, saveAssistantTurn: () => Promise.reject(new Error("db down")) };
  const events = await collect(broken, llmStreaming({ reply: "Noted.", clarifying_question: null, observations: [] }));
  const last = events[events.length - 1];
  assertEquals(last.event === "error" && last.data, {
    error: "Something went wrong. Please try again.",
    status: 500,
  });
});

Deno.test("SSE frames carry the event name and one-line JSON data", () => {
  assertEquals(encodeSse({ event: "delta", data: { text: "a\nb" } }), 'event: delta\ndata: {"text":"a\\nb"}\n\n');
});
