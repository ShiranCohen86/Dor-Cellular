/**
 * Builds a wa.me link with a pre-filled message for a new order.
 * Returns null if no phone number is provided.
 */
export function buildWaLink(phone, order) {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, '');
  const intl = clean.startsWith('0') ? '972' + clean.slice(1) : clean;
  const items = (order?.items || [])
    .map((i) => `• ${i.name} ×${i.quantity ?? i.qty ?? 1}`)
    .join('\n');
  const text = encodeURIComponent(
    `שלום! קיבלנו את הזמנתך 🙏\n${items}\nניצור קשר לתיאום תשלום ומשלוח/איסוף.\nדור הסלולר`
  );
  return `https://wa.me/${intl}?text=${text}`;
}
