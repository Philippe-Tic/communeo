/**
 * Factures et avoirs de l'abonnement Communeo (#314), en PDF (pdfkit, polices standard), même mise en
 * page que le devis. Le PDF est rendu une seule fois, à l'émission, et archivé tel quel avec son
 * empreinte : une facture n'est jamais régénérée.
 *
 * Mentions : émetteur et client (SIRET), numéro unique, dates d'émission et d'échéance, période,
 * montants et TVA (ou franchise), conditions de paiement, pénalités de retard et indemnité forfaitaire
 * de recouvrement dues par une personne publique (art. L. 2192-13 et D. 2192-35 du Code de la commande
 * publique), coordonnées bancaires.
 */
import PDFDocument from 'pdfkit';
import { formatEuros, formatIban, formatNumber, type InvoiceKind } from '@communeo/core';
import type { QuoteIssuer } from './quote-pdf';

export interface InvoiceIssuer extends QuoteIssuer {
  iban: string;
  bic: string;
}

export interface InvoiceContent {
  kind: InvoiceKind;
  number: string;
  /** Jours du calendrier (« 2026-09-28 ») */
  issuedAt: string;
  dueAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  label: string;
  quoteNumber: string | null;
  /** Avoir : la facture qu'il annule, et pourquoi */
  creditFor: string | null;
  cancelReason: string | null;
  customer: { name: string; siret: string; address: string; email: string };
  amounts: { ht: number; vatRate: number; vat: number; ttc: number };
}

const MISSING = '[à compléter]';
const BRAND = '#004643';
const MUTED = '#555555';

