const mongoose = require('mongoose');

const MOVEMENT_TYPES = [
  'purchase',   // from supplier
  'sale',       // out to customer
  'return',     // customer return
  'damaged',    // marked damaged
  'transfer_in',
  'transfer_out',
  'adjustment', // manual
];

const StockMovementSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    type: { type: String, enum: MOVEMENT_TYPES, required: true, index: true },
    quantity: { type: Number, required: true }, // signed: positive in, negative out
    reason: String,
    refType: { type: String, enum: ['Order', 'PurchaseOrder', 'Repair', 'Transfer', null], default: null },
    refId: { type: mongoose.Schema.Types.ObjectId },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

StockMovementSchema.statics.TYPES = MOVEMENT_TYPES;
StockMovementSchema.index({ productId: 1, createdAt: -1 });

module.exports = mongoose.model('StockMovement', StockMovementSchema);
