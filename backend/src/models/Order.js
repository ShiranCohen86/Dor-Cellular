const mongoose = require('mongoose');

const ORDER_STATUS = ['draft', 'completed', 'refunded', 'partially_refunded', 'cancelled'];
const PAYMENT_METHODS = ['cash', 'credit_card', 'bit', 'paypal', 'installments', 'store_credit'];

const OrderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    sku: String,
    imei: String,
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 }, // absolute amount
    taxRate: { type: Number, default: 17 },
    lineTotal: { type: Number, required: true, min: 0 }, // (unitPrice*qty - discount) including tax
    warrantyMonths: Number,
  },
  { _id: true },
);

const PaymentSchema = new mongoose.Schema(
  {
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    amount: { type: Number, required: true, min: 0 },
    reference: String,
    installments: { type: Number, default: 1, min: 1 },
    paidAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const TradeInSchema = new mongoose.Schema(
  {
    description: String,
    imei: String,
    condition: String,
    creditAmount: { type: Number, default: 0 },
  },
  { _id: false },
);

const OrderSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    salespersonId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    items: { type: [OrderItemSchema], default: [] },
    payments: { type: [PaymentSchema], default: [] },
    tradeIn: TradeInSchema,

    // Order-level discount applied on subtotal
    discountType: { type: String, enum: ['fixed', 'percent', 'coupon', 'none'], default: 'none' },
    discountValue: { type: Number, default: 0, min: 0 },
    couponCode: String,

    subtotal: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, default: 0 }, // can be negative for refunds

    status: { type: String, enum: ORDER_STATUS, default: 'draft', index: true },
    notes: String,

    refundedAmount: { type: Number, default: 0, min: 0 },
    refundReason: String,
    refundedAt: Date,
  },
  { timestamps: true },
);

OrderSchema.statics.STATUS = ORDER_STATUS;
OrderSchema.statics.PAYMENT_METHODS = PAYMENT_METHODS;
OrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', OrderSchema);
