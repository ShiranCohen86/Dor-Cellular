import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Storefront from './pages/Storefront.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import POS from './pages/POS.jsx';
import Orders from './pages/Orders.jsx';
import Repairs from './pages/Repairs.jsx';
import CustomersPage from './pages/Customers.jsx';
import SuppliersPage from './pages/Suppliers.jsx';
import ReportsPage from './pages/Reports.jsx';
import NotificationsPage from './pages/Notifications.jsx';
import BranchesPage from './pages/Branches.jsx';
import UsersPage from './pages/Users.jsx';
import Profile from './pages/Profile.jsx';
import SettingsPage from './pages/Settings.jsx';
import AuditLogs from './pages/AuditLogs.jsx';
import AIAssistant from './pages/AIAssistant.jsx';

export default function App() {
  const { loading } = useAuth();
  if (loading) return <div className="login-shell"><div className="login-card">Loading…</div></div>;

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Storefront />} />
      <Route path="/shop" element={<Storefront />} />
      <Route path="/login" element={<Login />} />

      {/* Authenticated */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/products" element={<Products />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/repairs" element={<Repairs />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/branches" element={<BranchesPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
