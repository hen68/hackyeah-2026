import { fetch } from 'expo/fetch';

import { streamChatMessage } from '@/lib/api/chat';
import { ERROR_MESSAGES, toUserMessage } from '@/lib/errors';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('@/lib/supabase', () => ({
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'publishable',
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 'jwt' } } }) } },
}));

const fetchMock = fetch as jest.Mock;
const DONE = { reply: 'That sounds hard. How long?', observations: [], message_id: 'm1', user_message_id: 'u1' };
const input = { message: 'tired', inputMode: 'text' as const, localDate: '2026-10-03' };

// A fake streaming response whose body yields `chunks` as UTF-8 bytes.
function sseResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  const queue = chunks.map((chunk) => encoder.encode(chunk));
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'text/event-stream' }),
    body: {
      getReader: () => ({
        read: () => {
          const value = queue.shift();
          return Promise.resolve(value ? { done: false, value } : { done: true, value: undefined });
        },
      }),
    },
  };
}

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(body),
    body: null,
  };
}

const frame = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

describe('streamChatMessage', () => {
  beforeEach(() => fetchMock.mockReset());

  test('posts a streaming request with the session token and reports each delta', async () => {
    const stream = frame('delta', { text: 'That ' }) + frame('delta', { text: 'sounds hard. ' }) + frame('done', DONE);
    fetchMock.mockResolvedValue(sseResponse([stream.slice(0, 20), stream.slice(20, 61), stream.slice(61)]));
    const onDelta = jest.fn();

    const response = await streamChatMessage({ ...input, onDelta });

    expect(response).toMatchObject({ reply: DONE.reply, message_id: 'm1' });
    expect(onDelta.mock.calls).toEqual([['That '], ['sounds hard. ']]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://project.supabase.co/functions/v1/chat');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer jwt', apikey: 'publishable' });
    expect(JSON.parse(init.body)).toEqual({
      message: 'tired',
      input_mode: 'text',
      local_date: '2026-10-03',
      stream: true,
    });
  });

  test('accepts a plain JSON reply from a function that does not stream yet', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, DONE));
    const onDelta = jest.fn();

    await expect(streamChatMessage({ ...input, onDelta })).resolves.toMatchObject({ reply: DONE.reply });
    expect(onDelta).not.toHaveBeenCalled();
  });

  test('maps HTTP errors before the stream to the existing chat messages', async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, { error: 'slow down' }));
    const limited = await streamChatMessage({ ...input, onDelta: jest.fn() }).catch((error: unknown) => error);
    expect(toUserMessage(limited)).toBe(ERROR_MESSAGES.chatRateLimited);

    fetchMock.mockResolvedValue(jsonResponse(404, {}));
    const missing = await streamChatMessage({ ...input, onDelta: jest.fn() }).catch((error: unknown) => error);
    expect(toUserMessage(missing)).toBe(ERROR_MESSAGES.chatUnavailable);
  });

  test('an error event or a stream cut short rejects', async () => {
    fetchMock.mockResolvedValue(
      sseResponse([frame('delta', { text: 'Half ' }), frame('error', { error: 'x', status: 502 })]),
    );
    const failed = await streamChatMessage({ ...input, onDelta: jest.fn() }).catch((error: unknown) => error);
    expect(toUserMessage(failed)).toBe(ERROR_MESSAGES.generic);

    fetchMock.mockResolvedValue(sseResponse([frame('delta', { text: 'Half ' })]));
    await expect(streamChatMessage({ ...input, onDelta: jest.fn() })).rejects.toBeDefined();
  });

  test('a network failure maps to the offline message', async () => {
    fetchMock.mockRejectedValue(new Error('fetch failed: offline'));
    const error = await streamChatMessage({ ...input, onDelta: jest.fn() }).catch((e: unknown) => e);
    expect(toUserMessage(error)).toBe(ERROR_MESSAGES.offline);
  });
});
