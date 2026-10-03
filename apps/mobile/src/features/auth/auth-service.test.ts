import { AuthApiError } from '@supabase/supabase-js';

import { createAuthService } from '@/features/auth/auth-service';

const SESSION = { access_token: 'token' };

function createMockClient() {
  return {
    auth: {
      signUp: jest.fn().mockResolvedValue({ data: { user: {}, session: SESSION }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: { user: {}, session: SESSION }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  };
}

function setup() {
  const client = createMockClient();
  // The service only touches `client.auth`; the mock implements the methods it calls.
  const service = createAuthService(client as unknown as Parameters<typeof createAuthService>[0]);
  return { client, service };
}

describe('auth service', () => {
  test('register signs up with a trimmed email and the password as typed', async () => {
    const { client, service } = setup();

    const result = await service.register('  anna@example.com ', ' secret 123 ');

    expect(client.auth.signUp).toHaveBeenCalledWith({ email: 'anna@example.com', password: ' secret 123 ' });
    expect(result).toBe('signed_in');
  });

  test('register reports that confirmation is needed when no session comes back', async () => {
    const { client, service } = setup();
    client.auth.signUp.mockResolvedValueOnce({ data: { user: {}, session: null }, error: null });

    await expect(service.register('anna@example.com', 'password1')).resolves.toBe('confirm_email');
  });

  test('register rethrows "email already registered" so the UI can suggest signing in', async () => {
    const { client, service } = setup();
    const exists = new AuthApiError('User already registered', 422, 'user_already_exists');
    client.auth.signUp.mockResolvedValueOnce({ data: { user: null, session: null }, error: exists });

    await expect(service.register('taken@example.com', 'password1')).rejects.toBe(exists);
  });

  test('sign-in uses email and password', async () => {
    const { client, service } = setup();

    await service.signIn(' anna@example.com', 'password1');

    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'anna@example.com', password: 'password1' });
  });

  test('sign-in surfaces wrong credentials', async () => {
    const { client, service } = setup();
    const invalid = new AuthApiError('Invalid login credentials', 400, 'invalid_credentials');
    client.auth.signInWithPassword.mockResolvedValueOnce({ data: { user: null, session: null }, error: invalid });

    await expect(service.signIn('anna@example.com', 'wrong')).rejects.toBe(invalid);
  });

  test('sign out surfaces errors', async () => {
    const { client, service } = setup();
    const failure = new AuthApiError('nope', 500, 'unexpected_failure');
    client.auth.signOut.mockResolvedValueOnce({ error: failure });

    await expect(service.signOut()).rejects.toBe(failure);
  });
});
