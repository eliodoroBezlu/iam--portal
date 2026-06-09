/**
 * Cliente HTTP para el IAM Core.
 * Todas las peticiones van a través de /api/iam/* (proxy en next.config.ts).
 * Las cookies se envían automáticamente (credentials: 'include').
 */

import type { IamUser, Session, TotpSetupResponse, LoginResponse } from '@/types';
import type {
  AdminUser, UserListResponse, Service, ApiKey, ApiKeyCreatedResponse,
  AuditLog, UserServiceAccess, AdminSession, Trabajador,
  OAuthClient, OAuthClientCreatedResponse, OAuthClientSecretResponse,
} from '@/types/admin';

export interface TrabajadorListResponse {
  data: Trabajador[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/browser';

const IAM_BASE = '/api/iam';

// ── Helpers ────────────────────────────────────────────────────────

async function request<T>(
  path:    string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${IAM_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw { statusCode: res.status, ...err };
  }

  // 204 No Content → retornar vacío
  if (res.status === 204) return {} as T;

  return res.json();
}

// ── Auth endpoints ─────────────────────────────────────────────────

export const authApi = {

  /** Login con usuario y contraseña. Puede requerir 2FA. */
  login: (username: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body:   JSON.stringify({ username, password }),
    }),

  /** Verificar código TOTP tras login con 2FA habilitado. */
  verify2fa: (tempToken: string, code: string) =>
    request<{ message: string }>('/auth/login/2fa', {
      method: 'POST',
      body:   JSON.stringify({ tempToken, code }),
    }),

  /** Silently refresh access token via refresh cookie. */
  refresh: () =>
    request<{ message: string }>('/auth/refresh', { method: 'POST' }),

  /** Cerrar sesión — revoca el refresh token actual. */
  logout: () =>
    request<void>('/auth/logout', { method: 'POST' }),

  /** Obtener el usuario autenticado junto con servicios y permisos. */
  me: () =>
    request<IamUser>('/auth/me'),

  /** Listar sesiones activas del usuario. */
  getSessions: () =>
    request<Session[]>('/auth/sessions'),

  /** Revocar todas las sesiones del usuario. */
  revokeAllSessions: () =>
    request<{ count: number }>('/auth/sessions/all', { method: 'DELETE' }),

  /** Cambiar la contraseña del usuario autenticado. */
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/me/password', {
      method: 'PATCH',
      body:   JSON.stringify({ currentPassword, newPassword }),
    }),

  // ── 2FA ─────────────────────────────────────────────────────────

  /** Iniciar configuración TOTP: devuelve QR + clave manual. */
  totpSetup: () =>
    request<TotpSetupResponse>('/auth/totp/setup', { method: 'POST' }),

  /** Activar TOTP verificando el primer código generado. */
  totpEnable: (code: string) =>
    request<{ backupCodes: string[] }>('/auth/totp/enable', {
      method: 'POST',
      body:   JSON.stringify({ code }),
    }),

  /** Desactivar TOTP confirmando con un código válido. */
  totpDisable: (code: string) =>
    request<{ message: string }>('/auth/totp/disable', {
      method: 'POST',
      body:   JSON.stringify({ code }),
    }),
};

// ── Admin endpoints ────────────────────────────────────────────────────

