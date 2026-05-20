/** Categories slice — small reference data, cached aggressively. */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchCategories } from '../../api/categories.api.js';
import { isCacheStale } from '../cacheUtils.js';

const initialState = { items: [], status: 'idle', errorMessage: null, loadedAt: null };

/** Loads category list from the API. */
export const loadCategories = createAsyncThunk('categories/load', async (_arg, { rejectWithValue }) => {
  try { return await fetchCategories(); } catch (err) { return rejectWithValue(err.message); }
});

/** Skips the call if the cached list is still fresh. */
export const loadCategoriesIfStale = createAsyncThunk(
  'categories/loadIfStale',
  async (_arg, { getState, dispatch }) => {
    const state = getState().categories;
    if (!isCacheStale(state, 5 * 60 * 1000)) return state;
    return dispatch(loadCategories()).unwrap();
  },
);

const slice = createSlice({
  name: 'categories',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadCategories.pending, (state) => { state.status = 'loading'; })
      .addCase(loadCategories.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items || [];
        state.loadedAt = Date.now();
      })
      .addCase(loadCategories.rejected, (state, action) => {
        state.status = 'failed';
        state.errorMessage = action.payload || 'Failed to load categories';
      });
  },
});

export const selectAllCategories = (state) => state.categories.items;
export default slice.reducer;
