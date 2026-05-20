/**
 * User profile page. Lets the logged-in user:
 *   - Edit name + phone.
 *   - Change their password.
 *
 * Auth state comes from Redux; the password-change call goes straight to the API
 * (no need to cache it in the store).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser, updateProfile } from '../store/slices/authSlice.js';
import { changeCurrentPassword } from '../api/auth.api.js';
import { logError } from '../api/logger.js';

export default function Profile() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);

  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
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
    <div style={{ maxWidth: 720 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{t('profile.title')}</h2>
        <div className="kpi-grid">
          <div><div className="muted">{t('common.email')}</div><div><strong>{currentUser.email}</strong></div></div>
          <div><div className="muted">{t('users.role')}</div><div><span className="badge info">{t(`roles.${currentUser.role}`)}</span></div></div>
          <div><div className="muted">{t('branches.title')}</div><div>{currentUser.branchId?.name || '—'}</div></div>
          <div><div className="muted">{t('profile.lastLogin')}</div><div>{currentUser.lastLogin ? new Date(currentUser.lastLogin).toLocaleString() : '—'}</div></div>
        </div>
      </div>

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
