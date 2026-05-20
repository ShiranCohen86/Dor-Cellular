/**
 * Public storefront page (route `/`).
 *
 * - Reads products + categories from the Redux `publicShop` slice (cached).
 * - Always renderable from cache → works offline once visited (PWA).
 * - Lets anonymous visitors filter by category, search, and toggle "in-stock only".
 * - Authenticated users see "Dashboard" + "My Profile" buttons in the navbar.
 */
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  loadPublicProductsIfStale, loadPublicCategories,
  selectPublicProducts, selectPublicCategories, selectPublicStatus,
} from '../store/slices/publicSlice.js';
import { selectCurrentUser, logoutUser } from '../store/slices/authSlice.js';
import { selectLanguage, toggleLanguage } from '../store/slices/uiSlice.js';

const CATEGORY_ORDER = ['smartphone', 'tablet', 'charger', 'case', 'screen_protector', 'sim', 'esim', 'accessory', 'repair_part'];

const CATEGORY_ICON = {
  smartphone:       '📱',
  tablet:           '📲',
  charger:          '🔌',
  case:             '🛡️',
  screen_protector: '🛡',
  sim:              '📶',
  esim:             '∞',
  repair_part:      '🔧',
  accessory:        '⚡',
};

const BRAND_GRADIENT = {
  Apple:          'linear-gradient(145deg, #1d1d1f 0%, #3a3a3c 100%)',
  Samsung:        'linear-gradient(145deg, #1428a0 0%, #0070c9 100%)',
  Xiaomi:         'linear-gradient(145deg, #c03800 0%, #ff6900 100%)',
  AccessoriesPro: 'linear-gradient(145deg, #064e3b 0%, #16a34a 100%)',
  Cellcom:        'linear-gradient(145deg, #9f1239 0%, #e11d48 100%)',
  Partner:        'linear-gradient(145deg, #4c1d95 0%, #7c3aed 100%)',
};

function getBrandGradient(brand = '') {
  if (BRAND_GRADIENT[brand]) return BRAND_GRADIENT[brand];
  const hue = [...brand].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 360, 0);
  return `linear-gradient(145deg, hsl(${hue},55%,25%) 0%, hsl(${(hue+40)%360},60%,40%) 100%)`;
}

function getCategoryIcon(type = '') {
  return CATEGORY_ICON[type] || '📦';
}

function DeviceImage({ brand, categoryType }) {
  const isMobile = categoryType === 'smartphone';
  const isTablet = categoryType === 'tablet';

  if (isMobile || isTablet) {
    const w = isTablet ? 60 : 44;
    const h = isTablet ? 80 : 80;
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.4))' }}>
        <rect x="2" y="2" width={w - 4} height={h - 4} rx={isTablet ? 7 : 9} stroke="rgba(255,255,255,.8)" strokeWidth="2.5" fill="rgba(255,255,255,.08)" />
        {!isTablet && <rect x={Math.round(w/2)-8} y="7" width="16" height="3.5" rx="1.75" fill="rgba(255,255,255,.35)" />}
        {isTablet && <rect x={Math.round(w/2)-5} y="6" width="10" height="3" rx="1.5" fill="rgba(255,255,255,.35)" />}
        <circle cx={Math.round(w/2)} cy={h - 10} r="3.5" stroke="rgba(255,255,255,.5)" strokeWidth="1.5" fill="none" />
        <rect x="8" y={isTablet ? 16 : 18} width={w - 16} height={h - (isTablet ? 36 : 38)} rx="4" fill="rgba(255,255,255,.12)" />
      </svg>
    );
  }

  return (
    <span style={{ fontSize: 52, lineHeight: 1, filter: 'drop-shadow(0 3px 8px rgba(0,0,0,.35))' }}>
      {getCategoryIcon(categoryType)}
    </span>
  );
}

