const mongoose = require('mongoose');

const REPAIR_STATUS = [
  'received',
  'diagnosed',
  'waiting_for_parts',
  'in_repair',
  'ready',
  'delivered',
  'cancelled',
];

const StatusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: REPAIR_STATUS, required: true },
    notes: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const RepairSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    deviceBrand: { type: String, required: true },
    deviceModel: { type: String, required: true },
    imei: { type: String, trim: true, index: true },
    color: String,
    accessories: String, // what came in (charger, case...)

    faultDescription: { type: String, required: true },
    diagnosis: String,
    technicianNotes: String,

    status: { type: String, enum: REPAIR_STATUS, default: 'received', index: true },
    history: { type: [StatusHistorySchema], default: [] },

    estimatedCost: { type: Number, default: 0, min: 0 },
    finalCost: { type: Number, default: 0, min: 0 },
    partsCost: { type: Number, default: 0, min: 0 },
    laborCost: { type: Number, default: 0, min: 0 },
    paid: { type: Boolean, default: false },

    intakeSignature: String, // base64 or url
    deliverySignature: String,

    promisedDate: Date,
    deliveredAt: Date,
  },
  { timestamps: true },
);

RepairSchema.statics.STATUS = REPAIR_STATUS;

module.exports = mongoose.model('Repair', RepairSchema);
