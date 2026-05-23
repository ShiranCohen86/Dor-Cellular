import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchAllUsers, registerEmployeeUser, updateUser } from '../api/auth.api.js';
import { logError } from '../api/logger.js';

const ROLES = ['admin', 'employee'];
const ALL_FILTER_ROLES = ['admin', 'employee', 'customer'];
const ROLE_LABEL = { admin: 'מנהל', employee: 'עובד', customer: 'לקוח', manager: 'מנהל', salesperson: 'מוכר', technician: 'טכנאי' };

const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 };
const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' };

// ── Inline "add user" form ────────────────────────────────────────────────
function AddUserInline({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      await registerEmployeeUser(form);
      onAdded();
      onClose();
    } catch (err) {
      setError(err.message || 'שגיאה ביצירת משתמש');
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ padding: '20px 20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <strong style={{ fontSize: 16 }}>+ הוסף עובד</strong>
        <button type="button" className="btn-ghost" onClick={onClose} style={{ padding: '2px 8px', fontSize: 18 }}>✕</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div>
            <label style={lbl}>שם מלא *</label>
            <input value={form.name} onChange={set('name')} required style={inp} autoFocus />
          </div>
          <div>
            <label style={lbl}>כתובת מייל *</label>
            <input value={form.email} onChange={set('email')} required type="email" style={inp} />
          </div>
          <div>
            <label style={lbl}>סיסמה *</label>
            <input value={form.password} onChange={set('password')} required type="password" minLength={6} style={inp} />
          </div>
          <div>
            <label style={lbl}>תפקיד *</label>
            <select value={form.role} onChange={set('role')} style={inp}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>
        </div>
        {error && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>⚠ {error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button type="submit" disabled={saving} style={{ flex: 1, padding: '11px 0', fontWeight: 700 }}>
            {saving ? 'יוצר...' : 'צור עובד'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1, padding: '11px 0' }}>ביטול</button>
        </div>
      </form>
    </div>
  );
}

// ── Edit role overlay modal ───────────────────────────────────────────────
function EditRoleModal({ user, onClose, onUpdated }) {
  const [role, setRole]     = useState(user.role);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      await updateUser(user._id, { role });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.message || 'שגיאה בעדכון תפקיד');
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div className="card" style={{ position: 'relative', width: 'min(360px, 92vw)', padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <strong style={{ fontSize: 17 }}>שינוי תפקיד — {user.name}</strong>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '2px 8px', fontSize: 18 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={lbl}>תפקיד</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ ...inp, marginBottom: 20 }}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>⚠ {error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '11px 0', fontWeight: 700 }}>
              {saving ? 'שומר...' : 'שמור'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1, padding: '11px 0' }}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [editUser, setEditUser]   = useState(null);

  async function loadUsers() {
    try {
      const result = await fetchAllUsers();
      setUsers(result.items || result || []);
    } catch (err) {
      logError('users', 'load failed', err);
    } finally { setLoading(false); }
  }

  useEffect(() => { loadUsers(); }, []);

  const visible = filterRole ? users.filter((u) => u.role === filterRole) : users;

  return (
    <div className="page">
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ minWidth: 140 }}>
          <option value="">כל התפקידים</option>
          {ALL_FILTER_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <div className="spacer-flex" />
        <button onClick={() => setShowNewForm(true)} disabled={showNewForm}>+ הוסף עובד</button>
      </div>

      {showNewForm && (
        <AddUserInline
          onClose={() => setShowNewForm(false)}
          onAdded={loadUsers}
        />
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('common.name')}</th>
              <th>{t('common.email')}</th>
              <th>{t('users.role')}</th>
              <th>{t('common.phone')}</th>
              <th>{t('users.lastLogin')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="muted">{t('common.loading')}</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan="6" className="muted">{t('common.noData')}</td></tr>
            ) : visible.map((user) => (
              <tr key={user._id}>
                <td style={{ fontWeight: 500 }}>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`badge ${user.role === 'admin' ? 'warning' : 'info'}`}>
                    {ROLE_LABEL[user.role] || user.role}
                  </span>
                </td>
                <td>{user.phone || '—'}</td>
                <td className="muted" style={{ fontSize: 12 }}>
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleString('he-IL') : '—'}
                </td>
                <td>
                  <button className="btn-ghost" onClick={() => setEditUser(user)}>ערוך תפקיד</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editUser && (
        <EditRoleModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onUpdated={loadUsers}
        />
      )}
    </div>
  );
}
