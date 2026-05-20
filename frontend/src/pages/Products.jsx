/**
 * Products / inventory listing page (admin & manager + read for others).
 *
 * Loads the full product list once, then filters client-side so that:
 * - Hebrew text is matched correctly (JS includes() is Unicode-aware).
 * - Matching products appear at the top; non-matching products are shown
 *   below a separator (dimmed) so there are always visible results.
 */
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  loadProductsIfStale,
  selectAllProducts, selectProductsStatus,
} from '../store/slices/productsSlice.js';
import { splitByQuery } from '../utils/searchUtils.js';

const PRODUCT_FIELDS = ['name', 'sku', 'brand', 'model', 'barcode', 'imei'];

export default function Products() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const productList = useSelector(selectAllProducts);
  const loadingStatus = useSelector(selectProductsStatus);

  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Load the full list once (no `q` — filtering is client-side).
  useEffect(() => { dispatch(loadProductsIfStale()); }, [dispatch]);

  const base = showLowStockOnly
    ? productList.filter((p) => p.totalStock <= p.minStockAlert)
    : productList;

  const { matched, rest } = useMemo(() => splitByQuery(base, searchQuery, PRODUCT_FIELDS), [base, searchQuery]);

  const renderRow = (product, dimmed) => (
    <tr key={product._id} style={dimmed ? { opacity: 0.4 } : undefined}>
      <td>{product.sku}</td>
      <td>{product.name}</td>
      <td>{product.brand} {product.model}</td>
      <td>
        {product.totalStock}
        {product.totalStock <= product.minStockAlert && (
          <span className="badge warning" style={{ marginInlineStart: 6 }}>{t('products.lowBadge')}</span>
        )}
      </td>
      <td>₪ {product.salePrice}</td>
      <td>{product.imei || '—'}</td>
      <td><button className="btn-ghost">{t('common.edit')}</button></td>
    </tr>
  );

  return (
    <div>
      <div className="toolbar">
        <input
          placeholder={t('common.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 280 }}
        />
        {searchQuery && (
          <button className="btn-ghost" onClick={() => setSearchQuery('')} style={{ padding: '4px 10px' }}>✕</button>
        )}
        <label className="row">
          <input
            type="checkbox"
            checked={showLowStockOnly}
            onChange={(e) => setShowLowStockOnly(e.target.checked)}
          /> {t('products.lowStockOnly')}
        </label>
        <div className="spacer-flex" />
        <button>{t('products.new')}</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('products.sku')}</th>
              <th>{t('common.name')}</th>
              <th>{t('products.brand')}</th>
              <th>{t('products.stock')}</th>
              <th>{t('products.salePrice')}</th>
              <th>{t('products.imei')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loadingStatus === 'loading' ? (
              <tr><td colSpan="7">{t('common.loading')}</td></tr>
            ) : matched.length === 0 && rest.length === 0 ? (
              <tr><td colSpan="7" className="muted">{t('common.noData')}</td></tr>
            ) : (
              <>
                {matched.map((p) => renderRow(p, false))}
                {searchQuery && rest.length > 0 && (
                  <>
                    <tr>
                      <td colSpan="7" style={{ padding: '4px 14px', background: 'var(--surface-2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                          <span>כל הפריטים · {rest.length}</span>
                          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        </div>
                      </td>
                    </tr>
                    {rest.map((p) => renderRow(p, true))}
                  </>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
