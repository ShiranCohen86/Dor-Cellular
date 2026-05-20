const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

// Streams a simple invoice PDF to the given writable stream (typically res).
// Pure LTR for now — for full Hebrew RTL support, embed an RTL-capable font
// and use a Bidi-aware text renderer.
function streamInvoice(order, stream) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(stream);

  // Header
  doc.fontSize(20).text('Dor-Store', { align: 'right' });
  doc.fontSize(10).text(`Invoice #: ${order.invoiceNumber}`, { align: 'right' });
  doc.text(`Date: ${new Date(order.createdAt || Date.now()).toLocaleString()}`, { align: 'right' });
  doc.moveDown();

  // Customer
  const cust = order.customerId && typeof order.customerId === 'object' ? order.customerId : null;
  if (cust) {
    doc.fontSize(12).text('Bill To:');
    doc.fontSize(10).text(cust.name || '');
    if (cust.phone) doc.text(cust.phone);
    if (cust.address) doc.text(cust.address);
    doc.moveDown();
  }

  // Items table
  doc.fontSize(12).text('Items', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);
  const col = { name: 50, qty: 290, price: 340, total: 430 };
  doc.text('Item', col.name).text('Qty', col.qty, doc.y - 12).text('Price', col.price, doc.y - 12).text('Total', col.total, doc.y - 12);
  doc.moveTo(50, doc.y + 2).lineTo(550, doc.y + 2).stroke();
  doc.moveDown(0.5);
  for (const it of order.items) {
    const y = doc.y;
    doc.text(it.name || it.sku || '-', col.name, y, { width: 230 });
    doc.text(String(it.quantity), col.qty, y);
    doc.text(it.unitPrice.toFixed(2), col.price, y);
    doc.text(it.lineTotal.toFixed(2), col.total, y);
    doc.moveDown(0.3);
  }
  doc.moveDown();

  // Totals
  const totalsX = 380;
  doc.text(`Subtotal: ${order.subtotal.toFixed(2)}`, totalsX);
  doc.text(`Discount: ${order.discountAmount.toFixed(2)}`, totalsX);
  doc.text(`Tax (incl.): ${order.taxAmount.toFixed(2)}`, totalsX);
  doc.font('Helvetica-Bold').text(`Total: ${order.total.toFixed(2)}`, totalsX);
  doc.font('Helvetica');
  if (order.paidAmount) doc.text(`Paid: ${order.paidAmount.toFixed(2)}`, totalsX);
  if (order.balanceDue) doc.text(`Balance Due: ${order.balanceDue.toFixed(2)}`, totalsX);

  // QR code with invoice ID for quick scanning
  QRCode.toDataURL(order.invoiceNumber, { margin: 1, scale: 4 })
    .then((dataUrl) => {
      const img = dataUrl.replace(/^data:image\/png;base64,/, '');
      doc.image(Buffer.from(img, 'base64'), 50, 700, { width: 80 });
      doc.fontSize(8).text(order.invoiceNumber, 50, 785);
      doc.end();
    })
    .catch(() => doc.end());
}

module.exports = { streamInvoice };
