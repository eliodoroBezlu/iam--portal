'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, InputAdornment, Menu, MenuItem,
  Pagination, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Tooltip, Typography,
  Divider, List, ListItem, ListItemText, ListItemSecondaryAction,
} from '@mui/material';
import {
  MoreVertOutlined, SearchOutlined, RefreshOutlined,
  PersonOffOutlined, PersonOutlined, LogoutOutlined,
  LockResetOutlined, ManageAccountsOutlined,
  AddCircleOutlineOutlined, RemoveCircleOutlineOutlined,
} from '@mui/icons-material';
import { adminApi } from '@/lib/api';
import type { AdminUser, UserListResponse, Service, UserServiceAccess } from '@/types/admin';

// ── Helpers ───────────────────────────────────────────────────────────

interface SnackState { open: boolean; message: string; severity: 'success' | 'error' }
const CLOSED: SnackState = { open: false, message: '', severity: 'success' };

const ROLE_COLOR: Record<string, 'error' | 'warning' | 'info' | 'default' | 'success'> = {
  super_admin: 'error',
  admin:       'warning',
  moderator:   'info',
  inspector:   'default',
  supervisor:  'default',
  tecnico:     'default',
  user:        'default',
};

function RoleChip({ role }: { role: string }) {
  return (
    <Chip
      key={role}
      label={role}
      size="small"
      color={ROLE_COLOR[role] ?? 'default'}
      sx={{ fontSize: '0.68rem', fontWeight: 700, height: 20 }}
    />
  );
}

// ── Main ──────────────────────────────────────────────────────────────

