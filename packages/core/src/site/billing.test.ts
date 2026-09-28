import { describe, expect, it } from 'vitest';
import { addOneYear, billingSummary, daysBetween, dueDay, formatIban, invoiceAmounts, invoiceNumber, invoiceState, parisDay, subscriptionPeriod } from './billing';

describe('facturation', () => {
  it('numéros par type et par année', () => {
    expect(invoiceNumber('invoice', 2026, 7)).toBe('FAC-2026-0007');
    expect(invoiceNumber('credit_note', 2027, 1)).toBe('AV-2027-0001');
  });

  it('jour de Paris, même tard le soir en UTC', () => {
    expect(parisDay(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01');
    expect(parisDay(new Date('2026-06-30T21:59:00Z'))).toBe('2026-06-30');
  });

  it('période de 12 mois, échéance à 30 jours, 29 février', () => {
    expect(subscriptionPeriod('2026-09-28')).toEqual({ start: '2026-09-28', end: '2027-09-27' });
    expect(addOneYear('2028-02-29')).toBe('2029-02-28');
    expect(dueDay('2026-12-15')).toBe('2027-01-14');
    expect(daysBetween('2026-10-28', '2026-11-04')).toBe(7);
  });

  it('état : en attente, puis en retard le lendemain de l’échéance', () => {
    const invoice = { kind: 'invoice' as const, status: 'issued' as const, dueAt: '2026-10-28' };
    expect(invoiceState(invoice, '2026-10-28')).toBe('pending');
    expect(invoiceState(invoice, '2026-10-29')).toBe('overdue');
    expect(invoiceState({ ...invoice, status: 'paid' }, '2027-01-01')).toBe('paid');
    expect(invoiceState({ ...invoice, kind: 'credit_note' }, '2027-01-01')).toBe('credit_note');
  });

  it('indicateurs : les annulées et les avoirs ne comptent pas dans le chiffre', () => {
    const base = { kind: 'invoice' as const, status: 'issued' as const, dueAt: '2026-10-28', amountTTC: 390, paidAmount: null, chorusDepositedAt: null };
    const summary = billingSummary(
      [
        base,
        { ...base, status: 'paid', paidAmount: 390, chorusDepositedAt: '2026-09-29' },
        { ...base, dueAt: '2026-09-01', chorusDepositedAt: '2026-08-01' },
        { ...base, status: 'cancelled' },
        { ...base, kind: 'credit_note', dueAt: '2026-09-30' },
      ],
      '2026-10-01',
    );
    expect(summary).toEqual({ issued: 1170, collected: 390, outstanding: 780, overdue: 390, overdueCount: 1, toDeposit: 2 });
  });

  it('montants et IBAN', () => {
    expect(invoiceAmounts(390, 0.2)).toEqual({ ht: 390, vatRate: 0.2, vat: 78, ttc: 468 });
    expect(formatIban('fr7630006000011234567890189')).toBe('FR76 3000 6000 0112 3456 7890 189');
  });
});
