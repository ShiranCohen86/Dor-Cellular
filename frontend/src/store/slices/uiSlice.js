/**
 * UI slice — language, RTL direction, toast queue, sidebar collapsed flag.
 * These never need to come from the server.
 */
import { createSlice } from '@reduxjs/toolkit';
import i18n from '../../i18n/index.js';

const storedLanguage = (typeof window !== 'undefined' && localStorage.getItem('lang')) || 'he';

const initialState = {
  language: storedLanguage,
  direction: storedLanguage === 'he' ? 'rtl' : 'ltr',
  toasts: [], // { id, title, message, severity }
  activeCustomer: null, // { _id, name, phone, loyalty, ... } — persists across pages
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    /** Switch UI language and flip <html dir>. */
    setLanguage(state, action) {
      state.language = action.payload;
      state.direction = action.payload === 'he' ? 'rtl' : 'ltr';
      i18n.changeLanguage(action.payload);
    },
    /** Toggle between Hebrew and English. */
    toggleLanguage(state) {
      const next = state.language === 'he' ? 'en' : 'he';
      state.language = next;
      state.direction = next === 'he' ? 'rtl' : 'ltr';
      i18n.changeLanguage(next);
    },
    /** Push a transient toast onto the queue. Auto-dismissed by the UI layer. */
    pushToast(state, action) {
      const toast = { id: Date.now() + Math.random(), severity: 'info', ...action.payload };
      state.toasts.push(toast);
    },
    /** Remove a toast by id. */
    dismissToast(state, action) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
    /** Set the active customer session (persists until explicitly cleared). */
    setActiveCustomer(state, action) {
      state.activeCustomer = action.payload;
    },
    /** Clear the active customer session. */
    clearActiveCustomer(state) {
      state.activeCustomer = null;
    },
  },
});

export const { setLanguage, toggleLanguage, pushToast, dismissToast, setActiveCustomer, clearActiveCustomer } = uiSlice.actions;

export const selectLanguage = (state) => state.ui.language;
export const selectDirection = (state) => state.ui.direction;
export const selectToasts = (state) => state.ui.toasts;
export const selectActiveCustomer = (state) => state.ui.activeCustomer;

export default uiSlice.reducer;
