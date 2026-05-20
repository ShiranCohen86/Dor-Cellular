const Notification = require('../models/Notification');
const { paginate } = require('../utils/pagination');

async function list(query, user) {
  const filter = {
    $or: [{ targetUserId: user.id }, { targetUserId: null, targetRole: { $in: ['all', user.role] } }],
  };
  if (query.unread === 'true') filter.isRead = false;
  if (query.type) filter.type = query.type;
  return paginate(Notification, filter, query);
}

async function markRead(id) {
  return Notification.findByIdAndUpdate(id, { isRead: true, readAt: new Date() }, { new: true });
}

async function markAllRead(user) {
  await Notification.updateMany(
    { $or: [{ targetUserId: user.id }, { targetUserId: null, targetRole: { $in: ['all', user.role] } }], isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  );
  return { ok: true };
}

async function emit(io, data) {
  const notif = await Notification.create(data);
  io?.emit('notification', notif);
  return notif;
}

module.exports = { list, markRead, markAllRead, emit };
