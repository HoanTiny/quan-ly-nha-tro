import type { AuthSession } from "@/types/domain";

const SESSION_KEY = "tro-auth-session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
export const AUTH_SESSION_CHANGED_EVENT = "tro-auth-session-changed";

function setCookie(name: string, value: string, maxAge = COOKIE_MAX_AGE) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function dispatchSessionChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}

export function saveAuthSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  setCookie("tro_auth", "1");
  setCookie("tro_role", session.role);
  setCookie("tro_user_id", session.userId);
  setCookie("tro_user_name", session.fullName);

  if (session.houseId) {
    setCookie("tro_house_id", session.houseId);
  } else {
    clearCookie("tro_house_id");
  }

  dispatchSessionChanged();
}

export function getAuthSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
  clearCookie("tro_auth");
  clearCookie("tro_role");
  clearCookie("tro_user_id");
  clearCookie("tro_user_name");
  clearCookie("tro_house_id");
  dispatchSessionChanged();
}
