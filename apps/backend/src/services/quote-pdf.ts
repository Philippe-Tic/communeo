/**
 * Devis et bon de commande de l'abonnement Communeo (#312), en PDF (pdfkit, polices standard).
 * Projet : consultable avant la validation. Validé : daté, avec le signataire, sa qualité, l'heure et
 * l'adresse IP de la validation en ligne ; archivé tel quel (quote.pdf) avec son empreinte SHA-256.
 */
import crypto from 'node:crypto';
import PDFDocument from 'pdfkit';
import { formatEuros, formatNumber, OFFER_INCLUDES, QUOTE_VALIDITY_DAYS } from '@communeo/core';

export interface QuoteIssuer {
  name: string;
  address: string;
  siret: string;
  email: string;
}

export interface QuoteContent {
  /** Absent : projet de devis */
  number?: string;
  date: Date;
  communeName: string;
  codeInsee: string | null;
  siret: string;
  address: string;
  billingEmail: string;
  population: number;
  tierLabel: string;
  amounts: { ht: number; vatRate: number; vat: number; ttc: number };
  signature?: { name: string; role: string; at: Date; ip: string; email: string };
}

const MISSING = '[à compléter]';
const BRAND = '#004643';
const MUTED = '#555555';

const parisDate = (date: Date) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }).format(date);
const parisTime = (date: Date) =>
  new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).format(date).replace(':', ' h ');

export function renderQuotePdf(issuer: QuoteIssuer, quote: QuoteContent): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: quote.number ? `Devis ${quote.number}` : 'Projet de devis', Author: issuer.name || 'Communeo' } });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  const width = doc.page.width - 100;

  // En-tête : émetteur à gauche, document à droite
  const top = doc.y;
  doc.font('Helvetica-Bold').fontSize(16).fillColor(BRAND).text(issuer.name || 'Communeo', 50, top, { width: width / 2 });
  doc.font('Helvetica').fontSize(9).fillColor(MUTED);
  doc.text(issuer.address || MISSING, { width: width / 2 });
  doc.text(`SIRET ${issuer.siret || MISSING}`, { width: width / 2 });
  doc.text(issuer.email || MISSING, { width: width / 2 });
  const leftBottom = doc.y;

  doc.font('Helvetica-Bold').fontSize(13).fillColor('#000000').text(quote.number ? 'DEVIS ET BON DE COMMANDE' : 'PROJET DE DEVIS', 50 + width / 2, top, { width: width / 2, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor(MUTED);
  doc.text(quote.number ? `N° ${quote.number}` : 'Non numéroté : devient un devis à la validation en ligne', { width: width / 2, align: 'right' });
  doc.text(`Date : ${parisDate(quote.date)}`, { width: width / 2, align: 'right' });
  doc.text(`Valable ${QUOTE_VALIDITY_DAYS} jours`, { width: width / 2, align: 'right' });
  doc.y = Math.max(leftBottom, doc.y) + 24;

  // Client
  doc.x = 50;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text('Client');
  doc.font('Helvetica').fontSize(10);
  doc.text(`Commune de ${quote.communeName}${quote.codeInsee ? ` (INSEE ${quote.codeInsee})` : ''}`);
  doc.text(quote.address);
  doc.text(`SIRET ${quote.siret}`);
  doc.text(`Facturation : ${quote.billingEmail}`);
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
  doc.font('Helvetica-Bold').fontSize(10).text('Abonnement annuel Communeo : site internet de la commune', 54, y, { width: 282 });
  doc.font('Helvetica').fontSize(9).fillColor(MUTED);
  doc.text(`Tranche : ${quote.tierLabel} (population municipale INSEE : ${formatNumber(quote.population)})`, { width: 282 });
  doc.text("12 mois à compter du passage en live, reconduits tacitement ; résiliable à l'échéance avec un préavis d'un mois.", { width: 282 });
  const lineBottom = doc.y;
  doc.fillColor('#000000').fontSize(10);
  doc.text('1', columns[1]!.x + 4, y, { width: columns[1]!.w - 8, align: 'right' });
  doc.text(formatEuros(quote.amounts.ht), columns[2]!.x + 4, y, { width: columns[2]!.w - 8, align: 'right' });
  doc.text(formatEuros(quote.amounts.ht), columns[3]!.x + 4, y, { width: columns[3]!.w - 8, align: 'right' });
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
  total('Total HT', formatEuros(quote.amounts.ht));
  if (quote.amounts.vatRate > 0) total(`TVA ${formatNumber(quote.amounts.vatRate * 100)} %`, formatEuros(quote.amounts.vat));
  total('Total TTC', formatEuros(quote.amounts.ttc), true);
  if (quote.amounts.vatRate === 0) {
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('TVA non applicable, art. 293 B du CGI', 300, y, { width: width - 250, align: 'right' });
    y += 14;
  }
  doc.x = 50;
  doc.y = y + 12;

  // Ce qui est compris
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text('Compris dans l’abonnement', 50);
  doc.font('Helvetica').fontSize(9).fillColor('#222222');
  doc.list([...OFFER_INCLUDES], { bulletRadius: 1.5, textIndent: 10, width });
  doc.moveDown();

  // Conditions
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text('Conditions');
  doc.font('Helvetica').fontSize(9).fillColor('#222222');
  doc.text(
    "Aucuns frais de mise en service. La facture est émise au passage en live et déposée sur Chorus Pro ; elle est payable par virement sous 30 jours. Le site est mis en ligne dès la validation de l'équipe Communeo, sans attendre le paiement.",
    { width },
  );
  doc.moveDown(0.5);
  doc.text(
    'Marché de faible montant, dispensé de publicité et de mise en concurrence préalables (art. R. 2122-8 du Code de la commande publique).',
    { width },
  );
  doc.moveDown(1.5);

  // Bon pour accord
  const boxTop = doc.y;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text('Bon pour accord', 60, boxTop + 10);
  doc.font('Helvetica').fontSize(9).fillColor('#222222');
  if (quote.signature) {
    const s = quote.signature;
    doc.text(
      `Validé en ligne le ${parisDate(s.at)} à ${parisTime(s.at)} (heure de Paris) par ${s.name}, ${s.role}, au nom de la commune de ${quote.communeName}, depuis le compte ${s.email} (adresse IP ${s.ip}).`,
      60,
      doc.y + 4,
      { width: width - 20 },
    );
  } else {
    doc.text("À valider en ligne depuis l'administration Communeo, écran « Passer en live », par le maire ou une personne ayant délégation.", 60, doc.y + 4, { width: width - 20 });
  }
  doc.rect(50, boxTop, width, doc.y - boxTop + 10).strokeColor(BRAND).stroke();

  doc.end();
  return done;
}

export const sha256 = (buffer: Buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
