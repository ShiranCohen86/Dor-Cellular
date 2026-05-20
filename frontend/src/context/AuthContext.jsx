/**
 * Thin wrapper around the Redux auth slice.
 *
 * Kept as a context to preserve the existing `useAuth()` API used across pages
 * (`user, login, logout, hasRole, refresh`). Internally everything goes through Redux.
 *
 * Prefer the Redux selectors/dispatch directly for NEW code:
 *     const currentUser = useSelector(selectCurrentUser);
 *     dispatch(loginUser({email, password}));
 */
import { createContext, useContext, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  bootstrapAuth, loginUser, logoutUser, updateProfile,
  selectCurrentUser, selectIsBootstrapped,
} from '../store/slices/authSlice.js';

const AuthContext = createContext(null);

/** Provider — runs `bootstrapAuth` on mount, exposes auth helpers via context. */
export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const isBootstrapped = useSelector(selectIsBootstrapped);

  useEffect(() => { dispatch(bootstrapAuth()); }, [dispatch]);

  /** Memoised context value so consumers don't re-render unnecessarily. */
  const contextValue = useMemo(
    () => ({
      user: currentUser,
      loading: !isBootstrapped,

      /** Logs the user in. Returns the user record on success, throws otherwise. */
      async login(emailAddress, plainPassword) {
        const result = await dispatch(loginUser({ email: emailAddress, password: plainPassword }));
        if (result.error) throw new Error(result.payload || 'Login failed');
        return result.payload;
      },

      /** Logs out and clears tokens. */
      async logout() { await dispatch(logoutUser()); },

      /** Re-fetches the current user (called e.g. after profile edit). */
      async refresh() { await dispatch(bootstrapAuth()); },

      /** Updates current-user profile (name/phone). */
      async updateMe(patch) {
        const result = await dispatch(updateProfile(patch));
        if (result.error) throw new Error(result.payload || 'Update failed');
        return result.payload;
      },

      /** Returns true if the current user has ANY of the allowed roles. */
      hasRole(...allowedRoles) {
        return !!currentUser && allowedRoles.includes(currentUser.role);
      },
    }),
    [dispatch, currentUser, isBootstrapped],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

/** Hook for components that still use the legacy context API. */
export function useAuth() { return useContext(AuthContext); }