export const adminApi = {

  // ── Usuarios ──────────────────────────────────────────────────────

  listUsers: (params?: { page?: number; limit?: number; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page)   qs.set('page',   String(params.page));
    if (params?.limit)  qs.set('limit',  String(params.limit));
    if (params?.search) qs.set('search', params.search);
    return request<UserListResponse>(`/admin/users?${qs.toString()}`);
  },

  getUser: (userId: string) =>
    request<AdminUser>(`/admin/users/${userId}`),

  deactivateUser: (userId: string) =>
    request<{ message: string }>(`/admin/users/${userId}/deactivate`, { method: 'POST' }),

  activateUser: (userId: string) =>
    request<{ message: string }>(`/admin/users/${userId}/activate`, { method: 'POST' }),

  forceLogout: (userId: string) =>
    request<{ message: string }>(`/admin/users/${userId}/logout`, { method: 'POST' }),

  resetPassword: (userId: string, newPassword: string) =>
    request<{ message: string }>(`/admin/users/${userId}/reset-password`, {
      method: 'POST',
      body:   JSON.stringify({ newPassword }),
    }),

  getUserSessions: (userId: string) =>
    request<AdminSession[]>(`/admin/users/${userId}/sessions`),

  getUserAccesses: (userId: string) =>
    request<UserServiceAccess[]>(`/admin/users/${userId}/services`),

  grantAccess: (userId: string, dto: { serviceKey: string; roles: string[]; expiresAt?: string }) =>
    request<UserServiceAccess>(`/admin/users/${userId}/services`, {
      method: 'POST',
      body:   JSON.stringify(dto),
    }),

  revokeAccess: (userId: string, serviceKey: string) =>
    request<{ message: string }>(`/admin/users/${userId}/services/${serviceKey}`, {
      method: 'DELETE',
    }),

  // ── Servicios ─────────────────────────────────────────────────────

  listServices: () =>
    request<Service[]>('/admin/services'),

  createService: (dto: { key: string; displayName: string; baseUrl: string; isActive?: boolean }) =>
    request<Service>('/admin/services', {
      method: 'POST',
      body:   JSON.stringify(dto),
    }),

  toggleService: (serviceId: string, active: boolean) =>
    request<Service>(`/admin/services/${serviceId}/toggle?active=${active}`, { method: 'PATCH' }),

  updateService: (serviceId: string, dto: { displayName?: string; baseUrl?: string; isActive?: boolean }) =>
    request<Service>(`/admin/services/${serviceId}`, {
      method: 'PATCH',
      body:   JSON.stringify(dto),
    }),

  deleteService: (serviceId: string) =>
    request<{ message: string }>(`/admin/services/${serviceId}`, { method: 'DELETE' }),

  // ── API Keys ──────────────────────────────────────────────────────

  listApiKeys: (serviceKey?: string) => {
    const qs = serviceKey ? `?serviceKey=${serviceKey}` : '';
    return request<ApiKey[]>(`/admin/api-keys${qs}`);
  },

  createApiKey: (serviceKey: string, description?: string) =>
    request<ApiKeyCreatedResponse>('/admin/api-keys', {
      method: 'POST',
      body:   JSON.stringify({ serviceKey, description }),
    }),

  revokeApiKey: (id: string) =>
    request<{ message: string }>(`/admin/api-keys/${id}`, { method: 'DELETE' }),

  // ── Trabajadores ──────────────────────────────────────────────────

  listTrabajadores: (params?: {
    search?:           string;
    superintendencia?: string;
    area?:             string;
    tieneAcceso?:      boolean;
    page?:             number;
    limit?:            number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.search)           qs.set('search',           params.search);
    if (params?.superintendencia) qs.set('superintendencia', params.superintendencia);
    if (params?.area)             qs.set('area',             params.area);
    if (params?.tieneAcceso !== undefined) qs.set('tieneAcceso', String(params.tieneAcceso));
    if (params?.page)             qs.set('page',             String(params.page));
    if (params?.limit)            qs.set('limit',            String(params.limit));
    return request<TrabajadorListResponse>(`/admin/trabajadores?${qs.toString()}`);
  },

  // ── Asignación de usuario a trabajador ───────────────────────────

  createTrabajador: (dto: {
    ci:               string;
    nomina:           string;
    puesto:           string;
    superintendencia: string;
    area?:            string;
    fechaIngreso?:    string;
    jde?:             string;
    noBloque?:        string;
    noHabitacion?:    string;
    residencia?:      string;
    celular?:         string;
  }) =>
    request<Trabajador>('/admin/trabajadores', {
      method: 'POST',
      body:   JSON.stringify(dto),
    }),

  updateTrabajador: (
    trabajadorId: string,
    dto: {
      nomina?:           string;
      puesto?:           string;
      superintendencia?: string;
      area?:             string;
      fechaIngreso?:     string;
      jde?:              string;
      noBloque?:         string;
      noHabitacion?:     string;
      residencia?:       string;
      celular?:          string;
      activo?:           boolean;
    },
  ) =>
    request<Trabajador>(`/admin/trabajadores/${trabajadorId}`, {
      method: 'PATCH',
      body:   JSON.stringify(dto),
    }),

  assignUserToTrabajador: (
    trabajadorId: string,
    dto: {
      username:         string;
      password:         string;
      fullName?:        string;
      email?:           string;
      roles?:           string[];
      grantFormsAccess?: boolean;
    },
  ) =>
    request<{ trabajador: Trabajador; user: { id: string; username: string } }>(
      `/admin/trabajadores/${trabajadorId}/assign-user`,
      { method: 'POST', body: JSON.stringify(dto) },
    ),

  unlinkUserFromTrabajador: (trabajadorId: string) =>
    request<{ message: string }>(
      `/admin/trabajadores/${trabajadorId}/unlink-user`,
      { method: 'DELETE' },
    ),

  // ── Audit Log ─────────────────────────────────────────────────────


  getAuditLogs: (filters?: {
    userId?:     string;
    event?:      string;
    serviceKey?: string;
    from?:       string;
    to?:         string;
    page?:       number;
    limit?:      number;
  }) => {
    const qs = new URLSearchParams();
    if (filters?.userId)     qs.set('userId',     filters.userId);
    if (filters?.event)      qs.set('event',      filters.event);
    if (filters?.serviceKey) qs.set('serviceKey', filters.serviceKey);
    if (filters?.from)       qs.set('from',       filters.from);
    if (filters?.to)         qs.set('to',         filters.to);
    if (filters?.page)       qs.set('page',       String(filters.page));
    if (filters?.limit)      qs.set('limit',      String(filters.limit));
    return request<AuditLog[]>(`/admin/audit-logs?${qs.toString()}`);
  },
};

