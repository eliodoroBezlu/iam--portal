import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { AdminPanel } from '@/components/dashboard/admin/AdminPanel';

export const metadata = { title: 'Panel de Administración — IAM Portal' };

/** Solo accesible para ADMIN y SUPER_ADMIN. */
export default async function AdminPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');
  // session is non-null from here — redirect() throws NEXT_REDIRECT internally
  const roles = session!.roles;

  const isAdmin = roles.includes('admin') || roles.includes('super_admin');
  if (!isAdmin) redirect('/dashboard');

  return <AdminPanel />;
}
