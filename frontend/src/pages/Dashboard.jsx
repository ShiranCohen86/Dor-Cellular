import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice.js';
import { Reports, Orders, Repairs } from '../api/client.js';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';

// ─── shared helpers ────────────────────────────────────────────────────────

function KpiCard({ label, value, accent, to }) {
  const content = (
    <>
      {accent && <div className="kpi__accent" style={{ background: accent }} />}
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </>
  );
  if (to) {
    return <Link to={to} className="kpi kpi--link">{content}</Link>;
  }
  return <div className="kpi">{content}</div>;
}

function DashGreeting({ name, subtitle }) {
  const { t } = useTranslation();
  return (
    <div className="dash-greeting">
      <h2>{t('dashboard.greeting', { name: name?.split(' ')[0] })}</h2>
      <p className="muted">{subtitle}</p>
    </div>
  );
}

const REPAIR_BADGE = {
  received: 'info', diagnosed: 'warning', waiting_for_parts: 'warning',
  in_repair: 'info', ready: 'success', delivered: '', cancelled: 'danger',
};

// ─── Admin dashboard ───────────────────────────────────────────────────────

function AdminDashboard() {
  const { t } = useTranslation();
  const currentUser = useSelector(selectCurrentUser);
  const [summary, setSummary] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    async function loadAdminData() {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
        const [dashboardSummary, salesResult, bestSellersResult, employeesResult] = await Promise.all([
          Reports.dashboard(),
          Reports.dailySales({ from: thirtyDaysAgo }),
          Reports.bestSellers({ limit: 5 }),
          Reports.employees({ limit: 5 }),
        ]);
        setSummary(dashboardSummary);
        setSalesData(salesResult.items.map((item) => ({ date: item._id, revenue: item.revenue })));
        setBestSellers(bestSellersResult.items);
        setEmployees(employeesResult.items || []);
      } catch (error) {
        console.error('[AdminDashboard] Failed to load dashboard data:', error);
      }
    }
    loadAdminData();
  }, []);

  if (!summary) return <div className="muted">{t('common.loading')}</div>;

  return (
    <div className="dash-layout">
      <DashGreeting name={currentUser?.name} subtitle={t('dashboard.adminSubtitle')} />

      <div className="kpi-grid">
        <KpiCard label={t('dashboard.todayRevenue')} value={`₪${summary.todayRevenue.toLocaleString('he-IL')}`} accent="#2563eb" to="/orders" />
        <KpiCard label={t('dashboard.todayOrders')}  value={summary.todayOrders}   accent="#16a34a" to="/orders" />
        <KpiCard label={t('dashboard.openRepairs')}  value={summary.openRepairs}   accent="#f59e0b" to="/repairs" />
        <KpiCard label={t('dashboard.lowStock')}     value={summary.lowStockCount} accent="#dc2626" to="/products?lowStock=true" />
        <KpiCard label={t('dashboard.customers')}    value={summary.customerCount} accent="#7c3aed" to="/customers" />
      </div>

      <div className="dash-row">
        <div className="card dash-chart-card">
          <h3>{t('dashboard.recentSales')}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3254" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => `₪${value.toLocaleString('he-IL')}`} contentStyle={{ background: '#162032', border: '1px solid #1e3254', color: '#e2e8f0' }} />
              <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card dash-chart-card">
          <h3>{t('reports.bestSellers')}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={bestSellers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3254" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="qty" fill="#16a34a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {employees.length > 0 && (
        <div className="card">
          <h3>{t('dashboard.employeePerfTitle')}</h3>
          <table>
            <thead>
              <tr>
                <th>{t('dashboard.employee')}</th>
                <th>{t('reports.orders')}</th>
                <th>{t('reports.revenue')}</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.employeeId}>
                  <td>{employee.name}</td>
                  <td>{employee.orderCount}</td>
                  <td>₪{employee.totalRevenue?.toLocaleString('he-IL')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="dash-quicklinks">
        <Link to="/users"     className="dash-quicklink dash-quicklink--blue">👥 {t('nav.users')}</Link>
        <Link to="/branches"  className="dash-quicklink dash-quicklink--slate">🏢 {t('nav.branches')}</Link>
        <Link to="/suppliers" className="dash-quicklink dash-quicklink--green">📦 {t('nav.suppliers')}</Link>
        <Link to="/reports"   className="dash-quicklink dash-quicklink--purple">📊 {t('nav.reports')}</Link>
        <Link to="/products"  className="dash-quicklink dash-quicklink--orange">📱 {t('nav.products')}</Link>
        <Link to="/customers" className="dash-quicklink dash-quicklink--teal">👤 {t('nav.customers')}</Link>
      </div>
    </div>
  );
}

// ─── Manager dashboard ─────────────────────────────────────────────────────

