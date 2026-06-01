'use client';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse,
  IconButton, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  ExpandMoreOutlined, ExpandLessOutlined,
  FilterListOutlined, RefreshOutlined,
} from '@mui/icons-material';
import { adminApi } from '@/lib/api';
import type { AuditLog } from '@/types/admin';

const EVENT_COLORS: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  USER_LOGIN:               'success',
  USER_LOGOUT:              'default',
  LOGIN_FAILED:             'error',
  USER_CREATED:             'info',
  USER_UPDATED:             'info',
  USER_DEACTIVATED:         'warning',
  USER_ACTIVATED:           'success',
  PASSWORD_CHANGED:         'warning',
  ALL_SESSIONS_REVOKED:     'warning',
  SERVICE_ACCESS_GRANTED:   'success',
  SERVICE_ACCESS_REVOKED:   'error',
  API_KEY_CREATED:          'info',
  API_KEY_REVOKED:          'error',
};

export function AuditTab() {
  const [logs,        setLogs]        = useState<AuditLog[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showFilter,  setShowFilter]  = useState(false);
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [error,       setError]       = useState('');

  const [filters, setFilters] = useState({
    event:      '',
    serviceKey: '',
    from:       '',
    to:         '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        limit:      100,
        event:      filters.event      || undefined,
        serviceKey: filters.serviceKey || undefined,
        from:       filters.from       || undefined,
        to:         filters.to         || undefined,
      };
      setLogs(await adminApi.getAuditLogs(params));
    } catch {
      setError('Error cargando auditoría');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const fmt = (d: string) =>
    new Date(d).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'medium' });

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle1" fontWeight={700}>
          Log de auditoría ({logs.length} eventos)
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title={showFilter ? 'Ocultar filtros' : 'Filtrar'}>
            <IconButton size="small" onClick={() => setShowFilter((v) => !v)}>
              <FilterListOutlined />
            </IconButton>
          </Tooltip>
          <Tooltip title="Recargar">
            <IconButton size="small" onClick={load} disabled={loading}><RefreshOutlined /></IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Filters */}
      <Collapse in={showFilter}>
        <Box
          sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
            <TextField
              label="Evento"
              value={filters.event}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters((f) => ({ ...f, event: e.target.value }))}
              size="small"
              placeholder="Ej: USER_LOGIN"
              sx={{ minWidth: 180 }}
            />
            <TextField
              label="Servicio"
              value={filters.serviceKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters((f) => ({ ...f, serviceKey: e.target.value }))}
              size="small"
              placeholder="Ej: forms"
              sx={{ minWidth: 140 }}
            />
            <TextField
              label="Desde"
              type="date"
              value={filters.from}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters((f) => ({ ...f, from: e.target.value }))}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Hasta"
              type="date"
              value={filters.to}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters((f) => ({ ...f, to: e.target.value }))}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <Button
              type="button" size="small" variant="outlined"
              onClick={() => setFilters({ event: '', serviceKey: '', from: '', to: '' })}
            >
              Limpiar
            </Button>
          </Stack>
        </Box>
      </Collapse>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
              <TableCell width={32} />
              <TableCell>Fecha</TableCell>
              <TableCell>Evento</TableCell>
              <TableCell>Usuario</TableCell>
              <TableCell>Servicio</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Sin eventos en el rango seleccionado.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <React.Fragment key={log.id}>
                  <TableRow
                    hover
                    sx={{ cursor: log.metadata ? 'pointer' : 'default' }}
                    onClick={() => log.metadata && setExpanded(expanded === log.id ? null : log.id)}
                  >
                    <TableCell>
                      {log.metadata && (
                        <IconButton size="small">
                          {expanded === log.id ? <ExpandLessOutlined fontSize="small" /> : <ExpandMoreOutlined fontSize="small" />}
                        </IconButton>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {fmt(log.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.event}
                        size="small"
                        color={EVENT_COLORS[log.event] ?? 'default'}
                        sx={{ fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {log.user?.username ?? '—'}
                      </Typography>
                      {log.user?.fullName && (
                        <Typography variant="caption" color="text.secondary">{log.user.fullName}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.serviceKey ? (
                        <Chip label={log.serviceKey} size="small" variant="outlined" />
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                  {log.metadata && expanded === log.id && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 0, bgcolor: 'grey.50' }}>
                        <Box
                          component="pre"
                          sx={{
                            p: 1.5, m: 1, borderRadius: 1,
                            bgcolor: 'grey.900', color: 'success.light',
                            fontSize: '0.75rem', overflow: 'auto', maxHeight: 200,
                          }}
                        >
                          {JSON.stringify(log.metadata, null, 2)}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
