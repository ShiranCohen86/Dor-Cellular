const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/settings.controller');

router.get('/', authenticate, ctrl.get);
router.patch('/', authenticate, authorize('admin'), ctrl.update);

module.exports = router;
