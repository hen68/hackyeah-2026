import { assertEquals } from "@std/assert";

import { createReplyGate } from "./reply-gate.ts";

Deno.test("releases whole words and holds back the unfinished one", () => {
  const gate = createReplyGate("I slept badly");
  assertEquals(gate.push("  That sou"), "That ");
  assertEquals(gate.push("nds hard"), "sounds ");
  assertEquals(gate.push(". How"), "hard. ");
  assertEquals(gate.rule, null);
});

Deno.test("stops before a multi-chunk directive reaches the patient", () => {
  const gate = createReplyGate("Should I double my HRT dose?");
  const shown = ["Maybe you ", "should dou", "ble your ", "HRT dose. ", "More text "].map((t) => gate.push(t)).join("");
  assertEquals(gate.rule, "directive");
  assertEquals(shown.includes("dose"), false);
  assertEquals(gate.push("anything else "), "");
});

Deno.test("an unseen drug name trips the gate, one the patient named does not", () => {
  const introduced = createReplyGate("I can't sleep");
  assertEquals(introduced.push("Some people try "), "Some people try ");
  assertEquals(introduced.push("melatonin at night. "), "");
  assertEquals(introduced.rule, "drug_recommendation");

  const repeated = createReplyGate("I take melatonin");
  assertEquals(repeated.push("You mentioned melatonin. "), "You mentioned melatonin. ");
  assertEquals(repeated.rule, null);
});

Deno.test("a partial word is not checked until it is complete", () => {
  // "aspirin" alone is a drug name; checking the partial "aspiring" would trip a false alarm.
  const gate = createReplyGate("hi");
  assertEquals(gate.push("Keep aspirin"), "Keep ");
  assertEquals(gate.push("g to rest. "), "aspiring to rest. ");
  assertEquals(gate.rule, null);
});

Deno.test("never shows more than the saved reply length", () => {
  const gate = createReplyGate("hi", 10);
  assertEquals(gate.push("abcd efgh ijkl mnop "), "abcd efgh ");
  assertEquals(gate.push("more "), "");
});
