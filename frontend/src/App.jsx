import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React, { useEffect, useLayoutEffect, useState, Suspense, lazy } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Lazy-load every page so the initial bundle stays small.
// React splits each into its own chunk — loaded only when first navigated to.
const Storefront    = lazy(() => import('./pages/Storefront.jsx'));
const Login         = lazy(() => import('./pages/Login.jsx'));
const Dashboard     = lazy(() => import('./pages/Dashboard.jsx'));
const Products      = lazy(() => import('./pages/Products.jsx'));
const Orders        = lazy(() => import('./pages/Orders.jsx'));
const Repairs       = lazy(() => import('./pages/Repairs.jsx'));
const CustomersPage = lazy(() => import('./pages/Customers.jsx'));
const SuppliersPage = lazy(() => import('./pages/Suppliers.jsx'));
const UsersPage     = lazy(() => import('./pages/Users.jsx'));
const Profile       = lazy(() => import('./pages/Profile.jsx'));
const SettingsPage  = lazy(() => import('./pages/Settings.jsx'));
const RepairTracker = lazy(() => import('./pages/RepairTracker.jsx'));

// ── Error boundary ────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('ErrorBoundary caught:', error, info); }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: 24, color: '#fff', background: '#0a0a0a', minHeight: '100vh', direction: 'rtl' }}>
        <h2>שגיאה</h2>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{String(this.state.error)}</pre>
        <button onClick={() => window.location.reload()} style={{ background: '#f97316', color: '#fff', border: 0, padding: '8px 16px', borderRadius: 8, marginTop: 12 }}>
          טען מחדש
        </button>
      </div>
    );
    return this.props.children;
  }
}

// ── Scroll restoration ────────────────────────────────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const raf = requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => cancelAnimationFrame(raf);
  }, [pathname]);
  return null;
}

// ── Cold-start overlay ────────────────────────────────────────────────────
// Shown when the auth bootstrap (first API call) takes more than 2.5 s,
// which means Render's free tier is warming up from sleep.
function WakeUpOverlay() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="wakeup-overlay">
      <div className="wakeup-overlay__inner">
        <div className="wakeup-overlay__icon">📱</div>
        <div className="pwa-spinner" />
        <div className="wakeup-overlay__title">מעיר את השרת{dots}</div>
        <div className="wakeup-overlay__sub">
          הטעינה הראשונה אחרי תקופת שקט<br />לוקחת עד 30 שניות
        </div>
        <div className="wakeup-overlay__bar" />
      </div>
    </div>
  );
}

// ── Suspense fallback (between page navigations) ──────────────────────────
function PageFallback() {
  return (
    <div className="login-shell">
      <div className="login-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div className="pwa-spinner" />
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>טוען…</span>
      </div>
    </div>
  );
}

// ── Role guards ───────────────────────────────────────────────────────────
function StaffOnlyRoute({ children }) {
  const { user } = useAuth();
  if (user?.role === 'customer') return <Navigate to="/orders" replace />;
  return children;
}

function AdminOnlyRoute({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

// ── Keep-alive ────────────────────────────────────────────────────────────
// Render free tier sleeps after 15 min of inactivity. Ping /health every
// 10 min so the server stays warm while anyone has the tab open.
function useKeepAlive() {
  useEffect(() => {
    const ping = () => fetch('/api/health').catch(() => {});
    const id = setInterval(ping, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
}

// ── PWA update banner ─────────────────────────────────────────────────────
function UpdateBanner({ onUpdate }) {
  return (
    <div style={{
      position: 'fixed', bottom: 16, insetInlineStart: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, background: 'var(--surface-1)', border: '1px solid var(--border)',
      borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.35)',
      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px',
      fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap',
    }}>
      <span>🔄 גרסה חדשה זמינה</span>
      <button onClick={onUpdate} style={{ padding: '6px 16px', fontWeight: 700, fontSize: 13 }}>עדכן עכשיו</button>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const { loading } = useAuth();
  const [showWakeUp, setShowWakeUp] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const { updateServiceWorker } = useRegisterSW({ onNeedRefresh() { setShowUpdate(true); } });
  useKeepAlive();

  // After 2.5 s of auth loading, assume cold start and show the branded overlay.
  useEffect(() => {
    if (!loading) { setShowWakeUp(false); return; }
    const t = setTimeout(() => setShowWakeUp(true), 2500);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading) return showWakeUp ? <WakeUpOverlay /> : <PageFallback />;

  return (
    <>
      {showUpdate && <UpdateBanner onUpdate={() => updateServiceWorker(true)} />}
      <ScrollToTop />
      <ErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public */}
            <Route path="/"      element={<Storefront />} />
            <Route path="/shop"  element={<Storefront />} />
            <Route path="/login" element={<Login />} />
            <Route path="/track" element={<RepairTracker />} />

            {/* Authenticated */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<StaffOnlyRoute><Dashboard /></StaffOnlyRoute>} />
              <Route path="/profile"   element={<Profile />} />
              <Route path="/products"  element={<StaffOnlyRoute><Products /></StaffOnlyRoute>} />
              <Route path="/orders"    element={<Orders />} />
              <Route path="/repairs"   element={<StaffOnlyRoute><Repairs /></StaffOnlyRoute>} />
              <Route path="/customers" element={<StaffOnlyRoute><CustomersPage /></StaffOnlyRoute>} />
              <Route path="/suppliers" element={<AdminOnlyRoute><SuppliersPage /></AdminOnlyRoute>} />
              <Route path="/users"     element={<AdminOnlyRoute><UsersPage /></AdminOnlyRoute>} />
              <Route path="/settings"  element={<AdminOnlyRoute><SettingsPage /></AdminOnlyRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
