/**
 * Repair-lab tickets endpoints.
 */
import { httpClient, safeRequest } from './request.js';

/** GET /repairs — paginated list with filters (status, technicianId, customerId). */
export function fetchRepairs(queryParams = {}) {
  return safeRequest(httpClient.get('/repairs', { params: queryParams }));
}

/** GET /repairs/:id — single repair ticket. */
export function fetchRepairById(repairId) {
  return safeRequest(httpClient.get(`/repairs/${repairId}`));
}

/** POST /repairs — create an intake ticket for a customer's device. */
export function createRepair(repairData) {
  return safeRequest(httpClient.post('/repairs', repairData));
}

/** PATCH /repairs/:id — update technician notes / costs / tech assignment. */
export function updateRepair(repairId, patch) {
  return safeRequest(httpClient.patch(`/repairs/${repairId}`, patch));
}

/**
 * POST /repairs/:id/status — change repair status (received → diagnosed → … → delivered).
 * Triggers an SMS to the customer for relevant statuses on the server side.
 */
export function changeRepairStatus(repairId, payload) {
  return safeRequest(httpClient.post(`/repairs/${repairId}/status`, payload));
}

/** POST /repairs/:id/sign — attach a base64/URL signature on delivery. */
export function signRepairDelivery(repairId, signature) {
  return safeRequest(httpClient.post(`/repairs/${repairId}/sign`, { signature }));
}

/** GET /repairs/performance — aggregated per-technician revenue & throughput. */
export function fetchTechnicianPerformance(queryParams = {}) {
  return safeRequest(httpClient.get('/repairs/performance', { params: queryParams }));
}
