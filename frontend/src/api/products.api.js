import { httpClient, safeRequest } from './request.js';

export function fetchProducts(queryParams = {}) {
  return safeRequest(httpClient.get('/products', { params: queryParams }));
}

export function fetchProductById(productId) {
  return safeRequest(httpClient.get(`/products/${productId}`));
}

export function scanProductByCode(code) {
  return safeRequest(httpClient.get(`/products/scan/${encodeURIComponent(code)}`));
}

export function createProduct(productData) {
  return safeRequest(httpClient.post('/products', productData));
}

export function updateProduct(productId, patch) {
  return safeRequest(httpClient.patch(`/products/${productId}`, patch));
}

export function deleteProduct(productId) {
  return safeRequest(httpClient.delete(`/products/${productId}`));
}

export function bulkImportProducts(rows) {
  return safeRequest(httpClient.post('/products/bulk-import', rows));
}
