/** Repairs slice — cached list of repair tickets. */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchRepairs } from '../../api/repairs.api.js';
import { isCacheStale } from '../cacheUtils.js';

const initialState = { items: [], total: 0, status: 'idle', errorMessage: null, loadedAt: null, lastQuery: null };

/** Fetches the repair list. */
export const loadRepairs = createAsyncThunk('repairs/load', async (queryParams = {}, { rejectWithValue }) => {
  try { return await fetchRepairs(queryParams); } catch (err) { return rejectWithValue(err.message); }
});

/** Cache-aware version. */
export const loadRepairsIfStale = createAsyncThunk(
  'repairs/loadIfStale',
  async (queryParams = {}, { getState, dispatch }) => {
    const state = getState().repairs;
    const sameQuery = JSON.stringify(state.lastQuery) === JSON.stringify(queryParams);
    if (sameQuery && !isCacheStale(state, 30 * 1000)) return state;
    return dispatch(loadRepairs(queryParams)).unwrap();
  },
);

const slice = createSlice({
  name: 'repairs',
  initialState,
  reducers: { invalidateRepairsCache(state) { state.loadedAt = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(loadRepairs.pending, (state, action) => { state.status = 'loading'; state.lastQuery = action.meta.arg || {}; })
      .addCase(loadRepairs.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items || [];
        state.total = action.payload.total || 0;
        state.loadedAt = Date.now();
      })
      .addCase(loadRepairs.rejected, (state, action) => {
        state.status = 'failed';
        state.errorMessage = action.payload || 'Failed to load repairs';
      });
  },
});

export const { invalidateRepairsCache } = slice.actions;
export const selectAllRepairs = (state) => state.repairs.items;
export default slice.reducer;
