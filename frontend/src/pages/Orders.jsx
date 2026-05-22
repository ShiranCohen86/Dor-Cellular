import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadOrdersIfStale, selectAllOrders } from '../store/slices/ordersSlice.js';
import { buildWaLink } from '../utils/whatsapp.js';
import EmptyState from '../components/ui/EmptyState.jsx';

const HANDLED_KEY = 'dor_handled_orders';

function loadHandled() {
  try { return new Set(JSON.parse(localStorage.getItem(HANDLED_KEY) || '[]')); }
  catch { return new Set(); }
}

function saveHandled(set) {
  localStorage.setItem(HANDLED_KEY, JSON.stringify([...set]));
}

const FILTERS = [
  { key: 'new',     label: 'חדשות' },
  { key: 'handled', label: 'טופלו' },
  { key: 'all',     label: 'הכל' },
];

export default function Orders() {
  const dispatch = useDispatch();
  const orders   = useSelector(selectAllOrders);
  const [filter,  setFilter]  = useState('new');
  const [handled, setHandled] = useState(loadHandled);

  useEffect(() => { dispatch(loadOrdersIfStale()); }, [dispatch]);

  function toggleHandled(id) {
    setHandled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveHandled(next);
      return next;
    });
  }

  const isHandled = (o) => handled.has(o._id);
  const newCount  = orders.filter((o) => !isHandled(o)).length;

  const visible = useMemo(() => {
    if (filter === 'new')     return orders.filter((o) => !isHandled(o));
    if (filter === 'handled') return orders.filter((o) =>  isHandled(o));
    return orders;
  }, [orders, handled, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const emptyMsg = filter === 'new' ? 'אין הזמנות חדשות 🎉' : 'אין הזמנות להציג';

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header__left">
          <h2 className="page-header__title">הזמנות</h2>
        </div>
      </div>

      {/* Filter chips */}
      <div className="toolbar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={filter === f.key ? '' : 'btn-secondary'}
            style={{ fontSize: 13 }}
          >
            {f.label}
            {f.key === 'new' && newCount > 0 && (
              <span className="badge" style={{ marginInlineStart: 6, background: 'var(--brand-primary)', color: '#fff' }}>
                {newCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState icon="🎉" title={emptyMsg} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visible.map((order) => {
            const phone  = order.customerPhone || order.customer?.phone;
            const name   = order.customerName  || order.customer?.name || 'לקוח';
            const date   = order.createdAt ? new Date(order.createdAt).toLocaleDateString('he-IL') : '';
            const waLink = buildWaLink(phone, order);
            const done   = isHandled(order);

            return (
              <div key={order._id} className={`order-card${done ? ' order-card--done' : ''}`}>
                <div className="order-card__row">
                  {/* Info */}
                  <div className="order-card__info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <strong className="order-card__name">{name}</strong>
                      <span className={`badge ${done ? 'success' : 'warning'}`}>{done ? 'טופל' : 'חדש'}</span>
                    </div>
                    <div className="order-card__meta">{date}</div>
                    {phone && <div style={{ fontSize: 13, marginTop: 3 }}>📞 {phone}</div>}
                  </div>

                  {/* Items */}
                  <div className="order-card__items">
                    {(order.items || []).map((item, i) => (
                      <div key={i} style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {item.name} ×{item.quantity ?? item.qty ?? 1}
                        {item.unitPrice ? ` · ₪${item.unitPrice}` : ''}
                      </div>
                    ))}
                    {order.notes && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>{order.notes}</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="order-card__actions">
                    {waLink && (
                      <a href={waLink} target="_blank" rel="noopener noreferrer" className="wa-btn">
                        WhatsApp ↗
                      </a>
                    )}
                    <button
                      className="btn-secondary"
                      style={{ fontSize: 13, padding: '7px 14px', whiteSpace: 'nowrap' }}
                      onClick={() => toggleHandled(order._id)}
                    >
                      {done ? '↩ בטל' : '✓ טופל'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
