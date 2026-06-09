// ── Admin-specific types ─────────────────────────────────────────────

export interface AdminUser {
  id:          string;
  username:    string;
  email?:      string;
  fullName?:   string;
  roles:       string[];
  permissions: string[];
  isActive:    boolean;
  isAdmin:     boolean;
  totpEnabled: boolean;
  lastLoginAt?: string;
  createdAt:   string;
  updatedAt:   string;
}

export interface UserListMeta {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface UserListResponse {
  data: AdminUser[];
  meta: UserListMeta;
}

export interface Service {
  id:          string;
  key:         string;
  displayName: string;
  baseUrl:     string;
  isActive:    boolean;
  createdAt:   string;
}

export interface ApiKey {
  id:          string;
  description?: string;
  isActive:    boolean;
  createdAt:   string;
  lastUsedAt?: string;
  expiresAt?:  string;
  service:     { key: string; displayName: string };
}

export interface ApiKeyCreatedResponse {
  apiKey:      string;
  serviceKey:  string;
  description?: string;
  message:     string;
}

export interface OAuthClient {
  id:                     string;
  clientId:               string;
  name:                   string;
  redirectUris:           string[];
  postLogoutRedirectUris: string[];
  allowedScopes:          string[];
  isConfidential:         boolean;
  isActive:               boolean;
  serviceId?:             string | null;
  createdAt:              string;
  updatedAt:              string;
}

export interface OAuthClientCreatedResponse {
  client:        OAuthClient;
  clientSecret?: string;   // solo confidential, mostrado una vez
  message:       string;
}

export interface OAuthClientSecretResponse {
  clientSecret: string;
  message:      string;
}

export interface AuditLog {
  id:         string;
  event:      string;
  serviceKey?: string;
  metadata?:  Record<string, unknown>;
  createdAt:  string;
  user?:      { id: string; username: string; fullName?: string };
}

export interface UserServiceAccess {
  id:        string;
  roles:     string[];
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  service:   { key: string; displayName: string };
}

export interface AdminSession {
  id:              string;
  userAgent?:      string;
  ipAddress?:      string;
  createdAt:       string;
  lastRefreshedAt: string;
  expiresAt:       string;
}

// ── Trabajadores (IAM Core — PostgreSQL) ─────────────────────────────

export interface Trabajador {
  id:                string;
  ci:                string;
  nomina:            string;
  puesto:            string;
  superintendencia:  string;
  area?:             string;
  jde?:              string;
  celular?:          string;
  residencia?:       string;
  fechaIngreso?:     string;
  noBloque?:         string;
  noHabitacion?:     string;
  tieneAccesoSistema: boolean;
  activo:            boolean;
  createdAt:         string;
  // usuario vinculado (si tiene acceso al sistema)
  user?:             { id: string; username: string; fullName?: string };
}
