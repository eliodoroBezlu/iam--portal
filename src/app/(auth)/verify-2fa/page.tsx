import { Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';
import { Verify2faForm } from '@/components/auth/Verify2faForm';

export const metadata = { title: 'Verificación 2FA — IAM Portal' };

// En Next.js 15 los searchParams son una Promise
export default async function Verify2faPage({
  searchParams,
}: {
  searchParams: Promise<{ tempToken?: string }>;
}) {
  const { tempToken } = await searchParams;

  return (
    // Verify2faForm usa useSearchParams() → requiere Suspense boundary (Next.js 15)
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress />
        </Box>
      }
    >
      <Verify2faForm tempToken={tempToken ?? ''} />
    </Suspense>
  );
}
