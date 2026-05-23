import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser, selectCurrentUser } from '../store/slices/authSlice.js';
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
  const handleLogout = () => dispatch(logoutUser());
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
        {isAdmin && (
          <button className="btn-ghost navbar-hamburger" onClick={onHamburger} aria-label="תפריט">
            ☰
          </button>
        )}
        <div className="shop-nav__brand">
          <Link to="/">{t('app.name')}</Link>
        </div>
        {isAdmin && pageTitle && (
          <span className="navbar-page-title">{pageTitle}</span>
        )}
      </div>

      {/* ── Actions / End ── */}
      <div className={isAdmin ? 'navbar-end' : 'shop-nav__actions'}>
        {/* Theme toggle */}
        <button
          className="btn-ghost"
          onClick={handleTheme}
          style={{ fontSize: 16, padding: '6px 9px' }}
          title={currentTheme === 'light' ? 'מצב לילה' : 'מצב יום'}
        >
          {currentTheme === 'light' ? '🌙' : '☀️'}
        </button>

        {/* Language toggle */}
        <button
          className={`btn-ghost${!isAdmin ? ' shop-nav__lang' : ''}`}
          onClick={() => dispatch(toggleLanguage())}
          style={{ fontSize: 13, padding: '6px 10px' }}
        >
          {currentLanguage === 'he' ? 'EN' : 'עב'}
        </button>

        {/* Cart — shop mode only */}
        {!isAdmin && (
          <button
            onClick={onCartOpen}
            className={cartBounce ? 'cart-bounce' : ''}
            style={{
              position: 'relative',
              background: 'var(--brand-primary)', color: '#fff',
              border: 'none', borderRadius: 8,
              padding: '7px 14px', cursor: 'pointer',
              fontWeight: 600, fontSize: 14,
            }}
          >
            🛒 <span className="shop-nav__cart-label">עגלה</span>
            {cartCount > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6,
                background: '#dc2626', color: '#fff',
                borderRadius: '50%', width: 20, height: 20,
                fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {cartCount}
              </span>
            )}
          </button>
        )}

        {/* User actions */}
        {currentUser ? (
          <>
            <Link to={profileTarget} className="btn-ghost">
              {t('nav.profile')}
            </Link>
            <button
              className={`btn-secondary${!isAdmin ? ' shop-nav__logout' : ''}`}
              onClick={handleLogout}
              style={{ fontSize: 13, padding: '7px 14px' }}
            >
              {t('nav.logout')}
            </button>
          </>
        ) : (
          <Link to="/login" className="btn-ghost">{t('auth.login')}</Link>
        )}
      </div>
    </header>
  );
}
