/**
 * @openapi
 * tags:
 *   - name: Customers
 */
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { audit } = require('../middleware/audit');
const validate = require('../middleware/validate');
const customersController = require('../controllers/customers.controller');
const customerValidator = require('../validators/customer.validator');

router.use(authenticate);
router.get('/birthdays', customersController.birthdays);
router.get('/', customersController.list);
router.get('/:id', customersController.get);
router.get('/:id/purchases', customersController.purchases);
router.get('/:id/repairs', customersController.repairs);
router.post('/', authorize('admin', 'manager', 'salesperson'), validate(customerValidator.create), audit('customer.create'), customersController.create);
router.patch('/:id', authorize('admin', 'manager', 'salesperson'), validate(customerValidator.update), audit('customer.update'), customersController.update);
router.post('/:id/loyalty', authorize('admin', 'manager'), validate(customerValidator.loyalty), audit('customer.loyalty'), customersController.loyalty);
router.delete('/:id', authorize('admin'), audit('customer.delete'), customersController.remove);

module.exports = router;
