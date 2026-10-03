import { AuthApiError } from '@supabase/supabase-js';

import { createAuthService } from '@/features/auth/auth-service';

function createMockClient() {
  const ok = () => jest.fn().mockResolvedValue({ data: {}, error: null });
  return {
    auth: {
      signInAnonymously: ok(),
      signInWithOtp: ok(),
      verifyOtp: ok(),
      updateUser: ok(),
      signOut: ok(),
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
  test('"Get started" signs in anonymously', async () => {
    const { client, service } = setup();

    await service.startAnonymous();

    expect(client.auth.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  test('sign-in requests a code without creating a user', async () => {
    const { client, service } = setup();

    await service.requestSignInCode('  anna@example.com ');

    expect(client.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'anna@example.com',
      options: { shouldCreateUser: false },
    });
  });

  test('sign-in verifies the code as an email OTP', async () => {
    const { client, service } = setup();

    await service.verifySignInCode('anna@example.com', ' 123456 ');

    expect(client.auth.verifyOtp).toHaveBeenCalledWith({ email: 'anna@example.com', token: '123456', type: 'email' });
  });

  describe('linking an email to an anonymous account', () => {
    test('requests an email change, then verifies it with an email_change OTP', async () => {
      const { client, service } = setup();

      await service.requestLinkEmail('anna@example.com');
      await service.verifyLinkEmail('anna@example.com', '654321');

      expect(client.auth.updateUser).toHaveBeenCalledWith({ email: 'anna@example.com' });
      expect(client.auth.verifyOtp).toHaveBeenCalledWith({
        email: 'anna@example.com',
        token: '654321',
        type: 'email_change',
      });
    });

    test('rethrows "email already registered" so the UI can suggest signing in', async () => {
      const { client, service } = setup();
      const exists = new AuthApiError('A user with this email address has already been registered', 422, 'email_exists');
      client.auth.updateUser.mockResolvedValueOnce({ data: { user: null }, error: exists });

      await expect(service.requestLinkEmail('taken@example.com')).rejects.toBe(exists);
    });
  });

  test('sign out surfaces errors', async () => {
    const { client, service } = setup();
    const failure = new AuthApiError('nope', 500, 'unexpected_failure');
    client.auth.signOut.mockResolvedValueOnce({ error: failure });

    await expect(service.signOut()).rejects.toBe(failure);
  });
});
