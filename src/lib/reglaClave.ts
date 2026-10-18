import { z } from 'zod';

/**
 * Regla de toda contraseña nueva, igual que `ClaveSegura` del IAM
 * (`iam-core/src/common/decorators/clave-segura.decorator.ts`). Se repite aquí
 * solo para avisar mientras se escribe: el IAM es quien decide. Si cambia allá,
 * cambia aquí.
 *
 * «Carácter especial» es cualquiera que no sea letra, número ni espacio.
 */
export const REQUISITOS_CLAVE: ReadonlyArray<{ texto: string; cumple: (v: string) => boolean }> = [
  { texto: 'Al menos 8 caracteres', cumple: (v) => v.length >= 8 },
  { texto: 'Una minúscula',         cumple: (v) => /[a-z]/.test(v) },
  { texto: 'Una mayúscula',         cumple: (v) => /[A-Z]/.test(v) },
  { texto: 'Un número',             cumple: (v) => /\d/.test(v) },
  { texto: 'Un carácter especial (# . @ - _ …)', cumple: (v) => /[^A-Za-z0-9\s]/.test(v) },
];

/** El primer requisito que no cumple, o `null` si los cumple todos. */
export const faltaEnClave = (v: string): string | null =>
  REQUISITOS_CLAVE.find((r) => !r.cumple(v))?.texto ?? null;

export const claveNuevaSchema = z.string().superRefine((v, ctx) => {
  const falta = faltaEnClave(v);
  if (falta) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Falta: ${falta.toLowerCase()}` });
});
