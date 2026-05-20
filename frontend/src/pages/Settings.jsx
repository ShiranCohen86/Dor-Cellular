import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  selectTheme, selectNavVisibility, selectCustomColors,
  setTheme, setNavItemVisible, resetNavVisibility, setCustomColors,
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

const ALL_NAV_ITEMS = [
  { key: 'dashboard',     roles: ['admin', 'manager', 'salesperson', 'technician'] },
  { key: 'pos',           roles: ['admin', 'manager', 'salesperson'] },
  { key: 'products',      roles: ['admin', 'manager', 'salesperson', 'technician'] },
  { key: 'orders',        roles: ['admin', 'manager', 'salesperson'] },
  { key: 'repairs',       roles: ['admin', 'manager', 'salesperson', 'technician'] },
  { key: 'customers',     roles: ['admin', 'manager', 'salesperson'] },
  { key: 'suppliers',     roles: ['admin', 'manager'] },
  { key: 'reports',       roles: ['admin', 'manager'] },
  { key: 'notifications', roles: ['admin', 'manager', 'salesperson', 'technician'] },
  { key: 'branches',      roles: ['admin', 'manager'] },
  { key: 'users',         roles: ['admin', 'manager'] },
  { key: 'profile',       roles: ['admin', 'manager', 'salesperson', 'technician'] },
  { key: 'settings',     roles: ['admin'] },
  { key: 'auditLogs',    roles: ['admin', 'manager'] },
];

const ROLES = ['admin', 'manager', 'salesperson', 'technician'];

export default function SettingsPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const currentTheme = useSelector(selectTheme);
  const navVisibility = useSelector(selectNavVisibility);
  const customColors = useSelector(selectCustomColors);
  const [activeTab, setActiveTab] = useState('appearance');

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
    <div style={{ maxWidth: 960 }}>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>{t('settings.title')}</h2>
      <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: 20, fontSize: 13 }}>
        {t('settings.subtitle')}
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
        <button style={tabStyle('appearance')} onClick={() => setActiveTab('appearance')}>
          {t('settings.tabAppearance')}
        </button>
        <button style={tabStyle('navigation')} onClick={() => setActiveTab('navigation')}>
          {t('settings.tabNavigation')}
        </button>
      </div>

      {/* ── Appearance tab ── */}
      {activeTab === 'appearance' && (
        <div>
          <h3 style={{ marginTop: 0, marginBottom: 6 }}>{t('settings.theme')}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 20px' }}>
            {t('settings.themeHint')}
          </p>

          {/* Preset themes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16, marginBottom: 24, maxWidth: 740 }}>
            {PRESET_THEMES.map((theme) => {
              const isActive = currentTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => dispatch(setTheme(theme.id))}
                  style={{
                    background: theme.bg,
                    border: `2px solid ${isActive ? theme.primary : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 12,
                    padding: 0,
                    cursor: 'pointer',
                    outline: isActive ? `3px solid ${theme.primary}40` : 'none',
                    outlineOffset: 2,
                    overflow: 'hidden',
                    transition: 'transform 0.15s ease, outline 0.15s ease',
                    transform: isActive ? 'scale(1.03)' : 'scale(1)',
                  }}
                >
                  <div style={{ background: theme.surface, padding: '10px 12px', display: 'flex', gap: 6, alignItems: 'center', borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
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
                    borderRadius: 12,
                    padding: 0,
                    cursor: 'pointer',
                    outline: isActive ? `3px solid var(--brand-primary-alpha-25)` : 'none',
                    outlineOffset: 2,
                    overflow: 'hidden',
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

          {/* Custom color pickers — shown only when custom theme is active */}
          {currentTheme === 'custom' && (
            <div className="card" style={{ maxWidth: 480, marginBottom: 20 }}>
              <h3 style={{ marginBottom: 16 }}>{t('settings.customizeColors')}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                    {t('settings.primaryColor')}
                  </label>
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
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                    {t('settings.accentColor')}
                  </label>
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

      {/* ── Navigation tab ── */}
      {activeTab === 'navigation' && (
        <div>
          {/* ── For all users ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <h3 style={{ margin: '0 0 4px' }}>{t('settings.navManagement')}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>{t('settings.navHint')}</p>
            </div>
            <button className="btn-secondary" onClick={() => dispatch(resetNavVisibility())} style={{ flexShrink: 0, marginTop: 4 }}>
              {t('settings.resetDefaults')}
            </button>
          </div>

          <div className="table-wrap" style={{ marginTop: 20, marginBottom: 36 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 140 }}>{t('common.name')}</th>
                  {ROLES.filter((r) => r !== 'admin').map((role) => (
                    <th key={role} style={{ textAlign: 'center', minWidth: 110 }}>
                      {t(`roles.${role}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_NAV_ITEMS.map((item) => (
                  <tr key={item.key}>
                    <td style={{ fontWeight: 500 }}>{t(`nav.${item.key}`)}</td>
                    {ROLES.filter((r) => r !== 'admin').map((role) => {
                      const hasBaseAccess = item.roles.includes(role);
                      const isVisible = navVisibility[role]?.[item.key] !== false;
                      return (
                        <td key={role} style={{ textAlign: 'center' }}>
                          {hasBaseAccess ? (
                            <input
                              type="checkbox"
                              checked={isVisible}
                              onChange={(e) => dispatch(setNavItemVisible({ role, key: item.key, visible: e.target.checked }))}
                              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--brand-primary)' }}
                            />
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Personal nav (admin only) ── */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 28 }}>
            <h3 style={{ margin: '0 0 4px' }}>{t('settings.navPersonal')}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 20px' }}>{t('settings.navPersonalHint')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, maxWidth: 680 }}>
              {ALL_NAV_ITEMS.map((item) => {
                const isVisible = navVisibility['admin']?.[item.key] !== false;
                return (
                  <label
                    key={item.key}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'var(--surface-3)', borderRadius: 8,
                      padding: '10px 14px', cursor: 'pointer',
                      border: `1.5px solid ${isVisible ? 'var(--brand-primary)' : 'var(--border)'}`,
                      opacity: isVisible ? 1 : 0.55,
                      transition: 'border-color .15s, opacity .15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={(e) => dispatch(setNavItemVisible({ role: 'admin', key: item.key, visible: e.target.checked }))}
                      style={{ width: 15, height: 15, accentColor: 'var(--brand-primary)', flexShrink: 0 }}
                    />
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{t(`nav.${item.key}`)}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
