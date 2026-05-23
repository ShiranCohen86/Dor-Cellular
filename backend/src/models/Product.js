const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    sku:          { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    barcode:      { type: String, trim: true, index: true, sparse: true, unique: true },
    imei:         { type: String, trim: true, sparse: true, unique: true, index: true },
    serialNumber: { type: String, trim: true, sparse: true, index: true },

    name:        { type: String, required: true, trim: true },
    brand:       { type: String, required: true, trim: true, index: true },
    model:       { type: String, trim: true, index: true },
    description: String,

    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', index: true },

    purchasePrice: { type: Number, required: true, min: 0 },
    salePrice:     { type: Number, required: true, min: 0 },

    color:     String,
    storageGB: Number,
    ramGB:     Number,

    images:   { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ProductSchema.index({ name: 'text', brand: 'text', model: 'text', description: 'text' });

module.exports = mongoose.model('Product', ProductSchema);
