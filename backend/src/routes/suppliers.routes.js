/**
 * @openapi
 * tags:
 *   - name: Suppliers
 */
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { audit } = require('../middleware/audit');
const validate = require('../middleware/validate');
const suppliersController = require('../controllers/suppliers.controller');
const supplierValidator = require('../validators/supplier.validator');

router.use(authenticate);

// Purchase orders
router.get('/purchase-orders', suppliersController.listPOs);
router.get('/purchase-orders/:id', suppliersController.getPO);
router.post('/purchase-orders', authorize('admin', 'manager'), validate(supplierValidator.createPO), audit('po.create'), suppliersController.createPO);
router.post('/purchase-orders/:id/status', authorize('admin', 'manager'), validate(supplierValidator.poStatus), audit('po.status'), suppliersController.updatePOStatus);
router.post('/purchase-orders/:id/receive', authorize('admin', 'manager'), validate(supplierValidator.receive), audit('po.receive'), suppliersController.receivePO);

// Suppliers
router.get('/', suppliersController.list);
router.get('/:id', suppliersController.get);
router.post('/', authorize('admin', 'manager'), validate(supplierValidator.createSupplier), audit('supplier.create'), suppliersController.create);
router.patch('/:id', authorize('admin', 'manager'), validate(supplierValidator.updateSupplier), audit('supplier.update'), suppliersController.update);
router.post('/:id/pay', authorize('admin', 'manager'), validate(supplierValidator.pay), audit('supplier.pay'), suppliersController.pay);

module.exports = router;
