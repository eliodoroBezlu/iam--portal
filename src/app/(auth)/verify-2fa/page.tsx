import { Verify2faForm } from '@/components/auth/Verify2faForm';

export const metadata = { title: 'Verificación 2FA — IAM Portal' };

// En Next.js 15 los searchParams son una Promise
export default async function Verify2faPage({
  searchParams,
}: {
  searchParams: Promise<{ tempToken?: string }>;
}) {
  const { tempToken } = await searchParams;
  return <Verify2faForm tempToken={tempToken ?? ''} />;
}
