const router = require('express').Router();

router.use('/public', require('./public.routes'));
router.use('/auth', require('./auth.routes'));
router.use('/products', require('./products.routes'));
router.use('/categories', require('./categories.routes'));
router.use('/customers', require('./customers.routes'));
router.use('/orders', require('./orders.routes'));
router.use('/repairs', require('./repairs.routes'));
router.use('/suppliers', require('./suppliers.routes'));
router.use('/reports', require('./reports.routes'));
router.use('/notifications', require('./notifications.routes'));
router.use('/branches', require('./branches.routes'));
router.use('/settings', require('./settings.routes'));
router.use('/admin/ai', require('./ai.routes'));

module.exports = router;
