import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice.js';
import { selectLanguage, toggleLanguage } from '../store/slices/uiSlice.js';
import { selectTheme, setTheme } from '../store/slices/settingsSlice.js';

/**
 * Unified top navigation bar.
 *
 * mode='admin' — rendered inside the CSS grid (.navbar class).
 *   Shows: hamburger · brand (links to shop) · page title · [actions]
 *
 * mode='shop'  — sticky full-width bar (.shop-nav class).
 *   Shows: brand · [actions] · cart · user buttons
 */
export default function TopBar({
  mode = 'shop',
  pageTitle = '',
  cartCount = 0,
  cartBounce = false,
  onCartOpen = null,
  onHamburger = null,
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const currentLanguage = useSelector(selectLanguage);
  const currentTheme = useSelector(selectTheme);

  const isAdmin = mode === 'admin';
  const handleTheme = () => dispatch(setTheme(currentTheme === 'light' ? 'dark' : 'light'));

  // In admin area "personal area" goes to profile (they're already in the admin section).
  // In shop, it goes to dashboard for staff, profile for customers.
  const profileTarget = isAdmin
    ? '/profile'
    : currentUser?.role === 'customer' ? '/profile' : '/dashboard';

  return (
    <header className={isAdmin ? 'navbar' : 'shop-nav'}>
      {/* ── Brand / Start ── */}
      <div className={isAdmin ? 'navbar-start' : 'shop-nav__brand'}>
        {isAdmin ? (
          <>
            <button className="btn-ghost navbar-hamburger" onClick={onHamburger} aria-label="תפריט">☰</button>
            <div className="shop-nav__brand"><Link to="/">{t('app.name')}</Link></div>
            {pageTitle && <span className="navbar-page-title">{pageTitle}</span>}
          </>
        ) : (
          <>
            {onHamburger && (
              <button className="btn-ghost navbar-hamburger" onClick={onHamburger} aria-label="תפריט">☰</button>
            )}
            <Link to="/">{t('app.name')}</Link>
          </>
        )}
      </div>

      {/* ── Actions / End ── */}
      <div className={isAdmin ? 'navbar-end' : 'shop-nav__actions'}>
        {isAdmin ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              className="btn-ghost"
              onClick={handleTheme}
              style={{ fontSize: 16, padding: '6px 9px' }}
              title={currentTheme === 'light' ? 'מצב לילה' : 'מצב יום'}
            >
              {currentTheme === 'light' ? '🌙' : '☀️'}
            </button>
            <button
              className="btn-ghost"
              onClick={() => dispatch(toggleLanguage())}
              style={{ fontSize: 13, padding: '6px 10px' }}
            >
              {currentLanguage === 'he' ? 'EN' : 'עב'}
            </button>
            <Link
              to="/"
              className="btn-ghost"
              style={{ padding: '6px 10px', display: 'flex', alignItems: 'center' }}
              title="חזרה לחנות"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </Link>
          </div>
        ) : (
          <>
            <button
              onClick={onCartOpen}
              className={`shop-nav__cart-mobile-hide${cartBounce ? ' cart-bounce' : ''}`}
              style={{
                position: 'relative',
                background: '#fff', color: '#0f172a',
                border: 'none', borderRadius: 8,
                padding: '7px 14px', cursor: 'pointer',
                fontWeight: 700, fontSize: 14,
              }}
            >
              🛒 <span className="shop-nav__cart-label">עגלה</span>
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -6,
                  background: 'var(--brand-primary)', color: '#fff',
                  borderRadius: '50%', width: 20, height: 20,
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {cartCount}
                </span>
              )}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                className="btn-ghost"
                onClick={handleTheme}
                style={{ fontSize: 16, padding: '6px 9px' }}
                title={currentTheme === 'light' ? 'מצב לילה' : 'מצב יום'}
              >
                {currentTheme === 'light' ? '🌙' : '☀️'}
              </button>
              <button
                className="btn-ghost"
                onClick={() => dispatch(toggleLanguage())}
                style={{ fontSize: 13, padding: '6px 10px' }}
              >
                {currentLanguage === 'he' ? 'EN' : 'עב'}
              </button>
              <Link
                to={currentUser ? profileTarget : '/login'}
                className="btn-ghost"
                style={{ padding: '6px 10px', fontSize: 13 }}
              >
                {t('nav.profile')}
              </Link>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
