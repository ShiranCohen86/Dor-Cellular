const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { audit } = require('../middleware/audit');
const validate = require('../middleware/validate');
const ordersController = require('../controllers/orders.controller');
const orderValidator = require('../validators/order.validator');

router.use(authenticate);

router.get('/',    ordersController.list);
router.get('/:id', ordersController.get);

router.post('/',        authorize('admin', 'manager', 'salesperson', 'employee', 'customer'), validate(orderValidator.create), audit('order.create'), ordersController.create);
router.post('/:id/cancel', authorize('admin', 'manager'), audit('order.cancel'), ordersController.cancel);

module.exports = router;
