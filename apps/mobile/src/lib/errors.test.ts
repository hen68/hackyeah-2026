import { AuthApiError, FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

import { ERROR_MESSAGES, toUserMessage } from '@/lib/errors';

describe('toUserMessage', () => {
  test('maps known auth error codes', () => {
    expect(toUserMessage(new AuthApiError('exists', 422, 'email_exists'))).toBe(ERROR_MESSAGES.emailExists);
    expect(toUserMessage(new AuthApiError('expired', 403, 'otp_expired'))).toBe(ERROR_MESSAGES.badCode);
    expect(toUserMessage(new AuthApiError('no signups', 422, 'otp_disabled'))).toBe(ERROR_MESSAGES.noAccount);
    expect(toUserMessage(new AuthApiError('slow down', 429, 'over_email_send_rate_limit'))).toBe(
      ERROR_MESSAGES.rateLimited,
    );
  });

  test('falls back to the generic message for unknown auth codes', () => {
    expect(toUserMessage(new AuthApiError('weird', 500, 'unexpected_failure'))).toBe(ERROR_MESSAGES.generic);
  });

  test('maps a 429 from an edge function to the chat rate-limit message', () => {
    const error = new FunctionsHttpError(new Response(null, { status: 429 }));

    expect(toUserMessage(error)).toBe(ERROR_MESSAGES.chatRateLimited);
  });

  test('maps other edge function failures to the generic message', () => {
    expect(toUserMessage(new FunctionsHttpError(new Response(null, { status: 500 })))).toBe(ERROR_MESSAGES.generic);
  });

  test('maps network failures to the offline message', () => {
    expect(toUserMessage(new FunctionsFetchError(new Error('down')))).toBe(ERROR_MESSAGES.offline);
    expect(toUserMessage(new TypeError('Network request failed'))).toBe(ERROR_MESSAGES.offline);
  });

  test('maps PostgREST error codes', () => {
    expect(toUserMessage({ code: '42501', message: 'denied', details: null, hint: null })).toBe(
      ERROR_MESSAGES.forbidden,
    );
    expect(toUserMessage({ code: '23505', message: 'dup', details: null, hint: null })).toBe(ERROR_MESSAGES.duplicate);
    expect(toUserMessage({ code: 'XX000', message: 'boom', details: null, hint: null })).toBe(ERROR_MESSAGES.generic);
  });

  test('never leaks raw messages for unknown values', () => {
    expect(toUserMessage(new Error('SELECT * FROM secrets'))).toBe(ERROR_MESSAGES.generic);
    expect(toUserMessage('oops')).toBe(ERROR_MESSAGES.generic);
  });
});
