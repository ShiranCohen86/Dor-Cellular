import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Auth } from '../api/client.js';

// ─── IP helpers ───────────────────────────────────────────────────────────────
function cleanIp(raw = '') {
  const s = raw.replace(/^::ffff:/, '');
  if (s === '::1') return '127.0.0.1';
  return s || '—';
}

function isLocalIp(ip) {
  return !ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.');
}

// ─── GeoIP hook ───────────────────────────────────────────────────────────────
function countryFlag(code) {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e0 + c.charCodeAt(0) - 65));
}

function useGeoIp(ip) {
  const [geo, setGeo] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!ip || ip === '—' || isLocalIp(ip)) return;
    setLoading(true);
    setGeo(null);
    fetch(`https://ipinfo.io/${ip}/json`)
      .then((r) => r.json())
      .then((d) => setGeo(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ip]);
  return { geo, loading };
}

// ─── Language / UA helpers ────────────────────────────────────────────────────
function parseLang(raw = '') {
  if (!raw) return null;
  const first = raw.split(',')[0].trim().split(';')[0].trim();
  const map = { he: 'עברית', 'he-IL': 'עברית (ישראל)', en: 'אנגלית', 'en-US': 'אנגלית (ארה״ב)', 'en-GB': 'אנגלית (בריטניה)', ar: 'ערבית', ru: 'רוסית', fr: 'צרפתית' };
  return map[first] || first;
}

