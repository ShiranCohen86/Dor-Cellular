/**
 * @openapi
 * tags:
 *   - name: Public
 *     description: Storefront endpoints — no authentication required.
 */
const router = require('express').Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const Repair = require('../models/Repair');
const { paginate } = require('../utils/pagination');
const asyncHandler = require('../utils/asyncHandler');

// Fields that are safe to show to anonymous visitors.
// Internal data (purchase price, supplier, stock counts per branch) is intentionally excluded.
const PUBLIC_FIELDS = 'name brand model description salePrice taxRate warrantyMonths color storageGB ramGB images categoryId sku';

router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const filter = { isActive: true };
    if (req.query.categoryId) filter.categoryId = req.query.categoryId;
    if (req.query.brand) filter.brand = req.query.brand;
    if (req.query.q) {
      filter.$or = [
        { name: new RegExp(req.query.q, 'i') },
        { brand: new RegExp(req.query.q, 'i') },
        { model: new RegExp(req.query.q, 'i') },
      ];
    }
    if (req.query.inStockOnly === 'true') filter.totalStock = { $gt: 0 };

    const result = await paginate(Product, filter, req.query, {
      projection: PUBLIC_FIELDS + ' totalStock',
      populate: { path: 'categoryId', select: 'name slug type' },
    });

    // Map totalStock -> boolean isInStock so we don't expose exact counts.
    result.items = result.items.map((p) => ({
      ...p,
      isInStock: p.totalStock > 0,
      totalStock: undefined,
    }));
    res.json(result);
  }),
);

router.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({ _id: req.params.id, isActive: true })
      .select(PUBLIC_FIELDS + ' totalStock')
      .populate('categoryId', 'name slug type')
      .lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    product.isInStock = product.totalStock > 0;
    delete product.totalStock;
    res.json(product);
  }),
);

router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const items = await Category.find({ isActive: true }).select('name slug type').sort('name').lean();
    res.json({ items });
  }),
);

router.get(
  '/brands',
  asyncHandler(async (_req, res) => {
    const items = await Product.distinct('brand', { isActive: true });
    res.json({ items: items.filter(Boolean).sort() });
  }),
);

// Public repair status lookup — no auth, no PII (no customer name/phone/price)
router.get(
  '/repairs/:ticketId',
  asyncHandler(async (req, res) => {
    const repair = await Repair.findOne({ ticketNumber: req.params.ticketId })
      .select('ticketNumber deviceBrand deviceModel status createdAt updatedAt')
      .lean();
    if (!repair) return res.status(404).json({ error: 'Repair not found' });
    res.json(repair);
  }),
);

module.exports = router;
