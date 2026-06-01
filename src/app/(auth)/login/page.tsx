import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = { title: 'Iniciar sesión — IAM Portal' };

export default async function LoginPage() {
  // Si ya tiene sesión → ir al dashboard
  const session = await getServerSession();
  if (session) redirect('/dashboard');

  return <LoginForm />;
}
