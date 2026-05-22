import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  selectTheme, selectCustomColors, selectStoreInfo,
  setTheme, setCustomColors, setStoreInfo,
} from '../store/slices/settingsSlice.js';

const PRESET_THEMES = [
  {
    id: 'dark',
    labelKey: 'settings.themeDark',
    bg: '#080e1a', surface: '#0f1929', primary: '#2563eb', accent: '#06b6d4', text: '#e2e8f0',
  },
  {
    id: 'light',
    labelKey: 'settings.themeLight',
    bg: '#f0f2ff', surface: '#ffffff', primary: '#6366f1', accent: '#06b6d4', text: '#1e1b4b',
  },
  {
    id: 'deep-blue',
    labelKey: 'settings.themeDeepBlue',
    bg: '#030d1f', surface: '#0a1f4a', primary: '#3b82f6', accent: '#22d3ee', text: '#e0f2fe',
  },
];

const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 };
const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 14, fontFamily: 'inherit' };

export default function SettingsPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const currentTheme = useSelector(selectTheme);
  const customColors = useSelector(selectCustomColors);
  const storeInfo    = useSelector(selectStoreInfo);
  const [activeTab, setActiveTab] = useState('appearance');

  const [storeForm, setStoreForm] = useState({
    name:      storeInfo.name      || '',
    phone:     storeInfo.phone     || '',
    whatsapp:  storeInfo.whatsapp  || '',
    address:   storeInfo.address   || '',
    email:     storeInfo.email     || '',
  });
  const [storeSaved, setStoreSaved] = useState(false);

  const setField = (field) => (e) => setStoreForm((prev) => ({ ...prev, [field]: e.target.value }));

  function handleStoreSave(e) {
    e.preventDefault();
    dispatch(setStoreInfo(storeForm));
    setStoreSaved(true);
    setTimeout(() => setStoreSaved(false), 2500);
  }

  const tabStyle = (tab) => ({
    background: 'transparent',
    color: activeTab === tab ? 'var(--brand-primary)' : 'var(--text-muted)',
    borderRadius: 0,
    borderBottom: activeTab === tab ? '2px solid var(--brand-primary)' : '2px solid transparent',
    padding: '10px 20px',
    fontWeight: 600,
    fontSize: 14,
  });

  return (
    <div style={{ maxWidth: 760 }}>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>{t('settings.title')}</h2>
      <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: 20, fontSize: 13 }}>
        {t('settings.subtitle')}
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
        <button style={tabStyle('appearance')} onClick={() => setActiveTab('appearance')}>
          🎨 מראה
        </button>
        <button style={tabStyle('storeInfo')} onClick={() => setActiveTab('storeInfo')}>
          🏪 פרטי חנות
        </button>
      </div>

      {/* ── Appearance tab ── */}
      {activeTab === 'appearance' && (
        <div>
          <h3 style={{ marginTop: 0, marginBottom: 6 }}>{t('settings.theme')}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 20px' }}>
            {t('settings.themeHint')}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16, marginBottom: 24, maxWidth: 680 }}>
            {PRESET_THEMES.map((theme) => {
              const isActive = currentTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => dispatch(setTheme(theme.id))}
                  style={{
                    background: theme.bg,
                    border: `2px solid ${isActive ? theme.primary : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 12, padding: 0, cursor: 'pointer',
                    outline: isActive ? `3px solid ${theme.primary}40` : 'none',
                    outlineOffset: 2, overflow: 'hidden',
                    transition: 'transform 0.15s ease, outline 0.15s ease',
                    transform: isActive ? 'scale(1.03)' : 'scale(1)',
                  }}
                >
                  <div style={{ background: theme.surface, padding: '10px 12px', display: 'flex', gap: 6, alignItems: 'center', borderBottom: 'rgba(255,255,255,0.06) 1px solid' }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: theme.primary }} />
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: theme.accent }} />
                    <div style={{ flex: 1, height: 2, background: `${theme.text}18`, borderRadius: 1 }} />
                  </div>
                  <div style={{ display: 'flex', height: 28 }}>
                    <div style={{ flex: 2, background: theme.bg }} />
                    <div style={{ flex: 1, background: theme.surface }} />
                    <div style={{ flex: 1, background: theme.primary }} />
                    <div style={{ flex: 1, background: theme.accent }} />
                  </div>
                  <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: theme.text, fontWeight: 600, fontSize: 13 }}>{t(theme.labelKey)}</span>
                    {isActive && (
                      <span style={{ background: theme.primary, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999 }}>
                        {t('settings.active')}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Custom theme card */}
            {(() => {
              const isActive = currentTheme === 'custom';
              return (
                <button
                  onClick={() => dispatch(setTheme('custom'))}
                  style={{
                    background: 'var(--surface-2)',
                    border: `2px solid ${isActive ? 'var(--brand-primary)' : 'var(--border)'}`,
                    borderRadius: 12, padding: 0, cursor: 'pointer',
                    outline: isActive ? '3px solid var(--brand-primary-alpha-25)' : 'none',
                    outlineOffset: 2, overflow: 'hidden',
                    transition: 'transform 0.15s ease, outline 0.15s ease',
                    transform: isActive ? 'scale(1.03)' : 'scale(1)',
                  }}
                >
                  <div style={{ padding: '10px 12px', display: 'flex', gap: 6, alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: customColors.primary }} />
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: customColors.accent }} />
                    <div style={{ flex: 1, height: 2, background: 'var(--border)', borderRadius: 1 }} />
                  </div>
                  <div style={{ display: 'flex', height: 28 }}>
                    <div style={{ flex: 2, background: 'var(--bg)' }} />
                    <div style={{ flex: 1, background: customColors.primary }} />
                    <div style={{ flex: 1, background: customColors.accent }} />
                  </div>
                  <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 13 }}>{t('settings.themeCustom')}</span>
                    {isActive && (
                      <span style={{ background: 'var(--brand-primary)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999 }}>
                        {t('settings.active')}
                      </span>
                    )}
                  </div>
                </button>
              );
            })()}
          </div>

          {currentTheme === 'custom' && (
            <div className="card" style={{ maxWidth: 480, marginBottom: 20 }}>
              <h3 style={{ marginBottom: 16 }}>{t('settings.customizeColors')}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={lbl}>{t('settings.primaryColor')}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="color"
                      value={customColors.primary}
                      onChange={(e) => dispatch(setCustomColors({ primary: e.target.value }))}
                      style={{ width: 48, height: 40, border: '1.5px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: 'none', padding: 3 }}
                    />
                    <code style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{customColors.primary}</code>
                  </div>
                </div>
                <div>
                  <label style={lbl}>{t('settings.accentColor')}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="color"
                      value={customColors.accent}
                      onChange={(e) => dispatch(setCustomColors({ accent: e.target.value }))}
                      style={{ width: 48, height: 40, border: '1.5px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: 'none', padding: 3 }}
                    />
                    <code style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{customColors.accent}</code>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '14px 0 0' }}>
                {t('settings.colorHint')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Store Info tab ── */}
      {activeTab === 'storeInfo' && (
        <div>
          <h3 style={{ marginTop: 0, marginBottom: 6 }}>פרטי החנות</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 24px' }}>
            פרטים אלה מופיעים בחנות האונליין ובהודעות WhatsApp ללקוחות.
          </p>

          <form onSubmit={handleStoreSave} style={{ maxWidth: 480 }}>
            <div style={{ display: 'grid', gap: 18 }}>
              <div>
                <label style={lbl}>שם העסק</label>
                <input value={storeForm.name} onChange={setField('name')} style={inp} placeholder="דור הסלולר" required />
              </div>
              <div>
                <label style={lbl}>טלפון</label>
                <input value={storeForm.phone} onChange={setField('phone')} style={inp} placeholder="052-6098000" type="tel" />
              </div>
              <div>
                <label style={lbl}>מספר WhatsApp (בפורמט בינלאומי ללא +)</label>
                <input value={storeForm.whatsapp} onChange={setField('whatsapp')} style={inp} placeholder="9720526098000" />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  לדוגמה: 052-xxx-xxxx הופך ל-972052xxxxxxx
                </div>
              </div>
              <div>
                <label style={lbl}>כתובת</label>
                <input value={storeForm.address} onChange={setField('address')} style={inp} placeholder="בית הכרם 30, ירושלים" />
              </div>
              <div>
                <label style={lbl}>מייל לקבלת הזמנות</label>
                <input value={storeForm.email} onChange={setField('email')} style={inp} placeholder="owner@example.com" type="email" />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  התראות על הזמנות חדשות יישלחו לכתובת זו
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
              <button type="submit" style={{ padding: '10px 28px', fontWeight: 700 }}>
                שמור פרטים
              </button>
              {storeSaved && (
                <span style={{ color: '#16a34a', fontSize: 14, fontWeight: 600 }}>✓ נשמר!</span>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
