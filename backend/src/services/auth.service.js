const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const Customer = require('../models/Customer');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/pagination');

// ── Token helpers ──────────────────────────────────────────────────────────

function hashJti(jti) {
  return crypto.createHash('sha256').update(jti).digest('hex');
}

function signTokens(user) {
  const payload = { sub: String(user._id), role: user.role };
  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
  const jti = crypto.randomBytes(16).toString('hex');
  const refreshToken = jwt.sign({ ...payload, jti }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken, jtiHash: hashJti(jti) };
}

function pushSession(user, { jtiHash, userAgent, ip }) {
  user.sessions.push({ jtiHash, userAgent, ip, lastSeen: new Date() });
  if (user.sessions.length > 10) user.sessions = user.sessions.slice(-10);
}

// ── Register ───────────────────────────────────────────────────────────────

async function register({ name, email, password, phone, address, role = 'employee', branchId }, actorRole) {
  if (role === 'admin' && actorRole !== 'admin') {
    throw ApiError.forbidden('Only admins can create admin users');
  }
  // Prevent managers from creating peers or above
  if (actorRole === 'manager' && !['employee', 'salesperson', 'technician'].includes(role)) {
    throw ApiError.forbidden('Managers can only create employee-level accounts');
  }
  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('Email already in use');

  const user = new User({ name, email, phone, role, branchId });
  await user.setPassword(password);
  await user.save();

  const trimmedPhone = (phone || '').trim();
  if (trimmedPhone) {
    try {
      let customer = await Customer.findOne({ phone: trimmedPhone });
      if (!customer) {
        const customerData = { name, phone: trimmedPhone };
        if (email) customerData.email = email;
        if (address && address.trim()) customerData.address = address.trim();
        customer = await Customer.create(customerData);
      }
      user.customerId = customer._id;
      await user.save();
    } catch (err) {
      logger.warn('register: could not create/link customer', { userId: String(user._id), phone: trimmedPhone, err: err.message });
    }
  }

  AuditLog.create({ userId: user._id, action: 'auth.user.registered', meta: { email: user.email, name: user.name, role: user.role } }).catch(() => {});
  return user;
}

// ── Login ──────────────────────────────────────────────────────────────────

async function login({ email, password, userAgent, ip, acceptLanguage }) {
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user || !user.isActive) {
    AuditLog.create({ action: 'auth.login.failed', ip, userAgent, meta: { email, acceptLanguage } }).catch(() => {});
    throw ApiError.unauthorized('Invalid credentials');
  }

  const ok = await user.verifyPassword(password);
  if (!ok) {
    AuditLog.create({ userId: user._id, action: 'auth.login.failed', ip, userAgent, meta: { email, acceptLanguage } }).catch(() => {});
    throw ApiError.unauthorized('Invalid credentials');
  }

  const { accessToken, refreshToken, jtiHash } = signTokens(user);
  pushSession(user, { jtiHash, userAgent, ip });
  user.lastLogin = new Date();
  await user.save();

  AuditLog.create({ userId: user._id, action: 'auth.login', ip, userAgent, meta: { email: user.email, name: user.name, role: user.role } }).catch(() => {});

  return { user: user.toJSON(), accessToken, refreshToken };
}

// ── Google OAuth ───────────────────────────────────────────────────────────

async function googleAuth({ idToken, userAgent, ip }) {
  if (!env.GOOGLE_CLIENT_ID) throw ApiError.badRequest('Google Sign-In is not configured');

  const { OAuth2Client } = require('google-auth-library');
  const oauthClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

  let ticket;
  try {
    ticket = await oauthClient.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
  } catch {
    throw ApiError.unauthorized('Invalid Google token');
  }

  const { sub: googleId, email, name } = ticket.getPayload();

  let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

  if (user) {
    if (!user.isActive) throw ApiError.unauthorized('Account is disabled');
    if (!user.googleId) user.googleId = googleId;
    if (!user.customerId) {
      const linkedCustomer = await Customer.findOne({ email: email.toLowerCase() }).lean();
      if (linkedCustomer) user.customerId = linkedCustomer._id;
    }
  } else {
    const linkedCustomer = await Customer.findOne({ email: email.toLowerCase() }).lean();
    user = new User({
      name: name || email.split('@')[0],
      email: email.toLowerCase(),
      googleId,
      role: 'customer',
      isActive: true,
      customerId: linkedCustomer?._id ?? null,
    });
    await user.save();
    AuditLog.create({ userId: user._id, action: 'auth.user.registered', meta: { email, name, via: 'google' } }).catch(() => {});
  }

  const { accessToken, refreshToken, jtiHash } = signTokens(user);
  pushSession(user, { jtiHash, userAgent, ip });
  user.lastLogin = new Date();
  await user.save();

  AuditLog.create({ userId: user._id, action: 'auth.login', ip, userAgent, meta: { email: user.email, name: user.name, role: user.role, via: 'google' } }).catch(() => {});

  return { user: user.toJSON(), accessToken, refreshToken };
}

// ── Refresh (with rotation) ────────────────────────────────────────────────