function parseUA(ua = '') {
  if (!ua) return { browser: 'לא ידוע', browserVersion: '', os: 'לא ידוע', osVersion: '', deviceType: 'מחשב', raw: '' };
  let browser = 'לא ידוע', browserVersion = '', os = 'לא ידוע', osVersion = '', m;
  if ((m = ua.match(/Edg\/([\d.]+)/)))                                    { browser = 'Edge';    browserVersion = m[1].split('.')[0]; }
  else if ((m = ua.match(/OPR\/([\d.]+)/)))                               { browser = 'Opera';   browserVersion = m[1].split('.')[0]; }
  else if ((m = ua.match(/Chrome\/([\d.]+)/)) && !/Chromium/.test(ua))   { browser = 'Chrome';  browserVersion = m[1].split('.')[0]; }
  else if ((m = ua.match(/Firefox\/([\d.]+)/)))                           { browser = 'Firefox'; browserVersion = m[1].split('.')[0]; }
  else if ((m = ua.match(/Version\/([\d.]+).*Safari/)) && !/Chrome/.test(ua)) { browser = 'Safari'; browserVersion = m[1].split('.')[0]; }
  else if (/MSIE|Trident/.test(ua))                                       { browser = 'IE'; }
  if ((m = ua.match(/Windows NT ([\d.]+)/))) {
    os = 'Windows';
    const ntMap = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' };
    osVersion = ntMap[m[1]] || m[1];
  } else if ((m = ua.match(/Mac OS X ([\d_]+)/))) { os = 'macOS'; osVersion = m[1].replace(/_/g, '.'); }
  else if ((m = ua.match(/Android ([\d.]+)/)))    { os = 'Android'; osVersion = m[1]; }
  else if (/iPhone/.test(ua)) { os = 'iOS';    if ((m = ua.match(/OS ([\d_]+)/))) osVersion = m[1].replace(/_/g, '.'); }
  else if (/iPad/.test(ua))   { os = 'iPadOS'; if ((m = ua.match(/OS ([\d_]+)/))) osVersion = m[1].replace(/_/g, '.'); }
  else if (/Linux/.test(ua))  { os = 'Linux'; }
  let deviceType = 'מחשב';
  if (/Mobi|Android.*Mobile|iPhone/.test(ua)) deviceType = 'סמארטפון';
  else if (/iPad|Android(?!.*Mobile)|Tablet/.test(ua)) deviceType = 'טאבלט';
  return { browser, browserVersion, os, osVersion, deviceType, raw: ua };
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ─── Action config ────────────────────────────────────────────────────────────
const ACTION_CONFIG = {
  'auth.login':            { label: 'כניסה',         icon: '✅', color: '#6366f1', bg: 'rgba(99,102,241,0.13)' },
  'auth.login.failed':     { label: 'כניסה נכשלת',  icon: '❌', color: '#dc2626', bg: 'rgba(220,38,38,0.13)' },
  'auth.logout':           { label: 'יציאה',          icon: '🚪', color: '#6b7280', bg: 'rgba(107,114,128,0.13)' },
  'auth.password.changed': { label: 'שינוי סיסמה',  icon: '🔑', color: '#d97706', bg: 'rgba(217,119,6,0.13)' },
  'auth.user.registered':  { label: 'רישום משתמש',  icon: '👤', color: '#059669', bg: 'rgba(5,150,105,0.13)' },
  'order.created':         { label: 'הזמנה חדשה',   icon: '🛒', color: '#7c3aed', bg: 'rgba(124,58,237,0.13)' },
  'order.payment.added':   { label: 'תשלום',         icon: '💳', color: '#059669', bg: 'rgba(5,150,105,0.13)' },
  'order.refunded':        { label: 'החזר כספי',     icon: '↩️', color: '#d97706', bg: 'rgba(217,119,6,0.13)' },
  'order.cancelled':       { label: 'ביטול הזמנה',  icon: '✖',  color: '#dc2626', bg: 'rgba(220,38,38,0.13)' },
  'repair.created':        { label: 'תיקון חדש',     icon: '🔧', color: '#0891b2', bg: 'rgba(8,145,178,0.13)' },
  'repair.status.changed': { label: 'עדכון תיקון',  icon: '🔄', color: '#0891b2', bg: 'rgba(8,145,178,0.13)' },
  'repair.delivered':      { label: 'מסירת תיקון',  icon: '📦', color: '#059669', bg: 'rgba(5,150,105,0.13)' },
  'customer.created':      { label: 'לקוח חדש',     icon: '👤', color: '#059669', bg: 'rgba(5,150,105,0.13)' },
  'customer.updated':      { label: 'עדכון לקוח',   icon: '✏️', color: '#6b7280', bg: 'rgba(107,114,128,0.13)' },
  'customer.deleted':      { label: 'מחיקת לקוח',   icon: '🗑️', color: '#dc2626', bg: 'rgba(220,38,38,0.13)' },
  'product.created':       { label: 'מוצר חדש',     icon: '📦', color: '#7c3aed', bg: 'rgba(124,58,237,0.13)' },
  'product.updated':       { label: 'עדכון מוצר',   icon: '✏️', color: '#6b7280', bg: 'rgba(107,114,128,0.13)' },
  'product.deleted':       { label: 'מחיקת מוצר',   icon: '🗑️', color: '#dc2626', bg: 'rgba(220,38,38,0.13)' },
  'supplier.created':      { label: 'ספק חדש',       icon: '🏭', color: '#0891b2', bg: 'rgba(8,145,178,0.13)' },
  'supplier.po.created':   { label: 'הזמנת ספק',    icon: '📋', color: '#0891b2', bg: 'rgba(8,145,178,0.13)' },
  'supplier.po.received':  { label: 'קבלת סחורה',   icon: '📥', color: '#059669', bg: 'rgba(5,150,105,0.13)' },
};

function actionConf(action) {
  return ACTION_CONFIG[action] || { label: action, icon: '•', color: '#6b7280', bg: 'rgba(107,114,128,0.13)' };
}

// Subject + detail per log type (table row summary)
function getRowDesc(log) {
  const { action, meta = {} } = log;
  const actor = log.userId;
  if (action.startsWith('auth.')) return {
    subject: meta.name || actor?.name || '—',
    detail: meta.email || actor?.email || '—',
  };
  if (action.startsWith('order.')) return {
    subject: meta.invoiceNumber || '—',
    detail: meta.total != null ? `₪${meta.total}` : '',
  };
  if (action.startsWith('repair.')) return {
    subject: meta.ticketNumber || '—',
    detail: [meta.deviceBrand, meta.deviceModel].filter(Boolean).join(' '),
  };
  if (action.startsWith('customer.')) return {
    subject: meta.name || '—',
    detail: meta.phone || '',
  };
  if (action.startsWith('product.')) return {
    subject: meta.name || '—',
    detail: meta.sku || '',
  };
  if (action.startsWith('supplier.')) return {
    subject: meta.poNumber || meta.name || '—',
    detail: meta.total != null ? `₪${meta.total}` : '',
  };
  return { subject: '—', detail: '' };
}

// ─── Hebrew labels for meta keys ─────────────────────────────────────────────
const META_LABELS = {
  invoiceNumber: 'מספר חשבונית', total: 'סכום (₪)', items: 'כמות פריטים', customerId: 'מזהה לקוח',
  ticketNumber: 'מספר כרטיס', deviceBrand: 'מותג', deviceModel: 'דגם', status: 'סטטוס',
  notes: 'הערות', name: 'שם', phone: 'טלפון', email: 'אימייל', sku: 'מק"ט',
  amount: 'סכום תשלום', method: 'אמצעי תשלום', balanceDue: 'יתרה לתשלום',
  reason: 'סיבה', poNumber: 'מספר הזמנת ספק', role: 'תפקיד', branchId: 'מזהה סניף',
  acceptLanguage: 'שפת דפדפן', supplierName: 'שם ספק',
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function DetailRow({ label, value, hint, mono }) {
  return (
    <div title={hint} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)', alignItems: 'baseline', minWidth: 0 }}>
      <div style={{ flex: '0 0 110px', fontWeight: 600, fontSize: 12, color: 'var(--text)', flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: 12, color: mono ? 'var(--brand-primary)' : 'var(--text)', fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-all', minWidth: 0, flex: 1 }}>
        {value || '—'}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text-muted)', margin: '12px 0 6px' }}>{children}</div>;
}

// Expanded panel for auth events — shows full IP/browser detail
function AuthExpandedDetail({ log }) {
  const { t } = useTranslation();
  const { browser, browserVersion, os, osVersion, deviceType, raw } = parseUA(log.userAgent);
  const isFailed = log.action === 'auth.login.failed';
  const cleanedIp = cleanIp(log.ip);
  const langLabel = parseLang(log.meta?.acceptLanguage);
  const { geo, loading: geoLoading } = useGeoIp(cleanedIp);
  const conf = actionConf(log.action);

  return (
    <div style={{ background: 'var(--surface-2)', border: `1.5px solid ${conf.color}`, borderRadius: 8, padding: '12px 16px', margin: '4px 0 8px', display: 'flex', flexWrap: 'wrap', gap: '0 28px', minWidth: 0, overflow: 'hidden' }}>
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <SectionTitle>פרטי המשתמש</SectionTitle>
        <DetailRow label="שם"       value={log.meta?.name} />
        <DetailRow label="אימייל"   value={log.meta?.email} mono />
        <DetailRow label="טלפון"    value={log.meta?.phone} />
        <DetailRow label="תפקיד"    value={log.meta?.role ? t(`roles.${log.meta.role}`) : null} />
        <DetailRow label="User ID"  value={log.userId?._id || log.userId || 'לא זוהה'} mono />
        <DetailRow label="Branch ID" value={log.meta?.branchId ? String(log.meta.branchId) : null} mono />
        <SectionTitle>פרטי האירוע</SectionTitle>
        <DetailRow label="סוג"          value={isFailed ? '❌ כניסה נכשלת' : '✅ כניסה מוצלחת'} />
        <DetailRow label="תאריך ושעה"   value={formatDateTime(log.createdAt)} />
        <DetailRow label="Log ID"        value={log._id} mono />
      </div>
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <SectionTitle>רשת ומכשיר</SectionTitle>
        <DetailRow label="כתובת IP" hint={isLocalIp(cleanedIp) ? 'כתובת מקומית' : 'IP ציבורי'} value={isLocalIp(cleanedIp) ? `${cleanedIp}  ·  מקומי` : cleanedIp} mono />
        {!isLocalIp(cleanedIp) && (
          <DetailRow label="מיקום" value={geoLoading ? 'מאתר…' : geo ? [countryFlag(geo.country), geo.city, geo.region, geo.country, geo.org].filter(Boolean).join('  ·  ') : null} />
        )}
        <DetailRow label="מכשיר"         value={deviceType} />
        <DetailRow label="דפדפן"         value={browserVersion ? `${browser} ${browserVersion}` : browser} />
        <DetailRow label="מערכת הפעלה"  value={osVersion ? `${os} ${osVersion}` : os} />
        <DetailRow label="שפת דפדפן"    value={langLabel ? `${langLabel}${log.meta?.acceptLanguage ? ` (${log.meta.acceptLanguage.split(',')[0]})` : ''}` : null} />
        <SectionTitle>User Agent גולמי</SectionTitle>
        <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', background: 'var(--surface-3)', borderRadius: 6, padding: '7px 9px', wordBreak: 'break-all', lineHeight: 1.6 }}>{raw || '—'}</div>
      </div>
    </div>
  );
}

// Expanded panel for non-auth events — shows meta fields
function GenericExpandedDetail({ log }) {
  const conf = actionConf(log.action);
  const actor = log.userId;
  const meta = log.meta || {};
  const isIdKey = (k) => k.endsWith('Id') || k.endsWith('_id') || k === '_id';

  return (
    <div style={{ background: 'var(--surface-2)', border: `1.5px solid ${conf.color}`, borderRadius: 8, padding: '12px 16px', margin: '4px 0 8px', display: 'flex', flexWrap: 'wrap', gap: '0 28px', minWidth: 0, overflow: 'hidden' }}>
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        {actor && (
          <>
            <SectionTitle>מבצע הפעולה</SectionTitle>
            <DetailRow label="שם"     value={actor.name} />
            <DetailRow label="אימייל" value={actor.email} mono />
            <DetailRow label="תפקיד" value={actor.role} />
          </>
        )}
        <SectionTitle>פרטי האירוע</SectionTitle>
        <DetailRow label="פעולה"       value={`${conf.icon} ${conf.label}`} />
        <DetailRow label="תאריך ושעה" value={formatDateTime(log.createdAt)} />
        <DetailRow label="Log ID"      value={log._id} mono />
      </div>
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <SectionTitle>נתונים</SectionTitle>
        {Object.entries(meta).map(([key, val]) => {
          if (val == null) return null;
          return (
            <DetailRow
              key={key}
              label={META_LABELS[key] || key}
              value={String(val)}
              mono={isIdKey(key)}
            />
          );
        })}
      </div>
    </div>
  );
}

function ExpandedDetail({ log }) {
  if (log.action.startsWith('auth.')) return <AuthExpandedDetail log={log} />;
  return <GenericExpandedDetail log={log} />;
}

function StatCard({ label, value, color, hint }) {
  return (
    <div className="kpi" style={{ borderTop: `3px solid ${color}` }} title={hint}>
      <div className="label">{label}</div>
      <div className="value" style={{ color }}>{value ?? '—'}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AuditLogs() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 50 };
      if (q) params.q = q;
      if (from) params.from = from;
      if (to) params.to = to;
      if (actionFilter) params.action = actionFilter;
      const result = await Auth.auditLogs(params);
      setData(result);
    } catch (err) {
      setError(err?.message || 'שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, [page, q, from, to, actionFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); load(); };

  const stats = data?.stats;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, userSelect: 'none' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>לוג פעולות מערכת</h2>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          רשומה נשמרת לכל פעולה משמעותית — כניסות, הזמנות, תיקונים, לקוחות, מוצרים וספקים.
        </div>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          <StatCard label="כניסות היום"        value={stats.todayLogins}  color="var(--brand-primary)"  hint="כניסות מוצלחות מחצות הלילה" />
          <StatCard label="כניסות כושלות"      value={stats.todayFailed}  color="#dc2626"                hint="ניסיונות כניסה שנכשלו היום" />
          <StatCard label="הזמנות היום"         value={stats.todayOrders}  color="#7c3aed"                hint="הזמנות שנפתחו היום" />
          <StatCard label="תיקונים היום"        value={stats.todayRepairs} color="#0891b2"                hint="תיקונים שנפתחו היום" />
        </div>
      )}

      <form className="card" style={{ padding: '12px 14px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }} onSubmit={handleSearch}>
        <div style={{ flex: '1 1 160px', minWidth: 130 }}>
          <div className="label" style={{ marginBottom: 4, fontSize: 12 }}>חיפוש חופשי</div>
          <input className="input" placeholder="שם, אימייל, חשבונית, כרטיס…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div style={{ flex: '0 0 140px' }}>
          <div className="label" style={{ marginBottom: 4, fontSize: 12 }}>מתאריך</div>
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div style={{ flex: '0 0 140px' }}>
          <div className="label" style={{ marginBottom: 4, fontSize: 12 }}>עד תאריך</div>
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div style={{ flex: '0 0 190px' }}>
          <div className="label" style={{ marginBottom: 4, fontSize: 12 }}>סוג פעולה</div>
          <select className="input" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">כל הפעולות</option>
            <optgroup label="כניסות">
              <option value="auth.login">כניסות מוצלחות</option>
              <option value="auth.login.failed">כניסות כושלות</option>
              <option value="auth.logout">יציאות</option>
              <option value="auth.password.changed">שינויי סיסמה</option>
              <option value="auth.user.registered">רישום משתמש</option>
            </optgroup>
            <optgroup label="הזמנות">
              <option value="order.created">הזמנה חדשה</option>
              <option value="order.payment.added">תשלום</option>
              <option value="order.refunded">החזר כספי</option>
              <option value="order.cancelled">ביטול הזמנה</option>
            </optgroup>
            <optgroup label="תיקונים">
              <option value="repair.created">תיקון חדש</option>
              <option value="repair.status.changed">עדכון סטטוס</option>
              <option value="repair.delivered">מסירה</option>
            </optgroup>
            <optgroup label="לקוחות">
              <option value="customer.created">לקוח חדש</option>
              <option value="customer.updated">עדכון לקוח</option>
              <option value="customer.deleted">מחיקת לקוח</option>
            </optgroup>
            <optgroup label="מוצרים">
              <option value="product.created">מוצר חדש</option>
              <option value="product.updated">עדכון מוצר</option>
              <option value="product.deleted">מחיקת מוצר</option>
            </optgroup>
            <optgroup label="ספקים">
              <option value="supplier.po.created">הזמנת ספק</option>
              <option value="supplier.po.received">קבלת סחורה</option>
            </optgroup>
          </select>
        </div>
        <button className="btn-primary" type="submit" style={{ height: 38 }}>סנן</button>
        <button className="btn-secondary" type="button" style={{ height: 38 }} onClick={() => { setQ(''); setFrom(''); setTo(''); setActionFilter(''); setPage(1); }}>נקה</button>
      </form>

      {error && <div className="badge danger" style={{ padding: '8px 14px' }}>{error}</div>}

      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface-3)', textAlign: 'start' }}>
              <th style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>תאריך ושעה</th>
              <th style={{ padding: '10px 14px', fontWeight: 600 }}>פעולה</th>
              <th style={{ padding: '10px 14px', fontWeight: 600 }}>מבצע</th>
              <th style={{ padding: '10px 14px', fontWeight: 600 }}>נושא</th>
              <th style={{ padding: '10px 14px', fontWeight: 600, width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>טוען...</td></tr>
            )}
            {!loading && data?.items?.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>לא נמצאו רשומות</td></tr>
            )}
            {!loading && data?.items?.map((log) => {
              const conf = actionConf(log.action);
              const isExpanded = expandedId === log._id;
              const actor = log.userId;
              const actorName = actor?.name || log.meta?.name || '—';
              const actorRole = actor?.role || log.meta?.role;
              const { subject, detail } = getRowDesc(log);

              return [
                <tr
                  key={log._id}
                  onClick={() => setExpandedId(isExpanded ? null : log._id)}
                  style={{
                    borderTop: '1px solid var(--border)',
                    background: isExpanded ? `${conf.bg}` : undefined,
                    cursor: 'pointer',
                  }}
                >
                  <td style={{ padding: '9px 14px', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 12 }}>
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{ background: conf.bg, color: conf.color, fontWeight: 700, fontSize: 11, borderRadius: 4, padding: '3px 8px' }}>
                      {conf.icon} {conf.label}
                    </span>
                  </td>
                  <td style={{ padding: '9px 14px', maxWidth: 160 }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actorName}</div>
                    {actorRole && <span className="badge" style={{ fontSize: 10 }}>{actorRole}</span>}
                  </td>
                  <td style={{ padding: '9px 14px', maxWidth: 200 }}>
                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subject}</div>
                    {detail && <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail}</div>}
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    {isExpanded ? '▲' : '▼'}
                  </td>
                </tr>,

                isExpanded && (
                  <tr key={`${log._id}-detail`}>
                    <td colSpan={5} style={{ padding: '0 12px 12px' }}>
                      <ExpandedDetail log={log} />
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>הקודם</button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>עמוד {page} מתוך {data.pages} · {data.total} רשומות</span>
          <button className="btn-secondary" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>הבא</button>
        </div>
      )}
    </div>
  );
}
