'use client';

import { LineItemData } from '@/components/quotes/LineItemsEditor';

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface InvoiceCompany {
  name?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  siret?: string;
  vatNumber?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  iban?: string;
  bic?: string;
  bankName?: string;
  rcsCity?: string;
  capital?: number;
  legalMentions?: string;
  defaultConditions?: string;
}

export interface InvoiceCustomer {
  id?: number;
  name?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  vat?: string;
  siret?: string;
  address?: string;
}

export interface InvoicePreviewData {
  reference?: string;
  invoiceDate?: string;
  dueDate?: string;
  purchaseOrder?: string;
  description?: string;
  notes?: string;
  conditions?: string;
  bankDetails?: string;
  discountPercent?: number;
  lineItems: LineItemData[];
  customer?: InvoiceCustomer | null;
  company?: InvoiceCompany | null;
}

interface Props {
  data: InvoicePreviewData;
  /** When true, wraps in a scrollable preview container */
  asModal?: boolean;
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

const fmt = (n: number) =>
  n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const STRUCTURAL = ['section', 'text', 'page_break'];

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function InvoicePreview({ data, asModal = false }: Props) {
  const {
    reference, invoiceDate, dueDate, purchaseOrder, description,
    notes, conditions, bankDetails, discountPercent = 0,
    lineItems = [], customer, company,
  } = data;

  /* ── Totals ─────────────────────────────────────────────────────────── */
  const billableItems = lineItems.filter(i => !STRUCTURAL.includes(i.item_type));

  // Raw total HT (before global discount)
  const rawHt = billableItems.reduce((s, i) => {
    const base = i.quantity * i.unit_price;
    const disc = i.discount_percent ? base * i.discount_percent / 100 : 0;
    return s + base - disc;
  }, 0);

  const globalDiscountAmt = (rawHt * discountPercent) / 100;
  const totalHt = rawHt - globalDiscountAmt;
  const ratio = rawHt > 0 ? totalHt / rawHt : 1; // scale factor for global discount

  // TVA breakdown by rate
  const vatBreakdown: Record<number, { ht: number; tva: number }> = {};
  for (const item of billableItems) {
    const base = item.quantity * item.unit_price;
    const lineDisc = item.discount_percent ? base * item.discount_percent / 100 : 0;
    const lineHt = (base - lineDisc) * ratio;
    const rate = item.vat_rate;
    if (!vatBreakdown[rate]) vatBreakdown[rate] = { ht: 0, tva: 0 };
    vatBreakdown[rate].ht += lineHt;
    vatBreakdown[rate].tva += lineHt * rate / 100;
  }

  const totalTva = Object.values(vatBreakdown).reduce((s, v) => s + v.tva, 0);
  const totalTtc = totalHt + totalTva;

  /* ── Derived payment conditions ──────────────────────────────────────── */
  const paymentConditions =
    conditions ||
    company?.defaultConditions ||
    '';

  /* ── Bank details ────────────────────────────────────────────────────── */
  const bankInfo = bankDetails || (
    company?.iban
      ? `IBAN : ${company.iban}${company.bic ? `  •  BIC : ${company.bic}` : ''}${company.bankName ? `\n${company.bankName}` : ''}`
      : null
  );

  /* ── Legal footer ────────────────────────────────────────────────────── */
  const legalLine = company?.legalMentions || [
    company?.name,
    company?.siret ? `SIRET ${company.siret}` : null,
    company?.rcsCity ? `RCS ${company.rcsCity}` : null,
    company?.capital ? `Capital ${company.capital.toLocaleString('fr-FR')} €` : null,
    company?.vatNumber ? `TVA intracommunautaire : ${company.vatNumber}` : null,
  ].filter(Boolean).join('  –  ');

  /* ── Wrapper classes ─────────────────────────────────────────────────── */
  const wrapperCls = asModal
    ? 'bg-gray-100 p-4 rounded-lg overflow-auto max-h-[80vh]'
    : '';

  return (
    <div className={wrapperCls}>
      {/* ── A4 page ──────────────────────────────────────────────────── */}
      <div
        id="invoice-preview"
        className="bg-white text-gray-900 text-xs font-sans"
        style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', padding: '15mm 15mm 20mm' }}
      >

        {/* ════ HEADER ════════════════════════════════════════════════════ */}
        <div className="flex justify-between items-start mb-8">
          {/* Seller */}
          <div className="flex-1">
            {company?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logoUrl} alt="logo" className="mb-2 max-h-14 max-w-40 object-contain" />
            )}
            <p className="text-base font-bold">{company?.name || '—'}</p>
            {company?.address && <p>{company.address}</p>}
            {(company?.postalCode || company?.city) && (
              <p>{[company.postalCode, company.city].filter(Boolean).join(' ')}</p>
            )}
            {company?.phone && <p>Tél : {company.phone}</p>}
            {company?.email && <p>{company.email}</p>}
            {company?.siret && <p className="text-gray-500">SIRET : {company.siret}</p>}
            {company?.vatNumber && <p className="text-gray-500">TVA : {company.vatNumber}</p>}
          </div>

