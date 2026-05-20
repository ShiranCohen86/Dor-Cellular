const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');

const ROLES = ['admin', 'manager', 'salesperson', 'technician'];

const SessionSchema = new mongoose.Schema(
  {
    tokenId: { type: String, required: true },
    userAgent: String,
    ip: String,
    lastSeen: { type: Date, default: Date.now },
  },
  { _id: false },
);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'salesperson', index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    isActive: { type: Boolean, default: true },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    lastLogin: Date,
    sessions: { type: [SessionSchema], default: [] },
  },
  { timestamps: true },
);

UserSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
};

UserSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

UserSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ virtuals: true });
  delete obj.passwordHash;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.__v;
  return obj;
};

UserSchema.statics.ROLES = ROLES;

module.exports = mongoose.model('User', UserSchema);
