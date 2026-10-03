import { assertEquals } from "@std/assert";

import { ANSWERS, FALLBACK } from "./answers.ts";
import { type CuratedStore, handleCurated, LIMITS } from "./handler.ts";
import type { Matcher } from "./jev.ts";

const NOW = new Date("2026-10-03T12:00:00Z");
const USER = "user-1";
const valid = { message: "What is perimenopause?", input_mode: "text", local_date: "2026-10-03" };

function fakeStore(over: { recent?: number; today?: number; locale?: string | null } = {}) {
  const calls = { inserted: [] as unknown[], saved: [] as { content: string }[] };
  let n = 0;
  const store: CuratedStore = {
    countUserMessagesSince: () => Promise.resolve(n++ === 0 ? over.recent ?? 0 : over.today ?? 0),
    insertUserMessage(row) {
      calls.inserted.push(row);
      return Promise.resolve({ id: "m-user" });
    },
    getLocale: () => Promise.resolve("locale" in over ? over.locale! : "en"),
    saveAssistantMessage(row) {
      calls.saved.push(row);
      return Promise.resolve({ messageId: "m-assistant" });
    },
  };
  return { store, calls };
}
const matching = (answerId: string | null, confidence = 0.9): Matcher => () =>
  Promise.resolve({ answerId, choice: answerId ?? "none", confidence });
const deps = (store: CuratedStore, match: Matcher) => ({ store, match, now: () => NOW });
const answer = (id: string) => ANSWERS.find((a) => a.id === id)!;

Deno.test("401 without a user; 400 for bad requests, before touching the database", async () => {
  const { store, calls } = fakeStore();
  assertEquals((await handleCurated(null, valid, deps(store, matching("thanks")))).status, 401);
  for (
    const body of [null, {}, { ...valid, message: "  " }, { ...valid, message: "x".repeat(2001) }, { ...valid, input_mode: "video" }, { ...valid, local_date: "2026-02-31" }, { ...valid, local_date: "2026-11-30" }]
  ) {
    assertEquals((await handleCurated(USER, body, deps(store, matching("thanks")))).status, 400);
  }
  assertEquals(calls.inserted.length, 0);
});

Deno.test("rate limits match the generative chat", async () => {
  const burst = fakeStore({ recent: LIMITS.perWindow });
  assertEquals((await handleCurated(USER, valid, deps(burst.store, matching("thanks")))).status, 429);
  assertEquals(burst.calls.inserted.length, 0);
  const day = fakeStore({ recent: 1, today: LIMITS.perDay });
  assertEquals((await handleCurated(USER, valid, deps(day.store, matching("thanks")))).status, 429);
});

Deno.test("a matched answer is saved and returned in the chat response shape", async () => {
  const { store, calls } = fakeStore();
  const result = await handleCurated(USER, valid, deps(store, matching("what_is_perimenopause")));
  assertEquals(result.status, 200);
  assertEquals(result.body.reply, answer("what_is_perimenopause").en);
  assertEquals(
    [result.body.observations, result.body.message_id, result.body.user_message_id, result.body.answer_id, result.body.matched],
    [[], "m-assistant", "m-user", "what_is_perimenopause", true],
  );
  assertEquals(calls.saved[0].content, answer("what_is_perimenopause").en);
});

Deno.test("nothing matched returns the fallback and says so", async () => {
  const { store, calls } = fakeStore();
  const result = await handleCurated(USER, { ...valid, message: "Who won the match yesterday?" }, deps(store, matching(null, 0.2)));
  assertEquals([result.status, result.body.reply, result.body.matched, result.body.answer_id], [200, FALLBACK.en, false, null]);
  assertEquals(calls.saved[0].content, FALLBACK.en);
});

Deno.test("the reply language follows the message, then the profile", async () => {
  const pl = await handleCurated(USER, { ...valid, message: "Czy to normalne, że źle śpię?" }, deps(fakeStore().store, matching("sleep_trouble")));
  assertEquals(pl.body.reply, answer("sleep_trouble").pl);
  const profilePl = await handleCurated(USER, { ...valid, message: "ok" }, deps(fakeStore({ locale: "pl" }).store, matching("acknowledge")));
  assertEquals(profilePl.body.reply, answer("acknowledge").pl);
  const en = await handleCurated(USER, valid, deps(fakeStore({ locale: "pl" }).store, matching("what_is_perimenopause")));
  assertEquals(en.body.reply, answer("what_is_perimenopause").en);
  const fallbackPl = await handleCurated(USER, { ...valid, message: "Jaka jest dziś pogoda?" }, deps(fakeStore().store, matching(null)));
  assertEquals(fallbackPl.body.reply, FALLBACK.pl);
});

Deno.test("a matcher failure is a generic 502 and nothing is saved as the assistant", async () => {
  const { store, calls } = fakeStore();
  const boom: Matcher = () => Promise.reject(new Error("jev request failed (500) sk-secret"));
  const result = await handleCurated(USER, valid, deps(store, boom));
  assertEquals(result.status, 502);
  assertEquals(String(result.body.error).includes("sk-secret"), false);
  assertEquals(calls.saved.length, 0);
});
