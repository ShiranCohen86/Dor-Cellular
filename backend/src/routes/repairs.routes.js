/**
 * @openapi
 * tags:
 *   - name: Repairs
 *     description: Repair lab tickets
 */
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { audit } = require('../middleware/audit');
const validate = require('../middleware/validate');
const repairsController = require('../controllers/repairs.controller');
const repairValidator = require('../validators/repair.validator');

router.use(authenticate);

router.get('/performance', authorize('admin', 'manager'), repairsController.performance);
router.get('/', repairsController.list);
router.get('/:id', repairsController.get);
router.post('/', authorize('admin', 'manager', 'salesperson', 'technician', 'employee'), validate(repairValidator.create), audit('repair.create'), repairsController.create);
router.patch('/:id', authorize('admin', 'manager', 'technician', 'employee'), validate(repairValidator.update), audit('repair.update'), repairsController.update);
router.post('/:id/status', authorize('admin', 'manager', 'technician', 'employee'), validate(repairValidator.status), audit('repair.status'), repairsController.changeStatus);
router.post('/:id/sign', authorize('admin', 'manager', 'salesperson', 'technician', 'employee'), validate(repairValidator.sign), audit('repair.sign'), repairsController.signDelivery);

module.exports = router;
