'use client';
import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from '@/styles/theme';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
