const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
}

/**
 * Send new-order notification to the store owner.
 * Fire-and-forget — never throws so the caller's transaction is unaffected.
 */
async function getOwnerEmail() {
  try {
    const StoreSettings = require('../models/StoreSettings');
    const s = await StoreSettings.findOne().lean();
    if (s?.ownerEmail) return s.ownerEmail;
  } catch {}
  return env.OWNER_EMAIL;
}

async function sendNewOrderEmail(order, customerName, customerPhone) {
  const t = getTransporter();
  const ownerEmail = await getOwnerEmail();
  console.log('[email] SMTP ready:', !!t, '| ownerEmail:', ownerEmail || '(empty)');
  if (!t) { console.error('[email] transporter is null — SMTP_HOST/USER/PASS missing?', { host: env.SMTP_HOST, user: env.SMTP_USER, hasPass: !!env.SMTP_PASS }); return; }
  if (!ownerEmail) { console.error('[email] ownerEmail is empty — set it in Settings or OWNER_EMAIL env'); return; }

  const itemLines = (order.items || [])
    .map((i) => `• ${i.name} ×${i.quantity}  — ₪${i.unitPrice}`)
    .join('\n');

  const waLink = customerPhone
    ? `https://wa.me/${customerPhone.replace(/\D/g, '').replace(/^0/, '972')}?text=${encodeURIComponent(`שלום! קיבלנו את הזמנתך 🙏\nניצור קשר לתיאום תשלום ומשלוח/איסוף.\nדור הסלולר`)}`
    : null;

  const html = `
<div dir="rtl" style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
  <h2 style="color:#2563eb;margin-top:0">🛒 הזמנה חדשה!</h2>
  <p><strong>לקוח:</strong> ${customerName || 'לא ידוע'}</p>
  ${customerPhone ? `<p><strong>טלפון:</strong> ${customerPhone}</p>` : ''}
  <h3 style="margin-bottom:8px">פריטים:</h3>
  <pre style="background:#f9fafb;padding:14px;border-radius:8px;font-size:14px;direction:rtl">${itemLines}</pre>
  ${order.notes ? `<p><strong>הערות:</strong> ${order.notes}</p>` : ''}
  ${waLink ? `<a href="${waLink}" style="display:inline-block;margin-top:16px;background:#25d366;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">📱 פתח WhatsApp</a>` : ''}
  <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb"/>
  <p style="font-size:12px;color:#6b7280">דור הסלולר — הזמנה #${order.invoiceNumber || order._id}</p>
</div>`;

  try {
    await t.sendMail({
      from: `"דור הסלולר" <${env.SMTP_USER}>`,
      to: ownerEmail,
      subject: `🛒 הזמנה חדשה${customerName ? ` מ-${customerName}` : ''}`,
      html,
    });
  } catch (err) {
    // Never block the order flow
    console.error('[email] failed to send order notification:', err.message);
  }
}

module.exports = { sendNewOrderEmail };
