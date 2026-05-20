/**
 * @openapi
 * tags:
 *   - name: Products
 *     description: Inventory management
 */
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { audit } = require('../middleware/audit');
const validate = require('../middleware/validate');
const productsController = require('../controllers/products.controller');
const productValidator = require('../validators/product.validator');

router.use(authenticate);

/**
 * @openapi
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: List products with filters and pagination
 *     parameters:
 *       - { in: query, name: q, schema: { type: string } }
 *       - { in: query, name: categoryId, schema: { type: string } }
 *       - { in: query, name: lowStock, schema: { type: boolean } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: List of products }
 */
router.get('/', productsController.list);
router.get('/low-stock', productsController.lowStock);
router.get('/scan/:code', productsController.scan);
router.get('/:id', productsController.get);
router.get('/:id/movements', productsController.movements);

router.post('/', authorize('admin', 'manager'), validate(productValidator.create), audit('product.create'), productsController.create);
router.post('/bulk-import', authorize('admin', 'manager'), audit('product.bulkImport'), productsController.bulkImport);
router.post('/transfer', authorize('admin', 'manager'), validate(productValidator.transfer), audit('product.transfer'), productsController.transfer);
router.post('/:id/adjust', authorize('admin', 'manager'), validate(productValidator.adjust), audit('product.adjust'), productsController.adjust);

router.patch('/:id', authorize('admin', 'manager'), validate(productValidator.update), audit('product.update'), productsController.update);
router.delete('/:id', authorize('admin'), audit('product.delete'), productsController.remove);

module.exports = router;
