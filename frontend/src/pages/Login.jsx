/**
 * Login page (`/login`).
 *
 * Uses the Redux auth slice — `loginUser` is a thunk that stores tokens in
 * localStorage on success. Any rejection surfaces via `selectAuthError`.
 */
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  loginUser, clearAuthError,
  selectAuthError, selectAuthStatus, selectCurrentUser,
} from '../store/slices/authSlice.js';
import { selectLanguage, toggleLanguage } from '../store/slices/uiSlice.js';

export default function Login() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const authError = useSelector(selectAuthError);
  const authStatus = useSelector(selectAuthStatus);
  const currentUser = useSelector(selectCurrentUser);
  const currentLanguage = useSelector(selectLanguage);

  // Pre-fill demo admin credentials so first-time testers can just click "Sign In".
  const [emailInput, setEmailInput] = useState('admin@dor-store.test');
  const [passwordInput, setPasswordInput] = useState('admin1234');

  // If already logged in (e.g. user reloads /login), bounce to dashboard.
  useEffect(() => { if (currentUser) navigate('/dashboard'); }, [currentUser, navigate]);

  // Clear any prior error when the user edits a field.
  useEffect(() => { if (authError) dispatch(clearAuthError()); }, [emailInput, passwordInput]); // eslint-disable-line

  /**
   * Submits the login form. Catches errors locally even though the slice
   * already records them, so we don't get an unhandled rejection warning.
   */
  const handleSubmit = async (formEvent) => {
    formEvent.preventDefault();
    try {
      const result = await dispatch(loginUser({ email: emailInput, password: passwordInput }));
      if (!result.error) {
        const role = result.payload?.role;
        navigate(role === 'salesperson' ? '/pos' : '/dashboard');
      }
    } catch {
      // Error is already in Redux state.
    }
  };

  const isSubmitting = authStatus === 'loading';

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>{t('app.name')}</h2>
          <button type="button" className="btn-ghost" onClick={() => dispatch(toggleLanguage())}>
            {currentLanguage === 'he' ? 'EN' : 'עב'}
          </button>
        </div>
        <p className="muted">{t('app.tagline')}</p>

        <div className="form-group">
          <label>{t('auth.email')}</label>
          <input
            value={emailInput}
            onChange={(event) => setEmailInput(event.target.value)}
            type="email" required autoFocus autoComplete="email"
          />
        </div>
        <div className="form-group">
          <label>{t('auth.password')}</label>
          <input
            value={passwordInput}
            onChange={(event) => setPasswordInput(event.target.value)}
            type="password" required autoComplete="current-password"
          />
        </div>

        {authError && <div className="badge danger" style={{ marginBottom: 8 }}>{t('auth.wrongCredentials')}</div>}

        <button type="submit" disabled={isSubmitting} style={{ width: '100%' }}>
          {isSubmitting ? t('common.loading') : t('auth.signIn')}
        </button>

        <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
          {t('auth.demoHint')}
        </p>
        <p style={{ fontSize: 13, marginTop: 8, textAlign: 'center' }}>
          <Link to="/">{t('auth.backToShop')}</Link>
        </p>
      </form>
    </div>
  );
}
