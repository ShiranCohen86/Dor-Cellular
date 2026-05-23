const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  ownerEmail: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('StoreSettings', schema);
