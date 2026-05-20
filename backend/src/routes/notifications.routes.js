/**
 * @openapi
 * tags:
 *   - name: Notifications
 */
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const notificationsController = require('../controllers/notifications.controller');

router.use(authenticate);
router.get('/', notificationsController.list);
router.post('/read-all', notificationsController.markAllRead);
router.post('/:id/read', notificationsController.markRead);

module.exports = router;
