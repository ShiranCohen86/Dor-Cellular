import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  loginUser, googleLoginUser, signupUser, clearAuthError,
  selectAuthError, selectAuthStatus, selectCurrentUser,
} from '../store/slices/authSlice.js';
import { selectLanguage, toggleLanguage } from '../store/slices/uiSlice.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Inline Google "G" SVG logo
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}

export default function Login() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate  = useNavigate();
  const [searchParams] = useSearchParams();
  const authError     = useSelector(selectAuthError);
  const authStatus    = useSelector(selectAuthStatus);
  const currentUser   = useSelector(selectCurrentUser);
  const currentLanguage = useSelector(selectLanguage);

  const [isRegister,    setIsRegister]    = useState(false);
  const [emailInput,    setEmailInput]    = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput,     setNameInput]     = useState('');
  const [phoneInput,    setPhoneInput]    = useState('');
  const [signupError,   setSignupError]   = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError,   setGoogleError]   = useState('');

  const googleInitialized = useRef(false);

  useEffect(() => {
    if (currentUser) {
      const redirect = searchParams.get('redirect');
      navigate(redirect || '/dashboard', { replace: true });
    }
  }, [currentUser, navigate, searchParams]);
  useEffect(() => { if (authError) dispatch(clearAuthError()); }, [emailInput, passwordInput]); // eslint-disable-line
  // Clean up ALL GIS-injected elements when Login unmounts (fallback for any navigation path)
  useEffect(() => () => {
    window.google?.accounts?.id?.cancel?.();
    document.querySelectorAll(
      '[id^="credential_"],[id^="g_id_"],[id^="g_a11y"],[id^="gsi_"]'
    ).forEach(el => el.remove());
  }, []);

  // ── Google credential callback ──────────────────────────────────────────
  const handleGoogleCredential = useCallback(async ({ credential }) => {
    setGoogleLoading(true);
    setGoogleError('');
    try {
      const result = await dispatch(googleLoginUser(credential));
      if (!result.error) {
        // Google One Tap on mobile modifies the browser's viewport/DOM state in ways
        // that break SPA navigation (horizontal scroll, wrong layout width).
        // Full page navigation resets all browser state cleanly — the token is already
        // in localStorage so the app bootstraps straight to the dashboard.
        window.google?.accounts?.id?.cancel?.();
        const redirect = new URLSearchParams(window.location.search).get('redirect');
        window.location.replace(redirect || '/dashboard');
      } else setGoogleError(result.payload || 'שגיאה בהתחברות עם Google');
    } finally {
      setGoogleLoading(false);
    }
  }, [dispatch]);

  // ── Initialize GIS when script is ready ────────────────────────────────
  const initGoogle = useCallback(() => {
    if (googleInitialized.current || !GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
      ux_mode: 'popup',
    });
    googleInitialized.current = true;
  }, [handleGoogleCredential]);

  useEffect(() => {
    if (window.google?.accounts?.id) {
      initGoogle();
      return;
    }
    // GIS script is async — listen for its load event
    const script = document.querySelector('script[src*="accounts.google.com"]');
    if (!script) return;
    script.addEventListener('load', initGoogle, { once: true });
    return () => script.removeEventListener('load', initGoogle);
  }, [initGoogle]);

  // ── Google button click ─────────────────────────────────────────────────
  const handleGoogleClick = () => {
    setGoogleError('');
    if (!GOOGLE_CLIENT_ID) {
      setGoogleError('Google Sign-In לא מוגדר — הגדר VITE_GOOGLE_CLIENT_ID ב-.env.local');
      return;
    }
    initGoogle();
    if (!window.google?.accounts?.id) {
      setGoogleError('Google script לא נטען — נסה לרענן את הדף');
      return;
    }
    window.google.accounts.id.prompt((notification) => {
      // If One Tap is suppressed (e.g. no stored credentials), prompt() silently fails —
      // in that case the user still signed in via the popup if ux_mode: 'popup' is set.
      if (notification.isNotDisplayed()) {
        setGoogleError('לא נמצאו חשבונות Google. בדוק שה-Client ID תקין.');
      }
    });
  };

  const isSubmitting = authStatus === 'loading';

  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupError('');
    setSignupLoading(true);
    try {
      const result = await dispatch(signupUser({ name: nameInput, email: emailInput, password: passwordInput, phone: phoneInput || undefined }));
      if (!result.error) {
        const redirect = new URLSearchParams(window.location.search).get('redirect');
        window.location.replace(redirect || '/');
      } else {
        setSignupError(result.payload || 'שגיאה בהרשמה');
      }
    } finally {
      setSignupLoading(false);
    }
  };

  const switchMode = (toRegister) => {
    setIsRegister(toRegister);
    setSignupError('');
    dispatch(clearAuthError());
  };

  const googleLabel = isRegister
    ? (currentLanguage === 'he' ? 'הרשמה עם Google' : 'Sign up with Google')
    : (currentLanguage === 'he' ? 'המשך עם Google' : 'Continue with Google');

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={isRegister ? handleSignup : async (e) => {
        e.preventDefault();
        try {
          await dispatch(loginUser({ email: emailInput, password: passwordInput }));
          // redirect is handled by the currentUser useEffect above — one navigate call only
        } catch { /* error in Redux state */ }
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>{t('app.name')}</h2>
          <button type="button" className="btn-ghost" onClick={() => dispatch(toggleLanguage())}>
            {currentLanguage === 'he' ? 'EN' : 'עב'}
          </button>
        </div>
        <p className="muted">{isRegister ? t('auth.register') : t('app.tagline')}</p>

        {/* ── Google button — always visible ── */}
        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={googleLoading || isSubmitting || signupLoading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '10px 16px',
            background: '#fff',
            color: '#3c4043',
            border: '1.5px solid #dadce0',
            borderRadius: 8,
            fontWeight: 500,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'box-shadow .15s, background .15s',
            marginBottom: 4,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.15)'; e.currentTarget.style.background = '#f8f8f8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#fff'; }}
        >
          {googleLoading ? (
            <span style={{ fontSize: 13, color: '#888' }}>מתחבר...</span>
          ) : (
            <>
              <GoogleIcon />
              <span>{googleLabel}</span>
            </>
          )}
        </button>

        {googleError && (
          <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 6, padding: '4px 0' }}>
            {googleError}
          </div>
        )}

        {/* divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span className="muted" style={{ fontSize: 12 }}>{t('auth.orEmail')}</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* ── Register fields (name + phone) ── */}
        {isRegister && (
          <>
            <div className="form-group">
              <label>{t('auth.fullName')}</label>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                type="text" required autoComplete="name"
              />
            </div>
            <div className="form-group">
              <label>{t('auth.phone')}</label>
              <input
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                type="tel" autoComplete="tel"
              />
            </div>
          </>
        )}

        <div className="form-group">
          <label>{t('auth.email')}</label>
          <input
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            type="email" required autoComplete="email"
          />
        </div>
        <div className="form-group">
          <label>{t('auth.password')}</label>
          <input
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            type="password" required autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
        </div>

        {!isRegister && authError && <div className="badge danger" style={{ marginBottom: 8 }}>{t('auth.wrongCredentials')}</div>}
        {isRegister && signupError && <div className="badge danger" style={{ marginBottom: 8 }}>{signupError}</div>}

        <button type="submit" disabled={isSubmitting || googleLoading || signupLoading} style={{ width: '100%' }}>
          {(isSubmitting || signupLoading) ? t('common.loading') : (isRegister ? t('auth.signUp') : t('auth.signIn'))}
        </button>

        <p style={{ fontSize: 13, marginTop: 10, textAlign: 'center' }}>
          {isRegister ? (
            <>{t('auth.hasAccount')}{' '}<button type="button" className="btn-ghost" style={{ fontSize: 13, padding: '0 4px', textDecoration: 'underline' }} onClick={() => switchMode(false)}>{t('auth.signIn2')}</button></>
          ) : (
            <>{t('auth.noAccount')}{' '}<button type="button" className="btn-ghost" style={{ fontSize: 13, padding: '0 4px', textDecoration: 'underline' }} onClick={() => switchMode(true)}>{t('auth.signUp')}</button></>
          )}
        </p>
        <p style={{ fontSize: 13, marginTop: 4, textAlign: 'center' }}>
          <Link to="/">{t('auth.backToShop')}</Link>
        </p>
      </form>
    </div>
  );
}
