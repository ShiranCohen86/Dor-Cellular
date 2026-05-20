const QRCode = require('qrcode');

async function toDataUrl(text, opts = {}) {
  return QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 1, scale: 6, ...opts });
}

async function toBuffer(text, opts = {}) {
  return QRCode.toBuffer(text, { errorCorrectionLevel: 'M', margin: 1, scale: 6, ...opts });
}

module.exports = { toDataUrl, toBuffer };
