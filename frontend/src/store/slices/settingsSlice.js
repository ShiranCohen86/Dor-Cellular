import { createSlice } from '@reduxjs/toolkit';

const DEFAULT_STORE_INFO = {
  name: 'דור הסלולר',
  phone: '052-6098000',
  whatsapp: '9720526098000',
  address: 'בית הכרם 30',
  email: '',
};

function loadFromStorage(key, defaultValue) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

const initialState = {
  theme: loadFromStorage('app-theme', 'light'),
  customColors: loadFromStorage('app-custom-colors', { primary: '#2563eb', accent: '#06b6d4' }),
  storeInfo: loadFromStorage('app-store-info', DEFAULT_STORE_INFO),
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme(state, action) {
      state.theme = action.payload;
      localStorage.setItem('app-theme', action.payload);
      document.documentElement.setAttribute('data-theme', action.payload);
    },
    setCustomColors(state, action) {
      state.customColors = { ...state.customColors, ...action.payload };
      localStorage.setItem('app-custom-colors', JSON.stringify(state.customColors));
    },
    setStoreInfo(state, action) {
      state.storeInfo = { ...state.storeInfo, ...action.payload };
      localStorage.setItem('app-store-info', JSON.stringify(state.storeInfo));
    },
  },
});

function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(255 * percent / 100)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(255 * percent / 100)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(255 * percent / 100)));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export const { setTheme, setCustomColors, setStoreInfo } = settingsSlice.actions;

export const selectTheme        = (state) => state.settings.theme;
export const selectCustomColors = (state) => state.settings.customColors;
export const selectStoreInfo    = (state) => state.settings.storeInfo;
export const selectStoreWhatsApp = (state) => state.settings.storeInfo?.whatsapp;

export default settingsSlice.reducer;
