'use client';
import React, { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, Alert,
  CircularProgress, Stack, TextField, InputAdornment,
} from '@mui/material';
import { ShieldOutlined, SecurityOutlined } from '@mui/icons-material';
import { verify2faAction } from '@/app/actions/auth';

interface Props {
  tempToken: string;
}

const ALLOWED_ORIGINS = (
  process.env.NEXT_PUBLIC_ALLOWED_REDIRECT_ORIGINS ??
  'http://localhost:3001,http://localhost:3005'
).split(',').map((o) => o.trim());

function sanitizeRedirect(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const allowed = ALLOWED_ORIGINS.some((o) => parsed.origin === new URL(o).origin);
    return allowed ? url : null;
  } catch {
    return url.startsWith('/') ? url : null;
  }
}

export function Verify2faForm({ tempToken }: Props) {
  const router              = useRouter();
  const searchParams        = useSearchParams();
  const redirectParam       = sanitizeRedirect(searchParams.get('redirect'));
  const [code, setCode]     = useState('');
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef            = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      setError('Ingresa el código de 6 dígitos.');
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await verify2faAction(tempToken, code);
      if (!result.ok) {
        setError(result.error);
        setCode('');
        setTimeout(() => inputRef.current?.focus(), 50);
        return;
      }
      // Cookies ya sincronizadas por la Server Action
      const targetUrl = redirectParam || '/dashboard';
      router.push(targetUrl);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      sx={{
        width:     '100%',
        maxWidth:  400,
        borderRadius: 3,
        boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
      }}
    >
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>

        {/* Header */}
        <Stack alignItems="center" spacing={1} mb={3}>
          <Box
            sx={{
              width: 56, height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2E7D32, #66BB6A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ShieldOutlined sx={{ color: 'white', fontSize: 28 }} />
          </Box>
          <Typography variant="h5" fontWeight={700} color="primary.dark">
            Verificación 2FA
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Ingresa el código de 6 dígitos de tu aplicación autenticadora.
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={3}>
            <TextField
              inputRef={inputRef}
              value={code}
              onChange={handleChange}
              label="Código de verificación"
              placeholder="000000"
              fullWidth
              autoFocus
              autoComplete="one-time-code"
              inputMode="numeric"
              error={!!error}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SecurityOutlined color={error ? 'error' : 'action'} fontSize="small" />
                  </InputAdornment>
                ),
                sx: {
                  letterSpacing: '0.5em',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  textAlign: 'center',
                },
              }}
              inputProps={{ maxLength: 6, style: { textAlign: 'center' } }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading || code.length < 6}
              sx={{ py: 1.4 }}
            >
              {loading
                ? <CircularProgress size={22} color="inherit" />
                : 'Verificar'}
            </Button>

            <Button
              type="button"
              variant="text"
              fullWidth
              size="small"
              color="inherit"
              onClick={() => router.push(`/login${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ''}`)}
              sx={{ color: 'text.secondary' }}
            >
              Volver al inicio de sesión
            </Button>
          </Stack>
        </Box>

      </CardContent>
    </Card>
  );
}
