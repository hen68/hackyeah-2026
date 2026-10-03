import { assert, assertEquals, assertRejects } from "@std/assert";

import { ANSWERS, NONE_KEY } from "./answers.ts";
import { buildRequest, createJevMatcher, decide, parseResponse } from "./jev.ts";

const reply = (choice: string, confidence: number, probabilities: Record<string, number> = { [choice]: confidence }) => ({
  model: "jev-latest",
  answers: { answer: { type: "choice", choice, confidence, probabilities } },
  usage: { input_tokens: 1, output_tokens: 1 },
});
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

Deno.test("the request is one Choice question with every answer plus 'none'", () => {
  const req = buildRequest("hot flushes at night");
  assertEquals([req.state, req.model], ["hot flushes at night", "jev-latest"]);
  const q = req.questions.answer;
  assertEquals(q.type, "choice");
  assertEquals(Object.keys(q.criteria).length, ANSWERS.length + 1);
  assertEquals(q.criteria.hot_flushes, ANSWERS.find((a) => a.id === "hot_flushes")!.ask);
  assert(NONE_KEY in q.criteria);
  assert(Object.keys(q.criteria).length <= 255);
});

Deno.test("a confident match returns that answer", () => {
  assertEquals(decide(parseResponse(reply("hot_flushes", 0.9))).answerId, "hot_flushes");
});

Deno.test("low confidence, 'none' and unknown choices all fall back", () => {
  assertEquals(decide(parseResponse(reply("hot_flushes", 0.59))).answerId, null);
  assertEquals(decide(parseResponse(reply("hot_flushes", 0.6))).answerId, "hot_flushes");
  assertEquals(decide(parseResponse(reply(NONE_KEY, 0.95))).answerId, null);
  assertEquals(decide(parseResponse(reply("made_up_answer", 0.99))).answerId, null);
});

Deno.test("confidence falls back to the probability of the chosen option", () => {
  const raw = { answers: { answer: { type: "choice", choice: "thanks", probabilities: { thanks: 0.8, goodbye: 0.2 } } } };
  const parsed = parseResponse(raw);
  assertEquals(parsed.confidence, 0.8);
  assertEquals(decide(parsed).answerId, "thanks");
});

Deno.test("an urgent answer wins when it clears its lower bar, even if not the top choice", () => {
  const p = { hot_flushes: 0.55, urgent_chest_pain: 0.42, none: 0.03 };
  assertEquals(decide(parseResponse(reply("hot_flushes", 0.55, p))).answerId, "urgent_chest_pain");
  // Below its own bar it does not fire.
  const weak = { hot_flushes: 0.9, urgent_chest_pain: 0.2 };
  assertEquals(decide(parseResponse(reply("hot_flushes", 0.9, weak))).answerId, "hot_flushes");
  // As the top choice an urgent answer needs only its lower bar.
  assertEquals(decide(parseResponse(reply("urgent_self_harm", 0.45))).answerId, "urgent_self_harm");
});

Deno.test("malformed responses are rejected", () => {
  for (const bad of [null, {}, { answers: {} }, { answers: { answer: { choice: 5 } } }]) {
    let threw = false;
    try {
      parseResponse(bad);
    } catch {
      threw = true;
    }
    assert(threw);
  }
});

Deno.test("the matcher sends the key and body, and returns the decision", async () => {
  let seen: { auth: string | null; body: { state: string } } | null = null;
  const fetchFake = (_url: string | URL | Request, init?: RequestInit) => {
    seen = {
      auth: new Headers(init?.headers).get("Authorization"),
      body: JSON.parse(String(init?.body)),
    };
    return Promise.resolve(ok(reply("what_is_menopause", 0.93)));
  };
  const match = createJevMatcher("test-key", { fetch: fetchFake as typeof fetch });
  const result = await match("What is menopause?");
  assertEquals(result.answerId, "what_is_menopause");
  assertEquals(seen!.auth, "Bearer test-key");
  assertEquals(seen!.body.state, "What is menopause?");
});

Deno.test("429 and 529 are retried once; other errors are not", async () => {
  const sequence = (statuses: number[]) => {
    let calls = 0;
    const fetchFake = () => {
      const status = statuses[Math.min(calls++, statuses.length - 1)];
      return Promise.resolve(status === 200 ? ok(reply("thanks", 0.9)) : new Response("{}", { status }));
    };
    return { fetchFake: fetchFake as unknown as typeof fetch, calls: () => calls };
  };
  const noWait = (_ms: number) => Promise.resolve();

  const recovers = sequence([429, 200]);
  const m1 = createJevMatcher("k", { fetch: recovers.fetchFake, sleep: noWait });
  assertEquals((await m1("thanks")).answerId, "thanks");
  assertEquals(recovers.calls(), 2);

  const overloaded = sequence([529, 529]);
  await assertRejects(() => createJevMatcher("k", { fetch: overloaded.fetchFake, sleep: noWait })("x"), Error, "529");
  assertEquals(overloaded.calls(), 2);

  const badKey = sequence([401]);
  await assertRejects(() => createJevMatcher("k", { fetch: badKey.fetchFake, sleep: noWait })("x"), Error, "401");
  assertEquals(badKey.calls(), 1);
});

Deno.test("errors never contain the key or the message", async () => {
  const fetchFake = () => Promise.resolve(new Response("{}", { status: 500 }));
  try {
    await createJevMatcher("sk-secret-key", { fetch: fetchFake as unknown as typeof fetch })("my private message");
  } catch (error) {
    const text = (error as Error).message;
    assertEquals([text.includes("sk-secret-key"), text.includes("private")], [false, false]);
  }
});
