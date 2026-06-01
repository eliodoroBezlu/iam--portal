'use client';
import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, CardActionArea, Typography,
  Chip, Skeleton, Alert, Stack, Avatar,
} from '@mui/material';
import {
  AssignmentOutlined, OpenInNewOutlined, InventoryOutlined,
  WarningAmberOutlined, AccountTreeOutlined,
} from '@mui/icons-material';
import { authApi } from '@/lib/api';
import type { ServiceAccess } from '@/types';

// ── Service icon / colour mapping ──────────────────────────────────

interface ServiceMeta {
  icon:  React.ReactNode;
  color: string;
  bg:    string;
}

function getServiceMeta(key: string): ServiceMeta {
  const map: Record<string, ServiceMeta> = {
    forms: {
      icon:  <AssignmentOutlined />,
      color: '#1565C0',
      bg:    'linear-gradient(135deg, #1565C0, #42A5F5)',
    },
    'iro-service': {
      icon:  <WarningAmberOutlined />,
      color: '#E65100',
      bg:    'linear-gradient(135deg, #E65100, #FFA726)',
    },
    inspecciones: {
      icon:  <InventoryOutlined />,
      color: '#2E7D32',
      bg:    'linear-gradient(135deg, #2E7D32, #66BB6A)',
    },
  };
  return map[key] ?? {
    icon:  <AccountTreeOutlined />,
    color: '#6A1B9A',
    bg:    'linear-gradient(135deg, #6A1B9A, #CE93D8)',
  };
}

// ── Component ──────────────────────────────────────────────────────

export function ServiceSelector() {
  const [services,  setServices]  = useState<ServiceAccess[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    authApi.me()
      .then((user) => setServices(user.services ?? []))
      .catch(() => setError('No se pudieron cargar tus servicios. Intenta recargar la página.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ServicesSkeleton />;

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        {error}
      </Alert>
    );
  }

  if (services.length === 0) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 10 }} spacing={2}>
        <Avatar sx={{ width: 72, height: 72, bgcolor: 'grey.200' }}>
          <AccountTreeOutlined sx={{ fontSize: 40, color: 'grey.500' }} />
        </Avatar>
        <Typography variant="h6" color="text.secondary" fontWeight={500}>
          Sin servicios asignados
        </Typography>
        <Typography variant="body2" color="text.disabled" align="center" maxWidth={360}>
          Aún no tienes acceso a ningún servicio. Contacta al administrador del sistema.
        </Typography>
      </Stack>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={0.5}>
        Mis servicios
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Selecciona un servicio para acceder.
      </Typography>

      <Grid container spacing={3}>
        {services.map((svc) => (
          <Grid key={svc.serviceKey} size={{ xs: 12, sm: 6, md: 4 }}>
            <ServiceCard service={svc} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// ── ServiceCard ────────────────────────────────────────────────────

function ServiceCard({ service }: { service: ServiceAccess }) {
  const meta = getServiceMeta(service.serviceKey);

  const handleOpen = () => {
    if (service.baseUrl) {
      window.open(service.baseUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
        },
      }}
    >
      <CardActionArea onClick={handleOpen} disabled={!service.baseUrl} sx={{ p: 0 }}>
        <CardContent sx={{ p: 0 }}>

          {/* Header gradient */}
          <Box
            sx={{
              background: meta.bg,
              p: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Avatar
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white',
                width: 48,
                height: 48,
              }}
            >
              {meta.icon}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700} color="white" lineHeight={1.2}>
                {service.displayName}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                {service.serviceKey}
              </Typography>
            </Box>
            {service.baseUrl && (
              <OpenInNewOutlined sx={{ color: 'rgba(255,255,255,0.8)', ml: 'auto', fontSize: 18 }} />
            )}
          </Box>

          {/* Roles */}
          <Box sx={{ p: 2.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} mb={1} display="block">
              Roles asignados
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {service.roles.map((role) => (
                <Chip
                  key={role}
                  label={role}
                  size="small"
                  sx={{
                    bgcolor: `${meta.color}14`,
                    color:   meta.color,
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    border: `1px solid ${meta.color}30`,
                  }}
                />
              ))}
            </Stack>
          </Box>

        </CardContent>
      </CardActionArea>
    </Card>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────

function ServicesSkeleton() {
  return (
    <Box>
      <Skeleton width={160} height={36} sx={{ mb: 1 }} />
      <Skeleton width={240} height={22} sx={{ mb: 3 }} />
      <Grid container spacing={3}>
        {[1, 2, 3].map((k) => (
          <Grid key={k} size={{ xs: 12, sm: 6, md: 4 }}>
            <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3 }} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
