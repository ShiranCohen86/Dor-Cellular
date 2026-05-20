/**
 * Branches (multi-branch) endpoints.
 */
import { httpClient, safeRequest } from './request.js';

/** GET /branches — list all branches. */
export function fetchBranches() {
  return safeRequest(httpClient.get('/branches'));
}

/** GET /branches/:id — single branch. */
export function fetchBranchById(branchId) {
  return safeRequest(httpClient.get(`/branches/${branchId}`));
}

/** POST /branches — create a new branch (admin only). */
export function createBranch(branchData) {
  return safeRequest(httpClient.post('/branches', branchData));
}

/** PATCH /branches/:id — update a branch (admin only). */
export function updateBranch(branchId, patch) {
  return safeRequest(httpClient.patch(`/branches/${branchId}`, patch));
}

/** GET /branches/:id/inventory — products and per-branch stock levels. */
export function fetchBranchInventory(branchId) {
  return safeRequest(httpClient.get(`/branches/${branchId}/inventory`));
}
