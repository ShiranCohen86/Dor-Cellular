import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
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

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function UpdateBanner() {
  const [show, setShow] = useState(() => {
    if (localStorage.getItem('app-just-updated')) {
      localStorage.removeItem('app-just-updated');
      return true;
    }
    return false;
  });
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 4000);
    return () => clearTimeout(t);
  }, [show]);
  if (!show) return null;
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      background: '#8b5cf6', color: '#fff', padding: '10px 22px',
      borderRadius: 10, fontWeight: 600, fontSize: 14, zIndex: 9999,
      boxShadow: '0 4px 20px rgba(0,0,0,.35)', animation: 'fade-up .3s ease',
      whiteSpace: 'nowrap',
    }}>
      ✓ האפליקציה עודכנה לגרסה חדשה
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
  if (loading) return <div className="login-shell"><div className="login-card">טוען…</div></div>;

  return (
    <>
    <UpdateBanner />
    <ScrollToTop />
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
    </>
  );
}
