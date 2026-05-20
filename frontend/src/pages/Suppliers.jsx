/**
 * Suppliers + Purchase Orders page.
 * Two tabs share the same screen — each reads its data from Redux.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  loadSuppliersIfStale, loadPurchaseOrders,
  selectAllSuppliers, selectAllPurchaseOrders,
} from '../store/slices/suppliersSlice.js';

export default function Suppliers() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const supplierList = useSelector(selectAllSuppliers);
  const purchaseOrderList = useSelector(selectAllPurchaseOrders);
  const [activeTab, setActiveTab] = useState('suppliers');

  useEffect(() => {
    dispatch(loadSuppliersIfStale());
    dispatch(loadPurchaseOrders());
  }, [dispatch]);

  return (
    <div>
      <div className="toolbar">
        <button
          className={activeTab === 'suppliers' ? '' : 'btn-secondary'}
          onClick={() => setActiveTab('suppliers')}
        >{t('suppliers.title')}</button>
        <button
          className={activeTab === 'pos' ? '' : 'btn-secondary'}
          onClick={() => setActiveTab('pos')}
        >{t('suppliers.purchaseOrders')}</button>
      </div>

      {activeTab === 'suppliers' ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('common.name')}</th>
                <th>{t('suppliers.contact')}</th>
                <th>{t('common.phone')}</th>
                <th>{t('common.email')}</th>
                <th>{t('customers.debt')}</th>
              </tr>
            </thead>
            <tbody>
              {supplierList.length === 0 ? (
                <tr><td colSpan="5" className="muted">{t('common.noData')}</td></tr>
              ) : supplierList.map((supplier) => (
                <tr key={supplier._id}>
                  <td>{supplier.name}</td>
                  <td>{supplier.contactPerson || '—'}</td>
                  <td>{supplier.phone || '—'}</td>
                  <td>{supplier.email || '—'}</td>
                  <td>{supplier.outstandingDebt > 0 ? <span className="badge warning">₪ {supplier.outstandingDebt}</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('suppliers.poNumber')}</th>
                <th>{t('suppliers.title')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.total')}</th>
                <th>{t('suppliers.expected')}</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrderList.length === 0 ? (
                <tr><td colSpan="5" className="muted">{t('common.noData')}</td></tr>
              ) : purchaseOrderList.map((purchaseOrder) => (
                <tr key={purchaseOrder._id}>
                  <td>{purchaseOrder.poNumber}</td>
                  <td>{purchaseOrder.supplierId?.name}</td>
                  <td><span className="badge info">{t(`suppliers.statuses.${purchaseOrder.status}`, purchaseOrder.status)}</span></td>
                  <td>₪ {purchaseOrder.total?.toFixed(2)}</td>
                  <td>{purchaseOrder.expectedDate ? new Date(purchaseOrder.expectedDate).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
