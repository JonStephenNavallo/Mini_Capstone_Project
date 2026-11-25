import axios from 'axios';
import { getSessionPhase, getSessionSignal } from '../shared/auth/sessionBoundary.js';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.defaults.xsrfCookieName = 'csrftoken';
api.defaults.xsrfHeaderName = 'X-CSRFToken';

api.interceptors.request.use((config) => {
  if (!config.sessionControl) {
    if (getSessionPhase() !== 'ready') {
      throw new axios.CanceledError('Session is changing.');
    }
    const scope = getSessionSignal();
    config.signal = config.signal && AbortSignal.any
      ? AbortSignal.any([scope, config.signal])
      : scope;
  }
  return config;
});

const LOCAL_MEDIA_URL_REGEX = /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(\/media\/.*)$/i;

/**
 * Normalize any loopback `/media/...` URL returned by Django into a root-relative
 * `/media/...` path so phones accessing the Vite dev server over LAN load images
 * through the same-origin `/media` proxy instead of hitting their own localhost.
 */
function normalizeLocalMediaUrls(value) {
  if (typeof value === 'string') {
    const match = value.match(LOCAL_MEDIA_URL_REGEX);
    return match ? match[1] : value;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeLocalMediaUrls);
  }
  if (value && typeof value === 'object') {
    const next = {};
    for (const [key, entry] of Object.entries(value)) {
      next[key] = normalizeLocalMediaUrls(entry);
    }
    return next;
  }
  return value;
}

let csrfRefresh;
api.interceptors.response.use(
  (response) => {
    if (response?.data && typeof response.data === 'object') {
      response.data = normalizeLocalMediaUrls(response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 403 &&
      typeof error.response?.data?.detail === 'string' &&
      error.response.data.detail.startsWith('CSRF Failed:') &&
      originalRequest &&
      !originalRequest._csrfRetry &&
      !originalRequest.signal?.aborted
    ) {
      originalRequest._csrfRetry = true;
      csrfRefresh ??= axios
        .get('/api/auth/csrf/', { withCredentials: true })
        .finally(() => {
          csrfRefresh = undefined;
        });
      await csrfRefresh;
      if (originalRequest.signal?.aborted) {
        throw new axios.CanceledError('Session changed.');
      }
      return api(originalRequest);
    }
    return Promise.reject(error);
  }
);

export default api;
