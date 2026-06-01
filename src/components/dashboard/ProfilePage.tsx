'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box, Grid, Card, CardContent, CardHeader, Typography,
  TextField, Button, Alert, Divider, Stack, Avatar,
  Chip, CircularProgress, Skeleton, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction,
  Snackbar,
} from '@mui/material';
import {
  PersonOutlined, LockOutlined, ShieldOutlined,
  ComputerOutlined, PhoneIphoneOutlined, DeleteOutlineOutlined,
  QrCodeOutlined, CheckCircleOutlined, VisibilityOutlined,
  VisibilityOffOutlined, InfoOutlined, FingerprintOutlined,
  AddOutlined,
} from '@mui/icons-material';
import { authApi, webAuthnApi, type WebAuthnCredential } from '@/lib/api';
import type { IamUser, Session, TotpSetupResponse } from '@/types';
import {
  startRegistration,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';

// ── Schemas ────────────────────────────────────────────────────────

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Requerido'),
  newPassword:     z.string().min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/,  'Debe contener una mayúscula')
    .regex(/[0-9]/,  'Debe contener un número')
    .regex(/[^A-Za-z0-9]/, 'Debe contener un carácter especial'),
  confirmPassword: z.string().min(1, 'Requerido'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path:    ['confirmPassword'],
});

const totpCodeSchema = z.object({
  code: z.string().length(6, 'El código debe tener 6 dígitos').regex(/^\d+$/, 'Solo dígitos'),
});

type PasswordFormData = z.infer<typeof passwordSchema>;
type TotpCodeData     = z.infer<typeof totpCodeSchema>;

// ── Snackbar helper ────────────────────────────────────────────────

interface SnackState { open: boolean; message: string; severity: 'success' | 'error' }
const closedSnack: SnackState = { open: false, message: '', severity: 'success' };

// ── Main component ─────────────────────────────────────────────────

