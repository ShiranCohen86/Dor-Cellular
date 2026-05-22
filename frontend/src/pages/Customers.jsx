/**
 * Customers list page. Loads the full list once, then filters client-side so
 * Hebrew text is matched correctly and results are always visible.
 */
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  loadCustomersIfStale,
  selectAllCustomers, selectCustomersStatus,
} from '../store/slices/customersSlice.js';
import { splitByQuery } from '../utils/searchUtils.js';

const CUSTOMER_FIELDS = ['name', 'phone', 'email', 'idNumber'];

export default function Customers() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const customerList = useSelector(selectAllCustomers);
  const loadingStatus = useSelector(selectCustomersStatus);

  const [searchQuery, setSearchQuery] = useState('');

  // Load the full list once — filtering is client-side.
  useEffect(() => { dispatch(loadCustomersIfStale()); }, [dispatch]);

  const { matched, rest } = useMemo(
    () => splitByQuery(customerList, searchQuery, CUSTOMER_FIELDS),
    [customerList, searchQuery],
  );

  const renderRow = (customer, dimmed) => (
    <tr key={customer._id} style={dimmed ? { opacity: 0.4 } : undefined}>
      <td>
        {customer.name}
        {customer.isVip && <span className="badge warning" style={{ marginInlineStart: 6 }}>VIP</span>}
      </td>
      <td>{customer.phone}</td>
      <td>{customer.email || '—'}</td>
      <td>{customer.loyaltyPoints || 0}</td>
      <td>
        {customer.outstandingDebt > 0
          ? <span className="badge danger">₪ {customer.outstandingDebt}</span>
          : '—'}
      </td>
      <td><button className="btn-ghost">{t('common.edit')}</button></td>
    </tr>
  );

  return (
    <div className="page">
      <div className="toolbar">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('common.search')}
          style={{ width: 280 }}
        />
        {searchQuery && (
          <button className="btn-ghost" onClick={() => setSearchQuery('')} style={{ padding: '4px 10px' }}>✕</button>
        )}
        <div className="spacer-flex" />
        <button>{t('customers.new')}</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('common.name')}</th>
              <th>{t('common.phone')}</th>
              <th>{t('common.email')}</th>
              <th>{t('customers.loyalty')}</th>
              <th>{t('customers.debt')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loadingStatus === 'loading' ? (
              <tr><td colSpan="6">{t('common.loading')}</td></tr>
            ) : matched.length === 0 && rest.length === 0 ? (
              <tr><td colSpan="6" className="muted">{t('common.noData')}</td></tr>
            ) : (
              <>
                {matched.map((c) => renderRow(c, false))}
                {searchQuery && rest.length > 0 && (
                  <>
                    <tr>
                      <td colSpan="6" style={{ padding: '4px 14px', background: 'var(--surface-2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                          <span>כל הלקוחות · {rest.length}</span>
                          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        </div>
                      </td>
                    </tr>
                    {rest.map((c) => renderRow(c, true))}
                  </>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
