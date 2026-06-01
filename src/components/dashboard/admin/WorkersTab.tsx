'use client';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, Grid, InputAdornment, InputLabel,
  MenuItem, OutlinedInput, Select, Switch,
  Snackbar, Stack, Table, TableBody, TableCell, TableFooter,
  TableHead, TablePagination, TableRow, TextField, Tooltip,
  Typography, IconButton,
} from '@mui/material';
import {
  SearchOutlined, RefreshOutlined, InfoOutlined,
  PersonAddOutlined, LinkOffOutlined, EditOutlined, AddOutlined,
} from '@mui/icons-material';
import { adminApi } from '@/lib/api';
import type { Trabajador } from '@/types/admin';

// ── Password validation ────────────────────────────────────────────────
function validatePwd(pwd: string): string | null {
  if (pwd.length < 8)                       return 'Mínimo 8 caracteres';
  if (!/[A-Z]/.test(pwd))                   return 'Falta mayúscula';
  if (!/[a-z]/.test(pwd))                   return 'Falta minúscula';
  if (!/\d/.test(pwd))                      return 'Falta número';
  if (!/[@$!%*?&]/.test(pwd))              return 'Falta símbolo (@$!%*?&)';
  return null;
}

const ROLES_OPTIONS = [
  { value: 'user',             label: 'Usuario' },
  { value: 'inspector',        label: 'Inspector' },
  { value: 'supervisor',       label: 'Supervisor' },
  { value: 'superintendente',  label: 'Superintendente' },
  { value: 'admin',            label: 'Administrador' },
];

// ── AssignUserDialog ───────────────────────────────────────────────────
interface AssignUserDialogProps {
  open:        boolean;
  trabajador:  Trabajador | null;
  onClose:     () => void;
  onSuccess:   (msg: string) => void;
  onError:     (msg: string) => void;
  onRefresh:   () => void;
}

