/** Customers slice — cached list + last-loaded query. */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchCustomers } from '../../api/customers.api.js';
import { isCacheStale } from '../cacheUtils.js';

const initialState = {
  items: [], total: 0, status: 'idle', errorMessage: null,
  loadedAt: null, lastQuery: null,
};

/** Fetches customers from the API (with the given filters). */
export const loadCustomers = createAsyncThunk('customers/load', async (queryParams = {}, { rejectWithValue }) => {
  try { return await fetchCustomers(queryParams); } catch (err) { return rejectWithValue(err.message); }
});

/** Cache-aware variant. */
export const loadCustomersIfStale = createAsyncThunk(
  'customers/loadIfStale',
  async (queryParams = {}, { getState, dispatch }) => {
    const state = getState().customers;
    const sameQuery = JSON.stringify(state.lastQuery) === JSON.stringify(queryParams);
    if (sameQuery && !isCacheStale(state)) return state;
    return dispatch(loadCustomers(queryParams)).unwrap();
  },
);

const slice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    invalidateCustomersCache(state) { state.loadedAt = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCustomers.pending, (state, action) => {
        state.status = 'loading';
        state.lastQuery = action.meta.arg || {};
      })
      .addCase(loadCustomers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items || [];
        state.total = action.payload.total || 0;
        state.loadedAt = Date.now();
      })
      .addCase(loadCustomers.rejected, (state, action) => {
        state.status = 'failed';
        state.errorMessage = action.payload || 'Failed to load customers';
      });
  },
});

export const { invalidateCustomersCache } = slice.actions;
export const selectAllCustomers = (state) => state.customers.items;
export const selectCustomersStatus = (state) => state.customers.status;
export default slice.reducer;
