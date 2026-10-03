import OpenAI from "openai";

// Mid-priced OpenAI model with strict function calling. Override with the OPENAI_MODEL secret.
export const DEFAULT_MODEL = "gpt-4.1-mini";

export type ChatTurnInput = {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
};
export type ChatTurnOutput = { toolInput: unknown; text: string };
export type LlmTurn = (input: ChatTurnInput) => Promise<ChatTurnOutput>;

// Strict mode needs every property listed in `required`, so optional fields are nullable.
export const RECORD_TURN_TOOL = {
  type: "function",
  function: {
    name: "record_turn",
    description: "Record your reply to the patient and the symptoms she described this turn.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        reply: { type: "string", description: "What you say to the patient." },
        clarifying_question: { type: ["string", "null"], description: "One optional follow-up question." },
        observations: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              symptom_code: { type: ["string", "null"] },
              custom_label: { type: ["string", "null"] },
              severity: { type: ["integer", "null"] },
              duration_days: { type: ["integer", "null"] },
              observed_on: { type: ["string", "null"], description: "YYYY-MM-DD" },
            },
            required: ["symptom_code", "custom_label", "severity", "duration_days", "observed_on"],
          },
        },
      },
      required: ["reply", "clarifying_question", "observations"],
    },
  },
} as const;

// Pieces of a streamed turn: `args` continues the `record_turn` JSON, `text` any plain content.
export type LlmStreamChunk = { args: string; text: string };
export type LlmStream = (input: ChatTurnInput) => AsyncIterable<LlmStreamChunk>;

const MAX_COMPLETION_TOKENS = 2048;

const request = (model: string, { system, messages }: ChatTurnInput) => ({
  model,
  max_completion_tokens: MAX_COMPLETION_TOKENS,
  messages: [{ role: "system" as const, content: system }, ...messages],
  tools: [RECORD_TURN_TOOL],
  tool_choice: { type: "function" as const, function: { name: RECORD_TURN_TOOL.function.name } },
});

// Status and code only: provider messages can echo parts of the key.
function logFailure(model: string, error: unknown) {
  const e = error as { status?: number; code?: string; type?: string };
  console.error("openai_call_failed", { model, status: e.status, code: e.code, type: e.type });
}

/** Same call as `createLlmTurn`, streamed: yields the tool arguments as the model writes them. */
export function createLlmStream(apiKey: string, model: string = DEFAULT_MODEL): LlmStream {
  const client = new OpenAI({ apiKey });
  return async function* (input) {
    try {
      const stream = await client.chat.completions.create({ ...request(model, input), stream: true });
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const args = delta?.tool_calls?.find((call) => call.index === 0)?.function?.arguments ?? "";
        const text = delta?.content ?? "";
        if (args || text) yield { args, text };
      }
    } catch (error) {
      logFailure(model, error);
      throw error;
    }
  };
}

export function createLlmTurn(apiKey: string, model: string = DEFAULT_MODEL): LlmTurn {
  const client = new OpenAI({ apiKey });
  return async (input) => {
    let completion;
    try {
      completion = await client.chat.completions.create(request(model, input));
    } catch (error) {
      logFailure(model, error);
      throw error;
    }
    const message = completion.choices[0]?.message;
    let toolInput: unknown = null;
    const call = message?.tool_calls?.find((c) => c.type === "function");
    if (call && call.type === "function") {
      try {
        toolInput = JSON.parse(call.function.arguments);
      } catch {
        toolInput = null;
      }
    }
    return { toolInput, text: message?.content ?? "" };
  };
}
