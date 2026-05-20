const mongoose = require('mongoose');

const CATEGORY_TYPES = [
  'smartphone',
  'tablet',
  'charger',
  'case',
  'screen_protector',
  'sim',
  'esim',
  'repair_part',
  'accessory',
  'other',
];

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    type: { type: String, enum: CATEGORY_TYPES, required: true, index: true },
    description: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

CategorySchema.statics.TYPES = CATEGORY_TYPES;

module.exports = mongoose.model('Category', CategorySchema);
