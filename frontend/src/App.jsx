import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Storefront from './pages/Storefront.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import Orders from './pages/Orders.jsx';
import Repairs from './pages/Repairs.jsx';
import CustomersPage from './pages/Customers.jsx';
import SuppliersPage from './pages/Suppliers.jsx';
import UsersPage from './pages/Users.jsx';
import Profile from './pages/Profile.jsx';
import SettingsPage from './pages/Settings.jsx';
import RepairTracker from './pages/RepairTracker.jsx';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('ErrorBoundary caught:', error, info); }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: 24, color: '#fff', background: '#0a0a0a', minHeight: '100vh', direction: 'rtl' }}>
        <h2>שגיאה</h2>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{String(this.state.error)}</pre>
        <button onClick={() => window.location.reload()} style={{ background: '#d41f1f', color: '#fff', border: 0, padding: '8px 16px', borderRadius: 8, marginTop: 12 }}>
          טען מחדש
        </button>
      </div>
    );
    return this.props.children;
  }
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    // Primary reset — fires before the browser paints.
    window.scrollTo(0, 0);
    // Backup reset one animation frame later — catches any post-render scroll manipulation
    // by external scripts (e.g. Google GIS closing its One Tap overlay).
    const raf = requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => cancelAnimationFrame(raf);
  }, [pathname]);
  return null;
}

function PwaUpdateModal({ onUpdate }) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // Trigger the update immediately — no user action needed
    onUpdate();
    const t = setTimeout(() => setTimedOut(true), 30000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.82)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      direction: 'rtl',
    }}>
      <div style={{
        background: 'var(--surface, #161616)',
        border: '1px solid rgba(212,31,31,0.35)',
        borderRadius: 16,
        padding: '36px 44px',
        textAlign: 'center',
        boxShadow: '0 8px 48px rgba(0,0,0,0.7)',
        minWidth: 260, maxWidth: '88vw',
      }}>
        {timedOut ? (
          <>
            <div style={{ fontSize: 30, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #f0f0f0)', marginBottom: 8 }}>
              העדכון לקח יותר מהצפוי
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 20 }}>
              אפשר לרענן ידנית כדי להמשיך
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{ background: '#d41f1f', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
            >
              רענן עכשיו
            </button>
          </>
        ) : (
          <>
            <div className="pwa-spinner" />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text, #f0f0f0)', marginTop: 20, marginBottom: 6 }}>
              מתקינה גרסה חדשה…
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
              הדף יתרענן אוטומטית
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StaffOnlyRoute({ children }) {
  const { user } = useAuth();
  if (user?.role === 'customer') return <Navigate to="/orders" replace />;
  return children;
}

export default function App() {
  const { loading } = useAuth();
  useRegisterSW();

  if (loading) return <div className="login-shell"><div className="login-card">טוען…</div></div>;

  return (
    <>
    <ScrollToTop />
    <ErrorBoundary>
    <Routes>
      {/* Public */}
      <Route path="/" element={<Storefront />} />
      <Route path="/shop" element={<Storefront />} />
      <Route path="/login" element={<Login />} />
      <Route path="/track" element={<RepairTracker />} />

      {/* Authenticated */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<StaffOnlyRoute><Dashboard /></StaffOnlyRoute>} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/products" element={<StaffOnlyRoute><Products /></StaffOnlyRoute>} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/repairs" element={<StaffOnlyRoute><Repairs /></StaffOnlyRoute>} />
        <Route path="/customers" element={<StaffOnlyRoute><CustomersPage /></StaffOnlyRoute>} />
        <Route path="/suppliers" element={<StaffOnlyRoute><SuppliersPage /></StaffOnlyRoute>} />
        <Route path="/users" element={<StaffOnlyRoute><UsersPage /></StaffOnlyRoute>} />
        <Route path="/settings" element={<StaffOnlyRoute><SettingsPage /></StaffOnlyRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ErrorBoundary>
    </>
  );
}