// ── OAuth / OIDC Clients ───────────────────────────────────────────

export const oauthClientsApi = {
  list: () =>
    request<OAuthClient[]>('/admin/oauth-clients'),

  create: (dto: {
    name: string;
    redirectUris: string[];
    postLogoutRedirectUris?: string[];
    allowedScopes?: string[];
    isConfidential?: boolean;
    serviceKey?: string;
  }) =>
    request<OAuthClientCreatedResponse>('/admin/oauth-clients', {
      method: 'POST',
      body:   JSON.stringify(dto),
    }),

  update: (id: string, dto: {
    name?: string;
    redirectUris?: string[];
    postLogoutRedirectUris?: string[];
    allowedScopes?: string[];
    isActive?: boolean;
  }) =>
    request<OAuthClient>(`/admin/oauth-clients/${id}`, {
      method: 'PATCH',
      body:   JSON.stringify(dto),
    }),

  rotateSecret: (id: string) =>
    request<OAuthClientSecretResponse>(`/admin/oauth-clients/${id}/rotate-secret`, {
      method: 'POST',
    }),

  remove: (id: string) =>
    request<{ message: string }>(`/admin/oauth-clients/${id}`, { method: 'DELETE' }),
};

// ── WebAuthn / Passkeys ────────────────────────────────────────────

export interface WebAuthnCredential {
  id:           string;
  credentialId: string;
  deviceType:   string;
  deviceName:   string;
  transports:   string[];
  createdAt:    string;
  lastUsedAt:   string | null;
}

export const webAuthnApi = {
  /** Obtiene el desafío de registro (requiere JWT). */
  registrationOptions: () =>
    request<PublicKeyCredentialCreationOptionsJSON>('/auth/webauthn/register/options', { method: 'POST' }),

  /** Envía la respuesta de registro firmada. */
  registrationVerify: (credential: RegistrationResponseJSON, deviceName?: string) =>
    request<{ credentialId: string; deviceName: string }>('/auth/webauthn/register/verify', {
      method: 'POST',
      body:   JSON.stringify({ credential, deviceName }),
    }),

  /** Obtiene el desafío de autenticación (público). */
  authOptions: (username?: string) =>
    request<{ options: PublicKeyCredentialRequestOptionsJSON; sessionKey: string }>(
      '/auth/webauthn/auth/options',
      { method: 'POST', body: JSON.stringify({ username }) },
    ),

  /** Envía la respuesta de autenticación firmada. Cookies quedan seteadas en la respuesta. */
  authVerify: (sessionKey: string, credential: AuthenticationResponseJSON) =>
    request<{ message: string }>('/auth/webauthn/auth/verify', {
      method: 'POST',
      body:   JSON.stringify({ sessionKey, credential }),
    }),

  /** Lista las credenciales del usuario autenticado. */
  listCredentials: () =>
    request<WebAuthnCredential[]>('/auth/webauthn/credentials'),

  /** Elimina una credencial. */
  deleteCredential: (credentialId: string) =>
    request<{ message: string }>(`/auth/webauthn/credentials/${encodeURIComponent(credentialId)}`, {
      method: 'DELETE',
    }),
};