function ManagerDashboard() {
  const { t } = useTranslation();
  const currentUser = useSelector(selectCurrentUser);
  const [summary, setSummary] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);

  useEffect(() => {
    async function loadManagerData() {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
        const [dashboardSummary, salesResult, bestSellersResult] = await Promise.all([
          Reports.dashboard(),
          Reports.dailySales({ from: thirtyDaysAgo }),
          Reports.bestSellers({ limit: 5 }),
        ]);
        setSummary(dashboardSummary);
        setSalesData(salesResult.items.map((item) => ({ date: item._id, revenue: item.revenue })));
        setBestSellers(bestSellersResult.items);
      } catch (error) {
        console.error('[ManagerDashboard] Failed to load dashboard data:', error);
      }
    }
    loadManagerData();
  }, []);

  if (!summary) return <div className="muted">{t('common.loading')}</div>;

  return (
    <div className="dash-layout">
      <DashGreeting name={currentUser?.name} subtitle={t('dashboard.managerSubtitle')} />

      <div className="kpi-grid">
        <KpiCard label={t('dashboard.todayRevenue')} value={`₪${summary.todayRevenue.toLocaleString('he-IL')}`} accent="#2563eb" to="/orders" />
        <KpiCard label={t('dashboard.todayOrders')}  value={summary.todayOrders}   accent="#16a34a" to="/orders" />
        <KpiCard label={t('dashboard.openRepairs')}  value={summary.openRepairs}   accent="#f59e0b" to="/repairs" />
        <KpiCard label={t('dashboard.lowStock')}     value={summary.lowStockCount} accent="#dc2626" to="/products?lowStock=true" />
        <KpiCard label={t('dashboard.customers')}    value={summary.customerCount} accent="#7c3aed" to="/customers" />
      </div>

      <div className="dash-row">
        <div className="card dash-chart-card">
          <h3>{t('dashboard.recentSales')}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3254" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => `₪${value.toLocaleString('he-IL')}`} contentStyle={{ background: '#162032', border: '1px solid #1e3254', color: '#e2e8f0' }} />
              <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card dash-chart-card">
          <h3>{t('reports.bestSellers')}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={bestSellers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3254" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="qty" fill="#16a34a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dash-quicklinks">
        <Link to="/pos"       className="dash-quicklink dash-quicklink--blue">🛒 {t('nav.pos')}</Link>
        <Link to="/products"  className="dash-quicklink dash-quicklink--orange">📱 {t('nav.products')}</Link>
        <Link to="/orders"    className="dash-quicklink dash-quicklink--green">📋 {t('nav.orders')}</Link>
        <Link to="/repairs"   className="dash-quicklink dash-quicklink--yellow">🔧 {t('nav.repairs')}</Link>
        <Link to="/customers" className="dash-quicklink dash-quicklink--teal">👤 {t('nav.customers')}</Link>
        <Link to="/reports"   className="dash-quicklink dash-quicklink--purple">📊 {t('nav.reports')}</Link>
      </div>
    </div>
  );
}

// ─── Salesperson dashboard ─────────────────────────────────────────────────

