'use client';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, Stack, Switch,
  Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography, Alert,
} from '@mui/material';
import {
  AddOutlined, RefreshOutlined, LinkOutlined,
  EditOutlined, DeleteOutlined,
} from '@mui/icons-material';
import { adminApi } from '@/lib/api';
import type { Service } from '@/types/admin';

// ── Snackbar / notify ─────────────────────────────────────────────────

interface SnackState { open: boolean; message: string; severity: 'success' | 'error' }
const CLOSED: SnackState = { open: false, message: '', severity: 'success' };

// ── Main ──────────────────────────────────────────────────────────────

export function ServicesTab() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [snack,    setSnack]    = useState<SnackState>(CLOSED);
  const [creating, setCreating] = useState(false);
  const [editing,  setEditing]  = useState<Service | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);

  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, message, severity });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setServices(await adminApi.listServices());
    } catch {
      notify('Error cargando servicios', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (svc: Service) => {
    try {
      const updated = await adminApi.toggleService(svc.id, !svc.isActive);
      setServices((prev) => prev.map((s) => s.id === svc.id ? updated : s));
      notify(`Servicio ${updated.isActive ? 'activado' : 'desactivado'}`);
    } catch {
      notify('Error actualizando servicio', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleting) return;
    try {
      await adminApi.deleteService(deleting.id);
      setServices((prev) => prev.filter((s) => s.id !== deleting.id));
      notify(`Servicio '${deleting.key}' eliminado`);
      setDeleting(null);
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? 'Error eliminando servicio';
      notify(msg, 'error');
    }
  };

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle1" fontWeight={700}>
          Servicios registrados ({services.length})
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Recargar">
            <IconButton size="small" onClick={load} disabled={loading}>
              <RefreshOutlined />
            </IconButton>
          </Tooltip>
          <Button
            type="button"
            variant="contained"
            size="small"
            startIcon={<AddOutlined />}
            onClick={() => setCreating(true)}
          >
            Nuevo servicio
          </Button>
        </Stack>
      </Stack>

      {snack.open && (
        <Alert severity={snack.severity} onClose={() => setSnack(CLOSED)} sx={{ mb: 2, borderRadius: 2 }}>
          {snack.message}
        </Alert>
      )}

      {/* Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
              <TableCell>Clave</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>URL Base</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Creado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No hay servicios registrados.
                </TableCell>
              </TableRow>
            ) : (
              services.map((svc) => (
                <TableRow key={svc.id} hover>
                  <TableCell>
                    <Chip label={svc.key} size="small" variant="outlined" color="primary"
                      sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{svc.displayName}</Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <LinkOutlined fontSize="small" color="action" />
                      <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                        {svc.baseUrl}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Switch
                        size="small"
                        checked={svc.isActive}
                        onChange={() => handleToggle(svc)}
                        color="success"
                      />
                      <Chip
                        label={svc.isActive ? 'Activo' : 'Inactivo'}
                        size="small"
                        color={svc.isActive ? 'success' : 'default'}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(svc.createdAt).toLocaleDateString('es-CL')}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => setEditing(svc)}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => setDeleting(svc)}>
                          <DeleteOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* Create dialog */}
      <CreateServiceDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(svc) => {
          setServices((prev) => [...prev, svc]);
          setCreating(false);
          notify(`Servicio '${svc.key}' creado`);
        }}
        notify={notify}
      />

      {/* Edit dialog */}
      {editing && (
        <EditServiceDialog
          service={editing}
          onClose={() => setEditing(null)}
          onUpdated={(svc) => {
            setServices((prev) => prev.map((s) => s.id === svc.id ? svc : s));
            setEditing(null);
            notify(`Servicio '${svc.key}' actualizado`);
          }}
          notify={notify}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleting} onClose={() => setDeleting(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700} color="error.main">Eliminar servicio</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Eliminar el servicio <strong>{deleting?.key}</strong>? Esta acción revocará todos los
            accesos de usuario asociados. No se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button type="button" onClick={() => setDeleting(null)}>Cancelar</Button>
          <Button type="button" variant="contained" color="error" onClick={handleDeleteConfirm}
            startIcon={<DeleteOutlined />}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── CreateServiceDialog ───────────────────────────────────────────────

interface CreateDialogProps {
  open:      boolean;
  onClose:   () => void;
  onCreated: (svc: Service) => void;
  notify:    (msg: string, sev?: 'success' | 'error') => void;
}

function CreateServiceDialog({ open, onClose, onCreated, notify }: CreateDialogProps) {
  const [form,   setForm]   = useState({ key: '', displayName: '', baseUrl: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleClose = () => {
    setForm({ key: '', displayName: '', baseUrl: '' });
    setErrors({});
    onClose();
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.key.trim())         e.key         = 'Requerido';
    if (!form.displayName.trim()) e.displayName = 'Requerido';
    if (!form.baseUrl.trim())     e.baseUrl     = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const svc = await adminApi.createService({
        key:         form.key.trim().toLowerCase(),
        displayName: form.displayName.trim(),
        baseUrl:     form.baseUrl.trim(),
      });
      onCreated(svc);
      handleClose();
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? 'Error creando servicio';
      notify(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>Nuevo servicio</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} mt={1}>
          <TextField
            label="Clave (key)"
            value={form.key}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, key: e.target.value }))}
            error={!!errors.key}
            helperText={errors.key ?? 'Identificador único. Ej: forms, ero-isop'}
            fullWidth
            inputProps={{ style: { fontFamily: 'monospace' } }}
          />
          <TextField
            label="Nombre visible"
            value={form.displayName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            error={!!errors.displayName}
            helperText={errors.displayName}
            fullWidth
          />
          <TextField
            label="URL Base"
            value={form.baseUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
            error={!!errors.baseUrl}
            helperText={errors.baseUrl ?? 'Ej: http://localhost:3002'}
            fullWidth
            placeholder="http://localhost:3002"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button type="button" onClick={handleClose} disabled={saving}>Cancelar</Button>
        <Button
          type="button"
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <AddOutlined />}
        >
          {saving ? 'Creando…' : 'Crear servicio'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── EditServiceDialog ─────────────────────────────────────────────────

interface EditDialogProps {
  service:    Service;
  onClose:    () => void;
  onUpdated:  (svc: Service) => void;
  notify:     (msg: string, sev?: 'success' | 'error') => void;
}

function EditServiceDialog({ service, onClose, onUpdated, notify }: EditDialogProps) {
  const [form,   setForm]   = useState({
    displayName: service.displayName,
    baseUrl:     service.baseUrl,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.displayName.trim() || !form.baseUrl.trim()) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateService(service.id, {
        displayName: form.displayName.trim(),
        baseUrl:     form.baseUrl.trim(),
      });
      onUpdated(updated);
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? 'Error actualizando servicio';
      notify(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>
        Editar servicio —{' '}
        <Chip label={service.key} size="small" variant="outlined" color="primary"
          sx={{ fontFamily: 'monospace', fontWeight: 700, ml: 0.5 }} />
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} mt={1}>
          <TextField
            label="Nombre visible"
            value={form.displayName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((f) => ({ ...f, displayName: e.target.value }))}
            fullWidth
          />
          <TextField
            label="URL Base"
            value={form.baseUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((f) => ({ ...f, baseUrl: e.target.value }))}
            fullWidth
            placeholder="http://localhost:3002"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button type="button" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button
          type="button"
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !form.displayName.trim() || !form.baseUrl.trim()}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <EditOutlined />}
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
