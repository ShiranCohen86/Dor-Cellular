const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');

exports.register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body, req.user?.role);
  res.status(201).json({ user });
});

exports.login = asyncHandler(async (req, res) => {
  // Prefer X-Forwarded-For (set by reverse proxies/load balancers).
  // Strip IPv4-mapped IPv6 prefix (::ffff:) so stored IPs are always clean dotted-decimal.
  const rawIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '';
  const ip = rawIp.replace(/^::ffff:/, '');

  const result = await authService.login({
    ...req.body,
    userAgent: req.headers['user-agent'] || '',
    acceptLanguage: req.headers['accept-language'] || '',
    ip,
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

exports.getLoginLogs = asyncHandler(async (req, res) => {
  const result = await authService.getLoginLogs(req.query);
  res.json(result);
});

exports.getAuditLogs = asyncHandler(async (req, res) => {
  const result = await authService.getAuditLogs(req.query);
  res.json(result);
});
