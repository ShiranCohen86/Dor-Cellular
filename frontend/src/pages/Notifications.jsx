/**
 * Notifications inbox page.
 * Source of truth is the Redux notifications slice, which is updated both via
 * REST (loadNotifications) and Socket.io (socketNotificationReceived in Layout).
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  loadNotifications, markAllAsRead, markOneAsRead,
  selectAllNotifications,
} from '../store/slices/notificationsSlice.js';

export default function Notifications() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const allNotifications = useSelector(selectAllNotifications);

  useEffect(() => { dispatch(loadNotifications()); }, [dispatch]);

  /** Mark every visible notification as read. */
  const handleMarkAllRead = () => dispatch(markAllAsRead());

  /** Click on a single notification row marks it as read. */
  const handleRowClick = (notificationId, isAlreadyRead) => {
    if (!isAlreadyRead) dispatch(markOneAsRead(notificationId));
  };

  return (
    <div>
      <div className="toolbar">
        <button onClick={handleMarkAllRead}>{t('notifications.markAllRead')}</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('common.date')}</th>
              <th>{t('notifications.type')}</th>
              <th>{t('notifications.title')}</th>
              <th>{t('notifications.severity')}</th>
              <th>{t('notifications.read')}</th>
            </tr>
          </thead>
          <tbody>
            {allNotifications.length === 0 ? (
              <tr><td colSpan="5" className="muted">{t('common.noData')}</td></tr>
            ) : allNotifications.map((notification) => (
              <tr
                key={notification._id}
                onClick={() => handleRowClick(notification._id, notification.isRead)}
                style={{ cursor: notification.isRead ? 'default' : 'pointer', fontWeight: notification.isRead ? 400 : 600 }}
              >
                <td>{new Date(notification.createdAt).toLocaleString()}</td>
                <td>{t(`notifications.types.${notification.type}`, notification.type)}</td>
                <td>
                  {notification.title}
                  <div className="muted" style={{ fontSize: 12, fontWeight: 400 }}>{notification.message}</div>
                </td>
                <td>
                  <span className={`badge ${notification.severity === 'critical' ? 'danger' : notification.severity === 'warning' ? 'warning' : 'info'}`}>
                    {t(`notifications.severities.${notification.severity}`, notification.severity)}
                  </span>
                </td>
                <td>{notification.isRead ? '✓' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
