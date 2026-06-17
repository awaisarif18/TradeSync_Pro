/** Persisted user JSON (same key as pre-JWT for continuity). */
export const AUTH_USER_STORAGE_KEY = "tsp_user";

/** Bearer access token from POST /auth/login | /auth/register. */
export const AUTH_ACCESS_TOKEN_STORAGE_KEY = "tsp_access_token";

export type StoredAuthUser = {
  id: string;
  email: string;
  fullName?: string;
  role: "MASTER" | "SLAVE" | "ADMIN" | null;
  licenseKey?: string | null;
  subscribedToId?: string | null;
};

export type StoredSession = {
  user: StoredAuthUser;
  token: string;
  remember: boolean;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function removeKeysFromStore(
  store: Storage,
  keys: readonly string[],
): void {
  keys.forEach((key) => store.removeItem(key));
}

/** Read from localStorage first, then sessionStorage. */
export function getItem(key: string): string | null {
  if (!isBrowser()) return null;
  return (
    localStorage.getItem(key) ?? sessionStorage.getItem(key)
  );
}

export function clearSession(): void {
  if (!isBrowser()) return;

  removeKeysFromStore(localStorage, [
    AUTH_USER_STORAGE_KEY,
    AUTH_ACCESS_TOKEN_STORAGE_KEY,
  ]);
  removeKeysFromStore(sessionStorage, [
    AUTH_USER_STORAGE_KEY,
    AUTH_ACCESS_TOKEN_STORAGE_KEY,
  ]);
}

export function setSession(
  remember: boolean,
  session: { user: StoredAuthUser; token: string },
): void {
  if (!isBrowser()) return;

  const target = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;

  target.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(session.user));
  target.setItem(AUTH_ACCESS_TOKEN_STORAGE_KEY, session.token);

  removeKeysFromStore(other, [
    AUTH_USER_STORAGE_KEY,
    AUTH_ACCESS_TOKEN_STORAGE_KEY,
  ]);
}

export function readSession(): StoredSession | null {
  if (!isBrowser()) return null;

  const userJson = getItem(AUTH_USER_STORAGE_KEY);
  const token = getItem(AUTH_ACCESS_TOKEN_STORAGE_KEY);

  if (!userJson || !token) {
    if (userJson && !token) {
      clearSession();
    }
    return null;
  }

  try {
    const user = JSON.parse(userJson) as StoredAuthUser;
    const remember = localStorage.getItem(AUTH_USER_STORAGE_KEY) !== null;

    return { user, token, remember };
  } catch {
    clearSession();
    return null;
  }
}

/** Decode JWT exp without a dependency; fail open on parse errors. */
export function isJwtExpired(token: string): boolean {
  try {
    const segment = token.split(".")[1];
    if (!segment) return false;

    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64)) as { exp?: unknown };

    if (typeof payload.exp !== "number") return false;

    return payload.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}
