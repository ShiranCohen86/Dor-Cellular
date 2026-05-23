import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  loadSuppliersIfStale, loadSuppliers, invalidateSuppliersCache,
  selectAllSuppliers,
} from '../store/slices/suppliersSlice.js';
import { createSupplier, updateSupplier } from '../api/suppliers.api.js';

const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 };
const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', boxSizing: 'border-box' };

// ── Inline "new supplier" form ────────────────────────────────────────────
function NewSupplierInline({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', contactPerson: '', phone: '', email: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      await createSupplier(form);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'שגיאה בשמירה');
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ padding: '20px 20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <strong style={{ fontSize: 16 }}>+ ספק חדש</strong>
        <button type="button" className="btn-ghost" onClick={onClose} style={{ padding: '2px 8px', fontSize: 18 }}>✕</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>שם הספק *</label>
            <input value={form.name} onChange={set('name')} required style={inp} autoFocus />
          </div>
          <div>
            <label style={lbl}>איש קשר</label>
            <input value={form.contactPerson} onChange={set('contactPerson')} style={inp} />
          </div>
          <div>
            <label style={lbl}>טלפון</label>
            <input value={form.phone} onChange={set('phone')} style={inp} type="tel" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>אימייל</label>
            <input value={form.email} onChange={set('email')} style={inp} type="email" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>הערות</label>
            <textarea value={form.notes} onChange={set('notes')} rows={3} style={{ ...inp, resize: 'vertical' }} />
          </div>
        </div>
        {error && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>⚠ {error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button type="submit" disabled={saving} style={{ flex: 1, padding: '11px 0', fontWeight: 700 }}>
            {saving ? 'שומר...' : 'צור ספק'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1, padding: '11px 0' }}>ביטול</button>
        </div>
      </form>
    </div>
  );
}

// ── Edit overlay modal ────────────────────────────────────────────────────
function EditSupplierModal({ supplier, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:          supplier.name          || '',
    contactPerson: supplier.contactPerson || '',
    phone:         supplier.phone         || '',
    email:         supplier.email         || '',
    notes:         supplier.notes         || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      await updateSupplier(supplier._id, form);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'שגיאה בשמירה');
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '16px 12px' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div className="card" style={{ position: 'relative', width: 'min(440px, 100%)', padding: 28, marginTop: 'auto', marginBottom: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <strong style={{ fontSize: 17 }}>עריכת ספק</strong>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '2px 8px', fontSize: 18 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={lbl}>שם הספק *</label>
              <input value={form.name} onChange={set('name')} required style={inp} autoFocus />
            </div>
            <div>
              <label style={lbl}>איש קשר</label>
              <input value={form.contactPerson} onChange={set('contactPerson')} style={inp} />
            </div>
            <div>
              <label style={lbl}>טלפון</label>
              <input value={form.phone} onChange={set('phone')} style={inp} type="tel" />
            </div>
            <div>
              <label style={lbl}>אימייל</label>
              <input value={form.email} onChange={set('email')} style={inp} type="email" />
            </div>
            <div>
              <label style={lbl}>הערות</label>
              <textarea value={form.notes} onChange={set('notes')} rows={3} style={{ ...inp, resize: 'vertical' }} />
            </div>
          </div>
          {error && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>⚠ {error}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '11px 0', fontWeight: 700 }}>
              {saving ? 'שומר...' : 'שמור שינויים'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1, padding: '11px 0' }}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Suppliers() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const supplierList = useSelector(selectAllSuppliers);
  const [showNewForm,  setShowNewForm]  = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);

  useEffect(() => { dispatch(loadSuppliersIfStale()); }, [dispatch]);

  const handleSaved = () => { dispatch(invalidateSuppliersCache()); dispatch(loadSuppliers()); };

  return (
    <div className="page">
      <div className="toolbar">
        <div className="spacer-flex" />
        <button onClick={() => setShowNewForm(true)} disabled={showNewForm}>{t('suppliers.newSupplier')}</button>
      </div>

      {showNewForm && (
        <NewSupplierInline
          onClose={() => setShowNewForm(false)}
          onSaved={handleSaved}
        />
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('common.name')}</th>
              <th className="col-hide-mobile">{t('suppliers.contact')}</th>
              <th>{t('common.phone')}</th>
              <th className="col-hide-mobile">{t('common.email')}</th>
              <th className="col-hide-mobile">{t('customers.debt')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {supplierList.length === 0 ? (
              <tr><td colSpan="6" className="muted">{t('common.noData')}</td></tr>
            ) : supplierList.map((s) => (
              <tr key={s._id} className="product-row" onClick={() => setEditSupplier(s)}>
                <td>{s.name}</td>
                <td className="col-hide-mobile">{s.contactPerson || '—'}</td>
                <td>{s.phone || '—'}</td>
                <td className="col-hide-mobile">{s.email || '—'}</td>
                <td className="col-hide-mobile">
                  {s.outstandingDebt > 0
                    ? <span className="badge warning">₪ {s.outstandingDebt}</span>
                    : '—'}
                </td>
                <td className="col-hide-mobile" onClick={(e) => e.stopPropagation()}>
                  <button className="btn-ghost" onClick={() => setEditSupplier(s)}>{t('common.edit')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editSupplier && (
        <EditSupplierModal
          supplier={editSupplier}
          onClose={() => setEditSupplier(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
