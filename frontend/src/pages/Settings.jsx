import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectStoreInfo, setStoreInfo } from '../store/slices/settingsSlice.js';

const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 };
const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 14, fontFamily: 'inherit' };

export default function SettingsPage() {
  const dispatch   = useDispatch();
  const storeInfo  = useSelector(selectStoreInfo);

  const [form, setForm] = useState({
    name:     storeInfo.name     || '',
    phone:    storeInfo.phone    || '',
    whatsapp: storeInfo.whatsapp || '',
    address:  storeInfo.address  || '',
    email:    storeInfo.email    || '',
  });
  const [saved, setSaved] = useState(false);

  const setField = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  function handleSave(e) {
    e.preventDefault();
    dispatch(setStoreInfo(form));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

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
              <label style={lbl}>מספר WhatsApp (פורמט בינלאומי ללא +)</label>
              <input value={form.whatsapp} onChange={setField('whatsapp')} style={inp} placeholder="9720526098000" />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                לדוגמה: 052-xxx-xxxx → 972052xxxxxxx
              </div>
            </div>
            <div>
              <label style={lbl}>כתובת</label>
              <input value={form.address} onChange={setField('address')} style={inp} placeholder="בית הכרם 30, ירושלים" />
            </div>
            <div>
              <label style={lbl}>מייל לקבלת הזמנות</label>
              <input value={form.email} onChange={setField('email')} style={inp} placeholder="owner@example.com" type="email" />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                התראות על הזמנות חדשות יישלחו לכתובת זו
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
            <button type="submit" style={{ padding: '10px 28px', fontWeight: 700 }}>שמור פרטים</button>
            {saved && <span style={{ color: '#16a34a', fontSize: 14, fontWeight: 600 }}>✓ נשמר!</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
