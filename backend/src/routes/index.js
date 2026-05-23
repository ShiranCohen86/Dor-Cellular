const router = require('express').Router();

router.use('/public',     require('./public.routes'));
router.use('/auth',       require('./auth.routes'));
router.use('/products',   require('./products.routes'));
router.use('/categories', require('./categories.routes'));
router.use('/customers',  require('./customers.routes'));
router.use('/orders',     require('./orders.routes'));
router.use('/repairs',    require('./repairs.routes'));
router.use('/suppliers',  require('./suppliers.routes'));
router.use('/settings',   require('./settings.routes'));

module.exports = router;
