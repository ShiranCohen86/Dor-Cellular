import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice.js';

export default function ShopBottomNav({ cartCount = 0, onCartOpen, onCategoriesOpen }) {
  const { pathname } = useLocation();
  const currentUser = useSelector(selectCurrentUser);
  const profileTarget = currentUser ? '/profile' : '/login';

  const isHome = pathname === '/' || pathname === '/shop';

  return (
    <nav className="bottom-nav">
      <Link className={`bottom-nav__tab${isHome ? ' bottom-nav__tab--active' : ''}`} to="/">
        <span className="bottom-nav__icon">🏠</span>
        <span className="bottom-nav__label">בית</span>
      </Link>

      <button className="bottom-nav__tab" onClick={onCategoriesOpen}>
        <span className="bottom-nav__icon">🗂</span>
        <span className="bottom-nav__label">קטגוריות</span>
      </button>

      <button className="bottom-nav__tab" onClick={onCartOpen}>
        <span className="bottom-nav__icon" style={{ position: 'relative' }}>
          🛒
          {cartCount > 0 && (
            <span className="bottom-nav__badge">{cartCount > 9 ? '9+' : cartCount}</span>
          )}
        </span>
        <span className="bottom-nav__label">סל</span>
      </button>

      <Link
        className={`bottom-nav__tab${pathname.startsWith('/profile') || pathname.startsWith('/login') ? ' bottom-nav__tab--active' : ''}`}
        to={profileTarget}
      >
        <span className="bottom-nav__icon">👤</span>
        <span className="bottom-nav__label">איזור אישי</span>
      </Link>
    </nav>
  );
}
