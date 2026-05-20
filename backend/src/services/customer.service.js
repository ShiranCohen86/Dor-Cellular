const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Repair = require('../models/Repair');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');
const { paginate, escapeRegex } = require('../utils/pagination');

/** Paginated customer search. Supports text search, VIP filter, debt filter. */
async function list(query) {
  const filter = { isActive: true };
  if (query.isVip === 'true') filter.isVip = true;
  if (query.hasDebt === 'true') filter.outstandingDebt = { $gt: 0 };
  if (query.q) {
    const safe = escapeRegex(query.q);
    filter.$or = [
      { name: new RegExp(safe, 'i') },
      { phone: new RegExp(safe, 'i') },
      { email: new RegExp(safe, 'i') },
      { idNumber: new RegExp(safe, 'i') },
    ];
  }
  return paginate(Customer, filter, query);
}

/** Loads a customer by id or throws 404. */
async function getById(id) {
  const customer = await Customer.findById(id);
  if (!customer) throw ApiError.notFound('Customer not found');
  return customer;
}

/** Creates a new customer. Phone uniqueness is enforced by a sparse index. */
async function create(data, actorId) {
  const duplicateCustomer = await Customer.findOne({ phone: data.phone });
  if (duplicateCustomer) throw ApiError.conflict('Customer with this phone already exists');
  const customer = await Customer.create(data);
  AuditLog.create({ userId: actorId, action: 'customer.created', entity: 'Customer', entityId: customer._id, meta: { name: customer.name, phone: customer.phone, email: customer.email } }).catch(() => {});
  return customer;
}

/** Partial update. */
async function update(id, patch, actorId) {
  const updatedCustomer = await Customer.findByIdAndUpdate(id, patch, { new: true });
  if (!updatedCustomer) throw ApiError.notFound('Customer not found');
  AuditLog.create({ userId: actorId, action: 'customer.updated', entity: 'Customer', entityId: id, meta: { name: updatedCustomer.name, phone: updatedCustomer.phone } }).catch(() => {});
  return updatedCustomer;
}

/** Soft-delete (sets isActive=false, preserving order/repair references). */
async function remove(id, actorId) {
  const removedCustomer = await Customer.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!removedCustomer) throw ApiError.notFound('Customer not found');
  AuditLog.create({ userId: actorId, action: 'customer.deleted', entity: 'Customer', entityId: id, meta: { name: removedCustomer.name, phone: removedCustomer.phone } }).catch(() => {});
  return { ok: true };
}

/** Most recent 100 orders for the customer. */
async function purchaseHistory(id) {
  return Order.find({ customerId: id }).sort('-createdAt').limit(100).lean();
}

/** Most recent 100 repair tickets for the customer. */
async function repairHistory(id) {
  return Repair.find({ customerId: id }).sort('-createdAt').limit(100).lean();
}

/** Adjusts loyalty points (positive = grant, negative = redeem). Clamps to ≥ 0. */
async function adjustLoyalty(id, delta) {
  const customer = await Customer.findByIdAndUpdate(id, { $inc: { loyaltyPoints: delta } }, { new: true });
  if (!customer) throw ApiError.notFound('Customer not found');
  if (customer.loyaltyPoints < 0) {
    await Customer.updateOne({ _id: id }, { $set: { loyaltyPoints: 0 } });
    customer.loyaltyPoints = 0;
  }
  return customer;
}

/**
 * Returns customers whose birthday falls within the next `days` days
 * AND who consented to marketing — used for birthday SMS campaigns.
 */
async function upcomingBirthdays(days = 14) {
  const now = new Date();
  const optedInCustomers = await Customer.find({
    birthday: { $ne: null },
    marketingConsent: true,
    isActive: true,
  }).lean();
  return optedInCustomers.filter((customer) => {
    if (!customer.birthday) return false;
    const birthdate = new Date(customer.birthday);
    const nextBirthday = new Date(now.getFullYear(), birthdate.getMonth(), birthdate.getDate());
    if (nextBirthday < now) nextBirthday.setFullYear(now.getFullYear() + 1);
    const daysUntil = (nextBirthday - now) / (1000 * 60 * 60 * 24);
    return daysUntil >= 0 && daysUntil <= days;
  });
}

module.exports = {
  list, getById, create, update, remove,
  purchaseHistory, repairHistory, adjustLoyalty, upcomingBirthdays,
};
