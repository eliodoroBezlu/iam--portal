/**
 * API Route — Proxy de solo lectura hacia BackendForm /trabajadores
 *
 * Corre en Node.js (no Edge), así que puede usar variables de entorno del servidor.
 * Autentica contra BackendForm con credenciales de admin del entorno.
 * No modifica FormNext ni BackendForm.
 */
import { NextRequest, NextResponse } from 'next/server';

const FORMS_URL  = process.env.FORMS_API_URL        ?? 'http://localhost:3002';
const FORMS_USER = process.env.FORMS_ADMIN_USERNAME  ?? '';
const FORMS_PASS = process.env.FORMS_ADMIN_PASSWORD  ?? '';

// ── Token cache (process-level) ───────────────────────────────────────

interface CachedToken { value: string; expiresAt: number }
let cachedToken: CachedToken | null = null;

async function getFormsToken(): Promise<string> {
  // Servir del cache si aún es válido (margen de 60 s)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  if (!FORMS_USER || !FORMS_PASS) {
    throw new Error('FORMS_ADMIN_USERNAME y FORMS_ADMIN_PASSWORD no configurados');
  }

  const loginRes = await fetch(`${FORMS_URL}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username: FORMS_USER, password: FORMS_PASS }),
  });

  if (!loginRes.ok) {
    const body = await loginRes.text();
    throw new Error(`BackendForm login failed ${loginRes.status}: ${body}`);
  }

  // Extraer access_token de la cabecera Set-Cookie
  const setCookies = loginRes.headers.getSetCookie();
  const tokenCookie = setCookies.find((c) => c.startsWith('access_token='));
  if (!tokenCookie) throw new Error('BackendForm no devolvió access_token cookie');

  const rawToken = tokenCookie.split(';')[0].split('=').slice(1).join('=');

  // Cache por 14 minutos (tokens en BackendForm suelen durar 15 min)
  cachedToken = { value: rawToken, expiresAt: Date.now() + 14 * 60 * 1000 };
  return rawToken;
}

// ── Route handler ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const token = await getFormsToken();

    // Reenviar query params (query, page, etc.)
    const url    = new URL(req.url);
    const search = url.searchParams.toString();
    const target = `${FORMS_URL}/trabajadores${search ? `?${search}` : ''}`;

    const res = await fetch(target, {
      headers: { Cookie: `access_token=${token}` },
      cache:   'no-store',
    });

    if (res.status === 401) {
      // Token expirado — limpiar cache y reintentar una vez
      cachedToken = null;
      const token2  = await getFormsToken();
      const res2    = await fetch(target, {
        headers: { Cookie: `access_token=${token2}` },
        cache:   'no-store',
      });
      const data = await res2.json();
      return NextResponse.json(data, { status: res2.status });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
