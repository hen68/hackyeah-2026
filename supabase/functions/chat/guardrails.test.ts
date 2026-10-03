import { assertEquals } from "@std/assert";

import { checkReply } from "./guardrails.ts";

const trips = (reply: string, user = "") => {
  const result = checkReply(reply, user);
  return result.tripped ? result.rule : null;
};

Deno.test("dosing amounts trip (EN + PL)", () => {
  assertEquals(trips("Try 2 mg of estradiol at night."), "dosing");
  assertEquals(trips("Weź 50 mcg wieczorem."), "dosing");
  assertEquals(trips("Możesz brać 2 tabletki dziennie."), "dosing");
});

Deno.test("directives to take or stop therapy trip (EN + PL)", () => {
  assertEquals(trips("You should stop your HRT for a while."), "directive");
  assertEquals(trips("Consider to double the dose if it persists."), "directive");
  assertEquals(trips("I recommend taking magnesium."), "directive");
  assertEquals(trips("Powinnaś odstawić hormony na tydzień."), "directive");
  assertEquals(trips("Zwiększ dawkę, jeśli objawy wracają."), "directive");
});

Deno.test("diagnoses trip (EN + PL)", () => {
  assertEquals(trips("You probably have an underactive thyroid disease."), null);
  assertEquals(trips("You probably have hypothyroidism."), "diagnosis");
  assertEquals(trips("It sounds like you have depression."), "diagnosis");
  assertEquals(trips("Prawdopodobnie masz niedoczynność tarczycy."), "diagnosis");
  assertEquals(trips("Cierpisz na depresję."), "diagnosis");
});

Deno.test("causal attribution trips (EN + PL)", () => {
  assertEquals(trips("Your night sweats are caused by low estrogen."), "causal_attribution");
  assertEquals(trips("That is due to your menopause."), "causal_attribution");
  assertEquals(trips("To jest spowodowane spadkiem hormonów."), "causal_attribution");
  assertEquals(trips("Przyczyną jest stres."), "causal_attribution");
});

Deno.test("introducing a drug trips, repeating the patient's own mention does not", () => {
  assertEquals(trips("Some women find gabapentin helpful."), "drug_recommendation");
  assertEquals(trips("Many take melatonin before bed.", "I am on melatonin already"), null);
  assertEquals(trips("Thanks for telling me about the Estradiol.", "I take estradiol"), null);
});

Deno.test("empathetic, organising replies pass (EN + PL)", () => {
  assertEquals(trips("That sounds exhausting. I've added night sweats to today."), null);
  assertEquals(trips("It might be worth mentioning this pattern to your doctor."), null);
  assertEquals(trips("Brzmi to bardzo męcząco. Dodałam poty nocne do dzisiejszego dnia."), null);
  assertEquals(trips("Warto o tym wspomnieć lekarzowi podczas wizyty."), null);
});
