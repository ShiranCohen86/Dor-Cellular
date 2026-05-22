import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider as ReduxProvider } from 'react-redux';
import App from './App.jsx';
import { store } from './store/index.js';
import { AuthProvider } from './context/AuthContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import './i18n';
import './styles/main.scss';
import { registerServiceWorker } from './pwa.js';

// Tell the browser not to restore scroll positions automatically on navigation — we do it.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

// Apply persisted theme + direction before first paint to prevent flash
const savedTheme = localStorage.getItem('app-theme') || 'light';
const savedLang  = localStorage.getItem('lang') || 'he';
document.documentElement.setAttribute('data-theme', savedTheme);
document.documentElement.setAttribute('dir',  savedLang === 'he' ? 'rtl' : 'ltr');
document.documentElement.setAttribute('lang', savedLang);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ReduxProvider store={store}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LanguageProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ReduxProvider>
  </React.StrictMode>,
);

registerServiceWorker();
