// ──────────────────────────────────────────────────────────────────
// Tipos del IAM Portal — alineados con las respuestas del IAM Core
// ──────────────────────────────────────────────────────────────────

export interface IamUser {
  id:           string;
  username:     string;
  email?:       string;
  roles:        string[];
  permissions:  string[];
  /** True si el usuario tiene TOTP habilitado */
  totpEnabled:  boolean;
  isActive:     boolean;
  isAdmin:      boolean;
  lastLoginAt?: string;
  services:     ServiceAccess[];
}

export interface ServiceAccess {
  serviceKey:  string;
  displayName: string;
  baseUrl?:    string;
  roles:       string[];
}

export interface LoginResponse {
  requires2FA?: boolean;
  tempToken?:   string;
  message?:     string;
}

export interface Session {
  id:               string;
  userAgent?:       string;
  ipAddress?:       string;
  createdAt:        string;
  lastRefreshedAt:  string;
  expiresAt:        string;
}

export interface TotpSetupResponse {
  /** Clave secreta base32 para ingresar manualmente */
  secret:     string;
  /** Data URL de la imagen PNG del QR */
  qrCodeUrl:  string;
  /** URI otpauth:// para apps autenticadoras */
  otpauthUrl: string;
}

export interface ApiError {
  statusCode: number;
  message:    string;
  error?:     string;
}
