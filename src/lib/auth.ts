/**
 * Utilidades de auth para Server Components.
 * Lee el access_token desde el header `x-iam-access-token` (puesto por
 * el middleware tras un refresh) o desde la cookie como fallback.
 */
import { cookies, headers } from 'next/headers';
import { jwtVerify, importSPKI, type JWTPayload, type KeyLike } from 'jose';
import * as fs from 'fs';
import * as path from 'path';

interface IamJwtPayload extends JWTPayload {
  sub:      string;
  username: string;
  email?:   string;
  roles:    string[];
  services: string[];
}

// ── Cache de la clave pública (proceso-vida) ───────────────────────
let cachedPublicKey: KeyLike | null = null;

async function getPublicKey(): Promise<KeyLike> {
  if (cachedPublicKey) return cachedPublicKey;

  // 1. Filesystem (dev — iam-portal y iam-core son hermanos en /forms)
  const localKeyPath = path.resolve(process.cwd(), '..', 'iam-core', 'keys', 'public.pem');
  if (fs.existsSync(localKeyPath)) {
    const pem = fs.readFileSync(localKeyPath, 'utf8');
    cachedPublicKey = await importSPKI(pem, 'RS256');
    return cachedPublicKey;
  }

  // 2. Fallback: HTTP al IAM Core
  const iamUrl = process.env.IAM_API_URL ?? 'http://localhost:4000/api';
  const res    = await fetch(`${iamUrl}/auth/public-key`, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`Failed to fetch public key: ${res.status}`);
  const { publicKey: pem } = await res.json();
  cachedPublicKey = await importSPKI(pem, 'RS256');
  return cachedPublicKey;
}

/**
 * Obtiene el payload del access token. Sólo para Server Components.
 *
 * Orden de lectura:
 *   1. Header `x-iam-access-token` — puesto por el middleware tras refresh
 *      (porque las cookies recién renovadas aún no están en cookies() del request actual)
 *   2. Cookie `access_token` — flujo normal
 */
export async function getServerSession(): Promise<IamJwtPayload | null> {
  try {
    const headerStore = await headers();
    const headerToken = headerStore.get('x-iam-access-token');

    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('access_token')?.value;

    const token = headerToken || cookieToken;
    if (!token) return null;

    const publicKey   = await getPublicKey();
    const { payload } = await jwtVerify(token, publicKey, { issuer: 'iam-core' });
    return payload as IamJwtPayload;
  } catch {
    return null;
  }
}
