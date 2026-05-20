/**
 * @openapi
 * tags:
 *   - name: Reports
 */
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const reportsController = require('../controllers/reports.controller');

router.use(authenticate);

router.get('/dashboard', reportsController.dashboard);
router.get('/daily-sales', authorize('admin', 'manager'), reportsController.dailySales);
router.get('/monthly-profit', authorize('admin', 'manager'), reportsController.monthlyProfit);
router.get('/best-sellers', authorize('admin', 'manager'), reportsController.bestSellers);
router.get('/dead-stock', authorize('admin', 'manager'), reportsController.deadStock);
router.get('/employees', authorize('admin', 'manager'), reportsController.employees);
router.get('/vat', authorize('admin', 'manager'), reportsController.vat);
router.get('/orders-per-month', authorize('admin', 'manager'), reportsController.ordersPerMonth);
router.get('/export.csv', authorize('admin', 'manager'), reportsController.exportCsv);

module.exports = router;
