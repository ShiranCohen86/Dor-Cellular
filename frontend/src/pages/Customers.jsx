/**
 * Customers list page. Loads the full list once, then filters client-side so
 * Hebrew text is matched correctly and results are always visible.
 */
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  loadCustomers, loadCustomersIfStale, invalidateCustomersCache,
  selectAllCustomers, selectCustomersStatus,
} from '../store/slices/customersSlice.js';
import { createCustomer, updateCustomer } from '../api/customers.api.js';
import { splitByQuery } from '../utils/searchUtils.js';

const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 };
const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', boxSizing: 'border-box' };

function CustomerModal({ customer, onClose, onSaved }) {
  const isNew = !customer._id;
  const [form, setForm] = useState({
    name:     customer.name     || '',
    phone:    customer.phone    || '',
    email:    customer.email    || '',
    idNumber: customer.idNumber || '',
    notes:    customer.notes    || '',
    isVip:    customer.isVip    || false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      if (isNew) await createCustomer(form);
      else await updateCustomer(customer._id, form);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'שגיאה בשמירה');
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div className="card" style={{ position: 'relative', width: 'min(420px, 92vw)', padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <strong style={{ fontSize: 17 }}>{isNew ? '+ לקוח חדש' : 'עריכת לקוח'}</strong>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '2px 8px', fontSize: 18 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={lbl}>שם מלא *</label>
              <input value={form.name} onChange={set('name')} required style={inp} autoFocus />
            </div>
            <div>
              <label style={lbl}>טלפון *</label>
              <input value={form.phone} onChange={set('phone')} required style={inp} type="tel" />
            </div>
            <div>
              <label style={lbl}>אימייל</label>
              <input value={form.email} onChange={set('email')} style={inp} type="email" />
            </div>
            <div>
              <label style={lbl}>ת.ז.</label>
              <input value={form.idNumber} onChange={set('idNumber')} style={inp} />
            </div>
            <div>
              <label style={lbl}>הערות</label>
              <textarea value={form.notes} onChange={set('notes')} rows={3} style={{ ...inp, resize: 'vertical' }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={form.isVip} onChange={(e) => setForm((p) => ({ ...p, isVip: e.target.checked }))} />
              לקוח VIP
            </label>
          </div>
          {error && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>⚠ {error}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '11px 0', fontWeight: 700 }}>
              {saving ? 'שומר...' : isNew ? 'צור לקוח' : 'שמור שינויים'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1, padding: '11px 0' }}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const CUSTOMER_FIELDS = ['name', 'phone', 'email', 'idNumber'];

export default function Customers() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const customerList = useSelector(selectAllCustomers);
  const loadingStatus = useSelector(selectCustomersStatus);

  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState(null);

  // Load the full list once — filtering is client-side.
  useEffect(() => { dispatch(loadCustomersIfStale()); }, [dispatch]);

  const handleSaved = () => {
    dispatch(invalidateCustomersCache());
    dispatch(loadCustomers());
  };

  const { matched, rest } = useMemo(
    () => splitByQuery(customerList, searchQuery, CUSTOMER_FIELDS),
    [customerList, searchQuery],
  );

  const renderRow = (customer, dimmed) => (
    <tr key={customer._id} style={dimmed ? { opacity: 0.4 } : undefined}>
      <td>
        {customer.name}
        {customer.isVip && <span className="badge warning" style={{ marginInlineStart: 6 }}>VIP</span>}
      </td>
      <td>{customer.phone}</td>
      <td>{customer.email || '—'}</td>
      <td>{customer.loyaltyPoints || 0}</td>
      <td>
        {customer.outstandingDebt > 0
          ? <span className="badge danger">₪ {customer.outstandingDebt}</span>
          : '—'}
      </td>
      <td><button className="btn-ghost" onClick={() => setModal(customer)}>{t('common.edit')}</button></td>
    </tr>
  );

  return (
    <div className="page">
      <div className="toolbar">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('common.search')}
          style={{ width: 280 }}
        />
        {searchQuery && (
          <button className="btn-ghost" onClick={() => setSearchQuery('')} style={{ padding: '4px 10px' }}>✕</button>
        )}
        <div className="spacer-flex" />
        <button onClick={() => setModal({})}>{t('customers.new')}</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('common.name')}</th>
              <th>{t('common.phone')}</th>
              <th>{t('common.email')}</th>
              <th>{t('customers.loyalty')}</th>
              <th>{t('customers.debt')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loadingStatus === 'loading' ? (
              <tr><td colSpan="6">{t('common.loading')}</td></tr>
            ) : matched.length === 0 && rest.length === 0 ? (
              <tr><td colSpan="6" className="muted">{t('common.noData')}</td></tr>
            ) : (
              <>
                {matched.map((c) => renderRow(c, false))}
                {searchQuery && rest.length > 0 && (
                  <>
                    <tr>
                      <td colSpan="6" style={{ padding: '4px 14px', background: 'var(--surface-2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                          <span>כל הלקוחות · {rest.length}</span>
                          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        </div>
                      </td>
                    </tr>
                    {rest.map((c) => renderRow(c, true))}
                  </>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <CustomerModal
          customer={modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
