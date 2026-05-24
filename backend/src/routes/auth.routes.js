const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const authController = require('../controllers/auth.controller');
const authValidator = require('../validators/auth.validator');

// Dedicated strict rate limiter for auth-sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts — please try again later' },
  skipSuccessfulRequests: false,
});

// Public
router.post('/signup',           authLimiter, validate(authValidator.signup),        authController.signup);
router.post('/login',            authLimiter, validate(authValidator.login),         authController.login);
router.post('/google',           authLimiter, validate(authValidator.googleAuth),     authController.googleAuth);
router.post('/refresh',          authLimiter, validate(authValidator.refresh),        authController.refresh);
router.post('/password/forgot',  authLimiter, validate(authValidator.requestReset),   authController.requestPasswordReset);
router.post('/password/reset',   authLimiter, validate(authValidator.resetPassword),  authController.resetPassword);

// Authenticated
router.post('/logout',           authenticate, authController.logout);
router.get('/me',                authenticate, authController.me);
router.patch('/me',              authenticate, validate(authValidator.updateProfile),  authController.updateMe);
router.post('/password/change',  authenticate, validate(authValidator.changePassword), authController.changePassword);

// Admin / Manager — user management
router.post('/register',         authenticate, authorize('admin', 'manager'), validate(authValidator.register), authController.register);
router.get('/users',             authenticate, authorize('admin', 'manager'), authController.listUsers);
router.patch('/users/:id',       authenticate, authorize('admin'),            validate(authValidator.updateUser), authController.updateUser);
router.get('/audit/logins',      authenticate, authorize('admin', 'manager'), authController.getLoginLogs);
router.get('/audit',             authenticate, authorize('admin', 'manager'), authController.getAuditLogs);

module.exports = router;
