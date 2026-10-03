'use client';
import React, { useState } from 'react';
import { useForm }     from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }           from 'zod';
import {
  Box, Button, TextField, Typography, Alert, CircularProgress, Stack,
} from '@mui/material';
import { KeyOutlined } from '@mui/icons-material';
import { cambiarClaveLoginAction } from '@/app/actions/auth';

// Mismas reglas que el IAM (ChangePasswordDto): así el error aparece antes de enviar.
const ESPECIALES = '@$!%*?&';
const schema = z.object({
  nueva: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[a-z]/, 'Falta una minúscula')
    .regex(/[A-Z]/, 'Falta una mayúscula')
    .regex(/\d/,    'Falta un número')
    .regex(/[@$!%*?&]/, `Falta un carácter especial (${ESPECIALES})`)
    .regex(/^[A-Za-z\d@$!%*?&]+$/, `Solo letras sin tilde, números y ${ESPECIALES}`),
  confirmar: z.string().min(1, 'Repite la contraseña'),
}).refine((d) => d.nueva === d.confirmar, {
  path:    ['confirmar'],
  message: 'Las contraseñas no coinciden',
});

type Datos = z.infer<typeof schema>;

export type ResultadoCambioClave =
  | { siguiente: 'sesion' }
  | { siguiente: '2fa'; tempToken: string };

interface Props {
  tempToken: string;
  mensaje:   string;
  onListo:   (r: ResultadoCambioClave) => void;
  onVolver:  () => void;
}

/**
 * Paso del login para cuentas con contraseña provisional (la puso un admin o
 * se invalidó por seguridad): sin elegir una propia no se abre sesión.
 */
export function CambioClaveObligatorio({ tempToken, mensaje, onListo, onVolver }: Props) {
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Datos>({ resolver: zodResolver(schema), mode: 'onTouched' });

  const onSubmit = async (d: Datos) => {
    setApiError(null);
    const r = await cambiarClaveLoginAction(tempToken, d.nueva);
    if (!r.ok) {
      setApiError(r.error);
      return;
    }
    onListo(r.requires2FA ? { siguiente: '2fa', tempToken: r.tempToken } : { siguiente: 'sesion' });
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2.5}>
        <Alert severity="warning" icon={<KeyOutlined />} sx={{ borderRadius: 2 }}>
          {mensaje}. Tu contraseña actual es provisional y no puede seguir usándose.
        </Alert>

        {apiError && (
          <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setApiError(null)}>
            {apiError}
          </Alert>
        )}

        <TextField
          {...register('nueva')}
          label="Contraseña nueva"
          type="password"
          fullWidth
          autoFocus
          autoComplete="new-password"
          error={!!errors.nueva}
          helperText={errors.nueva?.message
            ?? `Mínimo 8, con mayúscula, minúscula, número y uno de ${ESPECIALES}`}
        />

        <TextField
          {...register('confirmar')}
          label="Repetir contraseña nueva"
          type="password"
          fullWidth
          autoComplete="new-password"
          error={!!errors.confirmar}
          helperText={errors.confirmar?.message}
        />

        <Button type="submit" variant="contained" fullWidth size="large" disabled={isSubmitting} sx={{ py: 1.4 }}>
          {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Guardar y continuar'}
        </Button>

        <Button type="button" variant="text" onClick={onVolver} disabled={isSubmitting}>
          Volver
        </Button>

        <Typography variant="caption" color="text.disabled" align="center">
          Si este paso expira (5 minutos), vuelve a ingresar con la contraseña provisional.
        </Typography>
      </Stack>
    </Box>
  );
}
