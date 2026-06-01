'use client';
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main:  '#1565C0',   // Azul corporativo — identidad IAM
      light: '#42A5F5',
      dark:  '#0D47A1',
    },
    secondary: {
      main: '#00897B',
    },
    background: {
      default: '#F5F7FA',
      paper:   '#FFFFFF',
    },
    error: {
      main: '#D32F2F',
    },
    success: {
      main: '#2E7D32',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight:    600,
          borderRadius:  8,
        },
        containedPrimary: {
          boxShadow: '0 2px 8px rgba(21,101,192,0.3)',
          '&:hover': { boxShadow: '0 4px 12px rgba(21,101,192,0.4)' },
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
    MuiCard: {
      styleOverrides: {
        root: { boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: 12 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
  },
});
