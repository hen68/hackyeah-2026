import { AuthForm } from '@/features/auth/auth-form';
import { useAuth } from '@/features/auth/auth-provider';

export default function SignInScreen() {
  const { auth } = useAuth();
  return <AuthForm mode="signIn" onSubmit={auth.signIn} />;
}
