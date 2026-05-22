import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice.js';
import { loadOrdersIfStale, selectAllOrders } from '../store/slices/ordersSlice.js';
import { loadRepairsIfStale, selectAllRepairs } from '../store/slices/repairsSlice.js';

function greeting(name = '') {
  const h = new Date().getHours();
  if (h < 12) return `בוקר טוב, ${name} ☀️`;
  if (h < 17) return `צהריים טובים, ${name} 👋`;
  return `ערב טוב, ${name} 🌙`;
}

function buildWhatsAppLink(phone, order) {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, '');
  const intl = clean.startsWith('0') ? '972' + clean.slice(1) : clean;
  const items = (order.items || []).map((i) => `• ${i.name} ×${i.quantity ?? i.qty ?? 1}`).join('\n');
  const text = encodeURIComponent(`שלום! קיבלנו את הזמנתך:\n${items}\nניצור קשר בקרוב לתיאום משלוח/איסוף. תודה! 🙏`);
  return `https://wa.me/${intl}?text=${text}`;
}

function KpiCard({ label, value, to, color }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ padding: '20px 24px', borderInlineStart: `4px solid ${color}`, cursor: 'pointer' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 38, fontWeight: 800, color }}>{value}</div>
      </div>
    </Link>
  );
}

function OrderRow({ order }) {
  const customerPhone = order.customerPhone || order.customer?.phone;
  const customerName  = order.customerName  || order.customer?.name || 'לקוח';
  const waLink = buildWhatsAppLink(customerPhone, order);
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString('he-IL') : '';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 120 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{customerName}</div>
        <div className="muted" style={{ fontSize: 12 }}>{dateStr} · {(order.items || []).length} פריטים</div>
      </div>
      {customerPhone && (
        <a href={`tel:${customerPhone}`} className="btn-ghost" style={{ fontSize: 13, padding: '5px 10px' }}>📞 {customerPhone}</a>
      )}
      {waLink && (
        <a href={waLink} target="_blank" rel="noopener noreferrer"
          style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          WhatsApp ↗
        </a>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const orders  = useSelector(selectAllOrders);
  const repairs = useSelector(selectAllRepairs);

  useEffect(() => { dispatch(loadOrdersIfStale()); }, [dispatch]);
  useEffect(() => { dispatch(loadRepairsIfStale()); }, [dispatch]);

  const newOrders   = orders.filter((o) => o.status === 'new' || o.status === 'draft' || !o.status);
  const openRepairs = repairs.filter((r) => r.status !== 'delivered' && r.status !== 'cancelled');
  const recentNew   = newOrders.slice(0, 5);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          {greeting(currentUser?.name?.split(' ')[0])}
        </h2>
        <div className="muted" style={{ fontSize: 14 }}>הנה מה שמחכה לך היום</div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 28 }}>
        <KpiCard label="הזמנות חדשות"   value={newOrders.length}   to="/orders"  color="var(--brand-primary)" />
        <KpiCard label="תיקונים פתוחים" value={openRepairs.length} to="/repairs" color="#f59e0b" />
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        <Link to="/products"><button style={{ fontSize: 14 }}>+ הוסף מוצר</button></Link>
        <Link to="/repairs"><button className="btn-secondary" style={{ fontSize: 14 }}>+ תיקון חדש</button></Link>
        <Link to="/orders"><button className="btn-secondary" style={{ fontSize: 14 }}>כל ההזמנות →</button></Link>
      </div>

      {/* Recent new orders */}
      <div className="card" style={{ padding: '20px 20px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong style={{ fontSize: 15 }}>הזמנות שטרם טופלו</strong>
          <Link to="/orders" className="muted" style={{ fontSize: 13 }}>הכל →</Link>
        </div>
        {recentNew.length === 0 ? (
          <div className="muted" style={{ padding: '16px 0', textAlign: 'center', fontSize: 14 }}>אין הזמנות חדשות 🎉</div>
        ) : (
          recentNew.map((order) => <OrderRow key={order._id} order={order} />)
        )}
      </div>
    </div>
  );
}
