import { NextRequest, NextResponse } from 'next/server';
import { sessionCookieOptions, clearSessionCookies } from '@/lib/cookies';

// ── Rutas públicas ─────────────────────────────────────────────────
const PUBLIC_PATHS = ['/login', '/verify-2fa', '/api/', '/_next/', '/favicon.ico'];

/**
 * Decodifica el payload de un JWT sin verificar la firma.
 * Edge Runtime — sólo necesitamos exp para decidir si refrescar.
 */
function decodeJWTPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJWTPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return Math.floor(Date.now() / 1000) >= payload.exp;
}

/** Parsea los headers Set-Cookie del backend → { name, value }[] */
function parseCookies(headers: string[]): Array<{ name: string; value: string }> {
  return headers.map((h) => {
    const first = h.split(';')[0].trim();
    const idx   = first.indexOf('=');
    return { name: first.slice(0, idx).trim(), value: first.slice(idx + 1).trim() };
  });
}

// ── Middleware ─────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const accessToken  = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  // Sin ningún token → login
  if (!accessToken && !refreshToken) {
    return redirectToLogin(request);
  }

  // Token presente y NO expirado → pasar sin tocar
  if (accessToken && !isTokenExpired(accessToken)) {
    return NextResponse.next();
  }

  // Access token ausente o expirado → silent refresh
  if (refreshToken) {
    try {
      const iamUrl     = process.env.IAM_API_URL ?? 'http://localhost:4000/api';
      const refreshRes = await fetch(`${iamUrl}/auth/refresh`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `refresh_token=${refreshToken}`,
        },
        cache: 'no-store',
      });

      if (refreshRes.ok) {
        const newCookies     = parseCookies(refreshRes.headers.getSetCookie());
        const newAccessToken = newCookies.find((c) => c.name === 'access_token')?.value;

        /**
         * CRÍTICO: NO redirigir. Pasar la request con el nuevo token vía
         * header `x-iam-access-token`. getServerSession() lo leerá primero.
         * Esto elimina cualquier posibilidad de redirect loop.
         */
        const requestHeaders = new Headers(request.headers);
        if (newAccessToken) {
          requestHeaders.set('x-iam-access-token', newAccessToken);
        }

        const response = NextResponse.next({
          request: { headers: requestHeaders },
        });

        // Setear las nuevas cookies en la respuesta al browser
        // (domain compartido si COOKIE_DOMAIN está definido → SSO)
        for (const c of newCookies) {
          const maxAge = c.name === 'access_token' ? 15 * 60 : 8 * 60 * 60;
          response.cookies.set(c.name, c.value, sessionCookieOptions(maxAge));
        }

        return response;
      }
      // refresh_token inválido / revocado
    } catch {
      // IAM Core no disponible
    }
  }

  return redirectToLogin(request);
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL('/login', request.url);
  if (request.nextUrl.pathname !== '/') {
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
  }
  const res = NextResponse.redirect(loginUrl);
  clearSessionCookies(res.cookies);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