const longDay = (day: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`));

export function renderInvoicePdf(issuer: InvoiceIssuer, invoice: InvoiceContent): Promise<Buffer> {
  const credit = invoice.kind === 'credit_note';
  const title = credit ? 'AVOIR' : 'FACTURE';
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `${credit ? 'Avoir' : 'Facture'} ${invoice.number}`, Author: issuer.name || 'Communeo' } });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  const width = doc.page.width - 100;
  // Un avoir se lit en négatif
  const money = (value: number) => formatEuros(credit ? -value : value);

  // En-tête : émetteur à gauche, document à droite
  const top = doc.y;
  doc.font('Helvetica-Bold').fontSize(16).fillColor(BRAND).text(issuer.name || 'Communeo', 50, top, { width: width / 2 });
  doc.font('Helvetica').fontSize(9).fillColor(MUTED);
  doc.text(issuer.address || MISSING, { width: width / 2 });
  doc.text(`SIRET ${issuer.siret || MISSING}`, { width: width / 2 });
  doc.text(issuer.email || MISSING, { width: width / 2 });
  const leftBottom = doc.y;

  doc.font('Helvetica-Bold').fontSize(13).fillColor('#000000').text(title, 50 + width / 2, top, { width: width / 2, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor(MUTED);
  doc.text(`N° ${invoice.number}`, { width: width / 2, align: 'right' });
  doc.text(`Date d'émission : ${longDay(invoice.issuedAt)}`, { width: width / 2, align: 'right' });
  if (!credit) doc.text(`Échéance : ${longDay(invoice.dueAt)}`, { width: width / 2, align: 'right' });
  if (invoice.quoteNumber) doc.text(`Devis accepté : ${invoice.quoteNumber}`, { width: width / 2, align: 'right' });
  if (invoice.creditFor) doc.text(`Annule la facture ${invoice.creditFor}`, { width: width / 2, align: 'right' });
  doc.y = Math.max(leftBottom, doc.y) + 24;

  // Client
  doc.x = 50;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text('Client');
  doc.font('Helvetica').fontSize(10);
  doc.text(invoice.customer.name);
  doc.text(invoice.customer.address);
  doc.text(`SIRET ${invoice.customer.siret}`);
  doc.text(`Facturation : ${invoice.customer.email}`);
  doc.moveDown(1.5);

  // Ligne de l'abonnement
  const columns = [
    { label: 'Désignation', x: 50, w: 290, align: 'left' as const },
    { label: 'Qté', x: 340, w: 40, align: 'right' as const },
    { label: 'Prix unitaire HT', x: 380, w: 85, align: 'right' as const },
    { label: 'Total HT', x: 465, w: width + 50 - 465, align: 'right' as const },
  ];
  let y = doc.y;
  doc.rect(50, y - 4, width, 18).fill('#EEF3F2');
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
  for (const column of columns) doc.text(column.label, column.x + 4, y, { width: column.w - 8, align: column.align });
  y += 20;
  doc.font('Helvetica-Bold').fontSize(10).text(invoice.label, 54, y, { width: 282 });
  doc.font('Helvetica').fontSize(9).fillColor(MUTED);
  if (invoice.periodStart && invoice.periodEnd) {
    doc.text(`Période : du ${longDay(invoice.periodStart)} au ${longDay(invoice.periodEnd)}`, { width: 282 });
  }
  if (credit && invoice.cancelReason) doc.text(`Motif : ${invoice.cancelReason}`, { width: 282 });
  const lineBottom = doc.y;
  doc.fillColor('#000000').fontSize(10);
  doc.text('1', columns[1]!.x + 4, y, { width: columns[1]!.w - 8, align: 'right' });
  doc.text(money(invoice.amounts.ht), columns[2]!.x + 4, y, { width: columns[2]!.w - 8, align: 'right' });
  doc.text(money(invoice.amounts.ht), columns[3]!.x + 4, y, { width: columns[3]!.w - 8, align: 'right' });
  y = lineBottom + 10;
  doc.moveTo(50, y).lineTo(50 + width, y).strokeColor('#CCCCCC').stroke();
  y += 10;

  // Totaux
  const total = (label: string, value: string, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor('#000000');
    doc.text(label, 300, y, { width: 160, align: 'right' });
    doc.text(value, 465, y, { width: width + 50 - 469, align: 'right' });
    y += 16;
  };
  total('Total HT', money(invoice.amounts.ht));
  if (invoice.amounts.vatRate > 0) total(`TVA ${formatNumber(invoice.amounts.vatRate * 100)} %`, money(invoice.amounts.vat));
  total(credit ? 'Total TTC de l’avoir' : 'Net à payer TTC', money(invoice.amounts.ttc), true);
  if (invoice.amounts.vatRate === 0) {
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('TVA non applicable, art. 293 B du CGI', 300, y, { width: width - 250, align: 'right' });
    y += 14;
  }
  doc.x = 50;
  doc.y = y + 16;

  if (credit) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text('Avoir');
    doc.font('Helvetica').fontSize(9).fillColor('#222222');
    doc.text(
      `Cet avoir annule la facture ${invoice.creditFor ?? ''} pour son montant total. Si elle a déjà été réglée, la somme est remboursée par virement.`,
      { width },
    );
  } else {
    // Paiement
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text('Paiement');
    doc.font('Helvetica').fontSize(9).fillColor('#222222');
    doc.text(`À régler par virement au plus tard le ${longDay(invoice.dueAt)}, en indiquant le numéro ${invoice.number}.`, { width });
    doc.moveDown(0.5);
    const bank = doc.y;
    doc.rect(50, bank, width, 52).fill('#F4F7F6');
    doc.fillColor('#000000').font('Helvetica').fontSize(9);
    doc.text(`Titulaire : ${issuer.name || MISSING}`, 60, bank + 8, { width: width - 20 });
    doc.font('Helvetica-Bold').text(`IBAN : ${issuer.iban ? formatIban(issuer.iban) : MISSING}`, { width: width - 20 });
    doc.font('Helvetica').text(`BIC : ${issuer.bic || MISSING}`, { width: width - 20 });
    doc.x = 50;
    doc.y = bank + 64;
    doc.fontSize(8).fillColor(MUTED);
    doc.text(
      'Pas d’escompte pour paiement anticipé. En cas de retard de paiement : intérêts moratoires au taux de la Banque centrale européenne majoré de huit points, et indemnité forfaitaire de 40 euros pour frais de recouvrement (art. L. 2192-13 et D. 2192-35 du Code de la commande publique).',
      { width },
    );
  }
  doc.moveDown(1);
  doc.fontSize(8).fillColor(MUTED).text('Document transmis par Chorus Pro. Abonnement reconduit tacitement ; résiliable à l’échéance avec un préavis d’un mois.', { width });

  doc.end();
  return done;
}