export default function Storefront() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const products = useSelector(selectPublicProducts);
  const categories = useSelector(selectPublicCategories);
  const loadStatus = useSelector(selectPublicStatus);
  const currentUser = useSelector(selectCurrentUser);
  const currentLanguage = useSelector(selectLanguage);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => { dispatch(loadPublicCategories()); }, [dispatch]);

  useEffect(() => {
    dispatch(loadPublicProductsIfStale({
      q: searchQuery || undefined,
      categoryId: activeCategoryId || undefined,
      inStockOnly: inStockOnly || undefined,
      limit: 60,
    }));
  }, [dispatch, searchQuery, activeCategoryId, inStockOnly]);

  // Sort groups by device-first category order; flatten into a single list with header items.
  const flatCatalogItems = useMemo(() => {
    const groupMap = new Map();
    for (const product of products) {
      const key = product.categoryId?._id || 'other';
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          name: product.categoryId?.name || 'Other',
          type: product.categoryId?.type || '',
          items: [],
        });
      }
      groupMap.get(key).items.push(product);
    }

    const groups = Array.from(groupMap.values()).sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a.type);
      const ib = CATEGORY_ORDER.indexOf(b.type);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    if (activeCategoryId) {
      return products.map((p) => ({ kind: 'product', product: p }));
    }

    const flat = [];
    for (const group of groups) {
      flat.push({ kind: 'header', name: group.name, type: group.type });
      for (const product of group.items) {
        flat.push({ kind: 'product', product });
      }
    }
    return flat;
  }, [products, activeCategoryId]);

  const distinctBrands = useMemo(() => new Set(products.map((p) => p.brand)).size, [products]);

  const handleLogout = () => dispatch(logoutUser());

  return (
    <div className="shop">
      <header className="shop-nav">
        <div className="shop-nav__brand">
          <Link to="/">{t('app.name')}</Link>
        </div>
        <div className="shop-nav__actions">
          <button className="btn-ghost" onClick={() => dispatch(toggleLanguage())}>
            {currentLanguage === 'he' ? 'EN' : 'עב'}
          </button>
          {currentUser ? (
            <>
              <Link to="/profile" className="btn-ghost shop-nav__link">{t('nav.profile')}</Link>
              <Link to="/dashboard"><button>{t('nav.dashboard')}</button></Link>
              <button className="btn-secondary" onClick={handleLogout}>{t('nav.logout')}</button>
            </>
          ) : (
            <Link to="/login"><button>{t('auth.login')}</button></Link>
          )}
        </div>
      </header>

      <section className="shop-hero">
        <div className="shop-hero__inner">
          <div className="shop-hero__tags">
            <span className="shop-hero__tag">📱 {t('shop.tagPhones')}</span>
            <span className="shop-hero__tag">🔧 {t('shop.tagRepairs')}</span>
            <span className="shop-hero__tag">⚡ {t('shop.tagAccessories')}</span>
          </div>

          <h1>{t('shop.heroTitle')}</h1>
          <p className="shop-hero__subtitle">{t('shop.heroSubtitle')}</p>

          <div className="shop-hero__search">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('shop.searchPlaceholder')}
              aria-label={t('shop.searchPlaceholder')}
            />
          </div>

          <div className="shop-hero__contact">
            <span className="shop-hero__contact-item">
              <span>📍</span>{t('shop.heroAddress')}
            </span>
            <span className="shop-hero__contact-sep">·</span>
            <a href={`tel:${t('shop.heroPhone')}`} className="shop-hero__contact-phone">
              <span>📞</span>{t('shop.heroPhone')}
            </a>
          </div>

          {products.length > 0 && (
            <div className="shop-hero__stats">
              <div className="stat"><strong>{products.length}+</strong><span>{t('shop.statProducts')}</span></div>
              <div className="stat"><strong>{distinctBrands}</strong><span>{t('shop.statBrands')}</span></div>
              <div className="stat"><strong>2</strong><span>{t('shop.statBranches')}</span></div>
            </div>
          )}
        </div>
      </section>

      <section className="shop-filters">
        <div className="shop-chips">
          <button className={`chip ${activeCategoryId === '' ? 'chip--active' : ''}`} onClick={() => setActiveCategoryId('')}>
            {t('shop.all')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              className={`chip ${activeCategoryId === cat._id ? 'chip--active' : ''}`}
              onClick={() => setActiveCategoryId(cat._id)}
            >{cat.name}</button>
          ))}
        </div>
        <label className="row" style={{ gap: 6 }}>
          <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
          {t('shop.inStockOnly')}
        </label>
      </section>

      <main className="shop-main">
        {loadStatus === 'loading' ? (
          <div className="muted">{t('common.loading')}</div>
        ) : products.length === 0 ? (
          <div className="card">{t('shop.noResults')}</div>
        ) : (
          <div className="product-catalog">
            {flatCatalogItems.map((item, i) => {
              if (item.kind === 'header') {
                return (
                  <div key={`h-${i}`} className="product-catalog__heading">
                    <span className="product-catalog__heading-icon">{getCategoryIcon(item.type)}</span>
                    <h2>{item.name}</h2>
                  </div>
                );
              }
              const { product } = item;
              return (
                <article key={product._id} className="product-card">
                  <div className="product-card__image" style={{ background: getBrandGradient(product.brand) }}>
                    <DeviceImage brand={product.brand} categoryType={product.categoryId?.type} />
                    <span className="product-card__image-brand">{product.brand}</span>
                  </div>
                  <div className="product-card__body">
                    <div className="product-card__brand">{product.brand}</div>
                    <h3 className="product-card__name">{product.name}</h3>
                    <div className="product-card__meta">
                      {product.storageGB && <span className="badge">{product.storageGB}GB</span>}
                      {product.color && <span className="badge">{product.color}</span>}
                    </div>
                    <div className="product-card__footer">
                      <div className="product-card__price">₪{product.salePrice?.toLocaleString('he-IL')}</div>
                      <span className={`badge ${product.isInStock ? 'success' : 'danger'}`}>
                        {product.isInStock ? t('shop.inStock') : t('shop.outOfStock')}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <footer className="shop-footer">
        <span>© {new Date().getFullYear()} {t('app.name')}</span>
        <span className="muted">{t('app.tagline')}</span>
      </footer>
    </div>
  );
}
