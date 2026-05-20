/**
 * Public storefront slice — the data shown to anonymous visitors.
 * Cached so navigating around the shop doesn't hammer the API.
 * Also enables an offline experience via the PWA service worker.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchPublicProducts, fetchPublicCategories } from '../../api/public.api.js';
import { isCacheStale } from '../cacheUtils.js';

const initialState = {
  products: [],
  categories: [],
  status: 'idle',
  errorMessage: null,
  loadedAt: null,
  lastQuery: null,
};

/** Loads the publicly-visible product list. */
export const loadPublicProducts = createAsyncThunk(
  'public/loadProducts',
  async (queryParams = {}, { rejectWithValue }) => {
    try { return await fetchPublicProducts(queryParams); }
    catch (err) { return rejectWithValue(err.message); }
  },
);

/** Loads the categories shown as filter chips in the storefront. */
export const loadPublicCategories = createAsyncThunk(
  'public/loadCategories',
  async (_arg, { rejectWithValue }) => {
    try { return await fetchPublicCategories(); }
    catch (err) { return rejectWithValue(err.message); }
  },
);

/** Cache-aware public products loader. */
export const loadPublicProductsIfStale = createAsyncThunk(
  'public/loadProductsIfStale',
  async (queryParams = {}, { getState, dispatch }) => {
    const state = getState().publicShop;
    const sameQuery = JSON.stringify(state.lastQuery) === JSON.stringify(queryParams);
    if (sameQuery && !isCacheStale(state, 2 * 60 * 1000)) return state;
    return dispatch(loadPublicProducts(queryParams)).unwrap();
  },
);

const slice = createSlice({
  name: 'publicShop',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadPublicProducts.pending, (state, action) => {
        state.status = 'loading';
        state.lastQuery = action.meta.arg || {};
      })
      .addCase(loadPublicProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.products = action.payload.items || [];
        state.loadedAt = Date.now();
      })
      .addCase(loadPublicProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.errorMessage = action.payload || 'Failed to load products';
      })
      .addCase(loadPublicCategories.fulfilled, (state, action) => {
        state.categories = action.payload.items || [];
      });
  },
});

export const selectPublicProducts = (state) => state.publicShop.products;
export const selectPublicCategories = (state) => state.publicShop.categories;
export const selectPublicStatus = (state) => state.publicShop.status;
export default slice.reducer;
