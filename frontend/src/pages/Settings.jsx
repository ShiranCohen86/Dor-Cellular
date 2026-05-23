import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectStoreInfo, setStoreInfo } from '../store/slices/settingsSlice.js';
import { httpClient } from '../api/request.js';

const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 };
const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 14, fontFamily: 'inherit' };
const inpErr = { ...inp, borderColor: '#ef4444' };

function normalizeILWhatsApp(raw) {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('972') && digits.length >= 12) return digits;
  if (digits.startsWith('0') && digits.length >= 9) return '972' + digits.slice(1);
  if (!digits.startsWith('0') && !digits.startsWith('972') && digits.length === 9) return '972' + digits;
  return digits;
}

function isValidILWhatsApp(raw) {
  if (!raw.trim()) return true;
  const normalized = normalizeILWhatsApp(raw);
  return /^972[5-9]\d{8}$/.test(normalized);
}

export default function SettingsPage() {
  const dispatch  = useDispatch();
  const storeInfo = useSelector(selectStoreInfo);

  const [form, setForm] = useState({
    name:     storeInfo.name     || '',
    phone:    storeInfo.phone    || '',
    whatsapp: storeInfo.whatsapp || '',
    address:  storeInfo.address  || '',
    email:    storeInfo.email    || '',
  });
  const [saved, setSaved]     = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [waError, setWaError] = useState(null);

  const setField = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (field === 'whatsapp') setWaError(null);
  };

  async function handleSave(e) {
    e.preventDefault();
    setSaveError(null);
    if (form.whatsapp && !isValidILWhatsApp(form.whatsapp)) {
      setWaError('פורמט לא תקין — קבל: 050-1234567 / 0501234567 / +972-50-1234567');
      return;
    }
    dispatch(setStoreInfo({ ...form, whatsapp: normalizeILWhatsApp(form.whatsapp) }));
    try {
      await httpClient.patch('/settings', { ownerEmail: form.email || '' });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError('שגיאה בשמירת המייל — נסה שוב');
    }
  }

  const waPreview = form.whatsapp ? normalizeILWhatsApp(form.whatsapp) : null;
  const waValid   = isValidILWhatsApp(form.whatsapp);

  return (
    <div className="page">
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>הגדרות מערכת</h2>
      <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: 28, fontSize: 13 }}>
        פרטים אלה מופיעים בחנות האונליין ובהודעות WhatsApp ללקוחות.
      </p>

      <div className="card" style={{ maxWidth: 520 }}>
        <h3 style={{ marginTop: 0, marginBottom: 20 }}>🏪 פרטי החנות</h3>
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gap: 18 }}>
            <div>
              <label style={lbl}>שם העסק</label>
              <input value={form.name} onChange={setField('name')} style={inp} placeholder="דור הסלולר" required />
            </div>
            <div>
              <label style={lbl}>טלפון</label>
              <input value={form.phone} onChange={setField('phone')} style={inp} placeholder="052-6098000" type="tel" />
            </div>
            <div>
              <label style={lbl}>מספר WhatsApp</label>
              <input
                value={form.whatsapp}
                onChange={setField('whatsapp')}
                style={waError ? inpErr : inp}
                placeholder="050-1234567"
                type="tel"
              />
              {waError && (
                <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>⚠ {waError}</div>
              )}
              {!waError && waPreview && waValid && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  ✓ יישמר כ: {waPreview}
                </div>
              )}
              {!waError && !waPreview && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  קבל: 050-1234567 · 0501234567 · +972-50-1234567
                </div>
              )}
            </div>
            <div>
              <label style={lbl}>כתובת</label>
              <input value={form.address} onChange={setField('address')} style={inp} placeholder="בית הכרם 30, ירושלים" />
            </div>
            <div>
              <label style={lbl}>מייל לקבלת הזמנות</label>
              <input value={form.email} onChange={setField('email')} style={inp} placeholder="owner@example.com" type="email" />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                התראות על הזמנות חדשות יישלחו לכתובת זו.{' '}
                <span style={{ color: '#f59e0b' }}>כרגע נשלח רק ל-shiranc86@gmail.com (מגבלת Resend Free)</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
            <button type="submit" style={{ padding: '10px 28px', fontWeight: 700 }}>שמור פרטים</button>
            {saved && <span style={{ color: '#16a34a', fontSize: 14, fontWeight: 600 }}>✓ נשמר!</span>}
            {saveError && <span style={{ color: '#ef4444', fontSize: 13 }}>⚠ {saveError}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