async function refresh(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch (jwtError) {
    logger.warn('JWT refresh token verification failed', { message: jwtError.message });
    throw ApiError.unauthorized('Invalid refresh token');
  }

  if (!payload.jti) throw ApiError.unauthorized('Invalid refresh token format');

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized();

  const jtiHash = hashJti(payload.jti);
  const sessionIdx = user.sessions.findIndex((s) => s.jtiHash === jtiHash);
  if (sessionIdx === -1) throw ApiError.unauthorized('Refresh token revoked or already used');

  const oldSession = user.sessions[sessionIdx];
  user.sessions.splice(sessionIdx, 1);

  const { accessToken, refreshToken: newRefresh, jtiHash: newJtiHash } = signTokens(user);
  pushSession(user, { jtiHash: newJtiHash, userAgent: oldSession.userAgent, ip: oldSession.ip });
  await user.save();

  return { accessToken, refreshToken: newRefresh };
}

// ── Password reset ─────────────────────────────────────────────────────────

async function requestPasswordReset(email) {
  const user = await User.findOne({ email });
  if (!user) return { ok: true };

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  // Return token only when explicitly opted in for local development
  return { ok: true, devToken: env.RETURN_DEV_TOKEN ? rawToken : undefined };
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
  user.sessions = [];
  await user.save();
  AuditLog.create({ userId: user._id, action: 'auth.password.reset', meta: { email: user.email } }).catch(() => {});
  return { ok: true };
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');
  const ok = await user.verifyPassword(currentPassword);
  if (!ok) throw ApiError.unauthorized('Current password incorrect');
  await user.setPassword(newPassword);
  await user.save();
  AuditLog.create({ userId, action: 'auth.password.changed', meta: { email: user.email } }).catch(() => {});
  return { ok: true };
}

// ── Profile ────────────────────────────────────────────────────────────────

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

// ── Logout ─────────────────────────────────────────────────────────────────

async function logout(userId) {
  await User.updateOne({ _id: userId }, { $set: { sessions: [] } });
  AuditLog.create({ userId, action: 'auth.logout' }).catch(() => {});
  return { ok: true };
}

// ── Audit logs ─────────────────────────────────────────────────────────────

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
    if (to)   filter.createdAt.$lte = new Date(to);
  }
  if (q) {
    const safe = escapeRegex(q);
    filter.$or = [
      { 'meta.email': new RegExp(safe, 'i') },
      { 'meta.name':  new RegExp(safe, 'i') },
      { 'meta.invoiceNumber': new RegExp(safe, 'i') },
      { 'meta.ticketNumber':  new RegExp(safe, 'i') },
      { ip: new RegExp(safe, 'i') },
    ];
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).populate('userId', 'name email role').lean(),
    AuditLog.countDocuments(filter),
  ]);

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const [todayLogins, todayFailed, todayOrders, todayRepairs] = await Promise.all([
    AuditLog.countDocuments({ action: 'auth.login',        createdAt: { $gte: todayStart } }),
    AuditLog.countDocuments({ action: 'auth.login.failed', createdAt: { $gte: todayStart } }),
    AuditLog.countDocuments({ action: 'order.created',     createdAt: { $gte: todayStart } }),
    AuditLog.countDocuments({ action: 'repair.created',    createdAt: { $gte: todayStart } }),
  ]);

  return { items, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum), stats: { todayLogins, todayFailed, todayOrders, todayRepairs } };
}

async function getLoginLogs({ page = 1, limit = 50, from, to, userId, action, q } = {}) {
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(200, Math.max(1, Number(limit)));

  const filter = { action: action ? action : { $in: ['auth.login', 'auth.login.failed'] } };
  if (userId) filter.userId = userId;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(to);
  }
  if (q) {
    const safe = escapeRegex(q);
    filter.$or = [
      { 'meta.email': new RegExp(safe, 'i') },
      { 'meta.name':  new RegExp(safe, 'i') },
      { ip: new RegExp(safe, 'i') },
    ];
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
    AuditLog.countDocuments(filter),
  ]);

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const [todayLogins, todayFailed, todayUnique] = await Promise.all([
    AuditLog.countDocuments({ action: 'auth.login',        createdAt: { $gte: todayStart } }),
    AuditLog.countDocuments({ action: 'auth.login.failed', createdAt: { $gte: todayStart } }),
    AuditLog.distinct('userId', { action: 'auth.login',    createdAt: { $gte: todayStart } }),
  ]);

  return { items, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum), stats: { todayLogins, todayFailed, todayUnique: todayUnique.length } };
}

// ── Users list ─────────────────────────────────────────────────────────────

async function listUsers(query) {
  const filter = {};
  if (query.role)     filter.role = query.role;
  if (query.branchId) filter.branchId = query.branchId;
  if (query.q) {
    const safe = escapeRegex(query.q);
    filter.$or = [{ name: new RegExp(safe, 'i') }, { email: new RegExp(safe, 'i') }];
  }
  const users = await User.find(filter).limit(200).sort('-createdAt');
  // toJSON already strips sessions, passwordHash, etc.
  return users.map((u) => u.toJSON());
}

module.exports = {
  signTokens,
  register,
  login,
  googleAuth,
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
