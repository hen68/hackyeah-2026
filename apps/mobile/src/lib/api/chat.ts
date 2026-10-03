import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { fetch } from 'expo/fetch';
import { z } from 'zod';

import { createSseParser } from '@/lib/api/sse';
import type { Tables } from '@/lib/database.types';
import { supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/supabase';

const CHAT_FUNCTION = 'chat';
/** A hung or cold function must fail instead of blocking the UI. */
const CHAT_TIMEOUT_MS = 15_000;
/** Newest messages loaded when the chat opens; older history lives in each day's detail. */
const CHAT_HISTORY_LIMIT = 50;
/** Generous cap on the whole streamed reply once it has started. */
const CHAT_STREAM_TIMEOUT_MS = 60_000;
const HTTP_BAD_GATEWAY = 502;

const observationSchema = z.object({
  symptom_code: z.string().nullish(),
  custom_label: z.string().nullish(),
  severity: z.number().int().min(1).max(5).nullish(),
  duration_days: z.number().int().nonnegative().nullish(),
  observed_on: z.string().nullish(),
});

const chatResponseSchema = z.object({
  reply: z.string(),
  observations: z.array(observationSchema),
  message_id: z.string(),
});

export type ChatObservation = z.infer<typeof observationSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;

export type SendChatInput = {
  message: string;
  inputMode: 'text' | 'voice';
  /** Patient-local date, YYYY-MM-DD. */
  localDate: string;
};

/** Calls the `chat` edge function (plan Step 3); 429 surfaces as FunctionsHttpError. */
export async function sendChatMessage({ message, inputMode, localDate }: SendChatInput): Promise<ChatResponse> {
  const { data, error } = await supabase.functions.invoke<unknown>(CHAT_FUNCTION, {
    body: { message, input_mode: inputMode, local_date: localDate },
    timeout: CHAT_TIMEOUT_MS,
  });
  if (error) throw error;
  return chatResponseSchema.parse(data);
}

export type StreamChatInput = SendChatInput & {
  /** Called with each newly revealed piece of the reply, in order. */
  onDelta: (text: string) => void;
};

/**
 * Same turn as `sendChatMessage`, with the reply streamed as server-sent events. Falls back to the
 * JSON reply when the deployed function doesn't stream yet. Errors map through `toUserMessage`.
 */
export async function streamChatMessage({
  message,
  inputMode,
  localDate,
  onDelta,
}: StreamChatInput): Promise<ChatResponse> {
  const { data } = await supabase.auth.getSession();
  const controller = new AbortController();
  // The first byte gets the same budget as a non-streamed call; the whole reply gets longer.
  let timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);
  try {
    let response;
    try {
      response = await fetch(`${SUPABASE_URL}/functions/v1/${CHAT_FUNCTION}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${data.session?.access_token ?? SUPABASE_PUBLISHABLE_KEY}`,
          apikey: SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ message, input_mode: inputMode, local_date: localDate, stream: true }),
        signal: controller.signal,
      });
    } catch (error) {
      throw new FunctionsFetchError(error);
    }
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(), CHAT_STREAM_TIMEOUT_MS);

    if (!response.ok) throw httpError(response.status);
    if (!(response.headers.get('content-type') ?? '').includes('text/event-stream')) {
      return chatResponseSchema.parse(await response.json());
    }
    if (!response.body) throw httpError(HTTP_BAD_GATEWAY);
    return await readChatStream(response.body.getReader(), onDelta);
  } finally {
    clearTimeout(timer);
  }
}

const deltaSchema = z.object({ text: z.string() });
const streamErrorSchema = z.object({ status: z.number().int() });

/** Same shape the Supabase client throws, so `toUserMessage` maps 429/404 the same way. */
const httpError = (status: number) => new FunctionsHttpError(new Response(null, { status }));

type ChunkReader = { read: () => Promise<{ done: boolean; value?: Uint8Array }> };

async function readChatStream(reader: ChunkReader, onDelta: (text: string) => void): Promise<ChatResponse> {
  const decoder = new TextDecoder();
  const parser = createSseParser();
  for (;;) {
    let chunk;
    try {
      chunk = await reader.read();
    } catch (error) {
      throw new FunctionsFetchError(error);
    }
    const events = parser.push(chunk.done ? decoder.decode() : decoder.decode(chunk.value, { stream: true }));
    for (const { event, data } of events) {
      if (event === 'delta') onDelta(deltaSchema.parse(JSON.parse(data)).text);
      else if (event === 'done') return chatResponseSchema.parse(JSON.parse(data));
      else if (event === 'error') throw httpError(streamErrorSchema.parse(JSON.parse(data)).status);
    }
    // The stream ended without a final event: the reply is incomplete.
    if (chunk.done) throw httpError(HTTP_BAD_GATEWAY);
  }
}

type HistoryObservation = Pick<
  Tables<'observations'>,
  'id' | 'symptom_code' | 'custom_label' | 'severity' | 'duration_days' | 'observed_on'
>;

export type ChatHistoryRow = Pick<
  Tables<'chat_messages'>,
  'id' | 'role' | 'content' | 'input_mode' | 'local_date' | 'created_at'
> & { observations: HistoryObservation[] };

/** The patient's newest messages, newest first, each with the observations extracted from it (RLS-scoped). */
export async function getChatHistory(patientId: string): Promise<ChatHistoryRow[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(
      'id, role, content, input_mode, local_date, created_at, observations(id, symptom_code, custom_label, severity, duration_days, observed_on)',
    )
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(CHAT_HISTORY_LIMIT);
  if (error) throw error;
  return data;
}
