const router = require('express').Router();
const Joi = require('joi');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const categoriesController = require('../controllers/categories.controller');
const Category = require('../models/Category');

const createSchema = {
  body: Joi.object({
    name: Joi.string().required(),
    slug: Joi.string().lowercase(),
    type: Joi.string().valid(...Category.TYPES).required(),
    description: Joi.string().allow('', null),
    isActive: Joi.boolean(),
  }),
};
const updateSchema = { body: createSchema.body.fork(['name', 'type'], (s) => s.optional()) };

router.use(authenticate);
router.get('/', categoriesController.list);
router.post('/', authorize('admin', 'manager'), validate(createSchema), categoriesController.create);
router.patch('/:id', authorize('admin', 'manager'), validate(updateSchema), categoriesController.update);
router.delete('/:id', authorize('admin'), categoriesController.remove);

module.exports = router;
