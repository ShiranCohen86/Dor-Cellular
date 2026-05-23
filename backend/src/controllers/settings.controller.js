const asyncHandler = require('../utils/asyncHandler');
const StoreSettings = require('../models/StoreSettings');

exports.get = asyncHandler(async (req, res) => {
  const s = await StoreSettings.findOne().lean();
  res.json({ ownerEmail: s?.ownerEmail || '' });
});

exports.update = asyncHandler(async (req, res) => {
  const { ownerEmail } = req.body;
  const s = await StoreSettings.findOneAndUpdate(
    {},
    { ownerEmail: ownerEmail || '' },
    { upsert: true, new: true, runValidators: true },
  );
  res.json({ ownerEmail: s.ownerEmail });
});
