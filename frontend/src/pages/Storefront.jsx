import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  loadPublicProductsIfStale, loadPublicCategories,
  selectPublicProducts, selectPublicCategories, selectPublicStatus,
} from '../store/slices/publicSlice.js';
import { selectCurrentUser } from '../store/slices/authSlice.js';
import { createOrder } from '../api/orders.api.js';
import { invalidateOrdersCache } from '../store/slices/ordersSlice.js';
import { SkeletonCard } from '../components/Skeleton.jsx';
import { selectStoreWhatsApp } from '../store/slices/settingsSlice.js';
import TopBar from '../components/TopBar.jsx';
import ShopBottomNav from '../components/ShopBottomNav.jsx';

const CATEGORY_ORDER = ['smartphone', 'tablet', 'charger', 'case', 'screen_protector', 'sim', 'esim', 'accessory', 'repair_part'];

const CATEGORY_ICON = {
  smartphone: '📱', tablet: '📲', charger: '🔌', case: '🛡️',
  screen_protector: '🛡', sim: '📶', esim: '∞', repair_part: '🔧', accessory: '⚡',
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
  return `linear-gradient(145deg, hsl(${hue},55%,25%) 0%, hsl(${(hue + 40) % 360},60%,40%) 100%)`;
}

function getCategoryIcon(type = '') { return CATEGORY_ICON[type] || '📦'; }

function DeviceImage({ brand, categoryType }) {
  const isMobile = categoryType === 'smartphone';
  const isTablet = categoryType === 'tablet';
  if (isMobile || isTablet) {
    const w = isTablet ? 60 : 44, h = 80;
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.4))' }}>
        <rect x="2" y="2" width={w - 4} height={h - 4} rx={isTablet ? 7 : 9} stroke="rgba(255,255,255,.8)" strokeWidth="2.5" fill="rgba(255,255,255,.08)" />
        {!isTablet && <rect x={Math.round(w / 2) - 8} y="7" width="16" height="3.5" rx="1.75" fill="rgba(255,255,255,.35)" />}
        {isTablet  && <rect x={Math.round(w / 2) - 5} y="6" width="10" height="3"   rx="1.5"  fill="rgba(255,255,255,.35)" />}
        <circle cx={Math.round(w / 2)} cy={h - 10} r="3.5" stroke="rgba(255,255,255,.5)" strokeWidth="1.5" fill="none" />
        <rect x="8" y={isTablet ? 16 : 18} width={w - 16} height={h - (isTablet ? 36 : 38)} rx="4" fill="rgba(255,255,255,.12)" />
      </svg>
    );
  }
  return <span style={{ fontSize: 52, lineHeight: 1, filter: 'drop-shadow(0 3px 8px rgba(0,0,0,.35))' }}>{getCategoryIcon(categoryType)}</span>;
}


