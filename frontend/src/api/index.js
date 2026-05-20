/**
 * Barrel re-export for convenience.
 *
 * Prefer the per-domain imports inside components, e.g.:
 *     import { fetchProducts } from '../api/products.api.js';
 * The grouped exports here exist for places where it's nicer to write:
 *     import { AuthApi, ProductsApi } from '../api';
 */
export * as AuthApi from './auth.api.js';
export * as ProductsApi from './products.api.js';
export * as CategoriesApi from './categories.api.js';
export * as CustomersApi from './customers.api.js';
export * as OrdersApi from './orders.api.js';
export * as RepairsApi from './repairs.api.js';
export * as SuppliersApi from './suppliers.api.js';
export * as ReportsApi from './reports.api.js';
export * as NotificationsApi from './notifications.api.js';
export * as BranchesApi from './branches.api.js';
export * as PublicApi from './public.api.js';
export { httpClient, safeRequest, buildAbsoluteUrl } from './request.js';
