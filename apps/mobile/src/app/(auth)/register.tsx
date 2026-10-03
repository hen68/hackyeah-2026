import { AuthForm } from '@/features/auth/auth-form';
import { useAuth } from '@/features/auth/auth-provider';

const CONFIRM_EMAIL_NOTICE = 'Check your email to confirm your account, then sign in.';

export default function RegisterScreen() {
  const { auth } = useAuth();

  const handleRegister = async (email: string, password: string) => {
    const result = await auth.register(email, password);
    return result === 'confirm_email' ? CONFIRM_EMAIL_NOTICE : undefined;
  };

  return <AuthForm mode="register" onSubmit={handleRegister} />;
}
