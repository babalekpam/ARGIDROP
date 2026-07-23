// Per-delivery invoice PDFs for merchants, generated on the fly with pdfkit
// and streamed straight to the response — nothing is stored.
const PDFDocument = require('pdfkit');

const FOREST = '#1B4332';
const BRONZE = '#8B6F47';
const MUTED = '#6B6560';
const INK = '#1A1A1A';
const BORDER = '#E4DCC9';

function fmtAmount(v, currency = 'XOF') {
  const n = Math.round(parseFloat(v || 0));
  return `${n.toLocaleString('fr-FR')} ${currency}`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Streams a delivery invoice PDF into `res`.
 * @param {object} res     Express response
 * @param {object} data    { invoiceNumber, business, job, payment }
 */
function streamInvoicePDF(res, { invoiceNumber, business, job, payment }) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${invoiceNumber}.pdf"`);
  doc.pipe(res);

  const currency = payment.currency || 'XOF';
  const pageWidth = doc.page.width - 100;

  // ── Header ──
  doc.fillColor(FOREST).fontSize(22).font('Helvetica-Bold').text('ARGIDROP', 50, 50);
  doc.fillColor(MUTED).fontSize(9).font('Helvetica').text('Business moves. ARGIDROP delivers.', 50, 76);
  doc.fillColor(INK).fontSize(16).font('Helvetica-Bold').text('FACTURE / INVOICE', 50, 50, { align: 'right', width: pageWidth });
  doc.fillColor(MUTED).fontSize(10).font('Helvetica')
    .text(invoiceNumber, 50, 72, { align: 'right', width: pageWidth })
    .text(`Date : ${fmtDate(payment.releasedAt || payment.heldAt || payment.createdAt)}`, 50, 86, { align: 'right', width: pageWidth });

  doc.moveTo(50, 110).lineTo(doc.page.width - 50, 110).strokeColor(BORDER).lineWidth(1).stroke();

  // ── Billed to ──
  let y = 128;
  doc.fillColor(BRONZE).fontSize(9).font('Helvetica-Bold').text('FACTURÉ À / BILLED TO', 50, y);
  y += 14;
  doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(business.companyName || '—', 50, y);
  y += 15;
  doc.fillColor(MUTED).fontSize(9).font('Helvetica');
  if (business.address) { doc.text(business.address, 50, y); y += 12; }
  if (business.city || business.country) { doc.text([business.city, business.country].filter(Boolean).join(', '), 50, y); y += 12; }
  if (business.billingEmail) { doc.text(business.billingEmail, 50, y); y += 12; }

  // ── Delivery details ──
  y = Math.max(y + 16, 210);
  doc.fillColor(BRONZE).fontSize(9).font('Helvetica-Bold').text('LIVRAISON / DELIVERY', 50, y);
  y += 14;
  const detail = (label, value) => {
    doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(label, 50, y, { width: 130 });
    doc.fillColor(INK).fontSize(9).font('Helvetica').text(value || '—', 185, y, { width: doc.page.width - 235 });
    y += 14;
  };
  detail('Référence / Tracking', job?.trackingToken || '—');
  detail('Date', fmtDate(job?.deliveredAt || job?.createdAt));
  detail('Enlèvement / Pickup', job?.pickupAddress);
  detail('Livraison / Dropoff', job?.dropoffAddress);
  detail('Colis / Package', [job?.packageType, job?.packageDescription].filter(Boolean).join(' — '));
  detail('Statut / Status', payment.status === 'RELEASED' ? 'Payée / Paid' : payment.status === 'HELD' ? 'Fonds bloqués / Funds held' : payment.status);
  detail('Paiement / Payment', payment.paymentProvider || '—');

  // ── Amounts table ──
  y += 16;
  const col2 = doc.page.width - 200;
  doc.rect(50, y, pageWidth, 22).fill('#F7F3EB');
  doc.fillColor(BRONZE).fontSize(9).font('Helvetica-Bold')
    .text('DESCRIPTION', 60, y + 7)
    .text('MONTANT / AMOUNT', col2, y + 7, { width: 140, align: 'right' });
  y += 30;
  doc.fillColor(INK).fontSize(10).font('Helvetica')
    .text('Livraison / Delivery service', 60, y)
    .text(fmtAmount(payment.grossAmount, currency), col2, y, { width: 140, align: 'right' });
  y += 20;
  doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(BORDER).stroke();
  y += 10;
  doc.fillColor(FOREST).fontSize(12).font('Helvetica-Bold')
    .text('TOTAL', 60, y)
    .text(fmtAmount(payment.grossAmount, currency), col2, y, { width: 140, align: 'right' });

  // ── Footer ──
  doc.fillColor(MUTED).fontSize(8).font('Helvetica')
    .text('ARGIDROP — ARGILETTE LLC · Document généré automatiquement / Automatically generated document',
      50, doc.page.height - 70, { width: pageWidth, align: 'center' });

  doc.end();
}

module.exports = { streamInvoicePDF };
