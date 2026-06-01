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
  RefreshOutlined, WarningAmberOutlined,
} from '@mui/icons-material';
import { adminApi } from '@/lib/api';
import type { ApiKey, Service } from '@/types/admin';

interface SnackState { open: boolean; message: string; severity: 'success' | 'error' }
const CLOSED: SnackState = { open: false, message: '', severity: 'success' };

export function ApiKeysTab() {
  const [keys,      setKeys]      = useState<ApiKey[]>([]);
  const [services,  setServices]  = useState<Service[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [snack,     setSnack]     = useState<SnackState>(CLOSED);
  const [creating,  setCreating]  = useState(false);
  const [revoking,  setRevoking]  = useState<string | null>(null);

  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, message, severity });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [k, s] = await Promise.all([adminApi.listApiKeys(), adminApi.listServices()]);
      setKeys(k);
      setServices(s);
    } catch {
      notify('Error cargando API Keys', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await adminApi.revokeApiKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      notify('API Key revocada');
    } catch {
      notify('Error revocando key', 'error');
    } finally {
      setRevoking(null);
    }
  };

  const fmt = (d?: string) =>
    d ? new Date(d).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle1" fontWeight={700}>
          API Keys activas ({keys.length})
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
            Generar key
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
              <TableCell>Servicio</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Creada</TableCell>
              <TableCell>Último uso</TableCell>
              <TableCell>Expira</TableCell>
              <TableCell align="center">Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {keys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No hay API Keys activas.
                </TableCell>
              </TableRow>
            ) : (
              keys.map((k) => (
                <TableRow key={k.id} hover>
                  <TableCell>
                    <Chip label={k.service.key} size="small" color="primary" variant="outlined"
                      sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{k.description ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{fmt(k.createdAt)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{fmt(k.lastUsedAt)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color={k.expiresAt ? 'warning.main' : 'text.secondary'}>
                      {fmt(k.expiresAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Revocar key">
                      <span>
                        <IconButton
                          size="small" color="error"
                          disabled={revoking === k.id}
                          onClick={() => handleRevoke(k.id)}
                        >
                          {revoking === k.id
                            ? <CircularProgress size={16} />
                            : <DeleteOutlineOutlined fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <CreateApiKeyDialog
        open={creating}
        services={services}
        onClose={() => setCreating(false)}
        onCreated={() => {
          load(); // refresh list in background
          // NO cerrar aquí — el diálogo permanece abierto para que el usuario copie la key.
          // Se cierra solo cuando el usuario hace clic en "Listo, la guardé".
        }}
        notify={notify}
      />
    </Box>
  );
}

// ── CreateApiKeyDialog ────────────────────────────────────────────────

interface CreateDialogProps {
  open:      boolean;
  services:  Service[];
  onClose:   () => void;
  onCreated: (res: { apiKey: string; serviceKey: string }) => void;
  notify:    (msg: string, sev?: 'success' | 'error') => void;
}

function CreateApiKeyDialog({ open, services, onClose, onCreated, notify }: CreateDialogProps) {
  const [serviceKey,  setServiceKey]  = useState('');
  const [description, setDescription] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [rawKey,      setRawKey]      = useState<string | null>(null);
  const [copied,      setCopied]      = useState(false);

  const handleClose = () => {
    setServiceKey('');
    setDescription('');
    setRawKey(null);
    setCopied(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!serviceKey) { notify('Selecciona un servicio', 'error'); return; }
    setSaving(true);
    try {
      const res = await adminApi.createApiKey(serviceKey, description || undefined);
      setRawKey(res.apiKey);
      onCreated(res);
    } catch (err: unknown) {
      notify((err as { message?: string }).message ?? 'Error generando key', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (rawKey) {
      navigator.clipboard.writeText(rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>
        {rawKey ? '¡Key generada! Cópiala ahora' : 'Generar API Key'}
      </DialogTitle>
      <DialogContent>
        {rawKey ? (
          <Stack spacing={2} mt={1}>
            <Alert severity="warning" icon={<WarningAmberOutlined />} sx={{ borderRadius: 2 }}>
              Esta key solo se muestra una vez. Guárdala en un lugar seguro.
            </Alert>
            <Box
              sx={{
                p: 2, borderRadius: 2, bgcolor: 'grey.900',
                fontFamily: 'monospace', fontSize: '0.8rem',
                color: 'success.light', wordBreak: 'break-all',
                position: 'relative',
              }}
            >
              {rawKey}
              <Tooltip title={copied ? '¡Copiado!' : 'Copiar'}>
                <IconButton
                  size="small"
                  onClick={handleCopy}
                  sx={{ position: 'absolute', top: 4, right: 4, color: 'grey.400' }}
                >
                  <ContentCopyOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Stack>
        ) : (
          <Stack spacing={2.5} mt={1}>
            <TextField
              select
              label="Servicio"
              value={serviceKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setServiceKey(e.target.value)}
              fullWidth
              SelectProps={{ native: true }}
            >
              <option value="">-- Seleccionar --</option>
              {services.filter((s) => s.isActive).map((s) => (
                <option key={s.key} value={s.key}>{s.displayName} ({s.key})</option>
              ))}
            </TextField>
            <TextField
              label="Descripción (opcional)"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
              fullWidth
              placeholder="Ej: deploy CI/CD, servicio interno"
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        {rawKey ? (
          <Button type="button" variant="contained" onClick={handleClose}>
            Listo, la guardé
          </Button>
        ) : (
          <>
            <Button type="button" onClick={handleClose} disabled={saving}>Cancelar</Button>
            <Button
              type="button" variant="contained" onClick={handleSubmit}
              disabled={saving || !serviceKey}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <AddOutlined />}
            >
              {saving ? 'Generando…' : 'Generar'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
