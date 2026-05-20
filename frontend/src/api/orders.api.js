/**
 * Sales orders / POS endpoints.
 */
import { httpClient, safeRequest, buildAbsoluteUrl } from './request.js';

/** GET /orders — paginated list with filters. */
export function fetchOrders(queryParams = {}) {
  return safeRequest(httpClient.get('/orders', { params: queryParams }));
}

/** GET /orders/:id — single order with items, payments and customer. */
export function fetchOrderById(orderId) {
  return safeRequest(httpClient.get(`/orders/${orderId}`));
}

/** POST /orders — create a sale, decrement stock, attach payments. */
export function createOrder(orderPayload) {
  return safeRequest(httpClient.post('/orders', orderPayload));
}

/** POST /orders/:id/payments — append a payment to an existing order. */
export function addPaymentToOrder(orderId, payment) {
  return safeRequest(httpClient.post(`/orders/${orderId}/payments`, payment));
}

/** POST /orders/:id/refund — refund (full or partial) and optionally restock. */
export function refundOrder(orderId, payload) {
  return safeRequest(httpClient.post(`/orders/${orderId}/refund`, payload));
}

/** POST /orders/:id/cancel — cancels a draft order. */
export function cancelOrder(orderId) {
  return safeRequest(httpClient.post(`/orders/${orderId}/cancel`));
}

/** Returns the absolute URL of the invoice PDF (for <a href> / print). */
export function getInvoicePdfUrl(orderId) {
  return buildAbsoluteUrl(`/orders/${orderId}/invoice.pdf`);
}
