import {
  FunctionsFetchError,
  FunctionsHttpError,
  isAuthError,
  isAuthRetryableFetchError,
} from '@supabase/supabase-js';

const HTTP_TOO_MANY_REQUESTS = 429;

export const ERROR_MESSAGES = {
  generic: 'Something went wrong. Please try again.',
  offline: 'No internet connection. Check your connection and try again.',
  rateLimited: 'Too many tries. Please wait a minute and try again.',
  chatRateLimited: "You've sent a lot of messages. Please take a short break and try again.",
  emailExists: 'That email already has an account. Sign in with it instead.',
  wrongCredentials: 'That email or password is wrong. Please try again.',
  weakPassword: 'Please choose a longer password, at least 8 characters.',
  emailNotConfirmed: 'Please confirm your email first, then sign in.',
  signupDisabled: "New accounts can't be created right now.",
  sessionExpired: 'Your session has expired. Please sign in again.',
  forbidden: "You don't have permission to do that.",
  duplicate: 'This was already saved.',
} as const;

const AUTH_CODE_MESSAGES: Record<string, string> = {
  email_exists: ERROR_MESSAGES.emailExists,
  user_already_exists: ERROR_MESSAGES.emailExists,
  invalid_credentials: ERROR_MESSAGES.wrongCredentials,
  weak_password: ERROR_MESSAGES.weakPassword,
  email_not_confirmed: ERROR_MESSAGES.emailNotConfirmed,
  signup_disabled: ERROR_MESSAGES.signupDisabled,
  over_email_send_rate_limit: ERROR_MESSAGES.rateLimited,
  over_request_rate_limit: ERROR_MESSAGES.rateLimited,
  session_expired: ERROR_MESSAGES.sessionExpired,
  session_not_found: ERROR_MESSAGES.sessionExpired,
};

const POSTGREST_CODE_MESSAGES: Record<string, string> = {
  '23505': ERROR_MESSAGES.duplicate,
  '42501': ERROR_MESSAGES.forbidden,
  PGRST301: ERROR_MESSAGES.sessionExpired,
};

type PostgrestLike = { code: string; message: string; details: unknown };

function isPostgrestLike(error: unknown): error is PostgrestLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'details' in error
  );
}

function isNetworkError(error: unknown): boolean {
  return (
    error instanceof FunctionsFetchError ||
    isAuthRetryableFetchError(error) ||
    (error instanceof TypeError && /network request failed|failed to fetch/i.test(error.message))
  );
}

/** Maps Supabase Auth / Functions / PostgREST errors to text safe to show patients. */
export function toUserMessage(error: unknown): string {
  if (isNetworkError(error)) return ERROR_MESSAGES.offline;
  if (isAuthError(error)) {
    return (error.code && AUTH_CODE_MESSAGES[error.code]) || ERROR_MESSAGES.generic;
  }
  if (error instanceof FunctionsHttpError) {
    const status = error.context instanceof Response ? error.context.status : undefined;
    return status === HTTP_TOO_MANY_REQUESTS ? ERROR_MESSAGES.chatRateLimited : ERROR_MESSAGES.generic;
  }
  if (isPostgrestLike(error)) return POSTGREST_CODE_MESSAGES[error.code] ?? ERROR_MESSAGES.generic;
  return ERROR_MESSAGES.generic;
}
