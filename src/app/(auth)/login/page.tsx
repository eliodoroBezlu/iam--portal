import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { CircularProgress, Box } from '@mui/material';
import { getServerSession } from '@/lib/auth';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = { title: 'Iniciar sesión — IAM Portal' };

export default async function LoginPage() {
  // Si ya tiene sesión → ir al dashboard
  const session = await getServerSession();
  if (session) redirect('/dashboard');

  return (
    // LoginForm usa useSearchParams() → requiere Suspense boundary (Next.js 15)
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress />
        </Box>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
