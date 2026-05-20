const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, index: true },
    contactPerson: String,
    phone: String,
    email: { type: String, lowercase: true, trim: true },
    address: String,
    taxId: String,
    paymentTerms: String, // e.g., "Net 30"
    outstandingDebt: { type: Number, default: 0 },
    notes: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

SupplierSchema.index({ name: 'text', contactPerson: 'text', email: 'text' });

module.exports = mongoose.model('Supplier', SupplierSchema);
