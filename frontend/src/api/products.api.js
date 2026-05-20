/**
 * Inventory / products endpoints (authenticated).
 */
import { httpClient, safeRequest } from './request.js';

/**
 * GET /products — paginated list with optional filters.
 * @param {{q?:string, categoryId?:string, lowStock?:boolean, page?:number, limit?:number}} [queryParams]
 */
export function fetchProducts(queryParams = {}) {
  return safeRequest(httpClient.get('/products', { params: queryParams }));
}

/** GET /products/:id — single product by ID. */
export function fetchProductById(productId) {
  return safeRequest(httpClient.get(`/products/${productId}`));
}

/** GET /products/scan/:code — look up by barcode / SKU / IMEI. */
export function scanProductByCode(code) {
  return safeRequest(httpClient.get(`/products/scan/${encodeURIComponent(code)}`));
}

/** POST /products — create a new product (admin/manager). */
export function createProduct(productData) {
  return safeRequest(httpClient.post('/products', productData));
}

/** PATCH /products/:id — partial update (admin/manager). */
export function updateProduct(productId, patch) {
  return safeRequest(httpClient.patch(`/products/${productId}`, patch));
}

/** DELETE /products/:id — soft-delete (admin only). */
export function deleteProduct(productId) {
  return safeRequest(httpClient.delete(`/products/${productId}`));
}

/**
 * POST /products/:id/adjust — change stock for a product at a branch.
 * @param {string} productId
 * @param {{branchId:string, delta:number, type?:string, reason?:string}} payload
 */
export function adjustProductStock(productId, payload) {
  return safeRequest(httpClient.post(`/products/${productId}/adjust`, payload));
}

/** GET /products/:id/movements — paginated stock-movement history. */
export function fetchStockMovements(productId, queryParams = {}) {
  return safeRequest(httpClient.get(`/products/${productId}/movements`, { params: queryParams }));
}

/** GET /products/low-stock — products at/below their min-stock threshold. */
export function fetchLowStockProducts() {
  return safeRequest(httpClient.get('/products/low-stock'));
}

/** POST /products/transfer — move stock between branches. */
export function transferStockBetweenBranches(payload) {
  return safeRequest(httpClient.post('/products/transfer', payload));
}

/** POST /products/bulk-import — accepts an array of product rows. */
export function bulkImportProducts(rows) {
  return safeRequest(httpClient.post('/products/bulk-import', rows));
}
