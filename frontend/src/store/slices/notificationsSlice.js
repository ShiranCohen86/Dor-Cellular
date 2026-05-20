/**
 * Notifications slice.
 *
 * Items come in via two channels:
 *   1) `loadNotifications` thunk on mount/poll
 *   2) Real-time `notification` event from Socket.io — `socketNotificationReceived`
 *      action is dispatched by the Layout component.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '../../api/notifications.api.js';

const initialState = { items: [], status: 'idle', errorMessage: null, loadedAt: null };

/** Loads notifications visible to the current user. */
export const loadNotifications = createAsyncThunk('notifications/load', async (_arg, { rejectWithValue }) => {
  try { return await fetchNotifications(); } catch (err) { return rejectWithValue(err.message); }
});

/** Marks one notification as read both in API and in state. */
export const markOneAsRead = createAsyncThunk('notifications/markOne', async (notificationId) => {
  await markNotificationAsRead(notificationId);
  return notificationId;
});

/** Marks every notification as read. */
export const markAllAsRead = createAsyncThunk('notifications/markAll', async () => {
  await markAllNotificationsAsRead();
});

const slice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    /** Dispatched when Socket.io receives a `notification` event. */
    socketNotificationReceived(state, action) {
      // Prepend so newest is on top, dedupe by _id.
      const incoming = action.payload;
      if (state.items.find((existing) => existing._id === incoming._id)) return;
      state.items.unshift(incoming);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadNotifications.fulfilled, (state, action) => {
        state.items = action.payload.items || [];
        state.loadedAt = Date.now();
        state.status = 'succeeded';
      })
      .addCase(markOneAsRead.fulfilled, (state, action) => {
        const targetId = action.payload;
        const found = state.items.find((n) => n._id === targetId);
        if (found) { found.isRead = true; found.readAt = new Date().toISOString(); }
      })
      .addCase(markAllAsRead.fulfilled, (state) => {
        for (const notification of state.items) notification.isRead = true;
      });
  },
});

export const { socketNotificationReceived } = slice.actions;
export const selectAllNotifications = (state) => state.notifications.items;
export const selectUnreadCount = (state) => state.notifications.items.filter((n) => !n.isRead).length;
export default slice.reducer;
