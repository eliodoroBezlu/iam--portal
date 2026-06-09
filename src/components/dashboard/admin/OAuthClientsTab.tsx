'use client';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, Stack,
  Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material';
import {
  AddOutlined, ContentCopyOutlined, DeleteOutlineOutlined,
  RefreshOutlined, WarningAmberOutlined, VpnKeyOutlined,
} from '@mui/icons-material';
import { oauthClientsApi } from '@/lib/api';
import type { OAuthClient } from '@/types/admin';

interface SnackState { open: boolean; message: string; severity: 'success' | 'error' }
const CLOSED: SnackState = { open: false, message: '', severity: 'success' };

export function OAuthClientsTab() {
  const [clients,  setClients]  = useState<OAuthClient[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [snack,    setSnack]    = useState<SnackState>(CLOSED);
  const [creating, setCreating] = useState(false);
  const [busy,     setBusy]     = useState<string | null>(null);
  // Secret revelado (creación o rotación) — mostrado una sola vez
  const [revealed, setRevealed] = useState<{ clientId: string; secret: string } | null>(null);

  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, message, severity });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setClients(await oauthClientsApi.list());
    } catch {
      notify('Error cargando OAuth clients', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    setBusy(id);
    try {
      await oauthClientsApi.remove(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
      notify('OAuth client eliminado');
    } catch {
      notify('Error eliminando client', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleRotate = async (client: OAuthClient) => {
    setBusy(client.id);
    try {
      const res = await oauthClientsApi.rotateSecret(client.id);
      setRevealed({ clientId: client.clientId, secret: res.clientSecret });
    } catch {
      notify('Error rotando secret', 'error');
    } finally {
      setBusy(null);
    }
  };

  const fmt = (d?: string) =>
    d ? new Date(d).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle1" fontWeight={700}>
          OAuth / OIDC Clients ({clients.length})
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Recargar">
            <IconButton size="small" onClick={load} disabled={loading}><RefreshOutlined /></IconButton>
          </Tooltip>
          <Button
            type="button" variant="contained" size="small"
            startIcon={<AddOutlined />}
            onClick={() => setCreating(true)}
          >
            Nuevo client
          </Button>
        </Stack>
      </Stack>

      {snack.open && (
        <Alert severity={snack.severity} onClose={() => setSnack(CLOSED)} sx={{ mb: 2, borderRadius: 2 }}>
          {snack.message}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
              <TableCell>Client ID</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Redirect URIs</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Creado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No hay OAuth clients registrados.
                </TableCell>
              </TableRow>
            ) : (
              clients.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>
                    <Chip label={c.clientId} size="small" color="primary" variant="outlined"
                      sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
                  </TableCell>
                  <TableCell><Typography variant="body2">{c.name}</Typography></TableCell>
                  <TableCell>
                    <Stack spacing={0.3}>
                      {c.redirectUris.map((u) => (
                        <Typography key={u} variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {u}
                        </Typography>
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={c.isConfidential ? 'Confidential' : 'Público (PKCE)'}
                      size="small"
                      color={c.isConfidential ? 'default' : 'info'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={c.isActive ? 'Activo' : 'Inactivo'}
                      size="small"
                      color={c.isActive ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{fmt(c.createdAt)}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      {c.isConfidential && (
                        <Tooltip title="Rotar secret">
                          <span>
                            <IconButton
                              size="small" color="warning"
                              disabled={busy === c.id}
                              onClick={() => handleRotate(c)}
                            >
                              {busy === c.id ? <CircularProgress size={16} /> : <VpnKeyOutlined fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                      <Tooltip title="Eliminar client">
                        <span>
                          <IconButton
                            size="small" color="error"
                            disabled={busy === c.id}
                            onClick={() => handleDelete(c.id)}
                          >
                            <DeleteOutlineOutlined fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <CreateOAuthClientDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(clientId, secret) => {
          load();
          if (secret) setRevealed({ clientId, secret });
        }}
        notify={notify}
      />

      {/* Secret revelado una sola vez (creación o rotación) */}
      <SecretDialog
        open={!!revealed}
        clientId={revealed?.clientId ?? ''}
        secret={revealed?.secret ?? ''}
        onClose={() => setRevealed(null)}
      />
    </Box>
  );
}

// ── CreateOAuthClientDialog ───────────────────────────────────────────

interface CreateDialogProps {
  open:      boolean;
  onClose:   () => void;
  onCreated: (clientId: string, secret?: string) => void;
  notify:    (msg: string, sev?: 'success' | 'error') => void;
}

const ALL_SCOPES = ['openid', 'profile', 'email'];

function CreateOAuthClientDialog({ open, onClose, onCreated, notify }: CreateDialogProps) {
  const [name,            setName]            = useState('');
  const [redirectUris,    setRedirectUris]    = useState('');
  const [postLogout,      setPostLogout]      = useState('');
  const [isConfidential,  setIsConfidential]  = useState(true);
  const [saving,          setSaving]          = useState(false);

  const reset = () => {
    setName(''); setRedirectUris(''); setPostLogout(''); setIsConfidential(true);
  };
  const handleClose = () => { reset(); onClose(); };

  const toArray = (s: string) =>
    s.split(/[\n,]/).map((u) => u.trim()).filter(Boolean);

  const handleSubmit = async () => {
    const uris = toArray(redirectUris);
    if (!name.trim())  { notify('El nombre es requerido', 'error'); return; }
    if (uris.length === 0) { notify('Al menos un redirect URI', 'error'); return; }

    setSaving(true);
    try {
      const res = await oauthClientsApi.create({
        name:                   name.trim(),
        redirectUris:           uris,
        postLogoutRedirectUris: toArray(postLogout),
        allowedScopes:          ALL_SCOPES,
        isConfidential,
      });
      onCreated(res.client.clientId, res.clientSecret);
      handleClose();
      notify('OAuth client creado');
    } catch (err: unknown) {
      notify((err as { message?: string }).message ?? 'Error creando client', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>Nuevo OAuth Client</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} mt={1}>
          <TextField
            label="Nombre"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            fullWidth
            placeholder="Ej: FormNext (Formularios)"
          />
          <TextField
            label="Redirect URIs (uno por línea)"
            value={redirectUris}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRedirectUris(e.target.value)}
            fullWidth multiline minRows={2}
            placeholder={'https://app.ejemplo.com/api/auth/callback'}
          />
          <TextField
            label="Post-logout Redirect URIs (opcional, uno por línea)"
            value={postLogout}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPostLogout(e.target.value)}
            fullWidth multiline minRows={1}
            placeholder={'https://app.ejemplo.com/'}
          />
          <TextField
            select
            label="Tipo de client"
            value={isConfidential ? 'confidential' : 'public'}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsConfidential(e.target.value === 'confidential')}
            fullWidth
            SelectProps={{ native: true }}
            helperText="Confidential = con secret (apps con backend). Público = solo PKCE (SPA/móvil)."
          >
            <option value="confidential">Confidential (con secret)</option>
            <option value="public">Público (solo PKCE)</option>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button type="button" onClick={handleClose} disabled={saving}>Cancelar</Button>
        <Button
          type="button" variant="contained" onClick={handleSubmit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <AddOutlined />}
        >
          {saving ? 'Creando…' : 'Crear'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── SecretDialog (mostrado una sola vez) ──────────────────────────────

interface SecretDialogProps {
  open:     boolean;
  clientId: string;
  secret:   string;
  onClose:  () => void;
}

function SecretDialog({ open, clientId, secret, onClose }: SecretDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>Client secret generado</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Alert severity="warning" icon={<WarningAmberOutlined />} sx={{ borderRadius: 2 }}>
            Este secret solo se muestra una vez. Guárdalo en un lugar seguro
            (configúralo como <code>OIDC_CLIENT_SECRET</code> en el client).
          </Alert>
          <Typography variant="caption" color="text.secondary">
            Client ID: <strong style={{ fontFamily: 'monospace' }}>{clientId}</strong>
          </Typography>
          <Box
            sx={{
              p: 2, borderRadius: 2, bgcolor: 'grey.900',
              fontFamily: 'monospace', fontSize: '0.8rem',
              color: 'success.light', wordBreak: 'break-all',
              position: 'relative',
            }}
          >
            {secret}
            <Tooltip title={copied ? '¡Copiado!' : 'Copiar'}>
              <IconButton
                size="small" onClick={handleCopy}
                sx={{ position: 'absolute', top: 4, right: 4, color: 'grey.400' }}
              >
                <ContentCopyOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button type="button" variant="contained" onClick={onClose}>Listo, lo guardé</Button>
      </DialogActions>
    </Dialog>
  );
}