          {/* Invoice title */}
          <div className="text-right">
            <h1 className="text-2xl font-bold text-blue-700 tracking-wide">FACTURE</h1>
            <p className="text-lg font-semibold mt-1">{reference || 'Brouillon'}</p>
            <p className="text-gray-500 mt-2">Date : {fmtDate(invoiceDate)}</p>
            <p className="text-gray-500">Échéance : <span className="font-medium text-gray-800">{fmtDate(dueDate)}</span></p>
            {purchaseOrder && (
              <p className="text-gray-500 mt-1">Réf. commande : <span className="font-medium">{purchaseOrder}</span></p>
            )}
          </div>
        </div>

        {/* ════ BILL-TO ════════════════════════════════════════════════════ */}
        <div className="flex justify-end mb-8">
          <div className="border border-gray-300 rounded p-4 min-w-[200px] max-w-[220px]">
            <p className="text-[10px] font-semibold uppercase text-gray-400 mb-1">Destinataire</p>
            <p className="font-bold">{customer?.name || '—'}</p>
            {customer?.contactName && <p>{customer.contactName}</p>}
            {customer?.address && <p className="text-gray-600 whitespace-pre-line">{customer.address}</p>}
            {customer?.email && <p className="text-gray-500">{customer.email}</p>}
            {customer?.phone && <p className="text-gray-500">{customer.phone}</p>}
            {customer?.vat && <p className="text-gray-500 mt-1">TVA : {customer.vat}</p>}
            {customer?.siret && <p className="text-gray-500">SIRET : {customer.siret}</p>}
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="mb-4 text-gray-700 font-medium">Objet : {description}</p>
        )}

        {/* ════ LINE ITEMS TABLE ══════════════════════════════════════════ */}
        <table className="w-full border-collapse text-xs mb-6">
          <thead>
            <tr className="bg-blue-700 text-white">
              <th className="text-left px-2 py-2 w-[40%]">Désignation</th>
              <th className="text-right px-2 py-2 w-[8%]">Qté</th>
              <th className="text-left px-2 py-2 w-[6%]">Unité</th>
              <th className="text-right px-2 py-2 w-[12%]">PU HT</th>
              <th className="text-right px-2 py-2 w-[8%]">Remise</th>
              <th className="text-right px-2 py-2 w-[8%]">TVA</th>
              <th className="text-right px-2 py-2 w-[12%]">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-4 text-gray-400 italic">
                  Aucune ligne
                </td>
              </tr>
            )}
            {lineItems.map((item, idx) => {
              if (item.item_type === 'page_break') {
                return (
                  <tr key={idx}>
                    <td colSpan={7} className="py-1">
                      <div className="border-t border-dashed border-gray-300" />
                    </td>
                  </tr>
                );
              }
              if (item.item_type === 'section') {
                return (
                  <tr key={idx} className="bg-gray-100">
                    <td colSpan={7} className="px-2 py-1 font-bold uppercase text-[10px] tracking-wide text-blue-800">
                      {item.description}
                    </td>
                  </tr>
                );
              }
              if (item.item_type === 'text') {
                return (
                  <tr key={idx}>
                    <td colSpan={7} className="px-2 py-1 italic text-gray-600">
                      {item.description}
                    </td>
                  </tr>
                );
              }

              const base = item.quantity * item.unit_price;
              const lineDisc = item.discount_percent ? base * item.discount_percent / 100 : 0;
              const lineHt = base - lineDisc;

              return (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-2 py-1.5 align-top">
                    <p className="font-medium">{item.description || '—'}</p>
                    {item.long_description && (
                      <p className="text-gray-500 text-[10px] whitespace-pre-wrap mt-0.5">{item.long_description}</p>
                    )}
                    {item.reference && (
                      <p className="text-gray-400 text-[9px]">Réf : {item.reference}</p>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{item.quantity}</td>
                  <td className="px-2 py-1.5">{item.unit || 'u'}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmt(item.unit_price)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-gray-500">
                    {item.discount_percent ? `${item.discount_percent}%` : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{item.vat_rate}%</td>
                  <td className="px-2 py-1.5 text-right tabular-nums font-medium">{fmt(lineHt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ════ TOTALS ════════════════════════════════════════════════════ */}
        <div className="flex justify-end mb-6">
          <div className="min-w-[260px] space-y-1">
            <div className="flex justify-between py-0.5">
              <span className="text-gray-600">Total HT brut</span>
              <span className="tabular-nums">{fmt(rawHt)}</span>
            </div>

            {discountPercent > 0 && (
              <div className="flex justify-between py-0.5 text-green-700">
                <span>Remise globale ({discountPercent}%)</span>
                <span className="tabular-nums">- {fmt(globalDiscountAmt)}</span>
              </div>
            )}

            <div className="flex justify-between py-0.5 font-medium">
              <span>Total HT net</span>
              <span className="tabular-nums">{fmt(totalHt)}</span>
            </div>

            <div className="border-t border-gray-200 my-1" />

            {/* TVA breakdown by rate */}
            {Object.entries(vatBreakdown).sort(([a], [b]) => +b - +a).map(([rate, vals]) => (
              <div key={rate} className="flex justify-between py-0.5 text-gray-600">
                <span>TVA {rate}%</span>
                <span className="tabular-nums">+ {fmt(vals.tva)}</span>
              </div>
            ))}

            <div className="border-t-2 border-gray-800 my-1" />
            <div className="flex justify-between py-1 font-bold text-base">
              <span>TOTAL TTC</span>
              <span className="tabular-nums">{fmt(totalTtc)}</span>
            </div>
          </div>
        </div>

        {/* ════ PAYMENT & BANK ════════════════════════════════════════════ */}
        {bankInfo && (
          <div className="border border-gray-200 rounded p-3 mb-4 bg-gray-50">
            <p className="text-[10px] font-semibold uppercase text-gray-400 mb-1">Règlement par virement</p>
            <p className="whitespace-pre-line text-gray-700">{bankInfo}</p>
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase text-gray-400 mb-1">Notes</p>
            <p className="whitespace-pre-line text-gray-700">{notes}</p>
          </div>
        )}

        {/* ════ CONDITIONS & LEGAL MENTIONS ══════════════════════════════ */}
        <div className="border-t border-gray-200 pt-3 mt-4">
          <p className="text-[9px] font-semibold uppercase text-gray-400 mb-1">Conditions de paiement</p>
          <p className="text-[9px] text-gray-600 whitespace-pre-line leading-relaxed">{paymentConditions}</p>
        </div>

        {/* ════ FOOTER ════════════════════════════════════════════════════ */}
        {legalLine && (
          <div className="mt-auto pt-6 border-t border-gray-100">
            <p className="text-[8px] text-gray-400 text-center">{legalLine}</p>
          </div>
        )}
      </div>
    </div>
  );
}
