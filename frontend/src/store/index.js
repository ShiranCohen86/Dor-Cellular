import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import uiReducer from './slices/uiSlice.js';
import productsReducer from './slices/productsSlice.js';
import categoriesReducer from './slices/categoriesSlice.js';
import customersReducer from './slices/customersSlice.js';
import ordersReducer from './slices/ordersSlice.js';
import repairsReducer from './slices/repairsSlice.js';
import suppliersReducer from './slices/suppliersSlice.js';
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
    publicShop: publicReducer,
  },
});

export { CACHE_TTL_MS, isCacheStale } from './cacheUtils.js';
