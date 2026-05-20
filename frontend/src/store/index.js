/**
 * Central Redux store.
 *
 * Each slice owns one domain and exposes:
 *   - actions (sync reducers)
 *   - thunks  (async operations that call the API and cache results)
 *   - selectors
 *
 * Caching strategy: each slice stores `items`, `loadedAt` (timestamp) and `status`.
 * Pages call the `loadXxxIfStale` thunk which skips the network roundtrip
 * if the cache is fresh (< 60s).
 */
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import uiReducer from './slices/uiSlice.js';
import productsReducer from './slices/productsSlice.js';
import categoriesReducer from './slices/categoriesSlice.js';
import customersReducer from './slices/customersSlice.js';
import ordersReducer from './slices/ordersSlice.js';
import repairsReducer from './slices/repairsSlice.js';
import suppliersReducer from './slices/suppliersSlice.js';
import branchesReducer from './slices/branchesSlice.js';
import notificationsReducer from './slices/notificationsSlice.js';
import publicReducer from './slices/publicSlice.js';
import settingsReducer from './slices/settingsSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    settings: settingsReducer,
    products: productsReducer,
    categories: categoriesReducer,
    customers: customersReducer,
    orders: ordersReducer,
    repairs: repairsReducer,
    suppliers: suppliersReducer,
    branches: branchesReducer,
    notifications: notificationsReducer,
    publicShop: publicReducer,
  },
});

export { CACHE_TTL_MS, isCacheStale } from './cacheUtils.js';
