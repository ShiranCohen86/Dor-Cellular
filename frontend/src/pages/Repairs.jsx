/**
 * Repair Lab page.
 * - Lists repair tickets from Redux (cached).
 * - Status filter triggers a fresh fetch.
 * - "New intake" inline form posts to /repairs and refreshes the list.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { loadRepairs, selectAllRepairs, invalidateRepairsCache } from '../store/slices/repairsSlice.js';
import { createRepair, changeRepairStatus } from '../api/repairs.api.js';
import { fetchCustomers } from '../api/customers.api.js';
import { logError } from '../api/logger.js';

const REPAIR_STATUSES = ['received', 'diagnosed', 'waiting_for_parts', 'in_repair', 'ready', 'delivered', 'cancelled'];

function buildRepairWaLink(repair) {
  const phone = repair.customerId?.phone;
  if (!phone) return null;
  const clean = phone.replace(/\D/g, '');
  const intl = clean.startsWith('0') ? '972' + clean.slice(1) : clean;
  const name = repair.customerId?.name || 'לקוח';
  const device = `${repair.deviceBrand || ''} ${repair.deviceModel || ''}`.trim();
  const text = encodeURIComponent(`שלום ${name}! ה${device} שלך מוכן לאיסוף 📱\nנשמח לראותך — דור הסלולר`);
  return `https://wa.me/${intl}?text=${text}`;
}

export default function Repairs() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const repairList = useSelector(selectAllRepairs);

  const [statusFilter, setStatusFilter] = useState('');
  const [showIntakeForm, setShowIntakeForm] = useState(false);
  const [intakeForm, setIntakeForm] = useState({
    customerId: '', deviceBrand: '', deviceModel: '', imei: '',
    faultDescription: '', estimatedCost: 0,
  });
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState([]);

  /** Fetches the repair list — respecting the current status filter. */
  const reloadRepairList = () => {
    dispatch(invalidateRepairsCache());
    dispatch(loadRepairs(statusFilter ? { status: statusFilter } : {}));
  };

  useEffect(reloadRepairList, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Submits the intake form to create a new repair ticket. */
  const handleIntakeSubmit = async (formEvent) => {
    formEvent.preventDefault();
    try {
      await createRepair(intakeForm);
      setShowIntakeForm(false);
      setIntakeForm({
        customerId: '', deviceBrand: '', deviceModel: '', imei: '',
        faultDescription: '', estimatedCost: 0,
      });
      setCustomerSearchQuery('');
      reloadRepairList();
    } catch (err) {
      logError('repairs', 'create failed', err.message);
      alert(err.message);
    }
  };

  /** Moves a repair to a new status (and triggers SMS server-side for relevant ones). */
  const handleStatusChange = async (repairId, nextStatus) => {
    try {
      await changeRepairStatus(repairId, { status: nextStatus });
      reloadRepairList();
    } catch (err) {
      logError('repairs', 'status change failed', err.message);
      alert(err.message);
    }
  };

  /** Looks up customers for the intake form's customer picker. */
  const handleCustomerLookup = async () => {
    if (!customerSearchQuery) return;
    try {
      const result = await fetchCustomers({ q: customerSearchQuery, limit: 10 });
      setCustomerSearchResults(result.items || []);
    } catch (err) {
      logError('repairs', 'customer lookup failed', err.message);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">{t('common.status')}: —</option>
          {REPAIR_STATUSES.map((status) => (
            <option key={status} value={status}>{t(`repairs.${status}`)}</option>
          ))}
        </select>
        <div className="spacer-flex" />
        <button onClick={() => setShowIntakeForm(!showIntakeForm)}>{t('repairs.new')}</button>
      </div>

      {showIntakeForm && (
        <form className="card" onSubmit={handleIntakeSubmit}>
          <h3 style={{ marginTop: 0 }}>{t('repairs.new')}</h3>
          <div className="form-row">
            <div className="form-group">
              <label>{t('pos.customer')}</label>
              <div className="row">
                <input
                  value={customerSearchQuery}
                  onChange={(event) => setCustomerSearchQuery(event.target.value)}
                  placeholder={t('common.search')}
                  style={{ flex: 1 }}
                />
                <button type="button" onClick={handleCustomerLookup}>{t('common.search')}</button>
              </div>
              {customerSearchResults.map((customer) => (
                <div
                  key={customer._id}
                  className="row"
                  style={{ padding: 4, cursor: 'pointer' }}
                  onClick={() => {
                    setIntakeForm({ ...intakeForm, customerId: customer._id });
                    setCustomerSearchResults([]);
                    setCustomerSearchQuery(customer.name);
                  }}
                >
                  <strong>{customer.name}</strong><span className="muted">{customer.phone}</span>
                </div>
              ))}
            </div>
            <div className="form-group">
              <label>{t('repairs.deviceBrand')}</label>
              <input
                value={intakeForm.deviceBrand}
                onChange={(event) => setIntakeForm({ ...intakeForm, deviceBrand: event.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>{t('repairs.deviceModel')}</label>
              <input
                value={intakeForm.deviceModel}
                onChange={(event) => setIntakeForm({ ...intakeForm, deviceModel: event.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>IMEI</label>
              <input
                value={intakeForm.imei}
                onChange={(event) => setIntakeForm({ ...intakeForm, imei: event.target.value })}
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>{t('repairs.fault')}</label>
              <textarea
                value={intakeForm.faultDescription}
                onChange={(event) => setIntakeForm({ ...intakeForm, faultDescription: event.target.value })}
                rows={3}
                required
              />
            </div>
            <div className="form-group">
              <label>{t('repairs.estimatedCost')}</label>
              <input
                type="number"
                value={intakeForm.estimatedCost}
                onChange={(event) => setIntakeForm({ ...intakeForm, estimatedCost: event.target.value })}
              />
            </div>
          </div>
          <button type="submit" disabled={!intakeForm.customerId}>{t('common.save')}</button>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('repairs.ticket')}</th>
              <th>{t('repairs.device')}</th>
              <th>IMEI</th>
              <th>{t('pos.customer')}</th>
              <th>{t('common.status')}</th>
              <th>{t('repairs.estimatedCost')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {repairList.length === 0 ? (
              <tr><td colSpan="7" className="muted">{t('common.noData')}</td></tr>
            ) : repairList.map((repair) => (
              <tr key={repair._id}>
                <td>{repair.ticketNumber}</td>
                <td>{repair.deviceBrand} {repair.deviceModel}</td>
                <td>{repair.imei || '—'}</td>
                <td>{repair.customerId?.name || '—'}</td>
                <td><span className="badge info">{t(`repairs.${repair.status}`)}</span></td>
                <td>₪ {repair.estimatedCost || 0}</td>
                <td style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                  <select
                    onChange={(event) => handleStatusChange(repair._id, event.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>{t('repairs.changeStatus')}</option>
                    {REPAIR_STATUSES.map((status) => (
                      <option key={status} value={status}>{t(`repairs.${status}`)}</option>
                    ))}
                  </select>
                  {repair.status === 'ready' && buildRepairWaLink(repair) && (
                    <a
                      href={buildRepairWaLink(repair)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ background: '#25d366', color: '#fff', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
                    >
                      📱 שלח הודעה ללקוח
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
