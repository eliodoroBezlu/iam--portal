'use client';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, InputAdornment, List, ListItemButton, ListItemText, Stack, TextField, Typography,
} from '@mui/material';
import { LinkOutlined, SearchOutlined } from '@mui/icons-material';
import { adminApi } from '@/lib/api';
import type { AdminUser, Trabajador } from '@/types/admin';

interface Props {
  open:       boolean;
  trabajador: Trabajador | null;
  onClose:    () => void;
  onSuccess:  (msg: string) => void;
  onError:    (msg: string) => void;
  onRefresh:  () => void;
}

/** Palabras de un nombre, sin tildes ni mayúsculas, para compararlo con otro. */
function palabras(nombre: string | undefined): Set<string> {
  return new Set(
    (nombre ?? '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().split(/[^a-z0-9]+/)
      .filter((p) => p.length > 1),
  );
}

function coincidencias(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const p of a) if (b.has(p)) n++;
  return n;
}

/**
 * Vincula a la ficha una cuenta que ya existe (creada antes de tener ficha).
 * Solo ofrece cuentas sin ficha; las que comparten palabras del nombre van primero.
 */
export function VincularCuentaDialog({ open, trabajador, onClose, onSuccess, onError, onRefresh }: Props) {
  const [busqueda,   setBusqueda]   = useState('');
  const [cuentas,    setCuentas]    = useState<AdminUser[]>([]);
  const [cargando,   setCargando]   = useState(false);
  const [elegida,    setElegida]    = useState<AdminUser | null>(null);
  const [enviando,   setEnviando]   = useState(false);

  useEffect(() => {
    if (open) { setBusqueda(''); setElegida(null); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let vigente = true;
    setCargando(true);
    const t = setTimeout(() => {
      adminApi.listUsers({ sinFicha: true, search: busqueda.trim() || undefined, limit: 100 })
        .then((r) => { if (vigente) setCuentas(r.data); })
        .catch(() => { if (vigente) setCuentas([]); })
        .finally(() => { if (vigente) setCargando(false); });
    }, 250);
    return () => { vigente = false; clearTimeout(t); };
  }, [open, busqueda]);

  const ordenadas = useMemo(() => {
    const nomina = palabras(trabajador?.nomina);
    return cuentas
      .map((u) => ({ u, n: coincidencias(nomina, palabras(`${u.fullName ?? ''} ${u.username}`)) }))
      .sort((a, b) => b.n - a.n || (a.u.fullName ?? a.u.username).localeCompare(b.u.fullName ?? b.u.username));
  }, [cuentas, trabajador]);

  const vincular = async () => {
    if (!trabajador || !elegida) return;
    setEnviando(true);
    try {
      await adminApi.linkUserToTrabajador(trabajador.id, elegida.id);
      onSuccess(`@${elegida.username} vinculado a ${trabajador.nomina}`);
      onRefresh();
      onClose();
    } catch (err: unknown) {
      onError((err as { message?: string }).message ?? 'Error al vincular');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Vincular cuenta existente a {trabajador?.nomina}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Para cuentas que se crearon antes de tener ficha. Solo aparecen las que
            no están vinculadas a ningún trabajador.
          </Alert>

          <TextField
            size="small" autoFocus
            placeholder="Buscar por usuario, nombre o correo…"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setElegida(null); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start"><SearchOutlined fontSize="small" color="action" /></InputAdornment>
              ),
            }}
          />

          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, maxHeight: 320, overflow: 'auto' }}>
            {cargando ? (
              <Box display="flex" justifyContent="center" py={4}><CircularProgress size={24} /></Box>
            ) : ordenadas.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" py={4}>
                {busqueda ? 'Ninguna cuenta sin ficha coincide.' : 'No hay cuentas sin ficha.'}
              </Typography>
            ) : (
              <List dense disablePadding>
                {ordenadas.map(({ u, n }) => (
                  <ListItemButton key={u.id} selected={elegida?.id === u.id} onClick={() => setElegida(u)}>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <span>{u.fullName || u.username}</span>
                          {n >= 2 && <Chip size="small" color="success" variant="outlined" label="Nombre coincide" />}
                          {!u.isActive && <Chip size="small" label="Inactiva" />}
                        </Stack>
                      }
                      secondary={`@${u.username}${u.email ? ` · ${u.email}` : ''}`}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button type="button" onClick={onClose} disabled={enviando} color="inherit" variant="outlined">
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={() => void vincular()}
          disabled={!elegida || enviando}
          variant="contained"
          startIcon={enviando ? <CircularProgress size={16} color="inherit" /> : <LinkOutlined />}
        >
          {elegida ? `Vincular @${elegida.username}` : 'Elige una cuenta'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
