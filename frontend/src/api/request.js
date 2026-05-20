/**
 * Shared axios instance.
 *
 * Why a single instance:
 *   - One place to attach the JWT header on every request.
 *   - One place to log requests and errors.
 *   - One place to handle 401 (redirect to /login).
 *
 * Every per-domain api file imports `httpClient` from here.
 */
import axios from 'axios';
import { logDebug, logError, logWarn } from './logger.js';

const apiBaseUrl = import.meta.env.VITE_API_URL || '';

/**
 * Axios instance shared by all `*.api.js` modules.
 * Base URL points at `/api` so callers just write `.get('/products')`.
 */
export const httpClient = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  timeout: 20000,
});

// ---- Request interceptor: attach JWT, log outgoing requests ----
httpClient.interceptors.request.use(
  (requestConfig) => {
    const accessToken = localStorage.getItem('token');
    if (accessToken) requestConfig.headers.Authorization = `Bearer ${accessToken}`;
    logDebug('api', '→', requestConfig.method?.toUpperCase(), requestConfig.url);
    return requestConfig;
  },
  (requestError) => {
    logError('api', 'request error', requestError);
    return Promise.reject(requestError);
  },
);

// ---- Response interceptor: log, handle 401 globally ----
httpClient.interceptors.response.use(
  (response) => {
    logDebug('api', '←', response.status, response.config.url);
    return response;
  },
  (responseError) => {
    const status = responseError.response?.status;
    const url = responseError.config?.url;
    const apiMessage = responseError.response?.data?.error || responseError.message;

    if (status === 401 && location.pathname !== '/login') {
      logWarn('api', 'unauthorized — redirecting to /login');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      location.href = '/login';
    } else {
      logError('api', '✖', status || 'NETWORK', url, apiMessage);
    }
    return Promise.reject(responseError);
  },
);

/**
 * Convenience wrapper used by api files. Centralises `try / catch`,
 * normalises the returned shape to `response.data`, and turns network errors
 * into a friendly Error object with `.status` and `.payload` properties.
 *
 * @template T
 * @param {Promise<{data: T}>} requestPromise
 * @returns {Promise<T>}
 */
export async function safeRequest(requestPromise) {
  try {
    const response = await requestPromise;
    return response.data;
  } catch (rawError) {
    const status = rawError.response?.status;
    const message = rawError.response?.data?.error || rawError.message || 'Request failed';
    const wrappedError = new Error(message);
    wrappedError.status = status;
    wrappedError.payload = rawError.response?.data;
    throw wrappedError;
  }
}

/** Build a full URL — useful for `<a href>` to PDFs, CSV exports, etc. */
export function buildAbsoluteUrl(pathSuffix) {
  return `${apiBaseUrl}/api${pathSuffix}`;
}
