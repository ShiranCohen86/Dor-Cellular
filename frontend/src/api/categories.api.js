/**
 * Product categories endpoints.
 */
import { httpClient, safeRequest } from './request.js';

/** GET /categories — list all categories (active first). */
export function fetchCategories(queryParams = {}) {
  return safeRequest(httpClient.get('/categories', { params: queryParams }));
}

/** POST /categories — create a category (admin/manager). */
export function createCategory(categoryData) {
  return safeRequest(httpClient.post('/categories', categoryData));
}

/** PATCH /categories/:id — update a category. */
export function updateCategory(categoryId, patch) {
  return safeRequest(httpClient.patch(`/categories/${categoryId}`, patch));
}

/** DELETE /categories/:id — soft-delete (admin only). */
export function deleteCategory(categoryId) {
  return safeRequest(httpClient.delete(`/categories/${categoryId}`));
}
