const mongoose = require('mongoose');

const NOTIF_TYPES = [
  'low_stock',
  'repair_status',
  'overdue_payment',
  'warranty_expiring',
  'system',
  'audit_alert',
];

const NotificationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: NOTIF_TYPES, required: true, index: true },
    title: { type: String, required: true },
    message: String,
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info', index: true },
    targetRole: { type: String, enum: ['admin', 'manager', 'salesperson', 'technician', 'all'], default: 'all' },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    refType: String,
    refId: mongoose.Schema.Types.ObjectId,
    isRead: { type: Boolean, default: false, index: true },
    readAt: Date,
  },
  { timestamps: true },
);

NotificationSchema.statics.TYPES = NOTIF_TYPES;
NotificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
