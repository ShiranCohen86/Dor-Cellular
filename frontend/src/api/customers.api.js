/**
 * Customer / CRM endpoints.
 */
import { httpClient, safeRequest } from './request.js';

/** GET /customers — paginated list with filters (q, isVip, hasDebt). */
export function fetchCustomers(queryParams = {}) {
  return safeRequest(httpClient.get('/customers', { params: queryParams }));
}

/** GET /customers/:id — single customer. */
export function fetchCustomerById(customerId) {
  return safeRequest(httpClient.get(`/customers/${customerId}`));
}

/** POST /customers — create a new customer. */
export function createCustomer(customerData) {
  return safeRequest(httpClient.post('/customers', customerData));
}

/** PATCH /customers/:id — update a customer. */
export function updateCustomer(customerId, patch) {
  return safeRequest(httpClient.patch(`/customers/${customerId}`, patch));
}

/** DELETE /customers/:id — soft-delete (admin only). */
export function deleteCustomer(customerId) {
  return safeRequest(httpClient.delete(`/customers/${customerId}`));
}

/** GET /customers/:id/purchases — last 100 orders for a customer. */
export function fetchCustomerPurchases(customerId) {
  return safeRequest(httpClient.get(`/customers/${customerId}/purchases`));
}

/** GET /customers/:id/repairs — last 100 repairs for a customer. */
export function fetchCustomerRepairs(customerId) {
  return safeRequest(httpClient.get(`/customers/${customerId}/repairs`));
}

/**
 * POST /customers/:id/loyalty — adjust loyalty points (positive or negative).
 * @param {string} customerId
 * @param {number} delta
 */
export function adjustCustomerLoyalty(customerId, delta) {
  return safeRequest(httpClient.post(`/customers/${customerId}/loyalty`, { delta }));
}

/** GET /customers/birthdays — customers whose birthday falls in the next N days. */
export function fetchUpcomingBirthdays(days = 14) {
  return safeRequest(httpClient.get('/customers/birthdays', { params: { days } }));
}
