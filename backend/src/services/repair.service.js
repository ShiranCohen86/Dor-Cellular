const Repair = require('../models/Repair');
const Notification = require('../models/Notification');
const Customer = require('../models/Customer');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');
const { paginate, escapeRegex } = require('../utils/pagination');
const smsService = require('./sms.service');
const logger = require('../utils/logger');

function genTicketNumber() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RPR-${stamp}-${rand}`;
}

async function list(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.technicianId) filter.technicianId = query.technicianId;
  if (query.branchId) filter.branchId = query.branchId;
  if (query.customerId) filter.customerId = query.customerId;
  if (query.q) {
    const safe = escapeRegex(query.q);
    filter.$or = [
      { ticketNumber: new RegExp(safe, 'i') },
      { imei: new RegExp(safe, 'i') },
      { deviceModel: new RegExp(safe, 'i') },
    ];
  }
  return paginate(Repair, filter, query, { populate: 'customerId technicianId branchId' });
}

async function getById(id) {
  const repair = await Repair.findById(id).populate('customerId technicianId branchId');
  if (!repair) throw ApiError.notFound('Repair not found');
  return repair;
}

async function create(data, user) {
  const repair = new Repair({
    ...data,
    ticketNumber: genTicketNumber(),
    branchId: data.branchId || user.branchId,
    status: 'received',
    history: [{ status: 'received', changedBy: user.id, notes: data.intakeNotes }],
  });
  await repair.save();
  AuditLog.create({ userId: user.id, action: 'repair.created', entity: 'Repair', entityId: repair._id, meta: { ticketNumber: repair.ticketNumber, deviceBrand: repair.deviceBrand, deviceModel: repair.deviceModel, customerId: repair.customerId } }).catch(() => {});
  return repair;
}

async function update(id, patch) {
  const repair = await Repair.findById(id);
  if (!repair) throw ApiError.notFound('Repair not found');
  const editable = [
    'diagnosis', 'technicianNotes', 'estimatedCost', 'finalCost', 'partsCost',
    'laborCost', 'paid', 'promisedDate', 'technicianId', 'accessories', 'color',
  ];
  for (const field of editable) if (patch[field] !== undefined) repair[field] = patch[field];
  await repair.save();
  return repair;
}

async function changeStatus(id, { status, notes }, user, io) {
  const repair = await Repair.findById(id).populate('customerId');
  if (!repair) throw ApiError.notFound('Repair not found');
  if (!Repair.STATUS.includes(status)) throw ApiError.badRequest('Invalid status');
  repair.status = status;
  repair.history.push({ status, notes, changedBy: user.id });
  if (status === 'delivered') repair.deliveredAt = new Date();
  await repair.save();
  AuditLog.create({ userId: user.id, action: 'repair.status.changed', entity: 'Repair', entityId: repair._id, meta: { ticketNumber: repair.ticketNumber, status, notes, deviceBrand: repair.deviceBrand, deviceModel: repair.deviceModel } }).catch(() => {});

  // Notify customer via SMS for relevant statuses (non-blocking — SMS failure must not roll back the status change)
  if (['ready', 'in_repair', 'waiting_for_parts'].includes(status) && repair.customerId?.phone) {
    smsService.send({
      to: repair.customerId.phone,
      message: `Hi ${repair.customerId.name}, your repair ${repair.ticketNumber} status: ${status.replace(/_/g, ' ')}.`,
    }).catch((smsErr) => logger.warn('SMS send failed', { ticket: repair.ticketNumber, error: smsErr.message }));
  }

  const notification = await Notification.create({
    type: 'repair_status',
    title: `Repair ${repair.ticketNumber} → ${status}`,
    message: repair.deviceBrand + ' ' + repair.deviceModel,
    severity: 'info',
    targetRole: 'all',
    refType: 'Repair',
    refId: repair._id,
  });
  io?.emit('notification', notification);

  return repair;
}

async function signDelivery(id, signature, user) {
  const repair = await Repair.findById(id);
  if (!repair) throw ApiError.notFound('Repair not found');
  repair.deliverySignature = signature;
  if (repair.status !== 'delivered') {
    repair.status = 'delivered';
    repair.history.push({ status: 'delivered', changedBy: user.id, notes: 'Signed at delivery' });
    repair.deliveredAt = new Date();
  }
  await repair.save();
  AuditLog.create({ userId: user.id, action: 'repair.delivered', entity: 'Repair', entityId: repair._id, meta: { ticketNumber: repair.ticketNumber, deviceBrand: repair.deviceBrand, deviceModel: repair.deviceModel } }).catch(() => {});
  return repair;
}

async function technicianPerformance(query) {
  const match = {};
  if (query.from || query.to) {
    match.createdAt = {};
    if (query.from) match.createdAt.$gte = new Date(query.from);
    if (query.to) match.createdAt.$lte = new Date(query.to);
  }
  return Repair.aggregate([
    { $match: match },
    { $group: {
      _id: '$technicianId',
      total: { $sum: 1 },
      delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
      revenue: { $sum: '$finalCost' },
      avgCost: { $avg: '$finalCost' },
    } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'tech' } },
    { $unwind: { path: '$tech', preserveNullAndEmptyArrays: true } },
    { $project: { name: '$tech.name', total: 1, delivered: 1, revenue: 1, avgCost: 1 } },
    { $sort: { revenue: -1 } },
  ]);
}

module.exports = { list, getById, create, update, changeStatus, signDelivery, technicianPerformance };
