import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice.js';
import { loadOrdersIfStale, selectAllOrders } from '../store/slices/ordersSlice.js';
import { loadRepairsIfStale, selectAllRepairs } from '../store/slices/repairsSlice.js';
import { buildWaLink } from '../utils/whatsapp.js';
import EmptyState from '../components/ui/EmptyState.jsx';

function greeting(name = '') {
  const h = new Date().getHours();
  if (h < 12) return `בוקר טוב, ${name} ☀️`;
  if (h < 17) return `צהריים טובים, ${name} 👋`;
  return `ערב טוב, ${name} 🌙`;
}

function KpiCard({ label, value, to, color }) {
  return (
    <Link to={to} className="kpi kpi--link" style={{ borderInlineStart: `4px solid ${color}` }}>
      <div className="label">{label}</div>
      <div className="value" style={{ color }}>{value}</div>
    </Link>
  );
}

function OrderRow({ order }) {
  const phone = order.customerPhone || order.customer?.phone;
  const name  = order.customerName  || order.customer?.name || 'לקוח';
  const date  = order.createdAt ? new Date(order.createdAt).toLocaleDateString('he-IL') : '';
  const waLink = buildWaLink(phone, order);

  return (
    <div className="order-card__row" style={{ borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
      <div className="order-card__info">
        <div className="order-card__name">{name}</div>
        <div className="order-card__meta">{date} · {(order.items || []).length} פריטים</div>
      </div>
      <div className="order-card__actions">
        {phone && (
          <a href={`tel:${phone}`} className="btn-ghost" style={{ fontSize: 13, padding: '5px 10px' }}>
            📞 {phone}
          </a>
        )}
        {waLink && (
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="wa-btn">
            WhatsApp ↗
          </a>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const dispatch    = useDispatch();
  const navigate    = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const orders      = useSelector(selectAllOrders);
  const repairs     = useSelector(selectAllRepairs);

  useEffect(() => { dispatch(loadOrdersIfStale()); }, [dispatch]);
  useEffect(() => { dispatch(loadRepairsIfStale()); }, [dispatch]);

  const newOrders   = orders.filter((o) => o.status === 'new' || o.status === 'draft' || !o.status);
  const openRepairs = repairs.filter((r) => r.status !== 'delivered' && r.status !== 'cancelled');
  const recentNew   = newOrders.slice(0, 5);

  return (
    <div className="page">
      {/* Greeting */}
      <div className="page-header">
        <div className="page-header__left">
          <h2 className="page-header__title">{greeting(currentUser?.name?.split(' ')[0])}</h2>
          <p className="page-header__sub">הנה מה שמחכה לך היום</p>
        </div>
        <div className="page-header__actions">
          <button onClick={() => navigate('/products?new=1')} style={{ fontSize: 14 }}>+ הוסף מוצר</button>
          <button className="btn-secondary" onClick={() => navigate('/repairs?new=1')} style={{ fontSize: 14 }}>+ תיקון חדש</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard label="הזמנות חדשות"   value={newOrders.length}   to="/orders"  color="var(--brand-primary)" />
        <KpiCard label="תיקונים פתוחים" value={openRepairs.length} to="/repairs" color="var(--brand-accent)" />
      </div>

      {/* Recent new orders */}
      <div className="card" style={{ padding: '20px 20px 8px' }}>
        <div className="section-header">
          <span className="section-header__title">הזמנות שטרם טופלו</span>
          <Link to="/orders" className="section-header__link">הכל →</Link>
        </div>

        {recentNew.length === 0 ? (
          <EmptyState icon="🎉" title="אין הזמנות חדשות" />
        ) : (
          recentNew.map((order) => <OrderRow key={order._id} order={order} />)
        )}
      </div>
    </div>
  );
}
