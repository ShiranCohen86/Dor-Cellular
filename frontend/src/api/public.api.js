/**
 * Public storefront endpoints — no authentication required.
 * Exposes a SAFE subset of product fields (no purchase price, supplier, exact stock count).
 */
import { httpClient, safeRequest } from './request.js';

/** GET /public/products — visitor-friendly product listing. */
export function fetchPublicProducts(queryParams = {}) {
  return safeRequest(httpClient.get('/public/products', { params: queryParams }));
}

/** GET /public/products/:id — single product (public fields only). */
export function fetchPublicProductById(productId) {
  return safeRequest(httpClient.get(`/public/products/${productId}`));
}

/** GET /public/categories — categories the storefront can filter by. */
export function fetchPublicCategories() {
  return safeRequest(httpClient.get('/public/categories'));
}

/** GET /public/brands — distinct brand names currently in stock. */
export function fetchPublicBrands() {
  return safeRequest(httpClient.get('/public/brands'));
}