function SalespersonDashboard() {
  const { t } = useTranslation();
  const currentUser = useSelector(selectCurrentUser);
  const [summary, setSummary] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    async function loadSalespersonData() {
      try {
        const [dashboardSummary, ordersResult] = await Promise.all([
          Reports.dashboard(),
          Orders.list({ limit: 8 }),
        ]);
        setSummary(dashboardSummary);
        setRecentOrders(ordersResult.items || []);
      } catch (error) {
        console.error('[SalespersonDashboard] Failed to load dashboard data:', error);
      }
    }
    loadSalespersonData();
  }, []);

  return (
    <div className="dash-layout">
      <DashGreeting name={currentUser?.name} subtitle={t('dashboard.salespersonSubtitle')} />

      <Link to="/pos" className="dash-pos-btn">
        🛒 {t('dashboard.posButton')}
      </Link>

      {summary && (
        <div className="kpi-grid">
          <KpiCard label={t('dashboard.todayOrders')}  value={summary.todayOrders}   accent="#16a34a" to="/orders" />
          <KpiCard label={t('dashboard.todayRevenue')} value={`₪${summary.todayRevenue.toLocaleString('he-IL')}`} accent="#2563eb" to="/orders" />
          <KpiCard label={t('dashboard.openRepairs')}  value={summary.openRepairs}   accent="#f59e0b" to="/repairs" />
          <KpiCard label={t('dashboard.customers')}    value={summary.customerCount} accent="#7c3aed" to="/customers" />
        </div>
      )}

      <div className="card">
        <h3>{t('dashboard.recentOrders')}</h3>
        {recentOrders.length === 0 ? (
          <p className="muted">{t('dashboard.noOrdersToday')}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{t('dashboard.customerColumn')}</th>
                <th>{t('common.total')}</th>
                <th>{t('dashboard.paymentMethod')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.date')}</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order._id}>
                  <td style={{ fontSize: 12, color: '#64748b' }}>{order._id.slice(-6)}</td>
                  <td>{order.customerId?.name || t('pos.noCustomer')}</td>
                  <td>₪{order.totalAmount?.toLocaleString('he-IL')}</td>
                  <td>{order.payments?.[0]?.method || '—'}</td>
                  <td>
                    <span className={`badge ${order.status === 'completed' ? 'success' : ''}`}>
                      {t(`orders.statuses.${order.status}`) || order.status}
                    </span>
                  </td>
                  <td>{new Date(order.createdAt).toLocaleDateString('he-IL')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="dash-quicklinks">
        <Link to="/customers" className="dash-quicklink dash-quicklink--teal">👤 {t('nav.customers')}</Link>
        <Link to="/products"  className="dash-quicklink dash-quicklink--orange">📱 {t('nav.products')}</Link>
        <Link to="/repairs"   className="dash-quicklink dash-quicklink--yellow">🔧 {t('nav.repairs')}</Link>
        <Link to="/orders"    className="dash-quicklink dash-quicklink--green">📋 {t('nav.orders')}</Link>
      </div>
    </div>
  );
}

// ─── Technician dashboard ──────────────────────────────────────────────────

function TechnicianDashboard() {
  const { t } = useTranslation();
  const currentUser = useSelector(selectCurrentUser);
  const [repairsList, setRepairsList] = useState([]);

  useEffect(() => {
    async function loadTechnicianData() {
      try {
        const repairsResult = await Repairs.list({ limit: 30 });
        setRepairsList(repairsResult.items || []);
      } catch (error) {
        console.error('[TechnicianDashboard] Failed to load repairs:', error);
      }
    }
    loadTechnicianData();
  }, []);

  const openRepairs = repairsList.filter((repair) => !['delivered', 'cancelled'].includes(repair.status));
  const countByStatus = openRepairs.reduce((counts, repair) => {
    counts[repair.status] = (counts[repair.status] || 0) + 1;
    return counts;
  }, {});

  return (
    <div className="dash-layout">
      <DashGreeting name={currentUser?.name} subtitle={t('dashboard.technicianSubtitle')} />

      <div className="kpi-grid">
        <KpiCard label={t('dashboard.totalOpen')}            value={openRepairs.length}                    accent="#2563eb" to="/repairs" />
        <KpiCard label={t('repairs.in_repair')}              value={countByStatus.in_repair      || 0}    accent="#f59e0b" to="/repairs" />
        <KpiCard label={t('repairs.waiting_for_parts')}      value={countByStatus.waiting_for_parts || 0} accent="#dc2626" to="/repairs" />
        <KpiCard label={t('repairs.ready')}                  value={countByStatus.ready          || 0}    accent="#16a34a" to="/repairs" />
      </div>

      <div className="card">
        <h3>{t('dashboard.openRepairsTitle')}</h3>
        {openRepairs.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', padding: '24px 0' }}>
            {t('dashboard.noOpenRepairs')}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{t('dashboard.customerColumn')}</th>
                <th>{t('repairs.device')}</th>
                <th>{t('repairs.fault')}</th>
                <th>{t('common.status')}</th>
                <th>{t('repairs.estimatedCost')}</th>
              </tr>
            </thead>
            <tbody>
              {openRepairs.map((repair) => (
                <tr key={repair._id}>
                  <td style={{ fontWeight: 600, fontSize: 12 }}>{repair.ticketNumber}</td>
                  <td>{repair.customerId?.name || '—'}</td>
                  <td>{repair.deviceBrand} {repair.deviceModel}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {repair.faultDescription}
                  </td>
                  <td>
                    <span className={`badge ${REPAIR_BADGE[repair.status] || ''}`}>
                      {t(`repairs.${repair.status}`)}
                    </span>
                  </td>
                  <td>{repair.estimatedCost ? `₪${repair.estimatedCost}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="dash-quicklinks">
        <Link to="/repairs"   className="dash-quicklink dash-quicklink--yellow">🔧 {t('nav.repairs')}</Link>
        <Link to="/customers" className="dash-quicklink dash-quicklink--teal">👤 {t('nav.customers')}</Link>
        <Link to="/products"  className="dash-quicklink dash-quicklink--orange">📱 {t('nav.products')}</Link>
      </div>
    </div>
  );
}

// ─── Router ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const currentUser = useSelector(selectCurrentUser);
  if (!currentUser) return null;
  if (currentUser.role === 'admin')       return <AdminDashboard />;
  if (currentUser.role === 'manager')     return <ManagerDashboard />;
  if (currentUser.role === 'salesperson') return <SalespersonDashboard />;
  if (currentUser.role === 'technician')  return <TechnicianDashboard />;
  return <ManagerDashboard />;
}