export function UsersTab() {
  const [resp,    setResp]    = useState<UserListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [snack,   setSnack]   = useState<SnackState>(CLOSED);
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);

  // Dialogs
  const [resetTarget,  setResetTarget]  = useState<AdminUser | null>(null);
  const [servicesUser, setServicesUser] = useState<AdminUser | null>(null);

  // Per-row action menu
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuUser,   setMenuUser]   = useState<AdminUser | null>(null);

  // Force logout confirmation
  const [forceLogoutTarget, setForceLogoutTarget] = useState<AdminUser | null>(null);
  const [forcingLogout,     setForcingLogout]     = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnack({ open: true, message, severity });

  const load = useCallback(async (pg: number, q: string) => {
    setLoading(true);
    try {
      const r = await adminApi.listUsers({ page: pg, limit: 15, search: q || undefined });
      setResp(r);
    } catch {
      notify('Error cargando usuarios', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      load(1, search);
    }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search, load]);

  useEffect(() => { load(page, search); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ────────────────────────────────────────────────────────

  const closeMenu = () => { setMenuAnchor(null); setMenuUser(null); };

  const handleToggleActive = async (user: AdminUser) => {
    closeMenu();
    try {
      if (user.isActive) {
        await adminApi.deactivateUser(user.id);
        notify(`${user.username} desactivado`);
      } else {
        await adminApi.activateUser(user.id);
        notify(`${user.username} activado`);
      }
      load(page, search);
    } catch {
      notify('Error actualizando estado', 'error');
    }
  };

  const confirmForceLogout = (user: AdminUser) => {
    closeMenu();
    setForceLogoutTarget(user);
  };

  const handleForceLogout = async () => {
    if (!forceLogoutTarget) return;
    setForcingLogout(true);
    try {
      const res = await adminApi.forceLogout(forceLogoutTarget.id) as { message: string };
      notify(res.message ?? `Sesiones de ${forceLogoutTarget.username} revocadas`);
      setForceLogoutTarget(null);
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? 'Error revocando sesiones';
      notify(msg, 'error');
    } finally {
      setForcingLogout(false);
    }
  };

  const users = resp?.data ?? [];
  const totalPages = resp?.meta.totalPages ?? 1;

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle1" fontWeight={700}>
          Usuarios ({resp?.meta.total ?? 0})
        </Typography>
        <Tooltip title="Recargar">
          <IconButton size="small" onClick={() => load(page, search)} disabled={loading}>
            <RefreshOutlined />
          </IconButton>
        </Tooltip>
      </Stack>

      {snack.open && (
        <Alert severity={snack.severity} onClose={() => setSnack(CLOSED)} sx={{ mb: 2, borderRadius: 2 }}>
          {snack.message}
        </Alert>
      )}

      {/* Search */}
      <TextField
        size="small"
        placeholder="Buscar por usuario, email o nombre…"
        value={search}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        sx={{ mb: 2, width: { xs: '100%', sm: 340 } }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchOutlined fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
      />

      {/* Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                <TableCell>Usuario</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>2FA</TableCell>
                <TableCell>Último login</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Sin usuarios{search ? ' con ese criterio' : ''}.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id} hover sx={{ opacity: u.isActive ? 1 : 0.55 }}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: '0.8rem', fontWeight: 700 }}>
                          {u.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{u.username}</Typography>
                          {u.email && (
                            <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                          )}
                          {u.fullName && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {u.fullName}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" gap={0.5} flexWrap="wrap">
                        {u.roles.map((r) => <RoleChip key={r} role={r} />)}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={u.isActive ? 'Activo' : 'Inactivo'}
                        size="small"
                        color={u.isActive ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={u.totpEnabled ? 'ON' : 'OFF'}
                        size="small"
                        color={u.totpEnabled ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
                          : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => { setMenuAnchor(e.currentTarget); setMenuUser(u); }}
                      >
                        <MoreVertOutlined fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_: React.ChangeEvent<unknown>, p: number) => setPage(p)}
                color="primary"
                size="small"
              />
            </Box>
          )}
        </>
      )}

      {/* Per-row action menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        PaperProps={{ elevation: 3, sx: { borderRadius: 2, minWidth: 200 } }}
      >
        {menuUser && [
          <MenuItem
            key="toggle"
            onClick={() => menuUser && handleToggleActive(menuUser)}
          >
            {menuUser.isActive
              ? <><PersonOffOutlined fontSize="small" sx={{ mr: 1.5, color: 'error.main' }} /><Typography variant="body2" color="error">Desactivar</Typography></>
              : <><PersonOutlined    fontSize="small" sx={{ mr: 1.5, color: 'success.main' }} /><Typography variant="body2" color="success.main">Activar</Typography></>
            }
          </MenuItem>,
          <MenuItem
            key="logout"
            onClick={() => menuUser && confirmForceLogout(menuUser)}
          >
            <LogoutOutlined fontSize="small" sx={{ mr: 1.5, color: 'warning.main' }} />
            <Typography variant="body2">Forzar logout</Typography>
          </MenuItem>,
          <Divider key="div1" />,
          <MenuItem
            key="reset"
            onClick={() => { setResetTarget(menuUser); closeMenu(); }}
          >
            <LockResetOutlined fontSize="small" sx={{ mr: 1.5 }} />
            <Typography variant="body2">Resetear contraseña</Typography>
          </MenuItem>,
          <MenuItem
            key="services"
            onClick={() => { setServicesUser(menuUser); closeMenu(); }}
          >
            <ManageAccountsOutlined fontSize="small" sx={{ mr: 1.5 }} />
            <Typography variant="body2">Gestionar servicios</Typography>
          </MenuItem>,
        ]}
      </Menu>

      {/* Reset password dialog */}
      {resetTarget && (
        <ResetPasswordDialog
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          notify={notify}
        />
      )}

      {/* Manage services dialog */}
      {servicesUser && (
        <ManageServicesDialog
          user={servicesUser}
          onClose={() => setServicesUser(null)}
          notify={notify}
        />
      )}

      {/* Force logout confirmation */}
      <Dialog
        open={Boolean(forceLogoutTarget)}
        onClose={() => !forcingLogout && setForceLogoutTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle fontWeight={700} color="warning.main">
          Forzar logout
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            ¿Revocar <strong>todas las sesiones activas</strong> de{' '}
            <strong>{forceLogoutTarget?.username}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            El usuario será desconectado en su próximo intento de refresh.
            Su access token actual expirará normalmente (máx. 15 min).
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            type="button"
            onClick={() => setForceLogoutTarget(null)}
            disabled={forcingLogout}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="contained"
            color="warning"
            onClick={handleForceLogout}
            disabled={forcingLogout}
            startIcon={forcingLogout ? <CircularProgress size={16} color="inherit" /> : <LogoutOutlined />}
          >
            {forcingLogout ? 'Revocando…' : 'Forzar logout'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── ResetPasswordDialog ───────────────────────────────────────────────

interface ResetDialogProps {
  user:    AdminUser;
  onClose: () => void;
  notify:  (msg: string, sev?: 'success' | 'error') => void;
}

function ResetPasswordDialog({ user, onClose, notify }: ResetDialogProps) {
  const [pwd,    setPwd]    = useState('');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleSubmit = async () => {
    if (pwd.length < 8) { setError('Mínimo 8 caracteres'); return; }
    setSaving(true);
    try {
      await adminApi.resetPassword(user.id, pwd);
      notify(`Contraseña de ${user.username} actualizada`);
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Error actualizando contraseña');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>Resetear contraseña — {user.username}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
          <TextField
            label="Nueva contraseña"
            type="password"
            value={pwd}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPwd(e.target.value); setError(''); }}
            fullWidth
            autoFocus
            inputProps={{ minLength: 8 }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button type="button" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button
          type="button" variant="contained" color="warning"
          onClick={handleSubmit} disabled={saving || pwd.length < 8}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <LockResetOutlined />}
        >
          {saving ? 'Guardando…' : 'Actualizar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── ManageServicesDialog ──────────────────────────────────────────────

interface ManageServicesDialogProps {
  user:    AdminUser;
  onClose: () => void;
  notify:  (msg: string, sev?: 'success' | 'error') => void;
}

function ManageServicesDialog({ user, onClose, notify }: ManageServicesDialogProps) {
  const [accesses,  setAccesses]  = useState<UserServiceAccess[]>([]);
  const [services,  setServices]  = useState<Service[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [granting,  setGranting]  = useState(false);
  const [revoking,  setRevoking]  = useState<string | null>(null);

  const [grantForm, setGrantForm] = useState({ serviceKey: '', roles: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [acc, svc] = await Promise.all([
        adminApi.getUserAccesses(user.id),
        adminApi.listServices(),
      ]);
      setAccesses(acc);
      setServices(svc.filter((s) => s.isActive));
    } catch {
      notify('Error cargando datos', 'error');
    } finally {
      setLoading(false);
    }
  }, [user.id, notify]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGrant = async () => {
    if (!grantForm.serviceKey) { notify('Selecciona un servicio', 'error'); return; }
    const roles = grantForm.roles.split(',').map((r) => r.trim()).filter(Boolean);
    setGranting(true);
    try {
      await adminApi.grantAccess(user.id, { serviceKey: grantForm.serviceKey, roles });
      notify(`Acceso a '${grantForm.serviceKey}' concedido`);
      setGrantForm({ serviceKey: '', roles: '' });
      loadData();
    } catch (err: unknown) {
      notify((err as { message?: string }).message ?? 'Error concediendo acceso', 'error');
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (serviceKey: string) => {
    setRevoking(serviceKey);
    try {
      await adminApi.revokeAccess(user.id, serviceKey);
      notify(`Acceso a '${serviceKey}' revocado`);
      loadData();
    } catch (err: unknown) {
      notify((err as { message?: string }).message ?? 'Error revocando acceso', 'error');
    } finally {
      setRevoking(null);
    }
  };

  const grantedKeys = new Set(accesses.map((a) => a.service.key));

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>Servicios — {user.username}</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
        ) : (
          <Stack spacing={3}>
            {/* Current accesses */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                Accesos activos ({accesses.length})
              </Typography>
              {accesses.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Sin acceso a servicios.</Typography>
              ) : (
                <List dense disablePadding>
                  {accesses.map((acc) => (
                    <ListItem
                      key={acc.id}
                      sx={{ px: 1.5, py: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 0.5 }}
                    >
                      <ListItemText
                        primary={
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Chip label={acc.service.key} size="small" color="primary" variant="outlined"
                              sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
                            <Typography variant="body2">{acc.service.displayName}</Typography>
                          </Stack>
                        }
                        secondary={
                          acc.roles.length > 0
                            ? `Roles: ${acc.roles.join(', ')}`
                            : 'Sin roles específicos'
                        }
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Revocar acceso">
                          <span>
                            <IconButton
                              size="small" color="error"
                              disabled={revoking === acc.service.key}
                              onClick={() => handleRevoke(acc.service.key)}
                            >
                              {revoking === acc.service.key
                                ? <CircularProgress size={16} />
                                : <RemoveCircleOutlineOutlined fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            <Divider />

            {/* Grant new access */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                Conceder acceso
              </Typography>
              <Stack spacing={1.5}>
                <TextField
                  select
                  label="Servicio"
                  value={grantForm.serviceKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGrantForm((f) => ({ ...f, serviceKey: e.target.value }))}
                  size="small"
                  fullWidth
                  SelectProps={{ native: true }}
                >
                  <option value="">-- Seleccionar --</option>
                  {services
                    .filter((s) => !grantedKeys.has(s.key))
                    .map((s) => (
                      <option key={s.key} value={s.key}>{s.displayName} ({s.key})</option>
                    ))}
                </TextField>
                <TextField
                  label="Roles (separados por coma)"
                  value={grantForm.roles}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGrantForm((f) => ({ ...f, roles: e.target.value }))}
                  size="small"
                  fullWidth
                  placeholder="forms:inspector, forms:supervisor"
                />
                <Box>
                  <Button
                    type="button"
                    variant="outlined"
                    size="small"
                    onClick={handleGrant}
                    disabled={granting || !grantForm.serviceKey}
                    startIcon={granting ? <CircularProgress size={14} color="inherit" /> : <AddCircleOutlineOutlined />}
                  >
                    {granting ? 'Concediendo…' : 'Conceder'}
                  </Button>
                </Box>
              </Stack>
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button type="button" onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
