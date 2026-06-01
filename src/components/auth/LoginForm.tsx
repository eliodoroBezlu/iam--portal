'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm }    from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }          from 'zod';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, CircularProgress, InputAdornment, IconButton,
  Divider, Stack,
} from '@mui/material';
import {
  LockOutlined, PersonOutlined, VisibilityOutlined,
  VisibilityOffOutlined, SecurityOutlined, FingerprintOutlined,
} from '@mui/icons-material';
import { loginAction, getWebAuthnAuthOptionsAction, verifyWebAuthnAuthAction } from '@/app/actions/auth';
import {
  startAuthentication, browserSupportsWebAuthn,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';

// ── Schema de validación ───────────────────────────────────────────

const loginSchema = z.object({
  username: z.string().min(1, 'El usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ── Componente ─────────────────────────────────────────────────────

// Dominios permitidos para redirigir después del login (open redirect protection)
const ALLOWED_ORIGINS = (
  process.env.NEXT_PUBLIC_ALLOWED_REDIRECT_ORIGINS ??
  'http://localhost:3001,http://localhost:3005'
).split(',').map((o) => o.trim());

function sanitizeRedirect(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const allowed = ALLOWED_ORIGINS.some(
      (origin) => parsed.origin === new URL(origin).origin,
    );
    return allowed ? url : null;
  } catch {
    // relative paths are always safe
    return url.startsWith('/') ? url : null;
  }
}

export function LoginForm() {
  const router                          = useRouter();
  const searchParams                    = useSearchParams();
  const redirectParam                   = sanitizeRedirect(searchParams.get('redirect'));
  const [showPassword, setShowPassword] = useState(false);
  const [apiError,     setApiError]     = useState<string | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode:     'onTouched',
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    const result = await loginAction(data.username, data.password);

    if (!result.ok) {
      setApiError(result.error);
      return;
    }

    if (result.requires2FA) {
      router.push(`/verify-2fa?tempToken=${encodeURIComponent(result.tempToken)}${redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''}`);
      return;
    }

    const targetUrl = redirectParam || '/dashboard';
    router.push(targetUrl);
    router.refresh();
  };

  // ── WebAuthn / Passkey login ───────────────────────────────────

  const handlePasskeyLogin = async () => {
    setApiError(null);
    setPasskeyLoading(true);
    try {
      // 1. Obtener opciones a través de la Server Action segura
      const optResult = await getWebAuthnAuthOptionsAction();
      if (!optResult.ok) {
        setApiError(optResult.error);
        return;
      }

      // 2. Iniciar autenticación nativa en el navegador
      const response = await startAuthentication({ optionsJSON: optResult.options as PublicKeyCredentialRequestOptionsJSON });

      // 3. Verificar la firma y sincronizar cookies usando la Server Action segura
      const verifyResult = await verifyWebAuthnAuthAction(optResult.sessionKey, response);
      if (!verifyResult.ok) {
        setApiError(verifyResult.error);
        return;
      }

      // 4. Redirigir al dashboard o al servicio de origen
      const targetUrl = redirectParam || '/dashboard';
      router.push(targetUrl);
      router.refresh();
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? '';
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('abort')) {
        setApiError(msg || 'Autenticación con passkey fallida. Intenta con contraseña.');
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  const webAuthnSupported = typeof window !== 'undefined' && browserSupportsWebAuthn();

  return (
    <Card
      sx={{
        width:    '100%',
        maxWidth: 420,
        borderRadius: 3,
        boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
      }}
    >
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>

        {/* Logo / Header */}
        <Stack alignItems="center" spacing={1} mb={3}>
          <Box
            sx={{
              width:  56, height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1565C0, #42A5F5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <SecurityOutlined sx={{ color: 'white', fontSize: 28 }} />
          </Box>
          <Typography variant="h5" fontWeight={700} color="primary.dark">
            Iniciar sesión
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sistema de Gestión San Cristóbal
          </Typography>
        </Stack>

        {/* Error de API */}
        {apiError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setApiError(null)}>
            {apiError}
          </Alert>
        )}

        {/* Formulario */}
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2.5}>

            {/* Usuario */}
            <TextField
              {...register('username')}
              label="Usuario"
              fullWidth
              autoFocus
              autoComplete="username"
              error={!!errors.username}
              helperText={errors.username?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlined color={errors.username ? 'error' : 'action'} fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            {/* Contraseña */}
            <TextField
              {...register('password')}
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined color={errors.password ? 'error' : 'action'} fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      size="small"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword
                        ? <VisibilityOffOutlined fontSize="small" />
                        : <VisibilityOutlined   fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Botón de login */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isSubmitting || passkeyLoading}
              sx={{ mt: 1, py: 1.4 }}
            >
              {isSubmitting
                ? <CircularProgress size={22} color="inherit" />
                : 'Ingresar'}
            </Button>

          </Stack>
        </Box>

        {/* Passkey login — only shown if WebAuthn is supported */}
        {webAuthnSupported && (
          <>
            <Divider sx={{ my: 2.5 }}>
              <Typography variant="caption" color="text.disabled">o</Typography>
            </Divider>

            <Button
              type="button"
              variant="outlined"
              fullWidth
              size="large"
              onClick={handlePasskeyLogin}
              disabled={passkeyLoading || isSubmitting}
              startIcon={passkeyLoading
                ? <CircularProgress size={18} />
                : <FingerprintOutlined />}
              sx={{ py: 1.3, borderRadius: 2 }}
            >
              {passkeyLoading ? 'Verificando…' : 'Ingresar con passkey / huella'}
            </Button>
          </>
        )}

        <Divider sx={{ my: 3 }} />

        <Typography variant="caption" color="text.disabled" align="center" display="block">
          ¿Olvidaste tu contraseña? Contacta al administrador del sistema.
        </Typography>

      </CardContent>
    </Card>
  );
}
