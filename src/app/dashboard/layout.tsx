import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect('/login');
  // session is non-null from here — redirect() throws NEXT_REDIRECT internally
  const s = session!;

  const isAdmin = s.roles.includes('admin') || s.roles.includes('super_admin');

  return (
    <DashboardShell username={s.username} isAdmin={isAdmin}>
      {children}
    </DashboardShell>
  );
}