export function ProfilePage() {
  const [user,     setUser]     = useState<IamUser | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [snack,    setSnack]    = useState<SnackState>(closedSnack);

  const notify = useCallback((message: string, severity: 'success' | 'error' = 'success') => {
    setSnack({ open: true, message, severity });
  }, []);

  const refreshUser = useCallback(async () => {
    const [me, sess] = await Promise.all([
      authApi.me(),
      authApi.getSessions(),
    ]);
    setUser(me);
    setSessions(sess);
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  if (loading) return <ProfileSkeleton />;
  if (!user)   return <Alert severity="error">No se pudo cargar el perfil.</Alert>;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={0.5}>
        Mi perfil
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Gestiona tu cuenta, seguridad y sesiones activas.
      </Typography>

      <Grid container spacing={3}>

        {/* ── Info card ─────────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 4 }}>
          <UserInfoCard user={user} />
        </Grid>

        {/* ── Right column ──────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>

            <PasswordCard notify={notify} />

            <TotpCard
              totpEnabled={user.totpEnabled}
              notify={notify}
              onSuccess={refreshUser}
            />

            <PasskeysCard notify={notify} />

            <SessionsCard
              sessions={sessions}
              notify={notify}
              onRevoke={refreshUser}
            />

          </Stack>
        </Grid>

      </Grid>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(closedSnack)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack(closedSnack)}
          sx={{ borderRadius: 2, boxShadow: 4 }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ── UserInfoCard ───────────────────────────────────────────────────

function UserInfoCard({ user }: { user: IamUser }) {
  return (
    <Card sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Stack alignItems="center" spacing={2} mb={3}>
          <Avatar
            sx={{
              width: 80, height: 80,
              bgcolor: 'primary.main',
              fontSize: '2rem',
              fontWeight: 700,
            }}
          >
            {user.username.charAt(0).toUpperCase()}
          </Avatar>
          <Box textAlign="center">
            <Typography variant="h6" fontWeight={700}>{user.username}</Typography>
            {user.email && (
              <Typography variant="body2" color="text.secondary">{user.email}</Typography>
            )}
          </Box>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Stack spacing={1.5}>
          <InfoRow label="Roles">
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {user.roles.map((r) => (
                <Chip
                  key={r}
                  label={r}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                />
              ))}
            </Stack>
          </InfoRow>

          <InfoRow label="Estado">
            <Chip
              label={user.isActive ? 'Activo' : 'Inactivo'}
              size="small"
              color={user.isActive ? 'success' : 'error'}
              sx={{ fontWeight: 600 }}
            />
          </InfoRow>

          <InfoRow label="2FA">
            <Chip
              label={user.totpEnabled ? 'Habilitado' : 'Deshabilitado'}
              size="small"
              color={user.totpEnabled ? 'success' : 'default'}
              icon={user.totpEnabled ? <CheckCircleOutlined /> : undefined}
              sx={{ fontWeight: 600 }}
            />
          </InfoRow>
        </Stack>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

// ── PasswordCard ───────────────────────────────────────────────────

function PasswordCard({ notify }: { notify: (msg: string, sev?: 'success' | 'error') => void }) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    mode: 'onTouched',
  });

  const onSubmit = async (data: PasswordFormData) => {
    try {
      await authApi.changePassword(data.currentPassword, data.newPassword);
      notify('Contraseña actualizada correctamente.');
      reset();
    } catch (err: any) {
      notify(err.message ?? 'No se pudo actualizar la contraseña.', 'error');
    }
  };

  return (
    <Card sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
      <CardHeader
        avatar={<LockOutlined color="primary" />}
        title="Cambiar contraseña"
        titleTypographyProps={{ fontWeight: 700 }}
      />
      <Divider />
      <CardContent sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2.5}>

            <TextField
              {...register('currentPassword')}
              label="Contraseña actual"
              type={showCurrent ? 'text' : 'password'}
              fullWidth
              autoComplete="current-password"
              error={!!errors.currentPassword}
              helperText={errors.currentPassword?.message}
              InputProps={{
                endAdornment: (
                  <IconButton size="small" onClick={() => setShowCurrent((v) => !v)}>
                    {showCurrent ? <VisibilityOffOutlined fontSize="small" /> : <VisibilityOutlined fontSize="small" />}
                  </IconButton>
                ),
              }}
            />

            <TextField
              {...register('newPassword')}
              label="Nueva contraseña"
              type={showNew ? 'text' : 'password'}
              fullWidth
              autoComplete="new-password"
              error={!!errors.newPassword}
              helperText={errors.newPassword?.message}
              InputProps={{
                endAdornment: (
                  <IconButton size="small" onClick={() => setShowNew((v) => !v)}>
                    {showNew ? <VisibilityOffOutlined fontSize="small" /> : <VisibilityOutlined fontSize="small" />}
                  </IconButton>
                ),
              }}
            />

            <TextField
              {...register('confirmPassword')}
              label="Confirmar nueva contraseña"
              type="password"
              fullWidth
              autoComplete="new-password"
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
            />

            <Box>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <LockOutlined />}
              >
                {isSubmitting ? 'Guardando…' : 'Actualizar contraseña'}
              </Button>
            </Box>

          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}

// ── TotpCard ───────────────────────────────────────────────────────

interface TotpCardProps {
  totpEnabled: boolean;
  notify:      (msg: string, sev?: 'success' | 'error') => void;
  onSuccess:   () => Promise<void>;
}

function TotpCard({ totpEnabled, notify, onSuccess }: TotpCardProps) {
  const [setupData,    setSetupData]    = useState<TotpSetupResponse | null>(null);
  const [disableOpen,  setDisableOpen]  = useState(false);
  const [loadingSetup, setLoadingSetup] = useState(false);

  const startSetup = async () => {
    setLoadingSetup(true);
    try {
      const data = await authApi.totpSetup();
      setSetupData(data);
    } catch (err: any) {
      notify(err.message ?? 'No se pudo iniciar la configuración 2FA.', 'error');
    } finally {
      setLoadingSetup(false);
    }
  };

  const handleSetupSuccess = async () => {
    setSetupData(null);
    await onSuccess();
    notify('Autenticación de dos factores habilitada.');
  };

  const handleDisableSuccess = async () => {
    setDisableOpen(false);
    await onSuccess();
    notify('Autenticación de dos factores deshabilitada.');
  };

  return (
    <>
      <Card sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
        <CardHeader
          avatar={<ShieldOutlined color={totpEnabled ? 'success' : 'action'} />}
          title="Autenticación de dos factores (2FA)"
          titleTypographyProps={{ fontWeight: 700 }}
          action={
            <Chip
              label={totpEnabled ? 'Activo' : 'Inactivo'}
              color={totpEnabled ? 'success' : 'default'}
              size="small"
              sx={{ fontWeight: 600, mr: 1, mt: 1 }}
            />
          }
        />
        <Divider />
        <CardContent sx={{ p: 3 }}>

          {!totpEnabled && !setupData && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Agrega una capa extra de seguridad usando una aplicación autenticadora
                (Google Authenticator, Authy, etc.).
              </Typography>
              <Box>
                <Button
                  variant="outlined"
                  startIcon={loadingSetup ? <CircularProgress size={16} /> : <QrCodeOutlined />}
                  onClick={startSetup}
                  disabled={loadingSetup}
                >
                  Configurar 2FA
                </Button>
              </Box>
            </Stack>
          )}

          {setupData && (
            <TotpSetupWizard
              setupData={setupData}
              onSuccess={handleSetupSuccess}
              onCancel={() => setSetupData(null)}
              notify={notify}
            />
          )}

          {totpEnabled && !setupData && (
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CheckCircleOutlined color="success" />
                <Typography variant="body2">
                  Tu cuenta está protegida con autenticación de dos factores.
                </Typography>
              </Stack>
              <Box>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setDisableOpen(true)}
                >
                  Deshabilitar 2FA
                </Button>
              </Box>
            </Stack>
          )}

        </CardContent>
      </Card>

      {/* Disable 2FA dialog */}
      <TotpActionDialog
        open={disableOpen}
        title="Deshabilitar 2FA"
        description="Ingresa tu código actual para confirmar la desactivación."
        actionLabel="Deshabilitar"
        actionColor="error"
        onClose={() => setDisableOpen(false)}
        onConfirm={async (code) => {
          await authApi.totpDisable(code);
          await handleDisableSuccess();
        }}
        notify={notify}
      />
    </>
  );
}

// ── TotpSetupWizard ────────────────────────────────────────────────

interface SetupWizardProps {
  setupData: TotpSetupResponse;
  onSuccess: () => void;
  onCancel:  () => void;
  notify:    (msg: string, sev?: 'success' | 'error') => void;
}

function TotpSetupWizard({ setupData, onSuccess, onCancel, notify }: SetupWizardProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TotpCodeData>({
    resolver: zodResolver(totpCodeSchema),
    mode: 'onTouched',
  });

  const onSubmit = async (data: TotpCodeData) => {
    try {
      await authApi.totpEnable(data.code);
      onSuccess();
    } catch (err: any) {
      notify(err.message ?? 'Código inválido. Intenta de nuevo.', 'error');
    }
  };

  return (
    <Stack spacing={3}>
      <Alert severity="info" icon={<InfoOutlined />} sx={{ borderRadius: 2 }}>
        Escanea el código QR con tu aplicación autenticadora y luego ingresa el código generado.
      </Alert>

      {/* QR Code */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          p: 2,
          border: '2px dashed',
          borderColor: 'primary.light',
          borderRadius: 2,
          bgcolor: 'grey.50',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={setupData.qrCodeUrl}
          alt="QR Code 2FA"
          style={{ width: 180, height: 180, imageRendering: 'pixelated' }}
        />
      </Box>

      {/* Manual key */}
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Clave manual (si no puedes escanear):
        </Typography>
        <Typography
          variant="body2"
          fontFamily="monospace"
          fontWeight={700}
          letterSpacing="0.1em"
          sx={{
            mt: 0.5, p: 1, borderRadius: 1,
            bgcolor: 'grey.100', userSelect: 'all',
          }}
        >
          {setupData.secret}
        </Typography>
      </Box>

      {/* Verify code */}
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={2}>
          <TextField
            {...register('code')}
            label="Código de verificación"
            inputMode="numeric"
            placeholder="000000"
            autoFocus
            autoComplete="one-time-code"
            error={!!errors.code}
            helperText={errors.code?.message}
            inputProps={{ maxLength: 6 }}
          />
          <Stack direction="row" spacing={1.5}>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              Activar 2FA
            </Button>
            <Button type="button" variant="outlined" onClick={onCancel}>
              Cancelar
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Stack>
  );
}

// ── TotpActionDialog ───────────────────────────────────────────────

interface TotpActionDialogProps {
  open:        boolean;
  title:       string;
  description: string;
  actionLabel: string;
  actionColor: 'error' | 'primary';
  onClose:     () => void;
  onConfirm:   (code: string) => Promise<void>;
  notify:      (msg: string, sev?: 'success' | 'error') => void;
}

function TotpActionDialog({
  open, title, description, actionLabel, actionColor,
  onClose, onConfirm, notify,
}: TotpActionDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TotpCodeData>({
    resolver: zodResolver(totpCodeSchema),
    mode: 'onTouched',
  });

  const onSubmit = async (data: TotpCodeData) => {
    try {
      await onConfirm(data.code);
      reset();
    } catch (err: any) {
      notify(err.message ?? 'Código inválido.', 'error');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>{title}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {description}
          </Typography>
          <TextField
            {...register('code')}
            label="Código 2FA"
            inputMode="numeric"
            placeholder="000000"
            autoFocus
            fullWidth
            autoComplete="one-time-code"
            error={!!errors.code}
            helperText={errors.code?.message}
            inputProps={{ maxLength: 6 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button type="button" onClick={() => { onClose(); reset(); }}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color={actionColor}
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={18} color="inherit" /> : actionLabel}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// ── SessionsCard ───────────────────────────────────────────────────

interface SessionsCardProps {
  sessions: Session[];
  notify:   (msg: string, sev?: 'success' | 'error') => void;
  onRevoke: () => Promise<void>;
}

function SessionsCard({ sessions, notify, onRevoke }: SessionsCardProps) {
  const [revoking, setRevoking] = useState(false);

  const handleRevokeAll = async () => {
    setRevoking(true);
    try {
      await authApi.revokeAllSessions();
      await onRevoke();
      notify('Todas las sesiones han sido cerradas.');
    } catch (err: any) {
      notify(err.message ?? 'No se pudieron cerrar las sesiones.', 'error');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Card sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
      <CardHeader
        avatar={<ComputerOutlined color="action" />}
        title="Sesiones activas"
        titleTypographyProps={{ fontWeight: 700 }}
        subheader={`${sessions.length} sesión(es) activa(s)`}
        action={
          sessions.length > 1 && (
            <Tooltip title="Cerrar todas las sesiones">
              <Button
                type="button"
                color="error"
                size="small"
                onClick={handleRevokeAll}
                disabled={revoking}
                sx={{ mt: 1, mr: 1 }}
              >
                {revoking ? <CircularProgress size={16} /> : 'Cerrar todas'}
              </Button>
            </Tooltip>
          )
        }
      />
      <Divider />
      <CardContent sx={{ p: 0 }}>
        {sessions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
            No hay sesiones activas.
          </Typography>
        ) : (
          <List disablePadding>
            {sessions.map((sess, idx) => (
              <React.Fragment key={sess.id}>
                <SessionItem session={sess} />
                {idx < sessions.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

// ── SessionItem ────────────────────────────────────────────────────

function SessionItem({ session }: { session: Session }) {
  const isMobile = /mobile|android|iphone|ipad/i.test(session.userAgent ?? '');
  const createdAt = new Date(session.createdAt);
  const lastUsed  = new Date(session.lastRefreshedAt);

  const formatDate = (d: Date) =>
    d.toLocaleDateString('es-CL', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <ListItem sx={{ px: 3, py: 1.5 }}>
      <ListItemIcon sx={{ minWidth: 40 }}>
        {isMobile
          ? <PhoneIphoneOutlined color="action" />
          : <ComputerOutlined   color="action" />}
      </ListItemIcon>
      <ListItemText
        primary={
          <Typography variant="body2" fontWeight={600} noWrap>
            {session.userAgent
              ? session.userAgent.slice(0, 60)
              : 'Dispositivo desconocido'}
          </Typography>
        }
        secondary={
          <Stack component="span" direction={{ xs: 'column', sm: 'row' }} spacing={{ sm: 2 }}>
            <Typography component="span" variant="caption" color="text.secondary">
              IP: {session.ipAddress ?? '—'}
            </Typography>
            <Typography component="span" variant="caption" color="text.secondary">
              Inicio: {formatDate(createdAt)}
            </Typography>
            <Typography component="span" variant="caption" color="text.secondary">
              Última actividad: {formatDate(lastUsed)}
            </Typography>
          </Stack>
        }
      />
    </ListItem>
  );
}

// ── PasskeysCard ───────────────────────────────────────────────────

function PasskeysCard({ notify }: { notify: (msg: string, sev?: 'success' | 'error') => void }) {
  const [creds,      setCreds]      = useState<WebAuthnCredential[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [registering, setRegistering] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [nameOpen,   setNameOpen]   = useState(false);
  const [supported,  setSupported]  = useState(true);

  const loadCreds = useCallback(async () => {
    setLoading(true);
    try {
      setCreds(await webAuthnApi.listCredentials());
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSupported(browserSupportsWebAuthn());
    loadCreds();
  }, [loadCreds]);

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const optionsJSON = await webAuthnApi.registrationOptions();
      const response    = await startRegistration({ optionsJSON });
      await webAuthnApi.registrationVerify(response, deviceName.trim() || undefined);
      notify('Passkey registrada correctamente.');
      setNameOpen(false);
      setDeviceName('');
      await loadCreds();
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? 'Error registrando passkey';
      // User cancelled the dialog → don't show error
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('abort')) {
        notify(msg, 'error');
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (credentialId: string) => {
    try {
      await webAuthnApi.deleteCredential(credentialId);
      notify('Passkey eliminada.');
      await loadCreds();
    } catch {
      notify('Error eliminando passkey', 'error');
    }
  };

  const deviceIcon = (type: string) =>
    /platform/i.test(type) ? <FingerprintOutlined color="primary" /> : <ComputerOutlined color="action" />;

  return (
    <>
      <Card sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
        <CardHeader
          avatar={<FingerprintOutlined color={creds.length > 0 ? 'success' : 'action'} />}
          title="Passkeys / Huella digital"
          titleTypographyProps={{ fontWeight: 700 }}
          subheader="Inicia sesión sin contraseña usando tu huella, Face ID o clave de seguridad."
          action={
            supported && (
              <Tooltip title="Registrar nueva passkey">
                <IconButton
                  onClick={() => setNameOpen(true)}
                  disabled={registering}
                  sx={{ mt: 1, mr: 1 }}
                >
                  <AddOutlined />
                </IconButton>
              </Tooltip>
            )
          }
        />
        <Divider />
        <CardContent sx={{ p: 0 }}>
          {!supported && (
            <Alert severity="warning" sx={{ m: 2, borderRadius: 2 }}>
              Tu navegador no soporta WebAuthn / Passkeys.
            </Alert>
          )}
          {loading ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress size={24} />
            </Box>
          ) : creds.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
              No tienes passkeys registradas.{' '}
              {supported && (
                <Typography
                  component="span"
                  variant="body2"
                  color="primary"
                  sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => setNameOpen(true)}
                >
                  Registrar una ahora
                </Typography>
              )}
            </Typography>
          ) : (
            <List disablePadding>
              {creds.map((cred, idx) => (
                <React.Fragment key={cred.id}>
                  <ListItem sx={{ px: 3, py: 1.5 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {deviceIcon(cred.deviceType)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={600}>
                          {cred.deviceName}
                        </Typography>
                      }
                      secondary={
                        <Stack component="span" direction={{ xs: 'column', sm: 'row' }} spacing={{ sm: 2 }}>
                          <Typography component="span" variant="caption" color="text.secondary">
                            Tipo: {cred.deviceType}
                          </Typography>
                          <Typography component="span" variant="caption" color="text.secondary">
                            Registrada: {new Date(cred.createdAt).toLocaleDateString('es-CL')}
                          </Typography>
                          {cred.lastUsedAt && (
                            <Typography component="span" variant="caption" color="text.secondary">
                              Último uso: {new Date(cred.lastUsedAt).toLocaleDateString('es-CL')}
                            </Typography>
                          )}
                        </Stack>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Eliminar passkey">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(cred.credentialId)}
                        >
                          <DeleteOutlineOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {idx < creds.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Device name dialog before registration */}
      <Dialog open={nameOpen} onClose={() => setNameOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>Nombre del dispositivo</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Asigna un nombre para identificar esta passkey (opcional).
          </Typography>
          <TextField
            label="Nombre del dispositivo"
            value={deviceName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeviceName(e.target.value)}
            placeholder="Ej: MacBook, iPhone, YubiKey"
            fullWidth
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRegister(); } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button type="button" onClick={() => setNameOpen(false)}>Cancelar</Button>
          <Button
            type="button"
            variant="contained"
            onClick={handleRegister}
            disabled={registering}
            startIcon={registering ? <CircularProgress size={16} color="inherit" /> : <FingerprintOutlined />}
          >
            {registering ? 'Registrando…' : 'Registrar passkey'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ── Profile skeleton ───────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <Box>
      <Skeleton width={140} height={36} sx={{ mb: 1 }} />
      <Skeleton width={280} height={22} sx={{ mb: 3 }} />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            <Skeleton variant="rounded" height={220} sx={{ borderRadius: 3 }} />
            <Skeleton variant="rounded" height={160} sx={{ borderRadius: 3 }} />
            <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3 }} />
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
