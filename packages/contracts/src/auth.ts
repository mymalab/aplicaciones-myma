/**
 * Tipos relacionados con autenticación
 */

export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  role?: string;
  hd?: string; // Google Workspace domain
}

export interface AuthSession {
  user: User;
  accessToken: string;
  expiresAt: number;
}











