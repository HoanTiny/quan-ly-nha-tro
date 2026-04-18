const FALLBACK_API_BASE_URL = 'http://localhost:3001/api';

export const APP_NAME = 'Tro Manager';
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? FALLBACK_API_BASE_URL;

export function getApiOrigin() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return 'http://localhost:3001';
  }
}
