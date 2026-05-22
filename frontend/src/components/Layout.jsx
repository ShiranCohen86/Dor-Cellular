import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser, logoutUser } from '../store/slices/authSlice.js';
import { selectLanguage, toggleLanguage, pushToast, dismissToast, selectToasts } from '../store/slices/uiSlice.js';
import { selectTheme, selectCustomColors } from '../store/slices/settingsSlice.js';



const NAVIGATION_ITEMS = [
  { path: '/dashboard',  translationKey: 'dashboard', icon: '⊞', hiddenRoles: ['customer'] },
  { path: '/orders',     translationKey: 'orders',    icon: '◈' },
  { path: '/products',   translationKey: 'products',  icon: '◫', hiddenRoles: ['customer'] },
  { path: '/repairs',    translationKey: 'repairs',   icon: '🔧', hiddenRoles: ['customer'] },
  { path: '/customers',  translationKey: 'customers', icon: '◉', hiddenRoles: ['customer'] },
  { path: '/suppliers',  translationKey: 'suppliers', icon: '⊛', requiredRoles: ['admin'] },
  { path: '/users',      translationKey: 'users',     icon: '◌', requiredRoles: ['admin'] },
  { path: '/profile',    translationKey: 'profile',   icon: '○' },
  { path: '/settings',   translationKey: 'settings',  icon: '⊜', requiredRoles: ['admin'] },
];

function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(255 * percent / 100)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(255 * percent / 100)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(255 * percent / 100)));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// Deterministic avatar color from name string
function avatarColor(name = '') {
  const hue = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
  return `hsl(${hue}, 55%, 42%)`;
}

function initials(name = '') {
  return name.split(' ').slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || '?';
}

export default function Layout() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const location = useLocation();
  const currentUser = useSelector(selectCurrentUser);
  const currentLanguage = useSelector(selectLanguage);
  const activeToasts = useSelector(selectToasts);
  const currentTheme = useSelector(selectTheme);
  const customColors = useSelector(selectCustomColors);

  const hasAnyRole = (...allowedRoles) =>
    !!currentUser && allowedRoles.includes(currentUser.role);

  // Apply theme + custom color overrides to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme === 'custom' ? 'dark' : currentTheme);
    const root = document.documentElement;
    if (currentTheme === 'custom') {
      root.style.setProperty('--brand-primary', customColors.primary);
      root.style.setProperty('--brand-primary-dark', shadeColor(customColors.primary, -15));
      root.style.setProperty('--brand-accent', customColors.accent);
    } else {
      root.style.removeProperty('--brand-primary');
      root.style.removeProperty('--brand-primary-dark');
      root.style.removeProperty('--brand-accent');
    }
  }, [currentTheme, customColors]);

  const activePageKey = NAVIGATION_ITEMS.find((item) => item.path === location.pathname)?.translationKey || 'dashboard';
  const handleLogoutClick = () => dispatch(logoutUser());

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = () => setSidebarOpen(false);

  const userInitials = useMemo(() => initials(currentUser?.name), [currentUser?.name]);
  const userAvatarColor = useMemo(() => avatarColor(currentUser?.name), [currentUser?.name]);

  const visibleNavItems = NAVIGATION_ITEMS.filter((navItem) => {
    if (navItem.requiredRoles && !hasAnyRole(...navItem.requiredRoles)) return false;
    if (navItem.hiddenRoles && hasAnyRole(...navItem.hiddenRoles)) return false;
    return true;
  });

  return (
    <div className="layout">
      <div className={`sidebar-host${sidebarOpen ? ' sidebar-host--open' : ''}`}>
        <div
          className={`sidebar-overlay${sidebarOpen ? ' sidebar-overlay--visible' : ''}`}
          onClick={closeSidebar}
        />
        <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
          <Link to="/dashboard" className="brand" style={{ textDecoration: 'none' }}>{t('app.name')}</Link>
          <nav>
            {visibleNavItems.map((navItem) => (
              <NavLink key={navItem.path} to={navItem.path} onClick={closeSidebar}>
                <span className="nav-icon">{navItem.icon}</span>
                <span className="label">{t(`nav.${navItem.translationKey}`)}</span>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-user">
            <div className="sidebar-user__info">
              <div
                className="sidebar-user__avatar"
                style={{ background: userAvatarColor }}
              >
                {userInitials}
              </div>
              <div>
                <div className="sidebar-user__name">{currentUser?.name}</div>
                <div className="sidebar-user__role">{t(`roles.${currentUser?.role}`)}</div>
              </div>
            </div>
            <button className="btn-secondary" onClick={handleLogoutClick} style={{ width: '100%', fontSize: 12 }}>
              {t('nav.logout')}
            </button>
          </div>
        </aside>
      </div>

      <header className="navbar">
        <div className="navbar-start">
          <button className="btn-ghost navbar-hamburger" onClick={() => setSidebarOpen((o) => !o)}>☰</button>
          <div className="title">{t(`nav.${activePageKey}`)}</div>
          <Link to="/" className="btn-ghost" style={{ fontSize: 13 }}>{t('nav.shop')}</Link>
        </div>
        <div className="navbar-end">
          <button className="btn-ghost" onClick={() => dispatch(toggleLanguage())} style={{ fontSize: 13, padding: '6px 10px' }}>
            {currentLanguage === 'he' ? 'EN' : 'עב'}
          </button>
          <Link to="/profile" className="navbar-user" style={{ textDecoration: 'none' }}>
            <div className="navbar-user__avatar" style={{ background: userAvatarColor }}>
              {userInitials}
            </div>
            <span className="navbar-user__name" style={{ fontSize: 17, fontWeight: 700 }}>{currentUser?.name}</span>
          </Link>
        </div>
      </header>

      <main className="main">
        <Outlet />

        {/* Toast stack — bottom-right corner */}
        <div style={{ position: 'fixed', bottom: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 1000 }}>
          {activeToasts.map((toast) => (
            <div
              key={toast.id}
              className="card toast"
              style={{
                maxWidth: 320,
                borderInlineStart: `4px solid ${toast.severity === 'critical' ? '#dc2626' : toast.severity === 'warning' ? '#f59e0b' : '#2563eb'}`,
                cursor: 'pointer',
              }}
              onClick={() => dispatch(dismissToast(toast.id))}
            >
              <strong>{toast.title}</strong>
              {toast.message && <div className="muted" style={{ marginTop: 4 }}>{toast.message}</div>}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
