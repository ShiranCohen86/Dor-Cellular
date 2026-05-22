const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');
const AuditLog = require('../models/AuditLog');

function clientIp(req) {
  // With app.set('trust proxy', 1), req.ip already returns the real client IP.
  return (req.ip || '').replace(/^::ffff:/, '');
}

exports.register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body, req.user?.role);
  res.status(201).json({ user });
});

exports.login = asyncHandler(async (req, res) => {
  const result = await authService.login({
    ...req.body,
    userAgent: req.headers['user-agent'] || '',
    acceptLanguage: req.headers['accept-language'] || '',
    ip: clientIp(req),
  });
  res.json(result);
});

exports.googleAuth = asyncHandler(async (req, res) => {
  const result = await authService.googleAuth({
    idToken: req.body.idToken,
    userAgent: req.headers['user-agent'] || '',
    ip: clientIp(req),
  });
  res.json(result);
});

exports.refresh = asyncHandler(async (req, res) => {
  const tokens = await authService.refresh(req.body.refreshToken);
  res.json(tokens);
});

exports.logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id);
  res.json({ ok: true });
});

exports.me = asyncHandler(async (req, res) => {
  const profile = await authService.getProfile(req.user.id);
  res.json(profile);
});

exports.updateMe = asyncHandler(async (req, res) => {
  const profile = await authService.updateProfile(req.user.id, req.body);
  res.json(profile);
});

exports.requestPasswordReset = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset(req.body.email);
  res.json(result);
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  res.json(result);
});

exports.changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
  res.json(result);
});

exports.listUsers = asyncHandler(async (req, res) => {
  const users = await authService.listUsers(req.query);
  res.json({ items: users });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const User = require('../models/User');
  const allowed = ['role', 'isActive'];
  const patch = {};
  for (const key of allowed) { if (req.body[key] !== undefined) patch[key] = req.body[key]; }

  const before = await User.findById(req.params.id);
  if (!before) return res.status(404).json({ error: 'User not found' });

  const user = await User.findByIdAndUpdate(req.params.id, patch, { new: true });

  AuditLog.create({
    userId: req.user.id,
    action: 'auth.user.updated',
    meta: {
      targetUserId: req.params.id,
      targetEmail:  before.email,
      changes: Object.fromEntries(
        Object.keys(patch).map((k) => [k, { from: before[k], to: patch[k] }])
      ),
    },
  }).catch(() => {});

  res.json(user.toJSON());
});

exports.getLoginLogs = asyncHandler(async (req, res) => {
  const result = await authService.getLoginLogs(req.query);
  res.json(result);
});

exports.getAuditLogs = asyncHandler(async (req, res) => {
  const result = await authService.getAuditLogs(req.query);
  res.json(result);
});
