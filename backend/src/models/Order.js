const mongoose = require('mongoose');

const ORDER_STATUS = ['draft', 'completed', 'cancelled'];

const OrderItemSchema = new mongoose.Schema(
  {
    productId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name:       String,
    sku:        String,
    quantity:   { type: Number, required: true, min: 1 },
    unitPrice:  { type: Number, required: true, min: 0 },
    lineTotal:  { type: Number, required: true, min: 0 },
  },
  { _id: true },
);

const OrderSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    branchId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    customerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    salespersonId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items:         { type: [OrderItemSchema], default: [] },
    subtotal:      { type: Number, default: 0, min: 0 },
    total:         { type: Number, default: 0, min: 0 },
    status:        { type: String, enum: ORDER_STATUS, default: 'draft', index: true },
    notes:         String,
  },
  { timestamps: true },
);

OrderSchema.statics.STATUS = ORDER_STATUS;
OrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', OrderSchema);
