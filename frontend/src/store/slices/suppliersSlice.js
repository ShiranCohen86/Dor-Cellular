/** Suppliers slice — cached supplier list. */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchSuppliers, fetchPurchaseOrders } from '../../api/suppliers.api.js';
import { isCacheStale } from '../cacheUtils.js';

const initialState = {
  items: [], purchaseOrders: [],
  status: 'idle', errorMessage: null, loadedAt: null,
};

/** Fetches all suppliers. */
export const loadSuppliers = createAsyncThunk('suppliers/load', async (_arg, { rejectWithValue }) => {
  try { return await fetchSuppliers(); } catch (err) { return rejectWithValue(err.message); }
});

/** Fetches purchase orders list. */
export const loadPurchaseOrders = createAsyncThunk('suppliers/loadPOs', async (queryParams = {}, { rejectWithValue }) => {
  try { return await fetchPurchaseOrders(queryParams); } catch (err) { return rejectWithValue(err.message); }
});

/** Cache-aware loader for suppliers. */
export const loadSuppliersIfStale = createAsyncThunk('suppliers/loadIfStale', async (_arg, { getState, dispatch }) => {
  const state = getState().suppliers;
  if (!isCacheStale(state, 5 * 60 * 1000)) return state;
  return dispatch(loadSuppliers()).unwrap();
});

const slice = createSlice({
  name: 'suppliers',
  initialState,
  reducers: { invalidateSuppliersCache(state) { state.loadedAt = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(loadSuppliers.fulfilled, (state, action) => {
        state.items = action.payload.items || [];
        state.loadedAt = Date.now();
        state.status = 'succeeded';
      })
      .addCase(loadPurchaseOrders.fulfilled, (state, action) => {
        state.purchaseOrders = action.payload.items || [];
      });
  },
});

export const { invalidateSuppliersCache } = slice.actions;
export const selectAllSuppliers = (state) => state.suppliers.items;
export const selectAllPurchaseOrders = (state) => state.suppliers.purchaseOrders;
export default slice.reducer;
