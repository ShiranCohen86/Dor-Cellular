/**
 * Repair Lab page.
 * - Lists repair tickets from Redux (cached).
 * - Status filter triggers a fresh fetch.
 * - "New intake" inline form posts to /repairs and refreshes the list.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
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
  const device = [repair.deviceBrand, repair.deviceModel].filter(Boolean).join(' ');
  const text = encodeURIComponent(`שלום ${name}! ה${device} שלך מוכן לאיסוף 📱\nנשמח לראותך — דור הסלולר`);
  return `https://wa.me/${intl}?text=${text}`;
}

const EMPTY_INTAKE = {
  customerId: '', device: '', imei: '', faultDescription: '', estimatedCost: 0,
};

const lbl = { fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.4px', textTransform: 'uppercase', display: 'block', marginBottom: 5 };
const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', boxSizing: 'border-box' };

export default function Repairs() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const repairList = useSelector(selectAllRepairs);

  const [showIntakeForm, setShowIntakeForm] = useState(false);
  const [intakeForm, setIntakeForm] = useState(EMPTY_INTAKE);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [saving, setSaving] = useState(false);

  // Open intake form when navigated with ?new=1
  useEffect(() => {
    if (searchParams.get('new') === '1') setShowIntakeForm(true);
  }, [searchParams]);

  const reloadRepairList = () => {
    dispatch(invalidateRepairsCache());
    dispatch(loadRepairs({}));
  };

  useEffect(reloadRepairList, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleIntakeSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { device, ...rest } = intakeForm;
      await createRepair({ ...rest, deviceModel: device, deviceBrand: '' });
      setShowIntakeForm(false);
      setIntakeForm(EMPTY_INTAKE);
      setCustomerSearchQuery('');
      setCustomerSearchResults([]);
      reloadRepairList();
    } catch (err) {
      logError('repairs', 'create failed', err.message);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (repairId, nextStatus) => {
    try {
      await changeRepairStatus(repairId, { status: nextStatus });
      reloadRepairList();
    } catch (err) {
      logError('repairs', 'status change failed', err.message);
      alert(err.message);
    }
  };

  const handleCustomerLookup = async () => {
    if (!customerSearchQuery) return;
    try {
      const result = await fetchCustomers({ q: customerSearchQuery, limit: 10 });
      setCustomerSearchResults(result.items || []);
    } catch (err) {
      logError('repairs', 'customer lookup failed', err.message);
    }
  };

  const setField = (field) => (e) => setIntakeForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="page">
      {!showIntakeForm && (
        <div className="toolbar">
          <div className="spacer-flex" />
          <button onClick={() => setShowIntakeForm(true)}>{t('repairs.new')}</button>
        </div>
      )}

      {showIntakeForm && (
        <div className="card" style={{ padding: '20px 20px 24px' }}>
          {/* Header with X close button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <strong style={{ fontSize: 16 }}>{t('repairs.new')}</strong>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => { setShowIntakeForm(false); setIntakeForm(EMPTY_INTAKE); setCustomerSearchQuery(''); setCustomerSearchResults([]); }}
              style={{ padding: '2px 8px', fontSize: 18 }}
            >✕</button>
          </div>

          <form onSubmit={handleIntakeSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>

              {/* Customer picker */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>{t('pos.customer')}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCustomerLookup())}
                    placeholder="חפש לפי שם או טלפון"
                    style={{ ...inp, flex: 1 }}
                  />
                  <button type="button" onClick={handleCustomerLookup} className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>{t('common.search')}</button>
                </div>
                {customerSearchResults.length > 0 && (
                  <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, overflow: 'hidden', background: 'var(--surface)' }}>
                    {customerSearchResults.map((c) => (
                      <div
                        key={c._id}
                        style={{ padding: '9px 14px', cursor: 'pointer', display: 'flex', gap: 10, borderBottom: '1px solid var(--border)', alignItems: 'center' }}
                        onClick={() => {
                          setIntakeForm((prev) => ({ ...prev, customerId: c._id }));
                          setCustomerSearchResults([]);
                          setCustomerSearchQuery(c.name);
                        }}
                      >
                        <strong>{c.name}</strong>
                        <span className="muted" style={{ fontSize: 12 }}>{c.phone}</span>
                      </div>
                    ))}
                  </div>
                )}
                {intakeForm.customerId && (
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--success, #34d399)' }}>✓ לקוח נבחר</div>
                )}
              </div>

              {/* Merged device field */}
              <div>
                <label style={lbl}>{t('repairs.device')} (מותג + דגם)</label>
                <input
                  value={intakeForm.device}
                  onChange={setField('device')}
                  placeholder="לדוגמה: Samsung Galaxy A54"
                  required
                  style={inp}
                />
              </div>

              <div>
                <label style={lbl}>IMEI</label>
                <input
                  value={intakeForm.imei}
                  onChange={setField('imei')}
                  style={inp}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>{t('repairs.fault')}</label>
                <textarea
                  value={intakeForm.faultDescription}
                  onChange={setField('faultDescription')}
                  rows={3}
                  required
                  style={{ ...inp, resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={lbl}>{t('repairs.estimatedCost')}</label>
                <input
                  type="number"
                  value={intakeForm.estimatedCost}
                  onChange={setField('estimatedCost')}
                  style={inp}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button type="submit" disabled={saving || !intakeForm.customerId} style={{ flex: 1, padding: '11px 0', fontWeight: 700 }}>
                {saving ? 'שומר...' : t('common.save')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setShowIntakeForm(false); setIntakeForm(EMPTY_INTAKE); setCustomerSearchQuery(''); setCustomerSearchResults([]); }}
                style={{ padding: '11px 20px' }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('repairs.ticket')}</th>
              <th>{t('repairs.device')}</th>
              <th className="col-hide-mobile">IMEI</th>
              <th className="col-hide-mobile">{t('pos.customer')}</th>
              <th className="col-hide-mobile">{t('repairs.estimatedCost')}</th>
              <th>{t('common.status')}</th>
            </tr>
          </thead>
          <tbody>
            {repairList.length === 0 ? (
              <tr><td colSpan="7" className="muted">{t('common.noData')}</td></tr>
            ) : repairList.map((repair) => (
              <tr key={repair._id}>
                <td>{repair.ticketNumber}</td>
                <td>{[repair.deviceBrand, repair.deviceModel].filter(Boolean).join(' ')}</td>
                <td className="col-hide-mobile">{repair.imei || '—'}</td>
                <td className="col-hide-mobile">{repair.customerId?.name || '—'}</td>
                <td className="col-hide-mobile">₪ {repair.estimatedCost || 0}</td>
                <td style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                  <select
                    key={`${repair._id}-${repair.status}`}
                    value={repair.status}
                    onChange={(e) => handleStatusChange(repair._id, e.target.value)}
                    style={{ fontSize: 12, padding: '5px 8px' }}
                  >
                    {REPAIR_STATUSES.map((s) => (
                      <option key={s} value={s}>{t(`repairs.${s}`)}</option>
                    ))}
                  </select>
                  {repair.status === 'ready' && buildRepairWaLink(repair) && (
                    <a
                      href={buildRepairWaLink(repair)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wa-btn"
                      style={{ fontSize: 12, padding: '5px 10px' }}
                    >
                      📱 WhatsApp
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
