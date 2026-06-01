import React from 'react';
import { Box } from '@mui/material';

/**
 * Layout de autenticación — fondo degradado, centra el formulario.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight:       '100vh',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        background:      'linear-gradient(135deg, #0D47A1 0%, #1565C0 40%, #1976D2 100%)',
        px:              2,
      }}
    >
      {children}
    </Box>
  );
}
