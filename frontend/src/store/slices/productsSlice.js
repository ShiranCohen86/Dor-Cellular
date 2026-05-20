/**
 * Products slice — cached list of products.
 *
 * Avoids hitting the API on every page-mount by re-using the cache when it is fresh
 * (`isCacheStale`). When the user explicitly searches/filters, the thunk bypasses
 * the cache.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchProducts, fetchLowStockProducts } from '../../api/products.api.js';
import { isCacheStale } from '../cacheUtils.js';

const initialState = {
  items: [],
  total: 0,
  status: 'idle',
  errorMessage: null,
  loadedAt: null,
  lastQuery: null,
  lowStockItems: [],
};

/**
 * Loads products. Skips the network call when the cache is still fresh and the
 * query is identical to the previous one.
 */
export const loadProducts = createAsyncThunk(
  'products/load',
  async (queryParams = {}, { rejectWithValue }) => {
    try { return await fetchProducts(queryParams); }
    catch (err) { return rejectWithValue(err.message); }
  },
);

/** Re-uses the cache when fresh. Most pages should call this instead. */
export const loadProductsIfStale = createAsyncThunk(
  'products/loadIfStale',
  async (queryParams = {}, { getState, dispatch }) => {
    const state = getState().products;
    const sameQuery = JSON.stringify(state.lastQuery) === JSON.stringify(queryParams);
    if (sameQuery && !isCacheStale(state)) return state; // no-op
    return dispatch(loadProducts(queryParams)).unwrap();
  },
);

/** Loads the small list of low-stock products (used by dashboard + alerts). */
export const loadLowStockProducts = createAsyncThunk(
  'products/loadLowStock',
  async (_arg, { rejectWithValue }) => {
    try { return await fetchLowStockProducts(); }
    catch (err) { return rejectWithValue(err.message); }
  },
);

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    /** Invalidate the cache (call after a write that affects products). */
    invalidateProductsCache(state) { state.loadedAt = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadProducts.pending, (state, action) => {
        state.status = 'loading';
        state.errorMessage = null;
        state.lastQuery = action.meta.arg || {};
      })
      .addCase(loadProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items || [];
        state.total = action.payload.total || 0;
        state.loadedAt = Date.now();
      })
      .addCase(loadProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.errorMessage = action.payload || 'Failed to load products';
      })
      .addCase(loadLowStockProducts.fulfilled, (state, action) => {
        state.lowStockItems = action.payload.items || [];
      });
  },
});

export const { invalidateProductsCache } = productsSlice.actions;

export const selectAllProducts = (state) => state.products.items;
export const selectProductsStatus = (state) => state.products.status;
export const selectProductsError = (state) => state.products.errorMessage;
export const selectLowStockProducts = (state) => state.products.lowStockItems;

export default productsSlice.reducer;
