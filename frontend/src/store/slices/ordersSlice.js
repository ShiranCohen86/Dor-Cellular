/** Orders slice — cached list of recent sales. */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchOrders } from '../../api/orders.api.js';
import { isCacheStale } from '../cacheUtils.js';

const initialState = { items: [], total: 0, status: 'idle', errorMessage: null, loadedAt: null, lastQuery: null };

/** Fetches orders. */
export const loadOrders = createAsyncThunk('orders/load', async (queryParams = {}, { rejectWithValue }) => {
  try { return await fetchOrders(queryParams); } catch (err) { return rejectWithValue(err.message); }
});

/** Re-uses cache when fresh and query matches. */
export const loadOrdersIfStale = createAsyncThunk(
  'orders/loadIfStale',
  async (queryParams = {}, { getState, dispatch }) => {
    const state = getState().orders;
    const sameQuery = JSON.stringify(state.lastQuery) === JSON.stringify(queryParams);
    if (sameQuery && !isCacheStale(state, 30 * 1000)) return state;
    return dispatch(loadOrders(queryParams)).unwrap();
  },
);

const slice = createSlice({
  name: 'orders',
  initialState,
  reducers: { invalidateOrdersCache(state) { state.loadedAt = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(loadOrders.pending, (state, action) => { state.status = 'loading'; state.lastQuery = action.meta.arg || {}; })
      .addCase(loadOrders.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items || [];
        state.total = action.payload.total || 0;
        state.loadedAt = Date.now();
      })
      .addCase(loadOrders.rejected, (state, action) => {
        state.status = 'failed';
        state.errorMessage = action.payload || 'Failed to load orders';
      });
  },
});

export const { invalidateOrdersCache } = slice.actions;
export const selectAllOrders = (state) => state.orders.items;
export default slice.reducer;
