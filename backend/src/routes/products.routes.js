const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { audit } = require('../middleware/audit');
const validate = require('../middleware/validate');
const productsController = require('../controllers/products.controller');
const productValidator = require('../validators/product.validator');

router.use(authenticate);

router.get('/', productsController.list);
router.get('/scan/:code', productsController.scan);
router.get('/:id', productsController.get);

router.post('/', authorize('admin', 'manager'), validate(productValidator.create), audit('product.create'), productsController.create);
router.post('/bulk-import', authorize('admin', 'manager'), audit('product.bulkImport'), productsController.bulkImport);

router.patch('/:id', authorize('admin', 'manager'), validate(productValidator.update), audit('product.update'), productsController.update);
router.delete('/:id', authorize('admin'), audit('product.delete'), productsController.remove);

module.exports = router;
