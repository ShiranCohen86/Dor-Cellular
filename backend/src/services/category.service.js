const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');

/** Converts an arbitrary string into a URL-safe slug. */
const slugify = (rawString) =>
  rawString.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Lists categories with optional `type` and `isActive` filters. */
async function list(query) {
  const filter = {};
  if (query.type) filter.type = query.type;
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
  return Category.find(filter).sort('name').lean();
}

/** Creates a new category, auto-generating the slug from the name if missing. */
async function create(data) {
  const slug = data.slug || slugify(data.name);
  const duplicateCategory = await Category.findOne({ slug });
  if (duplicateCategory) throw ApiError.conflict('Category slug exists');
  return Category.create({ ...data, slug });
}

/** Updates a category. Re-derives the slug if the name changed but slug did not. */
async function update(id, patch) {
  if (patch.name && !patch.slug) patch.slug = slugify(patch.name);
  const updatedCategory = await Category.findByIdAndUpdate(id, patch, { new: true });
  if (!updatedCategory) throw ApiError.notFound('Category not found');
  return updatedCategory;
}

/** Soft-deletes a category by flipping isActive=false. */
async function remove(id) {
  const removedCategory = await Category.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!removedCategory) throw ApiError.notFound('Category not found');
  return { ok: true };
}

module.exports = { list, create, update, remove };
