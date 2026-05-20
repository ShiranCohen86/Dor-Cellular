import { createSlice } from '@reduxjs/toolkit';

const ALL_NAV_KEYS = ['dashboard', 'pos', 'products', 'orders', 'repairs', 'customers', 'suppliers', 'reports', 'notifications', 'branches', 'users', 'profile', 'settings'];
const allVisible = Object.fromEntries(ALL_NAV_KEYS.map((key) => [key, true]));

export const DEFAULT_NAV_VISIBILITY = {
  admin:       { ...allVisible },
  manager:     { ...allVisible },
  salesperson: { ...allVisible },
  technician:  { ...allVisible },
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
  navVisibility: loadFromStorage('app-nav-visibility', DEFAULT_NAV_VISIBILITY),
  customColors: loadFromStorage('app-custom-colors', { primary: '#2563eb', accent: '#06b6d4' }),
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
    setNavItemVisible(state, action) {
      const { role, key, visible } = action.payload;
      if (state.navVisibility[role]) {
        state.navVisibility[role][key] = visible;
        localStorage.setItem('app-nav-visibility', JSON.stringify(state.navVisibility));
      }
    },
    resetNavVisibility(state) {
      state.navVisibility = DEFAULT_NAV_VISIBILITY;
      localStorage.setItem('app-nav-visibility', JSON.stringify(DEFAULT_NAV_VISIBILITY));
    },
    setCustomColors(state, action) {
      state.customColors = { ...state.customColors, ...action.payload };
      localStorage.setItem('app-custom-colors', JSON.stringify(state.customColors));
      if (state.theme === 'custom') {
        const { primary, accent } = state.customColors;
        document.documentElement.style.setProperty('--brand-primary', primary);
        document.documentElement.style.setProperty('--brand-primary-dark', shadeColor(primary, -15));
        document.documentElement.style.setProperty('--brand-accent', accent);
      }
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

export const { setTheme, setNavItemVisible, resetNavVisibility, setCustomColors } = settingsSlice.actions;

export const selectTheme = (state) => state.settings.theme;
export const selectNavVisibility = (state) => state.settings.navVisibility;
export const selectCustomColors = (state) => state.settings.customColors;

export default settingsSlice.reducer;
