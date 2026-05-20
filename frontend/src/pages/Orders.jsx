/**
 * Orders list page — pulls from Redux `orders` slice (30-second cache).
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { loadOrdersIfStale, selectAllOrders } from '../store/slices/ordersSlice.js';
import { getInvoicePdfUrl } from '../api/orders.api.js';

export default function Orders() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const allOrders = useSelector(selectAllOrders);

  useEffect(() => { dispatch(loadOrdersIfStale()); }, [dispatch]);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t('orders.invoice')}</th>
            <th>{t('common.date')}</th>
            <th>{t('pos.customer')}</th>
            <th>{t('common.total')}</th>
            <th>{t('pos.paid')}</th>
            <th>{t('common.status')}</th>
            <th>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {allOrders.length === 0 ? (
            <tr><td colSpan="7" className="muted">{t('common.noData')}</td></tr>
          ) : allOrders.map((order) => (
            <tr key={order._id}>
              <td>{order.invoiceNumber}</td>
              <td>{new Date(order.createdAt).toLocaleString()}</td>
              <td>{order.customerId?.name || '—'}</td>
              <td>₪ {order.total.toFixed(2)}</td>
              <td>₪ {order.paidAmount.toFixed(2)}</td>
              <td>
                <span className={`badge ${order.status === 'completed' ? 'success' : order.status === 'refunded' ? 'danger' : 'info'}`}>
                  {t(`orders.statuses.${order.status}`, order.status)}
                </span>
              </td>
              <td>
                <a href={getInvoicePdfUrl(order._id)} target="_blank" rel="noreferrer">PDF</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
