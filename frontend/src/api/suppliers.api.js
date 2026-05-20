/**
 * Suppliers and Purchase Order endpoints.
 */
import { httpClient, safeRequest } from './request.js';

/** GET /suppliers — list suppliers. */
export function fetchSuppliers(queryParams = {}) {
  return safeRequest(httpClient.get('/suppliers', { params: queryParams }));
}

/** GET /suppliers/:id — single supplier. */
export function fetchSupplierById(supplierId) {
  return safeRequest(httpClient.get(`/suppliers/${supplierId}`));
}

/** POST /suppliers — create supplier. */
export function createSupplier(supplierData) {
  return safeRequest(httpClient.post('/suppliers', supplierData));
}

/** PATCH /suppliers/:id — update supplier. */
export function updateSupplier(supplierId, patch) {
  return safeRequest(httpClient.patch(`/suppliers/${supplierId}`, patch));
}

/** POST /suppliers/:id/pay — record a payment against supplier debt. */
export function paySupplier(supplierId, amount) {
  return safeRequest(httpClient.post(`/suppliers/${supplierId}/pay`, { amount }));
}

/** GET /suppliers/purchase-orders — list POs. */
export function fetchPurchaseOrders(queryParams = {}) {
  return safeRequest(httpClient.get('/suppliers/purchase-orders', { params: queryParams }));
}

/** GET /suppliers/purchase-orders/:id — single PO with line items. */
export function fetchPurchaseOrderById(purchaseOrderId) {
  return safeRequest(httpClient.get(`/suppliers/purchase-orders/${purchaseOrderId}`));
}

/** POST /suppliers/purchase-orders — create a new PO. */
export function createPurchaseOrder(payload) {
  return safeRequest(httpClient.post('/suppliers/purchase-orders', payload));
}

/** POST /suppliers/purchase-orders/:id/status — change PO status. */
export function updatePurchaseOrderStatus(purchaseOrderId, status) {
  return safeRequest(httpClient.post(`/suppliers/purchase-orders/${purchaseOrderId}/status`, { status }));
}

/**
 * POST /suppliers/purchase-orders/:id/receive — receive items into stock.
 * @param {string} purchaseOrderId
 * @param {Array<{productId:string, quantity:number}>} itemsReceived
 */
export function receivePurchaseOrder(purchaseOrderId, itemsReceived) {
  return safeRequest(
    httpClient.post(`/suppliers/purchase-orders/${purchaseOrderId}/receive`, { items: itemsReceived }),
  );
}
