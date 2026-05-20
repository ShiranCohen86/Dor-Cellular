/**
 * Auth slice — currently-logged-in user + tokens.
 *
 * The user object is the same shape as what /auth/me returns.
 * Tokens are mirrored to localStorage for the axios interceptor to read.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loginRequest, logoutRequest, fetchCurrentUser, updateCurrentUser } from '../../api/auth.api.js';
import { logError, logInfo } from '../../api/logger.js';

const initialState = {
  currentUser: null,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  errorMessage: null,
  isBootstrapped: false, // true after we've checked the stored token on app start
};

/**
 * Bootstraps the auth state on app start by calling /auth/me with whatever
 * token is in localStorage. Resolves with `null` if there is no token.
 */
export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async (_arg, { rejectWithValue }) => {
  const storedToken = localStorage.getItem('token');
  if (!storedToken) return null;
  try {
    return await fetchCurrentUser();
  } catch (err) {
    logError('auth', 'bootstrap failed', err.message);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return rejectWithValue(err.message);
  }
});

/** Logs the user in and stores the tokens. */
export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const result = await loginRequest(credentials);
    localStorage.setItem('token', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    logInfo('auth', 'logged in as', result.user.email);
    return result.user;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

/** Logs out and clears tokens. Server call is best-effort. */
export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try { await logoutRequest(); } catch { /* ignore network failure on logout */ }
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
});

/** Updates the current user's profile (name, phone). */
export const updateProfile = createAsyncThunk('auth/updateProfile', async (patch, { rejectWithValue }) => {
  try {
    return await updateCurrentUser(patch);
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Manually clear errors (e.g. after closing a login error banner). */
    clearAuthError(state) { state.errorMessage = null; },
  },
  extraReducers: (builder) => {
    builder
      // bootstrap
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.currentUser = action.payload;
        state.isBootstrapped = true;
        state.status = 'succeeded';
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.currentUser = null;
        state.isBootstrapped = true;
        state.status = 'idle';
      })
      // login
      .addCase(loginUser.pending, (state) => { state.status = 'loading'; state.errorMessage = null; })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentUser = action.payload;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.errorMessage = action.payload || 'Login failed';
      })
      // logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.currentUser = null;
        state.status = 'idle';
      })
      // updateProfile
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.currentUser = action.payload;
      });
  },
});

export const { clearAuthError } = authSlice.actions;

// ---- selectors ----
export const selectCurrentUser = (state) => state.auth.currentUser;
export const selectAuthStatus = (state) => state.auth.status;
export const selectAuthError = (state) => state.auth.errorMessage;
export const selectIsBootstrapped = (state) => state.auth.isBootstrapped;
/** Boolean shortcut for "is logged in". */
export const selectIsAuthenticated = (state) => !!state.auth.currentUser;
/** Role-check helper. Usage: `useSelector(selectHasRole('admin','manager'))`. */
export const selectHasRole = (...allowedRoles) => (state) =>
  !!state.auth.currentUser && allowedRoles.includes(state.auth.currentUser.role);

export default authSlice.reducer;
