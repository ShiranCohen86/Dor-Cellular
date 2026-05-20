/** Branches slice — small reference data, cached for 5 minutes. */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchBranches } from '../../api/branches.api.js';
import { isCacheStale } from '../cacheUtils.js';

const initialState = { items: [], status: 'idle', errorMessage: null, loadedAt: null };

/** Fetches branches from the API. */
export const loadBranches = createAsyncThunk('branches/load', async (_arg, { rejectWithValue }) => {
  try { return await fetchBranches(); } catch (err) { return rejectWithValue(err.message); }
});

/** Cache-aware loader. */
export const loadBranchesIfStale = createAsyncThunk('branches/loadIfStale', async (_arg, { getState, dispatch }) => {
  const state = getState().branches;
  if (!isCacheStale(state, 5 * 60 * 1000)) return state;
  return dispatch(loadBranches()).unwrap();
});

const slice = createSlice({
  name: 'branches',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(loadBranches.fulfilled, (state, action) => {
      state.items = action.payload.items || [];
      state.loadedAt = Date.now();
      state.status = 'succeeded';
    });
  },
});

export const selectAllBranches = (state) => state.branches.items;
export default slice.reducer;
