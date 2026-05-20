const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    barcode: { type: String, trim: true, index: true, sparse: true, unique: true },
    // imei/serial is unique only when present (sparse). For trackable devices like phones.
    imei: { type: String, trim: true, sparse: true, unique: true, index: true },
    serialNumber: { type: String, trim: true, sparse: true, index: true },

    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true, index: true },
    model: { type: String, trim: true, index: true },
    description: String,

    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', index: true },

    purchasePrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 17, min: 0, max: 100 }, // VAT default for IL

    warrantyMonths: { type: Number, default: 12, min: 0 },

    // Per-branch stock map. Keys are Branch _id strings.
    stockByBranch: { type: Map, of: Number, default: {} },
    totalStock: { type: Number, default: 0, min: 0, index: true },
    minStockAlert: { type: Number, default: 5, min: 0 },

    color: String,
    storageGB: Number,
    ramGB: Number,

    images: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    isTrackedBySerial: { type: Boolean, default: false }, // true for phones/tablets
  },
  { timestamps: true },
);

ProductSchema.index({ name: 'text', brand: 'text', model: 'text', description: 'text' });
ProductSchema.index({ totalStock: 1, minStockAlert: 1 });

ProductSchema.methods.isLowStock = function isLowStock() {
  return this.totalStock <= this.minStockAlert;
};

ProductSchema.methods.recomputeTotalStock = function recomputeTotalStock() {
  let sum = 0;
  for (const v of this.stockByBranch.values()) sum += v || 0;
  this.totalStock = sum;
};

module.exports = mongoose.model('Product', ProductSchema);
