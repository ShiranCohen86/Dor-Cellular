/**
 * User profile page. Lets the logged-in user:
 *   - Edit name + phone.
 *   - Change their password.
 *
 * Auth state comes from Redux; the password-change call goes straight to the API
 * (no need to cache it in the store).
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser, updateProfile } from '../store/slices/authSlice.js';
import { loadOrdersIfStale, selectAllOrders } from '../store/slices/ordersSlice.js';
import { changeCurrentPassword } from '../api/auth.api.js';
import { logError } from '../api/logger.js';

export default function Profile() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const orders = useSelector(selectAllOrders);

  const isCustomer = currentUser?.role === 'customer';

  useEffect(() => {
    if (isCustomer) dispatch(loadOrdersIfStale());
  }, [dispatch, isCustomer]);

  const myOrders = isCustomer
    ? orders.filter(o => String(o.customerId?._id ?? o.customerId) === String(currentUser?.customerId))
    : [];

  const [profileForm, setProfileForm] = useState({
    name:    currentUser?.name    || '',
    phone:   currentUser?.phone   || '',
    address: currentUser?.address || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileFeedback, setProfileFeedback] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  /** Submits the profile-info edit (name + phone). */
  const handleProfileSubmit = async (formEvent) => {
    formEvent.preventDefault();
    setIsSavingProfile(true); setProfileFeedback('');
    try {
      const result = await dispatch(updateProfile(profileForm));
      if (result.error) throw new Error(result.payload || 'Update failed');
      setProfileFeedback(t('profile.saved'));
    } catch (err) {
      logError('profile', 'update failed', err.message);
      setProfileFeedback(err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  /** Submits the change-password form. Performs client-side validation first. */
  const handlePasswordSubmit = async (formEvent) => {
    formEvent.preventDefault();
    setPasswordFeedback('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordFeedback(t('profile.pwMismatch')); return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordFeedback(t('profile.pwTooShort')); return;
    }
    try {
      await changeCurrentPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordFeedback(t('profile.pwChanged'));
    } catch (err) {
      logError('profile', 'password change failed', err.message);
      setPasswordFeedback(err.message);
    }
  };

  if (!currentUser) return <div>{t('common.loading')}</div>;

  return (
    <div className="page">
      <div className="card" style={{ padding: '18px 20px' }}>
        <h2 style={{ marginTop: 0, marginBottom: 14 }}>{t('profile.title')}</h2>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 14 }}>
          <div>
            <span className="muted" style={{ fontSize: 12 }}>{t('common.email')}</span>
            <div><strong>{currentUser.email}</strong></div>
          </div>
          <div>
            <span className="muted" style={{ fontSize: 12 }}>{t('users.role')}</span>
            <div><strong>{t(`roles.${currentUser.role}`)}</strong></div>
          </div>
        </div>
      </div>

      {isCustomer && myOrders.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>הזמנות שלי</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myOrders.slice(0, 10).map(order => {
              const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString('he-IL') : '';
              return (
                <div key={order._id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong>{date}</strong>
                    <span style={{ color: 'var(--text-muted)' }}>#{order.orderNumber || order._id?.slice(-6)}</span>
                  </div>
                  {(order.items || []).map((item, i) => (
                    <div key={i} style={{ color: 'var(--text-muted)' }}>
                      {item.name} ×{item.quantity ?? item.qty ?? 1}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <form className="card" onSubmit={handleProfileSubmit}>
        <h3 style={{ marginTop: 0 }}>{t('profile.details')}</h3>
        <div className="form-row">
          <div className="form-group">
            <label>{t('common.name')}</label>
            <input
              value={profileForm.name}
              onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('common.phone')}</label>
            <input
              value={profileForm.phone}
              onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })}
            />
          </div>
          <div className="form-group">
            <label>{t('common.address')}</label>
            <input
              value={profileForm.address}
              onChange={(event) => setProfileForm({ ...profileForm, address: event.target.value })}
              placeholder="רחוב, עיר"
            />
          </div>
        </div>
        <div className="row">
          <button type="submit" disabled={isSavingProfile}>
            {isSavingProfile ? t('common.loading') : t('common.save')}
          </button>
          {profileFeedback && <span className="badge info">{profileFeedback}</span>}
        </div>
      </form>

      <form className="card" onSubmit={handlePasswordSubmit}>
        <h3 style={{ marginTop: 0 }}>{t('profile.password')}</h3>
        <div className="form-row">
          <div className="form-group">
            <label>{t('profile.currentPassword')}</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
              required autoComplete="current-password"
            />
          </div>
          <div className="form-group">
            <label>{t('profile.newPassword')}</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
              required autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label>{t('profile.confirmPassword')}</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
              required autoComplete="new-password"
            />
          </div>
        </div>
        <div className="row">
          <button type="submit">{t('profile.changePassword')}</button>
          {passwordFeedback && <span className="badge info">{passwordFeedback}</span>}
        </div>
      </form>
    </div>
  );
}
