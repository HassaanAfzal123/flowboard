import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3999';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'flowboard_token';
const ORG_ACCESS_CODES = new Set(['ORG_MEMBERSHIP_REQUIRED', 'ORG_ACCESS_REVOKED']);
const LEGACY_ORG_ACCESS_MESSAGE = 'You are not a member of this organization';
let lastOrgAccessRedirectAt = 0;

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function isOrgScopedPath(pathname) {
  return (
    /^\/organizations\/[^/]+/.test(pathname) || /^\/projects\/[^/]+/.test(pathname) || /^\/tasks\/[^/]+/.test(pathname)
  );
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    const message = error?.response?.data?.message;
    const isOrgAccessError =
      ORG_ACCESS_CODES.has(code) || message === LEGACY_ORG_ACCESS_MESSAGE;

    if (status === 403 && isOrgAccessError && typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (isOrgScopedPath(path)) {
        const now = Date.now();
        if (now - lastOrgAccessRedirectAt > 1000) {
          lastOrgAccessRedirectAt = now;
          window.location.replace('/organizations');
        }
      }
    }

    return Promise.reject(error);
  }
);