function AssignUserDialog({
  open, trabajador, onClose, onSuccess, onError, onRefresh,
}: AssignUserDialogProps) {
  const [username,         setUsername]         = useState('');
  const [fullName,         setFullName]         = useState('');
  const [email,            setEmail]            = useState('');
  const [password,         setPassword]         = useState('');
  const [confirmPassword,  setConfirmPassword]  = useState('');
  const [roles,            setRoles]            = useState<string[]>(['user']);
  const [grantForms,       setGrantForms]       = useState(true);
  const [submitting,       setSubmitting]       = useState(false);

  // Pre-fill fullName from nomina when dialog opens
  useEffect(() => {
    if (open && trabajador) {
      setFullName(trabajador.nomina);
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setRoles(['user']);
      setGrantForms(true);
    }
  }, [open, trabajador]);

  const pwdError   = password ? validatePwd(password) : null;
  const matchError = confirmPassword && password !== confirmPassword ? 'Las contraseñas no coinciden' : null;
  const canSubmit  = username.length >= 3 && password.length >= 8 && !pwdError && !matchError;

  const handleSubmit = async () => {
    if (!trabajador || !canSubmit) return;
    setSubmitting(true);
    try {
      await adminApi.assignUserToTrabajador(trabajador.id, {
        username,
        password,
        fullName:         fullName || undefined,
        email:            email    || undefined,
        roles,
        grantFormsAccess: grantForms,
      });
      onSuccess(`Usuario @${username} creado y vinculado a ${trabajador.nomina}`);
      onRefresh();
      onClose();
    } catch (err: unknown) {
      onError((err as { message?: string }).message ?? 'Error al crear usuario');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Crear usuario para {trabajador?.nomina}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Username *"
            size="small"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
            error={username.length > 0 && username.length < 3}
            helperText={username.length > 0 && username.length < 3 ? 'Mínimo 3 caracteres' : 'Letras, números, - y _'}
          />
          <TextField
            label="Nombre completo"
            size="small"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            helperText="Pre-llenado con la nómina"
          />
          <TextField
            label="Email (opcional)"
            size="small"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Contraseña *"
            size="small"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={Boolean(pwdError)}
            helperText={pwdError ?? 'Mín. 8 chars con mayúscula, minúscula, número y símbolo'}
          />
          <TextField
            label="Confirmar contraseña *"
            size="small"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={Boolean(matchError)}
            helperText={matchError ?? ''}
          />
          <FormControl size="small">
            <InputLabel>Roles</InputLabel>
            <Select<string[]>
              multiple
              value={roles}
              onChange={(e) => {
                const val = e.target.value;
                setRoles(typeof val === 'string' ? val.split(',') : (val as string[]));
              }}
              input={<OutlinedInput label="Roles" />}
              renderValue={(selected) =>
                selected.map((v) => ROLES_OPTIONS.find((r) => r.value === v)?.label ?? v).join(', ')
              }
            >
              {ROLES_OPTIONS.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  <Checkbox checked={roles.includes(r.value)} size="small" />
                  {r.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={grantForms}
                onChange={(e) => setGrantForms(e.target.checked)}
                size="small"
              />
            }
            label="Conceder acceso al servicio Forms"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} disabled={submitting} color="inherit" variant="outlined">
          Cancelar
        </Button>
        <Button
          onClick={() => void handleSubmit()}
          disabled={!canSubmit || submitting}
          variant="contained"
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <PersonAddOutlined />}
        >
          {submitting ? 'Creando…' : 'Crear y vincular'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── CreateTrabajadorDialog ─────────────────────────────────────────────
const EMPTY_CREATE = {
  ci: '', nomina: '', puesto: '', superintendencia: '',
  area: '', fechaIngreso: '', jde: '', noBloque: '',
  noHabitacion: '', residencia: '', celular: '',
};
type CreateForm = typeof EMPTY_CREATE;

interface CreateDialogProps {
  open:      boolean;
  onClose:   () => void;
  onSuccess: (msg: string) => void;
  onError:   (msg: string) => void;
  onRefresh: () => void;
}

function CreateTrabajadorDialog({ open, onClose, onSuccess, onError, onRefresh }: CreateDialogProps) {
  const [form,       setForm]       = useState<CreateForm>(EMPTY_CREATE);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (open) setForm(EMPTY_CREATE); }, [open]);

  const set = (field: keyof CreateForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const canSubmit = form.ci.trim() && form.nomina.trim() && form.puesto.trim() && form.superintendencia.trim();

  const handleCreate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const t = await adminApi.createTrabajador({
        ci:               form.ci.trim(),
        nomina:           form.nomina.trim(),
        puesto:           form.puesto.trim(),
        superintendencia: form.superintendencia.trim(),
        area:             form.area         || undefined,
        fechaIngreso:     form.fechaIngreso  || undefined,
        jde:              form.jde           || undefined,
        noBloque:         form.noBloque      || undefined,
        noHabitacion:     form.noHabitacion  || undefined,
        residencia:       form.residencia    || undefined,
        celular:          form.celular       || undefined,
      });
      onSuccess(`Trabajador ${t.nomina} creado`);
      onRefresh();
      onClose();
    } catch (err: unknown) {
      onError((err as { message?: string }).message ?? 'Error al crear trabajador');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Nuevo trabajador</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth size="small" label="CI *"
              value={form.ci}
              onChange={(e) => setForm((p) => ({ ...p, ci: e.target.value.replace(/[^0-9A-Za-z-]/g, '') }))}
              error={!form.ci.trim()} helperText={!form.ci.trim() ? 'Requerido' : '5–12 caracteres'}
              inputProps={{ maxLength: 12 }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth size="small" label="Nómina *"
              value={form.nomina} onChange={set('nomina')}
              error={!form.nomina.trim()} helperText={!form.nomina.trim() ? 'Requerido' : ''}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth size="small" label="Puesto *"
              value={form.puesto} onChange={set('puesto')}
              error={!form.puesto.trim()} helperText={!form.puesto.trim() ? 'Requerido' : ''}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth size="small" label="Superintendencia *"
              value={form.superintendencia} onChange={set('superintendencia')}
              error={!form.superintendencia.trim()} helperText={!form.superintendencia.trim() ? 'Requerido' : ''}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Área" value={form.area} onChange={set('area')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth size="small" label="Fecha de ingreso" type="date"
              value={form.fechaIngreso} onChange={set('fechaIngreso')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Typography variant="caption" color="text.secondary">Información adicional (opcional)</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Código JDE" value={form.jde} onChange={set('jde')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="N° Bloque" value={form.noBloque} onChange={set('noBloque')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="N° Habitación" value={form.noHabitacion} onChange={set('noHabitacion')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Residencia" value={form.residencia} onChange={set('residencia')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Celular" value={form.celular} onChange={set('celular')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} disabled={submitting} color="inherit" variant="outlined">Cancelar</Button>
        <Button
          onClick={() => void handleCreate()}
          disabled={!canSubmit || submitting}
          variant="contained"
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <AddOutlined />}
        >
          {submitting ? 'Creando…' : 'Crear trabajador'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── EditTrabajadorDialog ───────────────────────────────────────────────
type EditForm = {
  nomina: string; puesto: string; superintendencia: string; area: string;
  fechaIngreso: string; jde: string; noBloque: string; noHabitacion: string;
  residencia: string; celular: string; activo: boolean;
};

function toEditForm(w: Trabajador): EditForm {
  return {
    nomina:           w.nomina,
    puesto:           w.puesto,
    superintendencia: w.superintendencia,
    area:             w.area             ?? '',
    fechaIngreso:     w.fechaIngreso ? w.fechaIngreso.split('T')[0] : '',
    jde:              w.jde             ?? '',
    noBloque:         w.noBloque        ?? '',
    noHabitacion:     w.noHabitacion    ?? '',
    residencia:       w.residencia      ?? '',
    celular:          w.celular         ?? '',
    activo:           w.activo,
  };
}

interface EditDialogProps {
  open:      boolean;
  trabajador: Trabajador | null;
  onClose:   () => void;
  onSuccess: (msg: string) => void;
  onError:   (msg: string) => void;
  onRefresh: () => void;
}

function EditTrabajadorDialog({ open, trabajador, onClose, onSuccess, onError, onRefresh }: EditDialogProps) {
  const [form,       setForm]       = useState<EditForm | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && trabajador) setForm(toEditForm(trabajador));
  }, [open, trabajador]);

  if (!form) return null;

  const set = (field: keyof EditForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => prev ? { ...prev, [field]: e.target.value } : prev);

  const canSubmit = form.nomina.trim() && form.puesto.trim() && form.superintendencia.trim();

  const handleSave = async () => {
    if (!trabajador || !canSubmit) return;
    setSubmitting(true);
    try {
      await adminApi.updateTrabajador(trabajador.id, {
        nomina:           form.nomina           || undefined,
        puesto:           form.puesto           || undefined,
        superintendencia: form.superintendencia  || undefined,
        area:             form.area             || undefined,
        fechaIngreso:     form.fechaIngreso     || undefined,
        jde:              form.jde              || undefined,
        noBloque:         form.noBloque         || undefined,
        noHabitacion:     form.noHabitacion     || undefined,
        residencia:       form.residencia       || undefined,
        celular:          form.celular          || undefined,
        activo:           form.activo,
      });
      onSuccess(`Trabajador ${form.nomina} actualizado`);
      onRefresh();
      onClose();
    } catch (err: unknown) {
      onError((err as { message?: string }).message ?? 'Error al actualizar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Editar trabajador — <Typography component="span" variant="inherit" color="primary">{trabajador?.ci}</Typography>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {/* CI — read-only */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="CI" value={trabajador?.ci ?? ''} disabled />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth size="small" label="Nómina *"
              value={form.nomina} onChange={set('nomina')}
              error={!form.nomina.trim()} helperText={!form.nomina.trim() ? 'Requerido' : ''}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth size="small" label="Puesto *"
              value={form.puesto} onChange={set('puesto')}
              error={!form.puesto.trim()} helperText={!form.puesto.trim() ? 'Requerido' : ''}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth size="small" label="Superintendencia *"
              value={form.superintendencia} onChange={set('superintendencia')}
              error={!form.superintendencia.trim()} helperText={!form.superintendencia.trim() ? 'Requerido' : ''}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Área" value={form.area} onChange={set('area')} />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth size="small" label="Fecha de ingreso" type="date"
              value={form.fechaIngreso} onChange={set('fechaIngreso')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="caption" color="text.secondary">Información adicional (opcional)</Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Código JDE" value={form.jde} onChange={set('jde')} />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="N° Bloque" value={form.noBloque} onChange={set('noBloque')} />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="N° Habitación" value={form.noHabitacion} onChange={set('noHabitacion')} />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Residencia" value={form.residencia} onChange={set('residencia')} />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Celular" value={form.celular} onChange={set('celular')} />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.activo}
                  onChange={(e) => setForm((prev) => prev ? { ...prev, activo: e.target.checked } : prev)}
                  color="success"
                />
              }
              label={form.activo ? 'Activo' : 'Inactivo'}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} disabled={submitting} color="inherit" variant="outlined">Cancelar</Button>
        <Button
          onClick={() => void handleSave()}
          disabled={!canSubmit || submitting}
          variant="contained"
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <EditOutlined />}
        >
          {submitting ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── WorkersTab ─────────────────────────────────────────────────────────
export function WorkersTab() {
  const [workers,     setWorkers]     = useState<Trabajador[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');

  // Create dialog
  const [createOpen,     setCreateOpen]     = useState(false);

  // Edit dialog
  const [editTarget,     setEditTarget]     = useState<Trabajador | null>(null);

  // Assign-user dialog
  const [assignTarget,   setAssignTarget]   = useState<Trabajador | null>(null);
  // Unlink confirm
  const [unlinkTarget,   setUnlinkTarget]   = useState<Trabajador | null>(null);
  const [unlinking,      setUnlinking]      = useState(false);

  // Snackbar
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false, msg: '', sev: 'success',
  });
  const notify = (msg: string, sev: 'success' | 'error' = 'success') =>
    setSnack({ open: true, msg, sev });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.listTrabajadores({
        search:  search || undefined,
        page:    page + 1,
        limit:   rowsPerPage,
      });
      setWorkers(res.data);
      setTotal(res.meta.total);
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Error al cargar trabajadores');
    } finally {
      setLoading(false);
    }
  }, [search, page, rowsPerPage]);

  useEffect(() => { void load(); }, [load]);

  const handleUnlink = async () => {
    if (!unlinkTarget) return;
    setUnlinking(true);
    try {
      await adminApi.unlinkUserFromTrabajador(unlinkTarget.id);
      notify(`Usuario desvinculado de ${unlinkTarget.nomina}`);
      void load();
    } catch (err: unknown) {
      notify((err as { message?: string }).message ?? 'Error al desvincular', 'error');
    } finally {
      setUnlinking(false);
      setUnlinkTarget(null);
    }
  };

  const fmt = (d?: string) =>
    d ? new Date(d).toLocaleDateString('es-CL') : '—';

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle1" fontWeight={700}>
            Trabajadores ({total})
          </Typography>
          <Tooltip title="Fuente: IAM Core (PostgreSQL). Crea usuarios y vincúlalos a trabajadores desde aquí.">
            <InfoOutlined fontSize="small" color="action" />
          </Tooltip>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            Nuevo trabajador
          </Button>
          <Tooltip title="Recargar">
            <IconButton size="small" onClick={() => void load()} disabled={loading}>
              <RefreshOutlined />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Alert severity="info" icon={<InfoOutlined />} sx={{ mb: 2, borderRadius: 2 }}>
        Fuente: IAM Core (PostgreSQL). Usa el botón <strong>PersonAdd</strong> para crear un usuario IAM y vincularlo a un trabajador.
      </Alert>

      {/* Search */}
      <TextField
        size="small"
        placeholder="Buscar por nómina, CI, puesto o JDE…"
        value={search}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          setSearch(e.target.value);
          setPage(0);
        }}
        sx={{ mb: 2, width: { xs: '100%', sm: 360 } }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchOutlined fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}
          action={<IconButton size="small" onClick={() => void load()}><RefreshOutlined fontSize="small" /></IconButton>}
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : !error && (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
              <TableCell>CI</TableCell>
              <TableCell>Nómina</TableCell>
              <TableCell>Puesto</TableCell>
              <TableCell>Área</TableCell>
              <TableCell>Superintendencia</TableCell>
              <TableCell>Ingreso</TableCell>
              <TableCell>Sistema</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {workers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {search ? 'Sin resultados para esa búsqueda.' : 'No hay trabajadores.'}
                </TableCell>
              </TableRow>
            ) : (
              workers.map((w) => (
                <TableRow key={w.id} hover>
                  <TableCell>
                    <Typography variant="caption" fontFamily="monospace" fontWeight={700}>
                      {w.ci}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{w.nomina}</Typography>
                    {w.user?.username && (
                      <Typography variant="caption" color="primary.main">
                        @{w.user.username}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{w.puesto}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{w.area ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{w.superintendencia}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {fmt(w.fechaIngreso)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={w.tieneAccesoSistema ? 'Con acceso' : 'Sin acceso'}
                      size="small"
                      color={w.tieneAccesoSistema ? 'primary' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={w.activo ? 'Activo' : 'Inactivo'}
                      size="small"
                      color={w.activo ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="Editar datos del trabajador">
                        <IconButton size="small" color="primary" onClick={() => setEditTarget(w)}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {!w.tieneAccesoSistema ? (
                        <Tooltip title="Crear usuario IAM y vincular">
                          <IconButton size="small" color="success" onClick={() => setAssignTarget(w)}>
                            <PersonAddOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title={`Desvincular usuario @${w.user?.username ?? ''}`}>
                          <IconButton size="small" color="warning" onClick={() => setUnlinkTarget(w)}>
                            <LinkOffOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TablePagination
                colSpan={9}
                rowsPerPageOptions={[25, 50, 100]}
                count={total}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                labelRowsPerPage="Filas:"
              />
            </TableRow>
          </TableFooter>
        </Table>
      )}

      {/* Create trabajador dialog */}
      <CreateTrabajadorDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={(msg) => notify(msg)}
        onError={(msg) => notify(msg, 'error')}
        onRefresh={() => void load()}
      />

      {/* Edit trabajador dialog */}
      <EditTrabajadorDialog
        open={editTarget !== null}
        trabajador={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={(msg) => notify(msg)}
        onError={(msg) => notify(msg, 'error')}
        onRefresh={() => void load()}
      />

      {/* Assign-user dialog */}
      <AssignUserDialog
        open={assignTarget !== null}
        trabajador={assignTarget}
        onClose={() => setAssignTarget(null)}
        onSuccess={(msg) => notify(msg)}
        onError={(msg) => notify(msg, 'error')}
        onRefresh={() => void load()}
      />

      {/* Unlink confirm dialog */}
      <Dialog open={unlinkTarget !== null} onClose={() => setUnlinkTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Desvincular usuario</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Desvincular el usuario <strong>@{unlinkTarget?.user?.username}</strong> del trabajador{' '}
            <strong>{unlinkTarget?.nomina}</strong>?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            El usuario IAM no será eliminado, solo se rompe el vínculo con el trabajador.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setUnlinkTarget(null)} disabled={unlinking} color="inherit" variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={() => void handleUnlink()}
            disabled={unlinking}
            color="warning"
            variant="contained"
            startIcon={unlinking ? <CircularProgress size={16} color="inherit" /> : <LinkOffOutlined />}
          >
            {unlinking ? 'Desvinculando…' : 'Desvincular'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.sev}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
