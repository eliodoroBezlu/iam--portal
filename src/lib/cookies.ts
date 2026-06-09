/**
 * Configuración centralizada de las cookies de sesión.
 * ──────────────────────────────────────────────────────────────────
 * Si COOKIE_DOMAIN está definido (ej. ".miempresa.com"), las cookies se
 * comparten entre subdominios → SSO real cross-subdominio.
 * Si NO está definido, las cookies son host-only (comportamiento actual).
 *
 * Seguridad: httpOnly (no accesible por JS), secure en producción (solo
 * HTTPS) y sameSite=lax (mitiga CSRF permitiendo navegación top-level).
 */
export const AUTH_COOKIE_NAMES = ['access_token', 'refresh_token'] as const;

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

export interface SessionCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  domain: string | undefined;
  maxAge?: number;
}

/** Opciones estándar para SETEAR una cookie de sesión. */
export function sessionCookieOptions(maxAge?: number): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    domain: COOKIE_DOMAIN,
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}

/** Escritor mínimo compatible con `cookies()` y `NextResponse.cookies`. */
export interface CookieWriter {
  set(
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: 'lax' | 'strict' | 'none';
      path?: string;
      domain?: string;
      maxAge?: number;
    },
  ): void;
}

/**
 * Borra las cookies de sesión. Para que el borrado aplique cuando se usó
 * COOKIE_DOMAIN, hay que re-setearlas vacías con el mismo domain/path y
 * maxAge 0 (un simple delete() borra solo la variante host-only).
 */
export function clearSessionCookies(store: CookieWriter): void {
  for (const name of AUTH_COOKIE_NAMES) {
    store.set(name, '', sessionCookieOptions(0));
  }
}
