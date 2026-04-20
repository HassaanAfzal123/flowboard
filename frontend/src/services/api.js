import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3999';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'flowboard_token';
const NOTICE_KEY = 'flowboard_notice';
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
    /^\/organizations\/[^/]+/.test(pathname) ||
    /^\/projects\/[^/]+/.test(pathname) ||
    /^\/tasks\/[^/]+/.test(pathname)
  );
}

function storeNotice(message) {
  try {
    sessionStorage.setItem(NOTICE_KEY, message);
  } catch {
    // ignore storage errors, redirect still works
  }
}

function safeRedirect(path, notice) {
  if (typeof window === 'undefined') return;
  const current = window.location.pathname;
  const now = Date.now();
  if (current === path) return;
  if (now - lastOrgAccessRedirectAt <= 1000) return;
  lastOrgAccessRedirectAt = now;
  if (notice) storeNotice(notice);
  window.location.replace(path);
}

function classifyError(status, code, message) {
  if (status === 401) return 'auth';
  if (ORG_ACCESS_CODES.has(code) || message === LEGACY_ORG_ACCESS_MESSAGE) return 'org_access';
  if (code === 'ORGANIZATION_NOT_FOUND') return 'org_access';
  if (code === 'PROJECT_NOT_FOUND') return 'project_missing';
  if (code === 'TASK_NOT_FOUND') return 'task_missing';
  if (status === 404 && code === 'RESOURCE_NOT_FOUND') return 'resource_missing';
  return 'other';
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    const message = error?.response?.data?.message;
    const kind = classifyError(status, code, message);
    const path = typeof window !== 'undefined' ? window.location.pathname : '';

    if (kind === 'auth') {
      setStoredToken(null);
      safeRedirect('/login', 'Your session expired. Please sign in again.');
    } else if (kind === 'org_access' && isOrgScopedPath(path)) {
      safeRedirect('/organizations', 'Your access to that organization changed.');
    } else if (
      (kind === 'project_missing' || kind === 'task_missing' || kind === 'resource_missing') &&
      isOrgScopedPath(path)
    ) {
      safeRedirect('/organizations', 'That resource is no longer available.');
    }

    return Promise.reject(error);
  }
);
