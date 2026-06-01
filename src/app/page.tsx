import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';

// Raíz → redirigir según estado de auth
export default async function RootPage() {
  const session = await getServerSession();
  if (session) {
    redirect('/dashboard');
  }
  redirect('/login');
}
