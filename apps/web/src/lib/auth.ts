export interface StoredUser {
  _id: string;
  email: string;
  fullName: string;
  role: string;
}

const AUTH_KEY = 'yumi_admin_auth';

interface AuthState {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
}

function read(): AuthState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthState) : null;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return read()?.accessToken ?? null;
}

export function getRefreshToken(): string | null {
  return read()?.refreshToken ?? null;
}

export function getStoredUser(): StoredUser | null {
  return read()?.user ?? null;
}

export function setAuth(state: AuthState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(state));
}

export function updateTokens(accessToken: string, refreshToken: string): void {
  const current = read();
  if (!current) return;
  setAuth({ ...current, accessToken, refreshToken });
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_KEY);
}

export function isAdmin(): boolean {
  return getStoredUser()?.role === 'ADMIN';
}
