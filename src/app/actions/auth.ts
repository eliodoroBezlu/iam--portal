'use server';

/**
 * Server Actions de autenticación para IAM Portal.
 *
 * Las Server Actions corren en el runtime de Node.js (no Edge), lo que permite:
 *   - Acceder a cookies() de next/headers en modo escritura
 *   - Sincronizar los Set-Cookie del IAM Core directamente al store del browser
 *
 * Esto evita el problema de que Next.js Rewrites no garantizan
 * la propagación de headers Set-Cookie del backend hacia el cliente.
 */

import { cookies } from 'next/headers';

const IAM_URL = process.env.IAM_API_URL ?? 'http://localhost:4000/api';

// ── Tipos de resultado ─────────────────────────────────────────────

export type AuthResult =
  | { ok: true; requires2FA?: false; user: unknown }
  | { ok: true; requires2FA: true; tempToken: string; message: string }
  | { ok: false; error: string };

// ── Helper: sincronizar Set-Cookie del backend → browser ───────────

/**
 * Copia los headers Set-Cookie de la respuesta del IAM Core
 * al store de cookies de Next.js (que los incluye en la respuesta al browser).
 */
async function syncCookies(response: Response): Promise<void> {
  const cookieStore   = await cookies();
  const setCookieHdrs = response.headers.getSetCookie();

  for (const cookieStr of setCookieHdrs) {
    const parts      = cookieStr.split(';').map((p) => p.trim());
    const [nameVal]  = parts;
    const eqIdx      = nameVal.indexOf('=');
    const name       = nameVal.slice(0, eqIdx).trim();
    const value      = nameVal.slice(eqIdx + 1).trim();

    const maxAgePart = parts.find((p) => p.toLowerCase().startsWith('max-age='));
    const maxAge     = maxAgePart ? parseInt(maxAgePart.split('=')[1], 10) : undefined;

    cookieStore.set(name, value, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path:     '/',
      maxAge,
    });
  }
}

// ── LOGIN ──────────────────────────────────────────────────────────

export async function loginAction(
  username: string,
  password: string,
): Promise<AuthResult> {
  try {
    const res  = await fetch(`${IAM_URL}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password }),
      cache:   'no-store',
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: data.message ?? 'Credenciales inválidas' };
    }

    // Requiere 2FA → devolver tempToken sin setear cookies
    if (data.requires2FA) {
      return {
        ok:          true,
        requires2FA: true,
        tempToken:   data.tempToken,
        message:     data.message,
      };
    }

    // Login exitoso → sincronizar cookies del backend al browser
    await syncCookies(res);
    return { ok: true, user: data.user };

  } catch {
    return { ok: false, error: 'Error de conexión con el servidor' };
  }
}

// ── VERIFY 2FA ─────────────────────────────────────────────────────

export async function verify2faAction(
  tempToken: string,
  code:      string,
): Promise<AuthResult> {
  try {
    const res  = await fetch(`${IAM_URL}/auth/login/2fa`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ tempToken, code }),
      cache:   'no-store',
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: data.message ?? 'Código TOTP inválido' };
    }

    await syncCookies(res);
    return { ok: true, user: data.user };

  } catch {
    return { ok: false, error: 'Error de conexión con el servidor' };
  }
}

// ── LOGOUT ─────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  try {
    const cookieStore  = await cookies();
    const accessToken  = cookieStore.get('access_token')?.value;
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (refreshToken) {
      await fetch(`${IAM_URL}/auth/logout`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${accessToken ?? ''}; refresh_token=${refreshToken}`,
        },
        cache: 'no-store',
      });
    }
  } catch {
    // Ignorar errores del backend — siempre limpiar cookies locales
  }

  // Limpiar cookies del browser
  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
}

// ── WEBAUTHN AUTHENTICATION ACTIONS ────────────────────────────────

export type WebAuthnAuthOptionsResult =
  | { ok: true;  options: unknown; sessionKey: string }
  | { ok: false; error: string };

export async function getWebAuthnAuthOptionsAction(
  username?: string,
): Promise<WebAuthnAuthOptionsResult> {
  try {
    const res = await fetch(`${IAM_URL}/auth/webauthn/auth/options`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username }),
      cache:   'no-store',
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: data.message ?? 'No se pudo obtener las opciones de autenticación' };
    }

    return { ok: true, options: data.options, sessionKey: data.sessionKey };
  } catch {
    return { ok: false, error: 'Error de conexión con el servidor' };
  }
}

export type WebAuthnVerifyResult =
  | { ok: true }
  | { ok: false; error: string };

export async function verifyWebAuthnAuthAction(
  sessionKey: string,
  credential: unknown,
): Promise<WebAuthnVerifyResult> {
  try {
    const res = await fetch(`${IAM_URL}/auth/webauthn/auth/verify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sessionKey, credential }),
      cache:   'no-store',
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: data.message ?? 'Verificación de passkey fallida' };
    }

    await syncCookies(res);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Error de conexión con el servidor' };
  }
}

