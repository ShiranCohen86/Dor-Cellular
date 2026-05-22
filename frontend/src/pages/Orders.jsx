import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadOrdersIfStale, selectAllOrders } from '../store/slices/ordersSlice.js';

const HANDLED_KEY = 'dor_handled_orders';

function loadHandled() {
  try { return new Set(JSON.parse(localStorage.getItem(HANDLED_KEY) || '[]')); }
  catch { return new Set(); }
}

function saveHandled(set) {
  localStorage.setItem(HANDLED_KEY, JSON.stringify([...set]));
}

function buildWaLink(phone, order) {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, '');
  const intl = clean.startsWith('0') ? '972' + clean.slice(1) : clean;
  const items = (order.items || []).map((i) => `• ${i.name} ×${i.quantity ?? i.qty ?? 1}`).join('\n');
  const text = encodeURIComponent(`שלום! קיבלנו את הזמנתך 🙏\n${items}\nניצור קשר לתיאום תשלום ומשלוח/איסוף.\nדור הסלולר`);
  return `https://wa.me/${intl}?text=${text}`;
}

const FILTERS = [
  { key: 'new',     label: 'חדשות' },
  { key: 'handled', label: 'טופלו' },
  { key: 'all',     label: 'הכל' },
];

export default function Orders() {
  const dispatch = useDispatch();
  const orders = useSelector(selectAllOrders);
  const [filter, setFilter]     = useState('new');
  const [handled, setHandled]   = useState(loadHandled);

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
    if (filter === 'handled') return orders.filter((o) => isHandled(o));
    return orders;
  }, [orders, handled, filter]);

  return (
    <div>
      {/* Filter chips */}
      <div className="toolbar" style={{ marginBottom: 18 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={filter === f.key ? '' : 'btn-secondary'}
            style={{ fontSize: 13 }}
          >
            {f.label}
            {f.key === 'new' && newCount > 0 && (
              <span className="badge" style={{ marginInlineStart: 6, background: 'var(--brand-primary)', color: '#fff' }}>{newCount}</span>
            )}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card muted" style={{ textAlign: 'center', padding: 40, fontSize: 15 }}>
          {filter === 'new' ? 'אין הזמנות חדשות 🎉' : 'אין הזמנות להציג'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visible.map((order) => {
            const phone   = order.customerPhone || order.customer?.phone;
            const name    = order.customerName  || order.customer?.name || 'לקוח';
            const date    = order.createdAt ? new Date(order.createdAt).toLocaleDateString('he-IL') : '';
            const waLink  = buildWaLink(phone, order);
            const done    = isHandled(order);

            return (
              <div key={order._id} className="card" style={{ padding: '16px 20px', opacity: done ? 0.6 : 1 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 16 }}>{name}</strong>
                      <span className={`badge ${done ? 'success' : 'warning'}`}>{done ? 'טופל' : 'חדש'}</span>
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>{date}</div>
                    {phone && <div style={{ fontSize: 13, marginTop: 3 }}>📞 {phone}</div>}
                  </div>

                  {/* Items */}
                  <div style={{ flex: 2, minWidth: 160 }}>
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
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {waLink && (
                      <a href={waLink} target="_blank" rel="noopener noreferrer"
                        style={{ background: '#25d366', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
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
