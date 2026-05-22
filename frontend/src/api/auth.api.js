/**
 * Authentication & user management endpoints.
 * Backed by /api/auth on the server.
 */
import { httpClient, safeRequest } from './request.js';

/**
 * POST /auth/login — exchange email+password for access+refresh tokens.
 * @param {{email:string, password:string}} credentials
 * @returns {Promise<{accessToken:string, refreshToken:string, user:object}>}
 */
export function loginRequest(credentials) {
  return safeRequest(httpClient.post('/auth/login', credentials));
}

/**
 * GET /auth/me — current user's profile.
 * @returns {Promise<object>}
 */
export function fetchCurrentUser() {
  return safeRequest(httpClient.get('/auth/me'));
}

/**
 * PATCH /auth/me — update name/phone on the logged-in user.
 * @param {{name?:string, phone?:string}} patch
 * @returns {Promise<object>}
 */
export function updateCurrentUser(patch) {
  return safeRequest(httpClient.patch('/auth/me', patch));
}

/**
 * POST /auth/password/change — change own password (requires the current one).
 * @param {{currentPassword:string, newPassword:string}} payload
 * @returns {Promise<{ok:boolean}>}
 */
export function changeCurrentPassword(payload) {
  return safeRequest(httpClient.post('/auth/password/change', payload));
}

/**
 * POST /auth/password/forgot — request a password reset token by email.
 * @param {string} email
 */
export function requestPasswordReset(email) {
  return safeRequest(httpClient.post('/auth/password/forgot', { email }));
}

/**
 * POST /auth/password/reset — set a new password using a reset token.
 * @param {{token:string, newPassword:string}} payload
 */
export function resetPasswordWithToken(payload) {
  return safeRequest(httpClient.post('/auth/password/reset', payload));
}

/**
 * POST /auth/logout — invalidates server-side sessions for the user.
 * Caller is responsible for clearing localStorage.
 */
export function logoutRequest() {
  return safeRequest(httpClient.post('/auth/logout'));
}

/** GET /auth/users — admin/manager only — list all employees. */
export function fetchAllUsers() {
  return safeRequest(httpClient.get('/auth/users'));
}

/** GET /auth/audit/logins — admin/manager only — paginated login audit log. */
export function fetchLoginLogs(params = {}) {
  return safeRequest(httpClient.get('/auth/audit/logins', { params }));
}

/** GET /auth/audit — admin/manager only — full audit log (all entities). */
export function fetchAuditLogs(params = {}) {
  return safeRequest(httpClient.get('/auth/audit', { params }));
}

/**
 * POST /auth/register — admin/manager creates a new employee user.
 * @param {object} userData
 */
export function registerEmployeeUser(userData) {
  return safeRequest(httpClient.post('/auth/register', userData));
}

/** PATCH /auth/users/:id — admin only — update role or other fields. */
export function updateUser(userId, patch) {
  return safeRequest(httpClient.patch(`/auth/users/${userId}`, patch));
}

/**
 * POST /auth/google — exchange a Google ID token for app JWT tokens.
 * @param {string} idToken  The credential string returned by Google Identity Services
 */
export function googleLogin(idToken) {
  return safeRequest(httpClient.post('/auth/google', { idToken }));
}