export default function Storefront() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const products = useSelector(selectPublicProducts);
  const categories = useSelector(selectPublicCategories);
  const loadStatus = useSelector(selectPublicStatus);
  const currentUser = useSelector(selectCurrentUser);
  const storeWhatsApp = useSelector(selectStoreWhatsApp);

  const [searchQuery, setSearchQuery] = useState('');
  const [heroSearch, setHeroSearch] = useState('');
  const [heroDrop, setHeroDrop] = useState(false);
  const heroRef    = useRef(null);
  const chipsRef   = useRef(null);
  const [activeCategoryId, setActiveCategoryId] = useState('');

  // ── Advanced filters ─────────────────────────────────────────────
  const [activeTag,       setActiveTag]       = useState('');
  const [brandFilter,     setBrandFilter]     = useState('');
  const [modelFilter,     setModelFilter]     = useState('');
  const [storageFilter,   setStorageFilter]   = useState('');
  const [sortBy,          setSortBy]          = useState('');
  const [showFilterPanel,  setShowFilterPanel]  = useState(false);
  const [showCategoryMore, setShowCategoryMore] = useState(false);
  const [showSortMore,     setShowSortMore]     = useState(false);
  const [showSelectsMore,  setShowSelectsMore]  = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  const categoryMoreRef = useRef(null);
  const sortMoreRef     = useRef(null);
  const selectsMoreRef  = useRef(null);
  const [quickView, setQuickView] = useState(null);
  const [cartBounce, setCartBounce] = useState(false);
  const [addedIds, setAddedIds] = useState({});

  // ── Cart state ────────────────────────────────────────────────
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [orderDone, setOrderDone] = useState(null);
  const [orderError, setOrderError] = useState(null);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.salePrice * i.qty, 0);

  function addToCart(product) {
    setCart((prev) => {
      const exists = prev.find((i) => i._id === product._id);
      if (exists) return prev.map((i) => i._id === product._id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { _id: product._id, name: product.name, brand: product.brand, salePrice: product.salePrice, qty: 1 }];
    });
    // Cart bounce + button feedback
    setCartBounce(true);
    setTimeout(() => setCartBounce(false), 450);
    setAddedIds((p) => ({ ...p, [product._id]: true }));
    setTimeout(() => setAddedIds((p) => { const n = { ...p }; delete n[product._id]; return n; }), 1000);
  }

  function shareProduct(product) {
    const url = `${window.location.origin}/shop`;
    const text = `ראיתי את "${product.name}" ב-דור הסלולר ☎️ ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  function setItemQty(id, qty) {
    setCart((prev) => qty <= 0
      ? prev.filter((i) => i._id !== id)
      : prev.map((i) => i._id === id ? { ...i, qty } : i),
    );
  }

  async function placeOrder() {
    if (!currentUser) {
      sessionStorage.setItem('pendingCart', JSON.stringify(cart));
      navigate('/login?redirect=/');
      return;
    }
    if (!contactPhone.trim()) {
      setOrderError('נא להזין מספר טלפון ליצירת קשר');
      return;
    }
    setOrdering(true);
    setOrderError(null);
    try {
      const notes = [`טלפון: ${contactPhone.trim()}`, orderNote.trim()].filter(Boolean).join('\n');
      const result = await createOrder({
        items: cart.map((i) => ({ productId: i._id, quantity: i.qty })),
        notes: notes || undefined,
      });
      setOrderDone(result);
      setCart([]);
      setCheckoutOpen(false);
      dispatch(invalidateOrdersCache());
    } catch (err) {
      setOrderError(err.message || 'שגיאה ביצירת ההזמנה');
    } finally {
      setOrdering(false);
    }
  }
  // ─────────────────────────────────────────────────────────────

  // Restore cart saved before login redirect
  useEffect(() => {
    if (!currentUser) return;
    const saved = sessionStorage.getItem('pendingCart');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) {
        setCart(parsed);
        setCartOpen(true);
      }
    } catch {}
    sessionStorage.removeItem('pendingCart');
  }, [currentUser]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { setQuickView(null); setHeroDrop(false); setHeroSearch(''); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close hero dropdown + overflow dropdowns on outside click
  useEffect(() => {
    function onOutside(e) {
      if (heroRef.current && !heroRef.current.contains(e.target)) setHeroDrop(false);
      if (categoryMoreRef.current && !categoryMoreRef.current.contains(e.target)) setShowCategoryMore(false);
      if (sortMoreRef.current && !sortMoreRef.current.contains(e.target)) setShowSortMore(false);
      if (selectsMoreRef.current && !selectsMoreRef.current.contains(e.target)) setShowSelectsMore(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 700px)');
    const handler = e => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const handleCategoriesOpen = useCallback(() => {
    chipsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Client-side filter all loaded products for hero suggestions (all languages)
  const heroSuggestions = useMemo(() => {
    const q = heroSearch.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) =>
        p.name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.model?.toLowerCase().includes(q)
      )
      .slice(0, 7);
  }, [heroSearch, products]);

  // Scroll so hero search input is near top when suggestions appear
  useEffect(() => {
    if (heroDrop && heroSuggestions.length > 0 && heroRef.current) {
      const rect = heroRef.current.getBoundingClientRect();
      const targetY = window.scrollY + rect.top - 64;
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    }
  }, [heroDrop, heroSuggestions.length]);

  useEffect(() => { dispatch(loadPublicCategories()); }, [dispatch]);

  useEffect(() => {
    dispatch(loadPublicProductsIfStale({
      q: searchQuery || undefined,
      categoryId: activeCategoryId || undefined,
      limit: 60,
    }));
  }, [dispatch, searchQuery, activeCategoryId]);

  // ── Client-side filter options ───────────────────────────────────
  const brandOptions   = useMemo(() => [...new Set(products.map(p => p.brand).filter(Boolean))].sort(), [products]);
  const modelOptions   = useMemo(() => [...new Set(products.map(p => p.model).filter(Boolean))].sort(), [products]);
  const storageOptions = useMemo(() => [...new Set(products.map(p => p.storageGB).filter(Boolean))].sort((a, b) => a - b), [products]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeTag === 'new') list = list.filter(p => Date.now() - new Date(p.createdAt) < 30 * 24 * 3600 * 1000);
    if (brandFilter)   list = list.filter(p => p.brand === brandFilter);
    if (modelFilter)   list = list.filter(p => p.model === modelFilter);
    if (storageFilter) list = list.filter(p => String(p.storageGB) === String(storageFilter));
    if (sortBy === 'price-asc')  list = [...list].sort((a, b) => a.salePrice - b.salePrice);
    if (sortBy === 'price-desc') list = [...list].sort((a, b) => b.salePrice - a.salePrice);
    if (sortBy === 'newest')     list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sortBy === 'name')       list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'he'));
    return list;
  }, [products, activeTag, brandFilter, modelFilter, storageFilter, sortBy]);

  const activeFilterCount = [brandFilter, modelFilter, storageFilter, sortBy].filter(Boolean).length;

  const SORT_OPTIONS = [
    ['', 'ברירת מחדל'], ['price-asc', 'מחיר ↑'], ['price-desc', 'מחיר ↓'],
    ['newest', 'חדש ראשון'], ['name', 'שם א-ת'],
  ];

  const CHIPS_MAX          = 2;
  const visibleCategories  = categories.slice(0, CHIPS_MAX);
  const overflowCategories = categories.slice(CHIPS_MAX);
  const overflowCount      = overflowCategories.length + 1; // +1 for מוצרים חדשים
  const overflowHasActive  = activeTag === 'new' || overflowCategories.some(c => c._id === activeCategoryId);

  const totalSelectCount = (brandOptions.length > 1 ? 1 : 0)
    + (modelOptions.length > 1 ? 1 : 0)
    + (storageOptions.length > 0 ? 1 : 0);
  const storageInOverflow = totalSelectCount >= 3;

  const flatCatalogItems = useMemo(() => {
    const groupMap = new Map();
    for (const product of filteredProducts) {
      const key = product.categoryId?._id || 'other';
      if (!groupMap.has(key)) groupMap.set(key, { name: product.categoryId?.name || 'Other', type: product.categoryId?.type || '', items: [] });
      groupMap.get(key).items.push(product);
    }
    const groups = Array.from(groupMap.values()).sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a.type), ib = CATEGORY_ORDER.indexOf(b.type);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    if (activeCategoryId) return filteredProducts.map((p) => ({ kind: 'product', product: p }));
    const flat = [];
    for (const group of groups) {
      flat.push({ kind: 'header', name: group.name, type: group.type });
      for (const product of group.items) flat.push({ kind: 'product', product });
    }
    return flat;
  }, [filteredProducts, activeCategoryId]);

  const distinctBrands = useMemo(() => new Set(products.map((p) => p.brand)).size, [products]);

  return (
    <div className="shop">
      {/* ── Navbar ── */}
      <TopBar
        mode="shop"
        cartCount={cartCount}
        cartBounce={cartBounce}
        onCartOpen={() => setCartOpen(true)}
      />

      {/* ── Hero ── */}
      <section className="shop-hero">
        <div className="shop-hero__inner">
          <div className="shop-hero__tags">
            <span className="shop-hero__tag">📱 {t('shop.tagPhones')}</span>
            <span className="shop-hero__tag">🔧 {t('shop.tagRepairs')}</span>
            <span className="shop-hero__tag">⚡ {t('shop.tagAccessories')}</span>
          </div>
          <h1>{t('shop.heroTitle')}</h1>
          <p className="shop-hero__subtitle">{t('shop.heroSubtitle')}</p>
          <div className="shop-hero__search" ref={heroRef}>
            <input
              value={heroSearch}
              onChange={(e) => { setHeroSearch(e.target.value); setHeroDrop(true); }}
              onFocus={() => { if (heroSearch) setHeroDrop(true); }}
              placeholder={t('shop.searchPlaceholder')}
            />
            {heroDrop && heroSuggestions.length > 0 && (
              <div className="hero-drop">
                {heroSuggestions.map((p) => (
                  <button
                    key={p._id}
                    className="hero-drop__item"
                    onMouseDown={() => { setQuickView(p); setHeroDrop(false); setHeroSearch(''); }}
                  >
                    {p.images?.[0]
                      ? <img src={p.images[0]} alt="" className="hero-drop__img" />
                      : <span className="hero-drop__img hero-drop__img--empty">📦</span>
                    }
                    <div className="hero-drop__info">
                      <span className="hero-drop__name">{p.name}</span>
                      {(p.brand || p.model) && (
                        <span className="hero-drop__sub">{[p.brand, p.model].filter(Boolean).join(' · ')}</span>
                      )}
                    </div>
                    {p.salePrice > 0 && (
                      <span className="hero-drop__price">₪{p.salePrice.toLocaleString()}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="shop-hero__contact">
            <span className="shop-hero__contact-item"><span>📍</span>{t('shop.heroAddress')}</span>
            <span className="shop-hero__contact-sep">·</span>
            <a href={`tel:${t('shop.heroPhone')}`} className="shop-hero__contact-phone"><span>📞</span>{t('shop.heroPhone')}</a>
          </div>
          {products.length > 0 && (
            <div className="shop-hero__stats">
              <div className="stat"><strong>{products.length}+</strong><span>{t('shop.statProducts')}</span></div>
              <div className="stat"><strong>{distinctBrands}</strong><span>{t('shop.statBrands')}</span></div>
            </div>
          )}
        </div>
      </section>

      {/* ── Filters ── */}
      <section className="shop-filters" ref={chipsRef}>
        {/* Row 1: Category chips — mobile: הכל + 2 + ···  |  desktop: all visible */}
        <div className="filter-chips-row">
          <button className={`chip${activeCategoryId === '' && activeTag === '' ? ' chip--active' : ''}`}
            onClick={() => { setActiveCategoryId(''); setActiveTag(''); }}>
            {t('shop.all')}
          </button>
          {(isMobile ? visibleCategories : categories).map(cat => (
            <button key={cat._id}
              className={`chip${activeCategoryId === cat._id ? ' chip--active' : ''}`}
              onClick={() => { setActiveCategoryId(cat._id); setActiveTag(''); }}>
              {cat.name}
            </button>
          ))}
          {!isMobile && (
            <button className={`chip${activeTag === 'new' ? ' chip--active' : ''}`}
              onClick={() => { setActiveTag(prev => prev === 'new' ? '' : 'new'); setActiveCategoryId(''); }}>
              ✨ מוצרים חדשים
            </button>
          )}
          {isMobile && (
            <div className="filter-more-wrap" ref={categoryMoreRef}>
              <button
                className={`chip${overflowHasActive ? ' chip--active' : ''}`}
                onClick={() => setShowCategoryMore(s => !s)}>
                ···
              </button>
              {showCategoryMore && (
                <div className="filter-more-list">
                  {overflowCategories.map(cat => (
                    <button key={cat._id}
                      className={`filter-more-list__item${activeCategoryId === cat._id ? ' filter-more-list__item--active' : ''}`}
                      onClick={() => { setActiveCategoryId(cat._id); setActiveTag(''); setShowCategoryMore(false); }}>
                      {cat.name}
                    </button>
                  ))}
                  <button
                    className={`filter-more-list__item${activeTag === 'new' ? ' filter-more-list__item--active' : ''}`}
                    onClick={() => { setActiveTag(prev => prev === 'new' ? '' : 'new'); setActiveCategoryId(''); setShowCategoryMore(false); }}>
                    ✨ מוצרים חדשים
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Row 2: ⚙ סנן on its own row */}
        <div className="filter-expand-row">
          <button
            className={`filter-expand-btn${showFilterPanel || activeFilterCount > 0 ? ' filter-expand-btn--active' : ''}`}
            onClick={() => setShowFilterPanel(s => !s)}>
            ⚙ סנן{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
        </div>

        {showFilterPanel && (
          <div className="filter-panel">
            <div className="filter-panel__group">
              <span className="filter-panel__label">מיון</span>
              <div className="filter-chips-row filter-chips-row--flush">
                {(isMobile ? SORT_OPTIONS.slice(0, 3) : SORT_OPTIONS).map(([val, label]) => (
                  <button key={val} className={`chip${sortBy === val ? ' chip--active' : ''}`}
                    onClick={() => setSortBy(val)}>{label}</button>
                ))}
                {isMobile && (
                  <div className="filter-more-wrap" ref={sortMoreRef}>
                    <button
                      className={`chip${SORT_OPTIONS.slice(3).some(([v]) => v === sortBy) ? ' chip--active' : ''}`}
                      onClick={() => setShowSortMore(s => !s)}>
                      ···
                    </button>
                    {showSortMore && (
                      <div className="filter-more-list">
                        {SORT_OPTIONS.slice(3).map(([val, label]) => (
                          <button key={val}
                            className={`filter-more-list__item${sortBy === val ? ' filter-more-list__item--active' : ''}`}
                            onClick={() => { setSortBy(val); setShowSortMore(false); }}>
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {(brandOptions.length > 1 || modelOptions.length > 1 || storageOptions.length > 0) && (
              <div className="filter-panel__group">
                <span className="filter-panel__label">סינון</span>
                <div className="filter-selects-row">
                  {brandOptions.length > 1 && (
                    <select className="filter-select" value={brandFilter}
                      onChange={e => { setBrandFilter(e.target.value); setModelFilter(''); }}>
                      <option value="">יצרן ▾</option>
                      {brandOptions.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  )}
                  {modelOptions.length > 1 && (
                    <select className="filter-select" value={modelFilter}
                      onChange={e => setModelFilter(e.target.value)}>
                      <option value="">דגם ▾</option>
                      {(brandFilter
                        ? modelOptions.filter(m => products.some(p => p.brand === brandFilter && p.model === m))
                        : modelOptions).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  )}
                  {storageOptions.length > 0 && (!isMobile || !storageInOverflow) && (
                    <select className="filter-select" value={storageFilter}
                      onChange={e => setStorageFilter(e.target.value)}>
                      <option value="">נפח ▾</option>
                      {storageOptions.map(s => <option key={s} value={s}>{s} GB</option>)}
                    </select>
                  )}
                  {storageOptions.length > 0 && isMobile && storageInOverflow && (
                    <div className="filter-more-wrap" ref={selectsMoreRef}>
                      <button
                        className={`chip${storageFilter ? ' chip--active' : ''}`}
                        onClick={() => setShowSelectsMore(s => !s)}>
                        ···
                      </button>
                      {showSelectsMore && (
                        <div className="filter-more-list" style={{ padding: '8px 12px' }}>
                          <select className="filter-select" value={storageFilter}
                            onChange={e => setStorageFilter(e.target.value)}>
                            <option value="">נפח ▾</option>
                            {storageOptions.map(s => <option key={s} value={s}>{s} GB</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                  {(brandFilter || modelFilter || storageFilter) && (
                    <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => { setBrandFilter(''); setModelFilter(''); setStorageFilter(''); }}>
                      ✕ נקה
                    </button>
                  )}
                </div>
              </div>
            )}

            {(brandFilter || modelFilter || storageFilter) && (
              <div className="filter-active-tags">
                {brandFilter   && <span className="filter-tag">{brandFilter}   <button onClick={() => setBrandFilter('')}>×</button></span>}
                {modelFilter   && <span className="filter-tag">{modelFilter}   <button onClick={() => setModelFilter('')}>×</button></span>}
                {storageFilter && <span className="filter-tag">{storageFilter}GB <button onClick={() => setStorageFilter('')}>×</button></span>}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Product grid ── */}
      <main className="shop-main">
        {loadStatus === 'loading' ? (
          <div className="product-catalog">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
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
              const inCart = cart.find((c) => c._id === product._id);
              return (
                <article key={product._id} className="product-card">
                  <div
                    className="product-card__image"
                    style={{ background: product.images?.[0] ? '#0f172a' : getBrandGradient(product.brand), cursor: 'pointer' }}
                    onClick={() => setQuickView(product)}
                  >
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
                    ) : (
                      <>
                        <DeviceImage brand={product.brand} categoryType={product.categoryId?.type} />
                        <span className="product-card__image-brand">{product.brand}</span>
                      </>
                    )}
                  </div>
                  <div className="product-card__body">
                    <div className="product-card__brand">{product.brand}</div>
                    <h3 className="product-card__name" style={{ cursor: 'pointer' }} onClick={() => setQuickView(product)}>{product.name}</h3>
                    <div className="product-card__meta">
                      {product.storageGB && <span className="badge">{product.storageGB}GB</span>}
                      {product.color && <span className="badge">{product.color}</span>}
                    </div>
                    <div className="product-card__footer">
                      <div className="product-card__price">₪{product.salePrice?.toLocaleString('he-IL')}</div>
                    </div>
                    {inCart ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                        <button onClick={() => setItemQty(product._id, inCart.qty - 1)} style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>−</button>
                        <span style={{ fontWeight: 700, minWidth: 24, textAlign: 'center', fontSize: 15 }}>{inCart.qty}</span>
                        <button onClick={() => setItemQty(product._id, inCart.qty + 1)} style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>+</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        className={addedIds[product._id] ? 'btn-added' : ''}
                        style={{ marginTop: 10, width: '100%', fontSize: 13, padding: '7px 0' }}
                      >
                        {addedIds[product._id] ? '✓ נוסף!' : '+ הוסף לעגלה'}
                      </button>
                    )}
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

      <ShopBottomNav
        cartCount={cartCount}
        onCartOpen={() => setCartOpen(true)}
        onCategoriesOpen={handleCategoriesOpen}
      />

      {/* ── Cart Drawer ── */}
      {cartOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setCartOpen(false)} />
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: Math.min(420, window.innerWidth),
            background: 'var(--surface-1)', display: 'flex', flexDirection: 'column',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <strong style={{ fontSize: 18 }}>🛒 עגלת קניות</strong>
              <button className="btn-ghost" onClick={() => setCartOpen(false)} style={{ fontSize: 20, padding: '2px 8px' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {cart.length === 0 ? (
                <div className="muted" style={{ textAlign: 'center', marginTop: 60, fontSize: 15 }}>העגלה ריקה</div>
              ) : (
                cart.map((item) => (
                  <div key={item._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{item.brand}</div>
                      <div style={{ color: 'var(--brand-primary)', fontWeight: 700, marginTop: 2 }}>₪{(item.salePrice * item.qty).toLocaleString('he-IL')}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => setItemQty(item._id, item.qty - 1)} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer' }}>−</button>
                      <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                      <button onClick={() => setItemQty(item._id, item.qty + 1)} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer' }}>+</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 18, fontWeight: 700 }}>
                  <span>סה״כ</span>
                  <span>₪{cartTotal.toLocaleString('he-IL')}</span>
                </div>
                {currentUser ? (
                  <button onClick={() => { setCartOpen(false); setCheckoutOpen(true); }} style={{ width: '100%', padding: '12px 0', fontSize: 16, fontWeight: 700 }}>
                    לביצוע הזמנה ←
                  </button>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>יש להתחבר כדי להזמין</div>
                    <button
                      style={{ width: '100%', padding: '12px 0' }}
                      onClick={() => {
                        sessionStorage.setItem('pendingCart', JSON.stringify(cart));
                        setCartOpen(false);
                        navigate('/login?redirect=/');
                      }}
                    >התחבר והזמן</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── WhatsApp FAB ── */}
      {storeWhatsApp && !checkoutOpen && (
        <a
          href={`https://wa.me/${storeWhatsApp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-fab"
          title="דברו איתנו"
          aria-label="דברו איתנו ב-WhatsApp"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      )}

      {/* ── Quick View Modal ── */}
      {quickView && (
        <div className="quick-view-backdrop" onClick={() => setQuickView(null)}>
          <div className="quick-view" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setQuickView(null)}
              style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1, zIndex: 1 }}
              aria-label="סגור"
            >✕</button>

            {/* Image */}
            <div style={{
              height: 220, borderRadius: 12, marginBottom: 20,
              background: quickView.images?.[0] ? '#0f172a' : getBrandGradient(quickView.brand),
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              {quickView.images?.[0] ? (
                <img src={quickView.images[0]} alt={quickView.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 12 }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <DeviceImage brand={quickView.brand} categoryType={quickView.categoryId?.type} />
                  <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 14, fontWeight: 600 }}>{quickView.brand}</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>{quickView.brand}</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>{quickView.name}</h2>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {quickView.storageGB && <span className="badge">{quickView.storageGB}GB</span>}
              {quickView.color     && <span className="badge">{quickView.color}</span>}
              {quickView.model     && <span className="badge">{quickView.model}</span>}
            </div>

            {quickView.description && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>{quickView.description}</p>
            )}

            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--brand-primary)', marginBottom: 18 }}>
              ₪{quickView.salePrice?.toLocaleString('he-IL')}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { addToCart(quickView); setQuickView(null); }}
                style={{ flex: 1, padding: '12px 0', fontSize: 15, fontWeight: 700 }}
              >
                + הוסף לעגלה
              </button>
              <button
                onClick={() => shareProduct(quickView)}
                title="שתף ב-WhatsApp"
                style={{ padding: '12px 16px', background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}
              >↑ שתף</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Checkout Modal ── */}
      {checkoutOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => { if (!ordering) { setCheckoutOpen(false); setOrderError(null); } }} />
          <div className="card" style={{ position: 'relative', width: 420, padding: 28 }}>
            {orderDone ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>ההזמנה נקלטה!</div>
                <div className="muted">מספר הזמנה: <strong>{orderDone.orderNumber || orderDone._id}</strong></div>
                <button onClick={() => { setCheckoutOpen(false); setOrderDone(null); }} style={{ marginTop: 20, padding: '10px 32px' }}>סגור</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <strong style={{ fontSize: 18 }}>אישור הזמנה</strong>
                  <button className="btn-ghost" onClick={() => { setCheckoutOpen(false); setOrderError(null); }} style={{ padding: '2px 8px', fontSize: 18 }}>✕</button>
                </div>

                <div style={{ marginBottom: 16 }}>
                  {cart.map((item) => (
                    <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, borderBottom: '1px solid var(--border)' }}>
                      <span>{item.name} × {item.qty}</span>
                      <span style={{ fontWeight: 600 }}>₪{(item.salePrice * item.qty).toLocaleString('he-IL')}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontWeight: 700, fontSize: 16 }}>
                    <span>סה״כ מחיר</span>
                    <span style={{ color: 'var(--brand-primary)' }}>₪{cartTotal.toLocaleString('he-IL')}</span>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    טלפון ליצירת קשר <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="050-0000000"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box' }}
                  />
                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>ניצור איתך קשר לתיאום המשך התהליך</div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>הערות (אופציונלי)</label>
                  <textarea value={orderNote} onChange={(e) => setOrderNote(e.target.value)} rows={2} style={{ width: '100%', resize: 'none', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', fontFamily: 'inherit', fontSize: 13 }} />
                </div>

                {orderError && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>⚠ {orderError}</div>}

                <button onClick={placeOrder} disabled={ordering} style={{ width: '100%', padding: '12px 0', fontSize: 16, fontWeight: 700 }}>
                  {ordering ? 'שולח...' : 'אשר הזמנה'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
