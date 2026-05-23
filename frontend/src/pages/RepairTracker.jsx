import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { fetchPublicRepairStatus } from '../api/public.api.js';
import { selectStoreWhatsApp } from '../store/slices/settingsSlice.js';

const STATUS_DISPLAY = {
  received:           { icon: '✓',  label: 'הטלפון שלך התקבל',      color: '#2563eb', bg: '#eff6ff' },
  diagnosed:          { icon: '🔍', label: 'בבדיקה',                 color: '#7c3aed', bg: '#f5f3ff' },
  waiting_for_parts:  { icon: '📦', label: 'ממתין לחלקים',           color: '#d97706', bg: '#fffbeb' },
  in_repair:          { icon: '🔧', label: 'בתיקון',                  color: '#d97706', bg: '#fffbeb' },
  ready:              { icon: '🎉', label: 'מוכן לאיסוף!',           color: '#16a34a', bg: '#f0fdf4' },
  delivered:          { icon: '✅', label: 'נמסר בהצלחה',            color: '#16a34a', bg: '#f0fdf4' },
  cancelled:          { icon: '✕',  label: 'בוטל',                   color: '#dc2626', bg: '#fef2f2' },
};

export default function RepairTracker() {
  const storeWhatsApp = useSelector(selectStoreWhatsApp);
  const [ticketId, setTicketId] = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    if (!ticketId.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const data = await fetchPublicRepairStatus(ticketId.trim());
      setResult(data);
    } catch (err) {
      setError(err.status === 404 ? 'לא נמצאה קריאה עם מספר זה' : 'שגיאה בחיפוש — נסה שוב');
    } finally { setLoading(false); }
  }

  function buildWaContactLink() {
    if (!storeWhatsApp) return null;
    const text = encodeURIComponent(`שלום! אני רוצה לברר לגבי מכשיר בתיקון — מספר קריאה: ${ticketId}`);
    return `https://wa.me/${storeWhatsApp}?text=${text}`;
  }

  const display = result ? STATUS_DISPLAY[result.status] : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Minimal navbar */}
      <header style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'var(--text)', fontWeight: 700, fontSize: 18 }}>דור הסלולר</Link>
        <span className="muted" style={{ fontSize: 13 }}>/ מעקב תיקון</span>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, textAlign: 'center' }}>בדוק סטטוס תיקון</h1>
          <p className="muted" style={{ textAlign: 'center', fontSize: 14, marginBottom: 32 }}>
            הכנס את מספר הקריאה שקיבלת בעת מסירת המכשיר
          </p>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
            <input
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              placeholder="מספר קריאה (לדוגמה: REP-0042)"
              style={{ flex: '1 1 180px', minWidth: 0, padding: '12px 16px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface-2)', fontSize: 15, fontFamily: 'inherit' }}
              autoFocus
            />
            <button type="submit" disabled={loading || !ticketId.trim()} style={{ flex: '0 0 auto', padding: '12px 24px', fontSize: 15, fontWeight: 700, borderRadius: 10 }}>
              {loading ? '...' : 'חפש'}
            </button>
          </form>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 18px', color: '#dc2626', fontSize: 14, textAlign: 'center' }}>
              ⚠ {error}
            </div>
          )}

          {result && display && (
            <div style={{ background: display.bg, border: `1.5px solid ${display.color}22`, borderRadius: 14, padding: '28px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>{display.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: display.color, marginBottom: 8 }}>{display.label}</div>

              {result.deviceBrand && (
                <div style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 16 }}>
                  {result.deviceBrand} {result.deviceModel}
                </div>
              )}

              {result.faultDescription && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, fontStyle: 'italic' }}>
                  "{result.faultDescription}"
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
                {result.createdAt && <span>📅 התקבל: {new Date(result.createdAt).toLocaleDateString('he-IL')}</span>}
                {result.updatedAt && <span>🔄 עדכון אחרון: {new Date(result.updatedAt).toLocaleDateString('he-IL')}</span>}
              </div>

              {buildWaContactLink() && (
                <a
                  href={buildWaContactLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-block', background: '#25d366', color: '#fff', borderRadius: 10, padding: '11px 24px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
                >
                  💬 קבל עדכון ב-WhatsApp
                </a>
              )}
            </div>
          )}
        </div>
      </main>

      <footer style={{ padding: '16px 20px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
        <span className="muted" style={{ fontSize: 13 }}>© {new Date().getFullYear()} דור הסלולר</span>
      </footer>
    </div>
  );
}
