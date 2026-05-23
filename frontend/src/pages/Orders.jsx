import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadOrdersIfStale, selectAllOrders } from '../store/slices/ordersSlice.js';
import { selectCurrentUser } from '../store/slices/authSlice.js';
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

const BASE_FILTERS = [
  { key: 'new',     label: 'פתוחות' },
  { key: 'handled', label: 'סגורות' },
  { key: 'all',     label: 'הכל' },
];

export default function Orders() {
  const dispatch     = useDispatch();
  const orders       = useSelector(selectAllOrders);
  const currentUser  = useSelector(selectCurrentUser);
  const [filter,   setFilter]   = useState(currentUser?.role === 'admin' ? 'all' : 'new');
  const [handled,  setHandled]  = useState(loadHandled);
  const [sortDir,  setSortDir]  = useState('desc');

  // Show "my orders" tab for staff users who also have a customer record
  const showMyOrders = currentUser?.role !== 'customer' && !!currentUser?.customerId;
  const FILTERS = showMyOrders
    ? [...BASE_FILTERS, { key: 'mine', label: 'ההזמנות שלי' }]
    : BASE_FILTERS;

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
    let list = orders;
    if (filter === 'mine') {
      const myId = String(currentUser?.customerId);
      list = orders.filter((o) => String(o.customerId?._id ?? o.customerId) === myId);
    } else if (filter === 'new')     { list = orders.filter((o) => !isHandled(o)); }
    else if (filter === 'handled')   { list = orders.filter((o) =>  isHandled(o)); }
    list = [...list].sort((a, b) => {
      const diff = new Date(b.createdAt) - new Date(a.createdAt);
      return sortDir === 'desc' ? diff : -diff;
    });
    return list;
  }, [orders, handled, filter, currentUser, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  const emptyMsg = filter === 'new' ? 'אין הזמנות פתוחות 🎉' : 'אין הזמנות להציג';

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header__left">
          <h2 className="page-header__title">הזמנות</h2>
        </div>
      </div>

      {/* Filter chips + sort */}
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
        <div className="spacer-flex" />
        <button
          className="btn-secondary"
          style={{ fontSize: 13, padding: '7px 14px', whiteSpace: 'nowrap' }}
          onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
        >
          {sortDir === 'desc' ? '↓ חדש ראשון' : '↑ ישן ראשון'}
        </button>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon="🎉" title={emptyMsg} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visible.map((order) => {
            const phoneFromNotes = order.notes?.match(/טלפון:\s*(\S+)/)?.[1];
            const phone  = order.customerPhone || order.customer?.phone || phoneFromNotes;
            const name   = order.customerName  || order.customer?.name || phone || 'לקוח';
            const extraNotes = order.notes?.replace(/טלפון:\s*\S+\n?/, '').trim();
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
                      <span className={`badge ${done ? 'success' : 'warning'}`}>{done ? 'סגורה' : 'פתוחה'}</span>
                    </div>
                    <div className="order-card__meta">{date}</div>
                    {phone && (
                      <a href={`tel:${phone}`} style={{ fontSize: 14, marginTop: 4, display: 'block', color: 'var(--brand-primary)', fontWeight: 600, textDecoration: 'none' }}>
                        📞 {phone}
                      </a>
                    )}
                  </div>

                  {/* Items */}
                  <div className="order-card__items">
                    {(order.items || []).map((item, i) => (
                      <div key={i} style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {item.name} ×{item.quantity ?? item.qty ?? 1}
                        {item.unitPrice ? ` · ₪${item.unitPrice}` : ''}
                      </div>
                    ))}
                    {extraNotes && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>{extraNotes}</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="order-card__actions">
                    {waLink && (
                      <a href={waLink} target="_blank" rel="noopener noreferrer" className="wa-btn">
                        📱 WhatsApp
                      </a>
                    )}
                    <button
                      className="btn-secondary"
                      style={{ fontSize: 13, padding: '7px 14px', whiteSpace: 'nowrap' }}
                      onClick={() => toggleHandled(order._id)}
                    >
                      {done ? '↩ פתח' : '✓ סגור'}
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
