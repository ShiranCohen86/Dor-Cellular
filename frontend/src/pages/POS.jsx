import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Orders } from '../api/client.js';
import { selectActiveCustomer, setActiveCustomer, clearActiveCustomer } from '../store/slices/uiSlice.js';
import { loadProductsIfStale, selectAllProducts } from '../store/slices/productsSlice.js';
import { loadCustomersIfStale, selectAllCustomers } from '../store/slices/customersSlice.js';
import { splitByQuery } from '../utils/searchUtils.js';

const PROD_FIELDS = ['name', 'sku', 'brand', 'model'];
const CUST_FIELDS = ['name', 'phone', 'email'];

const PAYMENT_METHODS = ['cash', 'credit_card', 'bit', 'paypal', 'installments'];

export default function POS() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const sessionCustomer = useSelector(selectActiveCustomer);

  const allProducts  = useSelector(selectAllProducts);
  const allCustomers = useSelector(selectAllCustomers);

  const [scan, setScan] = useState('');
  const [scanFocused, setScanFocused] = useState(false);
  const [items, setItems] = useState([]);
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [customerQuery, setCustomerQuery] = useState('');
  const [method, setMethod] = useState('cash');
  const [paid, setPaid] = useState('');
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);
  const scanRef = useRef(null);

  const subtotal = items.reduce((sum, it) => sum + it.unitPrice * it.quantity - (it.discount || 0), 0);
  const orderDiscount = discountType === 'percent'
    ? subtotal * (discountValue / 100)
    : (discountType === 'fixed' || discountType === 'coupon') ? Number(discountValue) : 0;
  const total = Math.max(0, subtotal - orderDiscount);
  const change = paid && Number(paid) > total ? Number(paid) - total : 0;

  // Load full lists on mount (shared with Products/Customers pages via Redux cache).
  useEffect(() => {
    dispatch(loadProductsIfStale());
    dispatch(loadCustomersIfStale());
  }, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Client-side product autocomplete (alias-aware) ───────────────────────
  const { prodMatched, prodRest } = useMemo(() => {
    if (!scan.trim()) return { prodMatched: [], prodRest: [] };
    const { matched, rest } = splitByQuery(allProducts, scan, PROD_FIELDS);
    return { prodMatched: matched.slice(0, 5), prodRest: rest.slice(0, 3) };
  }, [allProducts, scan]);

  const showSuggestions = scanFocused && scan.trim().length > 0 && (prodMatched.length > 0 || prodRest.length > 0);

  // ── Client-side customer search (alias-aware) ─────────────────────────────
  const { custMatched, custRest } = useMemo(() => {
    if (!customerQuery.trim()) return { custMatched: [], custRest: [] };
    const { matched, rest } = splitByQuery(allCustomers, customerQuery, CUST_FIELDS);
    return { custMatched: matched.slice(0, 5), custRest: rest.slice(0, 3) };
  }, [allCustomers, customerQuery]);

  const addProduct = useCallback((product) => {
    setItems((curr) => {
      const idx = curr.findIndex((it) => it.productId === product._id);
      if (idx >= 0) {
        const updated = [...curr];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
        return updated;
      }
      return [...curr, {
        productId: product._id,
        name: product.name,
        sku: product.sku,
        brand: product.brand,
        unitPrice: product.salePrice,
        quantity: 1,
        discount: 0,
      }];
    });
    setScan('');
    scanRef.current?.focus();
  }, []);

  const onScan = async (e) => {
    e.preventDefault();
    if (!scan.trim()) return;
    const first = prodMatched[0] ?? prodRest[0];
    if (first) { addProduct(first); return; }
    // Nothing matched client-side — try barcode/IMEI scan via API.
    try {
      const { Products } = await import('../api/client.js');
      const product = await Products.scan(scan.trim());
      addProduct(product);
    } catch {
      setMsg(t('pos.notFound'));
      setMsgOk(false);
      setTimeout(() => setMsg(''), 2500);
    }
  };

  const setQty = (idx, q) =>
    setItems((arr) => arr.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, Number(q)) } : it));

  const removeItem = (idx) => setItems((arr) => arr.filter((_, i) => i !== idx));

  const selectCustomer = (cust) => {
    dispatch(setActiveCustomer(cust));
    setCustomerQuery('');
  };

  const complete = async () => {
    if (!items.length) return;
    const payments = paid ? [{ method, amount: Number(paid) }] : [];
    try {
      const order = await Orders.create({
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount,
        })),
        customerId: sessionCustomer?._id,
        payments,
        discountType,
        discountValue: Number(discountValue) || 0,
      });
      setMsg(`${t('pos.saleCompleted')} · ${order.invoiceNumber}`);
      setMsgOk(true);
      setItems([]);
      setPaid('');
      setDiscountValue(0);
      setDiscountType('none');
      // Customer stays in session intentionally
    } catch (err) {
      console.error('[POS] Order creation failed:', err);
      setMsg(err.message || 'Error');
      setMsgOk(false);
    }
  };

  return (
    <div className="pos">

      {/* ── Left column: scan + cart ── */}
      <div className="pos-left">

        {/* Scan / search input */}
        <div className="pos-scan">
          <form onSubmit={onScan}>
            <input
              ref={scanRef}
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              onFocus={() => setScanFocused(true)}
              onBlur={() => setTimeout(() => setScanFocused(false), 150)}
              placeholder={t('pos.scanOrSku')}
              autoFocus
              autoComplete="off"
              style={{ flex: 1 }}
            />
            <button type="submit">{t('pos.addItem')}</button>
          </form>

          {/* Suggestions dropdown */}
          {showSuggestions && (
            <div className="pos-suggestions">
              {prodMatched.map((prod) => (
                <div
                  key={prod._id}
                  className="pos-suggestions__item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addProduct(prod)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {prod.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {prod.brand && `${prod.brand} · `}{prod.sku}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--brand-primary)', fontSize: 14, flexShrink: 0 }}>
                    ₪{prod.salePrice?.toLocaleString('he-IL')}
                  </div>
                  {!prod.isInStock && (
                    <span className="badge danger" style={{ fontSize: 10 }}>{t('shop.outOfStock')}</span>
                  )}
                </div>
              ))}
              {prodRest.length > 0 && (
                <>
                  <div style={{ padding: '4px 14px', fontSize: 10.5, color: 'var(--text-muted)', background: 'var(--surface-2)', borderBlock: '1px solid var(--border)' }}>
                    כל המוצרים
                  </div>
                  {prodRest.map((prod) => (
                    <div
                      key={prod._id}
                      className="pos-suggestions__item"
                      style={{ opacity: 0.55 }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addProduct(prod)}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {prod.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {prod.brand && `${prod.brand} · `}{prod.sku}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--brand-primary)', fontSize: 14, flexShrink: 0 }}>
                        ₪{prod.salePrice?.toLocaleString('he-IL')}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Cart table */}
        <div className="pos-cart">
          <table>
            <thead>
              <tr>
                <th>{t('common.name')}</th>
                <th style={{ width: 72 }}>{t('common.quantity')}</th>
                <th style={{ width: 86 }}>{t('common.price')}</th>
                <th style={{ width: 90 }}>{t('common.total')}</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    {t('pos.emptyCart')}
                  </td>
                </tr>
              ) : items.map((it, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{it.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {it.brand ? `${it.brand} · ` : ''}{it.sku}
                    </div>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={(e) => setQty(i, e.target.value)}
                      style={{ width: '100%', textAlign: 'center' }}
                    />
                  </td>
                  <td style={{ direction: 'ltr', textAlign: 'end' }}>₪{it.unitPrice?.toLocaleString('he-IL')}</td>
                  <td style={{ fontWeight: 600, direction: 'ltr', textAlign: 'end' }}>
                    ₪{(it.unitPrice * it.quantity - (it.discount || 0)).toFixed(2)}
                  </td>
                  <td>
                    <button
                      className="btn-ghost"
                      onClick={() => removeItem(i)}
                      style={{ padding: '2px 7px', color: 'var(--danger)', fontSize: 16 }}
                    >×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Right column: customer + payment ── */}
      <div className="pos-right">

        {/* Customer */}
        <div className="card" style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-muted)', marginBottom: 10 }}>
            {t('pos.customer')}
          </div>
          {sessionCustomer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{sessionCustomer.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', direction: 'ltr', textAlign: 'start' }}>
                  {sessionCustomer.phone}
                </div>
                {sessionCustomer.loyaltyPoints > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--brand-accent)', marginTop: 2 }}>
                    ⭐ {sessionCustomer.loyaltyPoints} {t('customers.loyalty')}
                  </div>
                )}
              </div>
              <button
                className="btn-ghost"
                onClick={() => dispatch(clearActiveCustomer())}
                style={{ fontSize: 18, padding: '2px 8px', color: 'var(--text-muted)' }}
              >×</button>
            </div>
          ) : (
            <>
              <input
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder={t('common.search')}
                style={{ width: '100%', marginBottom: 6, fontSize: 13 }}
              />
              {[
                ...custMatched.map((c) => ({ ...c, _dim: false })),
                ...(custRest.length > 0
                  ? [{ _separator: true }, ...custRest.map((c) => ({ ...c, _dim: true }))]
                  : []),
              ].map((co, idx) =>
                co._separator ? (
                  <div key="cust-sep" style={{ padding: '3px 4px', fontSize: 10.5, color: 'var(--text-muted)', background: 'var(--surface-2)', borderBlock: '1px solid var(--border)', margin: '2px 0' }}>
                    כל הלקוחות
                  </div>
                ) : (
                  <div
                    key={co._id}
                    onClick={() => selectCustomer(co)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 4px', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', transition: 'background .12s', borderRadius: 4,
                      opacity: co._dim ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-3)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{co.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', direction: 'ltr', textAlign: 'start' }}>{co.phone}</div>
                    </div>
                    {co.loyaltyPoints > 0 && <span className="badge" style={{ fontSize: 10 }}>⭐ {co.loyaltyPoints}</span>}
                  </div>
                ),
              )}
            </>
          )}
        </div>

        {/* Discount */}
        <div className="card" style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-muted)', marginBottom: 10 }}>
            {t('pos.discount')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} style={{ flex: 1 }}>
              <option value="none">—</option>
              <option value="percent">%</option>
              <option value="fixed">₪</option>
              <option value="coupon">{t('pos.coupon')}</option>
            </select>
            {discountType !== 'none' && (
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                style={{ width: 90 }}
                min="0"
              />
            )}
          </div>
        </div>

        {/* Payment method */}
        <div className="card" style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-muted)', marginBottom: 10 }}>
            {t('pos.payment')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={method === m ? '' : 'btn-secondary'}
                style={{ padding: '5px 10px', fontSize: 12, flex: '1 0 auto' }}
              >
                {t(`pos.${m}`)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}>{t('pos.amount')}</label>
            <input
              type="number"
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
              placeholder={total.toFixed(2)}
              style={{ flex: 1 }}
            />
          </div>
          {change > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--brand-accent)', fontWeight: 600 }}>
              {t('pos.change')}: ₪{change.toFixed(2)}
            </div>
          )}
        </div>

        {/* Totals + complete */}
        <div className="card" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5, color: 'var(--text-muted)' }}>
            <span>{t('pos.subtotal')}</span>
            <span style={{ direction: 'ltr' }}>₪{subtotal.toFixed(2)}</span>
          </div>
          {orderDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5, color: 'var(--brand-accent)' }}>
              <span>{t('pos.discount')}</span>
              <span style={{ direction: 'ltr' }}>− ₪{orderDiscount.toFixed(2)}</span>
            </div>
          )}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 20, fontWeight: 800,
            borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 6, marginBottom: 14,
          }}>
            <span>{t('pos.total')}</span>
            <span style={{ color: 'var(--brand-primary)', direction: 'ltr' }}>₪{total.toFixed(2)}</span>
          </div>
          <button
            onClick={complete}
            disabled={!items.length}
            style={{ width: '100%', fontSize: 15, padding: '11px 0' }}
          >
            {t('pos.complete')}
          </button>
          {msg && (
            <div style={{
              marginTop: 10, padding: '8px 12px', borderRadius: 6,
              background: msgOk ? 'var(--brand-primary-alpha-25)' : 'rgba(239,68,68,.12)',
              color: msgOk ? 'var(--nav-active-color)' : 'var(--danger)',
              fontSize: 13, textAlign: 'center', fontWeight: 500,
            }}>
              {msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
