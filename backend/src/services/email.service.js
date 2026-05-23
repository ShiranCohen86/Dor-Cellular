const env = require('../config/env');

async function getOwnerEmail() {
  try {
    const StoreSettings = require('../models/StoreSettings');
    const s = await StoreSettings.findOne().lean();
    if (s?.ownerEmail) return s.ownerEmail;
  } catch {}
  return env.OWNER_EMAIL;
}

async function sendNewOrderEmail(order, customerName, customerPhone) {
  if (!env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping email');
    return;
  }

  const ownerEmail = await getOwnerEmail();
  if (!ownerEmail) {
    console.warn('[email] ownerEmail not set — skipping email');
    return;
  }

  const itemLines = (order.items || [])
    .map((i) => `• ${i.name} ×${i.quantity}  — ₪${i.unitPrice}`)
    .join('\n');

  const waLink = customerPhone
    ? `https://wa.me/${customerPhone.replace(/\D/g, '').replace(/^0/, '972')}?text=${encodeURIComponent('שלום! קיבלנו את הזמנתך 🙏\nניצור קשר לתיאום.\nדור הסלולר')}`
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
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'דור הסלולר <onboarding@resend.dev>',
        to: [ownerEmail],
        subject: `🛒 הזמנה חדשה${customerName ? ` מ-${customerName}` : ''}`,
        html,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('[email] Resend error:', data);
    } else {
      console.log('[email] sent OK, id:', data.id);
    }
  } catch (err) {
    console.error('[email] failed:', err.message);
  }
}

module.exports = { sendNewOrderEmail };
