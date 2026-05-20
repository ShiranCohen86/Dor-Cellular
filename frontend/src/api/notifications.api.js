/**
 * In-app notifications endpoints.
 * Real-time delivery happens via Socket.io (`notification` event) — see Layout.jsx.
 */
import { httpClient, safeRequest } from './request.js';

/** GET /notifications — paginated list (unread first). */
export function fetchNotifications(queryParams = {}) {
  return safeRequest(httpClient.get('/notifications', { params: queryParams }));
}

/** POST /notifications/:id/read — mark one as read. */
export function markNotificationAsRead(notificationId) {
  return safeRequest(httpClient.post(`/notifications/${notificationId}/read`));
}

/** POST /notifications/read-all — mark every notification visible to the user as read. */
export function markAllNotificationsAsRead() {
  return safeRequest(httpClient.post('/notifications/read-all'));
}
