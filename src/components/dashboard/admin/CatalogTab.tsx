'use client';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Divider, IconButton,
  MenuItem, Paper, Snackbar, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography, Tooltip,
} from '@mui/material';
import { AddOutlined, EditOutlined, SaveOutlined, CloseOutlined } from '@mui/icons-material';
import { adminApi } from '@/lib/api';
import type { Area, Superintendencia } from '@/types/admin';

/**
 * Gestión del catálogo maestro: Superintendencias y Áreas (fuente de verdad).
 * Los servicios (Sync, forms) sincronizan este catálogo.
 */
export function CatalogTab() {
  const [sups, setSups] = useState<Superintendencia[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState<{ msg: string; sev: 'success' | 'error' } | null>(null);

  // Nueva superintendencia
  const [newSup, setNewSup] = useState('');
  // Nueva área
  const [newArea, setNewArea] = useState({ codigo: '', nombre: '', superintendenciaId: '' });
  // Edición de área
  const [editArea, setEditArea] = useState<{ codigo: string; nombre: string; superintendenciaId: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([adminApi.listSuperintendencias(), adminApi.listAreas()]);
      setSups(s);
      setAreas(a);
    } catch {
      setSnack({ msg: 'Error cargando el catálogo', sev: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const notify = (msg: string, sev: 'success' | 'error' = 'success') => setSnack({ msg, sev });

  const addSup = async () => {
    if (!newSup.trim()) return;
    try {
      await adminApi.createSuperintendencia(newSup.trim());
      setNewSup('');
      notify('Superintendencia creada');
      load();
    } catch (e: unknown) { notify((e as { message?: string }).message ?? 'Error', 'error'); }
  };

  const toggleSup = async (s: Superintendencia) => {
    try { await adminApi.updateSuperintendencia(s.id, { activo: !s.activo }); load(); }
    catch (e: unknown) { notify((e as { message?: string }).message ?? 'Error', 'error'); }
  };

  const addArea = async () => {
    if (!newArea.codigo.trim() || !newArea.nombre.trim() || !newArea.superintendenciaId) {
      notify('Completa código, nombre y superintendencia', 'error'); return;
    }
    try {
      await adminApi.createArea({
        codigo: newArea.codigo.trim(), nombre: newArea.nombre.trim(),
        superintendenciaId: newArea.superintendenciaId,
      });
      setNewArea({ codigo: '', nombre: '', superintendenciaId: '' });
      notify('Área creada');
      load();
    } catch (e: unknown) { notify((e as { message?: string }).message ?? 'Error', 'error'); }
  };

  const saveEditArea = async () => {
    if (!editArea) return;
    try {
      await adminApi.updateArea(editArea.codigo, {
        nombre: editArea.nombre, superintendenciaId: editArea.superintendenciaId,
      });
      setEditArea(null);
      notify('Área actualizada');
      load();
    } catch (e: unknown) { notify((e as { message?: string }).message ?? 'Error', 'error'); }
  };

  const toggleArea = async (a: Area) => {
    try { await adminApi.updateArea(a.codigo, { activo: !a.activo }); load(); }
    catch (e: unknown) { notify((e as { message?: string }).message ?? 'Error', 'error'); }
  };

  if (loading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={0.5}>Áreas y Superintendencias</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        Fuente de verdad del catálogo. Los servicios (Sync, forms) lo sincronizan. La configuración
        privada de cada servicio (ej. «requiere calibración» en Sync) se gestiona en ese servicio.
      </Alert>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
        {/* Superintendencias */}
        <Paper variant="outlined" sx={{ p: 2, flex: 1, width: '100%' }}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>Superintendencias ({sups.length})</Typography>
          <Stack direction="row" spacing={1} mb={1.5}>
            <TextField size="small" label="Nueva superintendencia" value={newSup}
              onChange={(e) => setNewSup(e.target.value)} fullWidth
              onKeyDown={(e) => { if (e.key === 'Enter') addSup(); }} />
            <Button variant="outlined" startIcon={<AddOutlined />} onClick={addSup}>Añadir</Button>
          </Stack>
          <Table size="small">
            <TableBody>
              {sups.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>{s.nombre}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Chip label={`${s._count?.areas ?? 0} áreas`} size="small" variant="outlined" sx={{ mr: 1 }} />
                    <Chip
                      label={s.activo ? 'Activa' : 'Inactiva'} size="small"
                      color={s.activo ? 'success' : 'default'}
                      onClick={() => toggleSup(s)} sx={{ cursor: 'pointer' }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        {/* Áreas */}
        <Paper variant="outlined" sx={{ p: 2, flex: 1.4, width: '100%' }}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>Áreas ({areas.length})</Typography>
          <Stack direction="row" spacing={1} mb={1.5} flexWrap="wrap" useFlexGap>
            <TextField size="small" label="Código" value={newArea.codigo}
              onChange={(e) => setNewArea((p) => ({ ...p, codigo: e.target.value }))} sx={{ width: 90 }} />
            <TextField size="small" label="Nombre" value={newArea.nombre}
              onChange={(e) => setNewArea((p) => ({ ...p, nombre: e.target.value }))} sx={{ flex: 1, minWidth: 140 }} />
            <TextField select size="small" label="Superintendencia" value={newArea.superintendenciaId}
              onChange={(e) => setNewArea((p) => ({ ...p, superintendenciaId: e.target.value }))} sx={{ minWidth: 180 }}>
              <MenuItem value=""><em>—</em></MenuItem>
              {sups.filter((s) => s.activo).map((s) => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
            </TextField>
            <Button variant="outlined" startIcon={<AddOutlined />} onClick={addArea}>Añadir</Button>
          </Stack>
          <Divider sx={{ mb: 1 }} />
          <Box sx={{ maxHeight: 420, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Código</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Superintendencia</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {areas.map((a) => {
                  const editing = editArea?.codigo === a.codigo;
                  return (
                    <TableRow key={a.codigo} hover sx={{ opacity: a.activo === false ? 0.5 : 1 }}>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{a.codigo}</TableCell>
                      <TableCell>
                        {editing ? (
                          <TextField size="small" value={editArea!.nombre}
                            onChange={(e) => setEditArea((p) => p && ({ ...p, nombre: e.target.value }))} />
                        ) : a.nombre}
                      </TableCell>
                      <TableCell>
                        {editing ? (
                          <TextField select size="small" value={editArea!.superintendenciaId}
                            onChange={(e) => setEditArea((p) => p && ({ ...p, superintendenciaId: e.target.value }))} sx={{ minWidth: 160 }}>
                            {sups.map((s) => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
                          </TextField>
                        ) : <Typography variant="caption">{a.superintendencia}</Typography>}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        {editing ? (
                          <>
                            <Tooltip title="Guardar"><IconButton size="small" color="primary" onClick={saveEditArea}><SaveOutlined fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Cancelar"><IconButton size="small" onClick={() => setEditArea(null)}><CloseOutlined fontSize="small" /></IconButton></Tooltip>
                          </>
                        ) : (
                          <>
                            <Tooltip title="Editar"><IconButton size="small" onClick={() => setEditArea({ codigo: a.codigo, nombre: a.nombre, superintendenciaId: a.superintendenciaId ?? '' })}><EditOutlined fontSize="small" /></IconButton></Tooltip>
                            <Chip label={a.activo === false ? 'Inactiva' : 'Activa'} size="small"
                              color={a.activo === false ? 'default' : 'success'}
                              onClick={() => toggleArea(a)} sx={{ cursor: 'pointer', ml: 0.5 }} />
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </Stack>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack ? <Alert severity={snack.sev} onClose={() => setSnack(null)}>{snack.msg}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
