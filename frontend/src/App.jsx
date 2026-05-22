import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

function StaffOnlyRoute({ children }) {
  const { user } = useAuth();
  if (user?.role === 'customer') return <Navigate to="/orders" replace />;
  return children;
}
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

export default function App() {
  const { loading } = useAuth();
  if (loading) return <div className="login-shell"><div className="login-card">טוען…</div></div>;

  return (
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
  );
}
