import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Reports } from '../api/client.js';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

const HE_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

export default function ReportsPage() {
  const { t } = useTranslation();
  const [profit, setProfit] = useState([]);
  const [best, setBest] = useState([]);
  const [dead, setDead] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [vat, setVat] = useState(null);
  const [ordersYear, setOrdersYear] = useState(CURRENT_YEAR);
  const [ordersData, setOrdersData] = useState([]);

  useEffect(() => {
    async function loadReportsData() {
      try {
        const [profitResult, bestResult, deadResult, employeesResult, vatResult] = await Promise.all([
          Reports.monthlyProfit(),
          Reports.bestSellers(),
          Reports.deadStock(),
          Reports.employees(),
          Reports.vat(),
        ]);
        setProfit(profitResult.items);
        setBest(bestResult.items);
        setDead(deadResult.items);
        setEmployees(employeesResult.items);
        setVat(vatResult);
      } catch (error) {
        console.error('[ReportsPage] Failed to load reports data:', error);
      }
    }
    loadReportsData();
  }, []);

  useEffect(() => {
    Reports.ordersPerMonth({ year: ordersYear })
      .then((res) => setOrdersData(res.items.map((r) => ({ ...r, name: HE_MONTHS[r.month - 1] }))))
      .catch(console.error);
  }, [ordersYear]);

  return (
    <div>
      <div className="toolbar">
        <a className="badge info" href={Reports.exportCsv()} target="_blank" rel="noreferrer">{t('reports.exportCsv')}</a>
      </div>

      {vat && (
        <div className="kpi-grid">
          <div className="kpi"><div className="label">{t('reports.revenue')}</div><div className="value">₪ {vat.total?.toFixed(2) || 0}</div></div>
          <div className="kpi"><div className="label">{t('reports.vat')}</div><div className="value">₪ {vat.tax?.toFixed(2) || 0}</div></div>
          <div className="kpi"><div className="label">{t('reports.discounts')}</div><div className="value">₪ {vat.discounts?.toFixed(2) || 0}</div></div>
          <div className="kpi"><div className="label">{t('reports.refunded')}</div><div className="value">₪ {vat.refunded?.toFixed(2) || 0}</div></div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>הזמנות לפי חודש</h3>
          <select value={ordersYear} onChange={(e) => setOrdersYear(Number(e.target.value))} style={{ fontSize: 14, padding: '4px 10px' }}>
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={ordersData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(val, name) => {
                const labels = { completed: 'הושלמו', cancelled: 'בוטלו', refunded: 'הוחזרו', draft: 'טיוטות' };
                return [val, labels[name] || name];
              }} />
              <Legend formatter={(name) => ({ completed: 'הושלמו', cancelled: 'בוטלו', refunded: 'הוחזרו', draft: 'טיוטות' }[name] || name)} />
              <Bar dataKey="completed" stackId="a" fill="#2563eb" radius={[0,0,0,0]} />
              <Bar dataKey="refunded"  stackId="a" fill="#f59e0b" radius={[0,0,0,0]} />
              <Bar dataKey="cancelled" stackId="a" fill="#dc2626" radius={[0,0,0,0]} />
              <Bar dataKey="draft"     stackId="a" fill="#9ca3af" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { key: 'total',     label: 'סה״כ',     color: '#1e293b' },
            { key: 'completed', label: 'הושלמו',   color: '#2563eb' },
            { key: 'refunded',  label: 'הוחזרו',   color: '#f59e0b' },
            { key: 'cancelled', label: 'בוטלו',    color: '#dc2626' },
          ].map(({ key, label, color }) => (
            <div key={key} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>
                {ordersData.reduce((s, r) => s + (r[key] || 0), 0)}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>{label} {ordersYear}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>{t('reports.monthlyProfit')}</h3>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={profit}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#2563eb" />
              <Line type="monotone" dataKey="profit" stroke="#16a34a" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3>{t('reports.bestSellers')}</h3>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={best}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="qty" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3>{t('reports.employees')}</h3>
        <table>
          <thead>
            <tr>
              <th>{t('common.name')}</th>
              <th>{t('users.role')}</th>
              <th>{t('reports.orders')}</th>
              <th>{t('reports.revenue')}</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee._id}>
                <td>{employee.name}</td>
                <td>{employee.role}</td>
                <td>{employee.orders}</td>
                <td>₪ {employee.revenue?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>{t('reports.deadStock')}</h3>
        <table>
          <thead><tr><th>SKU</th><th>Name</th><th>Stock</th></tr></thead>
          <tbody>
            {dead.map((deadProduct) => (
            <tr key={deadProduct._id}>
              <td>{deadProduct.sku}</td>
              <td>{deadProduct.name}</td>
              <td>{deadProduct.totalStock}</td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
