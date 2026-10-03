// Shared fakes for the handler tests.
import type { ChatContext, ChatStore } from "./handler.ts";

export const NOW = new Date("2026-10-03T12:00:00Z");
export const USER = "user-1";
export const valid = { message: "I woke up drenched in sweat", input_mode: "text", local_date: "2026-10-03" };

const catalog = [
  { code: "night_sweats", label: "Night sweats" },
  { code: "sleep", label: "Sleep trouble" },
];

export function fakeStore(over: Partial<{ recent: number; today: number; history: ChatContext["history"] }> = {}) {
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
