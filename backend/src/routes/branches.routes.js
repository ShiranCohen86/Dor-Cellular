/**
 * @openapi
 * tags:
 *   - name: Branches
 */
const router = require('express').Router();
const Joi = require('joi');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const branchesController = require('../controllers/branches.controller');

const branchSchema = {
  body: Joi.object({
    name: Joi.string().required(),
    code: Joi.string().uppercase().required(),
    address: Joi.string().allow('', null),
    city: Joi.string().allow('', null),
    phone: Joi.string().allow('', null),
    isActive: Joi.boolean(),
  }),
};

router.use(authenticate);
router.get('/', branchesController.list);
router.get('/:id', branchesController.get);
router.get('/:id/inventory', branchesController.inventory);
router.post('/', authorize('admin'), validate(branchSchema), branchesController.create);
router.patch('/:id', authorize('admin'), validate({ body: branchSchema.body.fork(['name', 'code'], (s) => s.optional()) }), branchesController.update);

module.exports = router;
