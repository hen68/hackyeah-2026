import { AuthApiError } from '@supabase/supabase-js';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { AuthForm } from '@/features/auth/auth-form';
import { ERROR_MESSAGES } from '@/lib/errors';

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Link: ({ children }: { children: ReactNode }) => <Text>{children}</Text>,
    router: { back: jest.fn() },
  };
});

async function fillIn(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText('Email'), email);
  await fireEvent.changeText(screen.getByLabelText('Password'), password);
}

describe('AuthForm', () => {
  test('register stays disabled until the email is valid and the password is long enough', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<AuthForm mode="register" onSubmit={onSubmit} />);

    await fillIn('anna@example.com', 'short');
    expect(screen.getByRole('button', { name: 'Enter your email and password' })).toBeDisabled();

    await fillIn('anna@example.com', 'long enough');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(onSubmit).toHaveBeenCalledWith('anna@example.com', 'long enough');
  });

  test('sign-in shows a friendly message for wrong credentials', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new AuthApiError('Invalid', 400, 'invalid_credentials'));
    await render(<AuthForm mode="signIn" onSubmit={onSubmit} />);

    await fillIn('anna@example.com', 'x');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText(ERROR_MESSAGES.wrongCredentials)).toBeOnTheScreen();
  });

  test('shows the notice the submit handler returns', async () => {
    const onSubmit = jest.fn().mockResolvedValue('Check your email');
    await render(<AuthForm mode="register" onSubmit={onSubmit} />);

    await fillIn('anna@example.com', 'long enough');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Check your email')).toBeOnTheScreen();
  });
});
