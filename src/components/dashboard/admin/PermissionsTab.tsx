'use client';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, CircularProgress, Divider,
  FormControlLabel, MenuItem, Paper, Snackbar, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { SaveOutlined, AddOutlined } from '@mui/icons-material';
import { adminApi } from '@/lib/api';
import type { Service } from '@/types/admin';

/**
 * Editor de RBAC por servicio: matriz rol × permiso.
 * El admin marca qué permisos tiene cada rol en cada servicio; se guarda en
 * Service.rolePermissions (fuente de verdad que consumen forms/sync).
 */
export function PermissionsTab() {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceKey, setServiceKey] = useState('');
  const [matrix, setMatrix] = useState<Record<string, Set<string>>>({});
  const [catalog, setCatalog] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [newPerm, setNewPerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState<{ msg: string; sev: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const svc = await adminApi.listServices();
      setServices(svc);
      if (svc.length && !serviceKey) setServiceKey(svc[0].key);
    } catch {
      setSnack({ msg: 'Error cargando servicios', sev: 'error' });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  // Al cambiar el servicio, poblar la matriz desde rolePermissions
  useEffect(() => {
    const svc = services.find((s) => s.key === serviceKey);
    if (!svc) return;
    setCatalog(svc.permissionCatalog ?? []);
    setRoles(svc.availableRoles ?? []);
    const rp = svc.rolePermissions ?? {};
    const m: Record<string, Set<string>> = {};
    for (const role of svc.availableRoles ?? []) {
      m[role] = new Set(rp[role] ?? []);
    }
    setMatrix(m);
  }, [serviceKey, services]);

  const toggle = (role: string, perm: string) => {
    setMatrix((prev) => {
      const next = { ...prev };
      const set = new Set(next[role] ?? []);
      if (set.has(perm)) set.delete(perm); else set.add(perm);
      next[role] = set;
      return next;
    });
  };

  const addPermission = () => {
    const p = newPerm.trim();
    if (!p || catalog.includes(p)) return;
    setCatalog((prev) => [...prev, p]);
    setNewPerm('');
  };

  const handleSave = async () => {
    const svc = services.find((s) => s.key === serviceKey);
    if (!svc) return;
    setSaving(true);
    try {
      const rolePermissions: Record<string, string[]> = {};
      for (const role of roles) rolePermissions[role] = Array.from(matrix[role] ?? []);
      await adminApi.updateService(svc.id, { permissionCatalog: catalog, rolePermissions });
      setSnack({ msg: `Permisos de '${serviceKey}' guardados`, sev: 'success' });
      await load();
    } catch (err: unknown) {
      setSnack({ msg: (err as { message?: string }).message ?? 'Error al guardar', sev: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} mb={2} flexWrap="wrap">
        <Typography variant="h6" fontWeight={700}>Roles y Permisos</Typography>
        <TextField
          select size="small" label="Servicio" value={serviceKey}
          onChange={(e) => setServiceKey(e.target.value)} sx={{ minWidth: 240 }}
        >
          {services.map((s) => (
            <MenuItem key={s.key} value={s.key}>{s.displayName} ({s.key})</MenuItem>
          ))}
        </TextField>
        <Box flex={1} />
        <Button
          variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlined />}
          onClick={handleSave} disabled={saving}
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        Marca qué permisos tiene cada rol en este servicio. Es la fuente de verdad: forms y sync
        los consumen del IAM (se refleja tras expirar su caché, ~5 min, o al renovar sesión).
      </Alert>

      {roles.length === 0 || catalog.length === 0 ? (
        <Typography color="text.secondary">Este servicio no tiene roles o permisos configurados.</Typography>
      ) : (
        <Paper variant="outlined" sx={{ overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, position: 'sticky', left: 0, bgcolor: 'background.paper' }}>
                  Permiso \ Rol
                </TableCell>
                {roles.map((r) => (
                  <TableCell key={r} align="center" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {catalog.map((perm) => (
                <TableRow key={perm} hover>
                  <TableCell sx={{ fontFamily: 'monospace', position: 'sticky', left: 0, bgcolor: 'background.paper' }}>
                    {perm}
                  </TableCell>
                  {roles.map((role) => (
                    <TableCell key={role} align="center" padding="none">
                      <Checkbox
                        size="small"
                        checked={matrix[role]?.has(perm) ?? false}
                        onChange={() => toggle(role, perm)}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Divider sx={{ my: 2 }} />
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          size="small" label="Nuevo permiso (ej. create:form)" value={newPerm}
          onChange={(e) => setNewPerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addPermission(); }}
        />
        <Button startIcon={<AddOutlined />} onClick={addPermission} disabled={!newPerm.trim()}>
          Añadir permiso
        </Button>
      </Stack>

      <Snackbar
        open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snack ? <Alert severity={snack.sev} onClose={() => setSnack(null)}>{snack.msg}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
