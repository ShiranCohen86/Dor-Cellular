const env = require('../config/env');
const logger = require('../utils/logger');

// Stub. Replace with Twilio, WhatsApp Cloud API, or a local IL provider (019/Cellact/InforU) in production.
async function send({ to, message, channel = 'sms' }) {
  if (env.SMS_PROVIDER === 'stub' || !env.SMS_API_KEY) {
    logger.info('[sms-stub]', { to, channel, message });
    return { ok: true, stubbed: true };
  }
  // TODO: real provider integration
  logger.warn('SMS provider not implemented, falling back to stub', { provider: env.SMS_PROVIDER });
  return { ok: true, stubbed: true };
}

async function sendWhatsApp({ to, message }) {
  return send({ to, message, channel: 'whatsapp' });
}

module.exports = { send, sendWhatsApp };
