/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Authentication, registration, password reset, profile
 */
const router = require('express').Router();
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const authController = require('../controllers/auth.controller');
const authValidator = require('../validators/auth.validator');

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email + password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Tokens + user }
 */
router.post('/login', validate(authValidator.login), authController.login);
router.post('/refresh', validate(authValidator.refresh), authController.refresh);
router.post('/password/forgot', validate(authValidator.requestReset), authController.requestPasswordReset);
router.post('/password/reset', validate(authValidator.resetPassword), authController.resetPassword);

// Authenticated
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, validate(authValidator.updateProfile), authController.updateMe);
router.post('/password/change', authenticate, validate(authValidator.changePassword), authController.changePassword);

// Admin / Manager — user management
router.post('/register', authenticate, authorize('admin', 'manager'), validate(authValidator.register), authController.register);
router.get('/users', authenticate, authorize('admin', 'manager'), authController.listUsers);
router.get('/audit/logins', authenticate, authorize('admin', 'manager'), authController.getLoginLogs);
router.get('/audit', authenticate, authorize('admin', 'manager'), authController.getAuditLogs);

module.exports = router;
