import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchProducts } from '../../api/products.api.js';
import { isCacheStale } from '../cacheUtils.js';

const initialState = {
  items: [],
  total: 0,
  status: 'idle',
  errorMessage: null,
  loadedAt: null,
  lastQuery: null,
};

export const loadProducts = createAsyncThunk(
  'products/load',
  async (queryParams = {}, { rejectWithValue }) => {
    try { return await fetchProducts(queryParams); }
    catch (err) { return rejectWithValue(err.message); }
  },
);

export const loadProductsIfStale = createAsyncThunk(
  'products/loadIfStale',
  async (queryParams = {}, { getState, dispatch }) => {
    const state = getState().products;
    const sameQuery = JSON.stringify(state.lastQuery) === JSON.stringify(queryParams);
    if (sameQuery && !isCacheStale(state)) return state;
    return dispatch(loadProducts(queryParams)).unwrap();
  },
);

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
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
      });
  },
});

export const { invalidateProductsCache } = productsSlice.actions;

export const selectAllProducts = (state) => state.products.items;
export const selectProductsStatus = (state) => state.products.status;
export const selectProductsError = (state) => state.products.errorMessage;

export default productsSlice.reducer;
