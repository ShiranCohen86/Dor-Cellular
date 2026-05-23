const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    phone: { type: String, trim: true, unique: true, sparse: true },
    email: { type: String, lowercase: true, trim: true, sparse: true, unique: true },
    idNumber: { type: String, trim: true, sparse: true }, // teudat zehut / national id
    address: String,
    city: String,
    birthday: Date,
    notes: String,

    loyaltyPoints: { type: Number, default: 0, min: 0 },
    isVip: { type: Boolean, default: false, index: true },
    marketingConsent: { type: Boolean, default: false },

    outstandingDebt: { type: Number, default: 0 }, // updated on partial payments

    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

CustomerSchema.index({ name: 'text', phone: 'text', email: 'text', idNumber: 'text' });

module.exports = mongoose.model('Customer', CustomerSchema);
