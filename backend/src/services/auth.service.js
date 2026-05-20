const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/pagination');

function signTokens(user) {
  const payload = { sub: String(user._id), role: user.role };
  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken };
}

async function register({ name, email, password, phone, role = 'salesperson', branchId }, actorRole) {
  if (actorRole && role === 'admin' && actorRole !== 'admin') {
    throw ApiError.forbidden('Only admins can create admin users');
  }
  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('Email already in use');

  const user = new User({ name, email, phone, role, branchId });
  await user.setPassword(password);
  await user.save();
  AuditLog.create({ userId: user._id, action: 'auth.user.registered', meta: { email: user.email, name: user.name, role: user.role } }).catch(() => {});
  return user;
}

async function login({ email, password, userAgent, ip, acceptLanguage }) {
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user || !user.isActive) {
    AuditLog.create({ action: 'auth.login.failed', ip, userAgent, meta: { email, acceptLanguage } }).catch(() => {});
    throw ApiError.unauthorized('Invalid credentials');
  }

  const ok = await user.verifyPassword(password);
  if (!ok) {
    AuditLog.create({ userId: user._id, action: 'auth.login.failed', ip, userAgent, meta: { email, name: user.name, role: user.role, phone: user.phone, branchId: user.branchId, acceptLanguage } }).catch(() => {});
    throw ApiError.unauthorized('Invalid credentials');
  }

  const tokens = signTokens(user);
  const tokenId = crypto.randomBytes(8).toString('hex');
  user.sessions.push({ tokenId, userAgent, ip, lastSeen: new Date() });
  user.lastLogin = new Date();
  if (user.sessions.length > 10) user.sessions = user.sessions.slice(-10);
  await user.save();

  AuditLog.create({ userId: user._id, action: 'auth.login', ip, userAgent, meta: { email: user.email, name: user.name, role: user.role, phone: user.phone, branchId: user.branchId, acceptLanguage } }).catch(() => {});

  return { user: user.toJSON(), ...tokens };
}

async function refresh(refreshToken) {
  try {
    const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) throw ApiError.unauthorized();
    return signTokens(user);
  } catch (jwtError) {
    logger.warn('JWT refresh token verification failed', { message: jwtError.message });
    throw ApiError.unauthorized('Invalid refresh token');
  }
}

async function requestPasswordReset(email) {
  const user = await User.findOne({ email });
  if (!user) return { ok: true }; // do not leak

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h
  await user.save();

  // In production: email the rawToken to user. For now return it (dev-only).
  return { ok: true, devToken: env.NODE_ENV === 'production' ? undefined : rawToken };
}

async function resetPassword({ token, newPassword }) {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hash,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordHash +passwordResetToken +passwordResetExpires');

  if (!user) throw ApiError.badRequest('Invalid or expired reset token');
  await user.setPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  return { ok: true };
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');
  const ok = await user.verifyPassword(currentPassword);
  if (!ok) throw ApiError.unauthorized('Current password incorrect');
  await user.setPassword(newPassword);
  await user.save();
  AuditLog.create({ userId, action: 'auth.password.changed', meta: { email: user.email, name: user.name } }).catch(() => {});
  return { ok: true };
}

async function getProfile(userId) {
  const user = await User.findById(userId).populate('branchId', 'name code');
  if (!user) throw ApiError.notFound('User not found');
  return user.toJSON();
}

async function updateProfile(userId, patch) {
  const allowed = ['name', 'phone'];
  const update = {};
  for (const k of allowed) if (patch[k] !== undefined) update[k] = patch[k];
  const user = await User.findByIdAndUpdate(userId, update, { new: true });
  if (!user) throw ApiError.notFound('User not found');
  return user.toJSON();
}

async function logout(userId) {
  // For stateless JWT we just record a sign-off; client should drop the token.
  await User.updateOne({ _id: userId }, { $set: { sessions: [] } });
  AuditLog.create({ userId, action: 'auth.logout' }).catch(() => {});
  return { ok: true };
}

async function getAuditLogs({ page = 1, limit = 50, from, to, userId, action, entity, q } = {}) {
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(200, Math.max(1, Number(limit)));

  const filter = {};
  if (action) filter.action = action;
  if (entity) filter.entity = entity;
  if (userId) filter.userId = userId;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  if (q) {
    const safe = escapeRegex(q);
    filter.$or = [
      { 'meta.email': new RegExp(safe, 'i') },
      { 'meta.name': new RegExp(safe, 'i') },
      { 'meta.invoiceNumber': new RegExp(safe, 'i') },
      { 'meta.ticketNumber': new RegExp(safe, 'i') },
      { 'meta.phone': new RegExp(safe, 'i') },
      { ip: new RegExp(safe, 'i') },
    ];
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('userId', 'name email role')
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [todayLogins, todayFailed, todayOrders, todayRepairs] = await Promise.all([
    AuditLog.countDocuments({ action: 'auth.login', createdAt: { $gte: todayStart } }),
    AuditLog.countDocuments({ action: 'auth.login.failed', createdAt: { $gte: todayStart } }),
    AuditLog.countDocuments({ action: 'order.created', createdAt: { $gte: todayStart } }),
    AuditLog.countDocuments({ action: 'repair.created', createdAt: { $gte: todayStart } }),
  ]);

  return {
    items,
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum),
    stats: { todayLogins, todayFailed, todayOrders, todayRepairs },
  };
}

async function getLoginLogs({ page = 1, limit = 50, from, to, userId, action, q } = {}) {
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(200, Math.max(1, Number(limit)));

  const filter = { action: action ? action : { $in: ['auth.login', 'auth.login.failed'] } };
  if (userId) filter.userId = userId;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  if (q) {
    const safe = escapeRegex(q);
    filter.$or = [
      { 'meta.email': new RegExp(safe, 'i') },
      { 'meta.name': new RegExp(safe, 'i') },
      { ip: new RegExp(safe, 'i') },
    ];
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  // Stats for today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [todayLogins, todayFailed, todayUnique] = await Promise.all([
    AuditLog.countDocuments({ action: 'auth.login', createdAt: { $gte: todayStart } }),
    AuditLog.countDocuments({ action: 'auth.login.failed', createdAt: { $gte: todayStart } }),
    AuditLog.distinct('userId', { action: 'auth.login', createdAt: { $gte: todayStart } }),
  ]);

  return {
    items,
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum),
    stats: { todayLogins, todayFailed, todayUnique: todayUnique.length },
  };
}

async function listUsers(query) {
  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.branchId) filter.branchId = query.branchId;
  if (query.q) { const safe = escapeRegex(query.q); filter.$or = [{ name: new RegExp(safe, 'i') }, { email: new RegExp(safe, 'i') }]; }
  const users = await User.find(filter).limit(200).sort('-createdAt');
  return users.map((user) => user.toJSON());
}

module.exports = {
  signTokens,
  register,
  login,
  refresh,
  requestPasswordReset,
  resetPassword,
  changePassword,
  getProfile,
  updateProfile,
  logout,
  listUsers,
  getLoginLogs,
  getAuditLogs,
};
