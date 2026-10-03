import { assert, assertEquals } from "@std/assert";

import { createReplyGate, MIN_TAIL_CHARS, MIN_TAIL_WORDS } from "./reply-gate.ts";

const SAFE_START = "That sounds really hard, and it makes sense that you feel worn out after nights like that. ";

// Streams `reply` token by token (split after each space) and returns every released delta.
function stream(reply: string, userMessage = "hi"): { deltas: string[]; rule: string | null } {
  const gate = createReplyGate(userMessage);
  const tokens = reply.match(/\S+\s*|\s+/g) ?? [];
  const deltas = tokens.map((token) => gate.push(token)).filter(Boolean);
  return { deltas, rule: gate.rule };
}

// Everything shown ends before `phrase` starts in `reply`, so none of its words leaked.
function assertStopsBefore(deltas: string[], reply: string, phrase: string) {
  const shown = deltas.join("");
  assert(reply.startsWith(shown));
  assert(shown.length <= reply.indexOf(phrase), `leaked: ${shown.slice(reply.indexOf(phrase))}`);
}

Deno.test("a normal reply streams progressively, keeping the window held back", () => {
  const reply = `${SAFE_START}Many women notice the same pattern. Let's keep an eye on how your sleep goes this week. `;
  const { deltas, rule } = stream(reply);
  assertEquals(rule, null);
  assert(deltas.length > 1);
  const shown = deltas.join("");
  assert(reply.startsWith(shown));
  const held = reply.slice(shown.length);
  assert(held.length >= MIN_TAIL_CHARS);
  assert(held.trim().split(/\s+/).length >= MIN_TAIL_WORDS);
});

Deno.test("the first delta arrives before the reply ends", () => {
  const gate = createReplyGate("hi");
  const tokens = `${SAFE_START}${SAFE_START}`.match(/\S+\s*/g)!;
  const firstAt = tokens.findIndex((token) => gate.push(token) !== "");
  assert(firstAt > 0 && firstAt < tokens.length - 1);
});

Deno.test("no word of a directive streamed token by token is ever shown", () => {
  const reply = `${SAFE_START}Honestly, you should take your HRT patch every evening. ${SAFE_START}`;
  const { deltas, rule } = stream(reply);
  assertEquals(rule, "directive");
  assertStopsBefore(deltas, reply, "Honestly, you should take your HRT");
});

Deno.test("no word of a dose streamed token by token is ever shown", () => {
  const reply = `${SAFE_START}Try to take 500 mg before bed. ${SAFE_START}`;
  const { deltas, rule } = stream(reply);
  assertEquals(rule, "dosing");
  assertStopsBefore(deltas, reply, "Try to take 500 mg");
});

Deno.test("a long diagnosis is caught before any of its words show", () => {
  const reply = `${SAFE_START}I think you are suffering from an anxiety disorder. ${SAFE_START}`;
  const { deltas, rule } = stream(reply);
  assertEquals(rule, "diagnosis");
  assertStopsBefore(deltas, reply, "I think you are suffering");
});

Deno.test("a spaced-out Polish directive is caught before any of its words show", () => {
  const reply = `${SAFE_START}Moim zdaniem przestań brać od jutra rano wieczorem zawsze te hormony. ${SAFE_START}`;
  const { deltas, rule } = stream(reply);
  assertEquals(rule, "directive");
  assertStopsBefore(deltas, reply, "Moim zdaniem przestań");
});

Deno.test("an unseen drug name trips the gate, one the patient named does not", () => {
  assertEquals(stream(`${SAFE_START}Some people try melatonin at night. ${SAFE_START}`).rule, "drug_recommendation");
  assertEquals(stream(`You mentioned melatonin. ${SAFE_START}`, "I take melatonin").rule, null);
});

Deno.test("a partial word is not checked until it is complete", () => {
  // "aspirin" alone is a drug name; checking the partial "aspiring" would trip a false alarm.
  const gate = createReplyGate("hi");
  gate.push("Keep aspirin");
  gate.push("g to rest. ");
  assertEquals(gate.rule, null);
});

Deno.test("nothing is released after a trip, and never more than the saved reply length", () => {
  const tripped = createReplyGate("hi");
  tripped.push("You should double your dose. ");
  assertEquals(tripped.push(SAFE_START.repeat(3)), "");

  const capped = createReplyGate("hi", 10);
  assertEquals(capped.push(SAFE_START.repeat(3)).length, 10);
  assertEquals(capped.push(SAFE_START), "");
});
