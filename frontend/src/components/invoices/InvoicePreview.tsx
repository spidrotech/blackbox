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
  /** Pre-formatted header block from company settings (shown verbatim in left column) */
  headerText?: string;
  /** Pre-formatted footer block from company settings (shown verbatim in footer) */
  footerText?: string;
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

  /* ── Header text (left column) ───────────────────────────────────────── */
  // Prefer explicit headerText from settings; fall back to auto-building from fields
  const headerLines = company?.headerText
    ? company.headerText.split('\n').map(l => l.trim()).filter(Boolean)
    : [
        company?.name,
        company?.address,
        [company?.postalCode, company?.city].filter(Boolean).join(' ') || null,
        company?.phone ? `Tél : ${company.phone}` : null,
        company?.email ?? null,
        company?.website ?? null,
        company?.siret ? `SIRET : ${company.siret}` : null,
        company?.vatNumber ? `TVA : ${company.vatNumber}` : null,
      ].filter(Boolean) as string[];

  /* ── Footer text (bottom band) ────────────────────────────────────────── */
  // Prefer explicit footerText from settings; fall back to auto-building from fields
  const footerLines = company?.footerText
    ? company.footerText.split('\n').map(l => l.trim()).filter(Boolean)
    : (() => {
        const lines: string[] = [];
        const line1 = [
          company?.name,
          company?.address,
          [company?.postalCode, company?.city].filter(Boolean).join(' '),
        ].filter(Boolean).join(' – ');
        if (line1) lines.push(line1);
        const legal = [
          company?.siret ? `SIRET ${company.siret}` : '',
          company?.rcsCity ? `RCS ${company.rcsCity}` : '',
          company?.capital ? `Capital ${company.capital.toLocaleString('fr-FR')} €` : '',
          company?.vatNumber ? `TVA : ${company.vatNumber}` : '',
        ].filter(Boolean).join(' – ');
        if (legal) lines.push(legal);
        const contact = [company?.phone, company?.email, company?.website].filter(Boolean).join('  |  ');
        if (contact) lines.push(contact);
        if (company?.legalMentions) lines.push(company.legalMentions);
        return lines;
      })();

  /* ── Wrapper classes ─────────────────────────────────────────────────── */
  const wrapperCls = asModal
    ? 'bg-gray-100 p-4 rounded-lg overflow-auto max-h-[80vh]'
    : '';

  return (
    <div className={wrapperCls}>
      {/* ── A4 page ──────────────────────────────────────────────────── */}
      <div
        id="invoice-preview"
        className="bg-white text-gray-900 text-[11px] font-sans"
        style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', padding: '0', display: 'flex', flexDirection: 'column' }}
      >
        {/* ════ TOP ACCENT STRIPE ═════════════════════════════════════════ */}
        <div style={{ height: '5px', background: 'linear-gradient(90deg, #1d4ed8 0%, #3b82f6 60%, #6366f1 100%)' }} />

        {/* ════ DOCUMENT BODY ═════════════════════════════════════════════ */}
        <div style={{ padding: '12mm 15mm 10mm', flex: 1 }}>

          {/* ════ HEADER ══════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8mm' }}>

            {/* Left column – company identity */}
            <div style={{ flex: 1, paddingRight: '8mm' }}>
              {company?.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={company.logoUrl}
                  alt="logo"
                  style={{ maxHeight: '48px', maxWidth: '160px', objectFit: 'contain', marginBottom: '6px', display: 'block' }}
                />
              )}
              {headerLines.map((line, i) => (
                <p
                  key={i}
                  style={{
                    margin: '1px 0',
                    fontWeight: i === 0 ? 700 : 400,
                    fontSize: i === 0 ? '13px' : '10px',
                    color: i === 0 ? '#111827' : i >= headerLines.length - 2 ? '#9ca3af' : '#374151',
                  }}
                >
                  {line}
                </p>
              ))}
            </div>

            {/* Right column – invoice metadata */}
            <div style={{ minWidth: '180px', textAlign: 'right' }}>
              <div style={{
                display: 'inline-block',
                background: '#1d4ed8',
                color: 'white',
                padding: '6px 14px',
                borderRadius: '6px',
                marginBottom: '8px',
              }}>
                <p style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '2px', margin: 0 }}>FACTURE</p>
              </div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: '2px 0' }}>
                {reference || <em style={{ color: '#6b7280', fontWeight: 400 }}>Brouillon</em>}
              </p>
              <p style={{ fontSize: '10px', color: '#6b7280', margin: '4px 0 1px' }}>
                Date d&apos;émission&nbsp;: <span style={{ fontWeight: 600, color: '#111827' }}>{fmtDate(invoiceDate)}</span>
              </p>
              <p style={{ fontSize: '10px', color: '#6b7280', margin: '1px 0' }}>
                Date d&apos;échéance&nbsp;: <span style={{ fontWeight: 700, color: '#ef4444' }}>{fmtDate(dueDate)}</span>
              </p>
              {purchaseOrder && (
                <p style={{ fontSize: '10px', color: '#6b7280', margin: '1px 0' }}>
                  BdC client&nbsp;: <span style={{ fontWeight: 600, color: '#111827' }}>{purchaseOrder}</span>
                </p>
              )}

              {/* Bill-to box */}
              <div style={{
                marginTop: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '8px 10px',
                textAlign: 'left',
                background: '#f9fafb',
              }}>
                <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', margin: '0 0 4px' }}>
                  Destinataire
                </p>
                <p style={{ fontWeight: 700, fontSize: '11px', color: '#111827', margin: '0 0 2px' }}>{customer?.name || '—'}</p>
                {customer?.contactName && <p style={{ fontSize: '10px', color: '#374151', margin: '1px 0' }}>{customer.contactName}</p>}
                {customer?.address && (
                  <p style={{ fontSize: '10px', color: '#6b7280', margin: '1px 0', whiteSpace: 'pre-line' }}>{customer.address}</p>
                )}
                {customer?.email && <p style={{ fontSize: '10px', color: '#6b7280', margin: '1px 0' }}>{customer.email}</p>}
                {customer?.phone && <p style={{ fontSize: '10px', color: '#6b7280', margin: '1px 0' }}>{customer.phone}</p>}
                {(customer?.vat || customer?.siret) && (
                  <p style={{ fontSize: '9px', color: '#9ca3af', margin: '3px 0 0' }}>
                    {[customer.siret && `SIRET ${customer.siret}`, customer.vat && `TVA ${customer.vat}`].filter(Boolean).join('  –  ')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Separator */}
          <div style={{ borderTop: '2px solid #e5e7eb', marginBottom: '6mm' }} />

          {/* Description / Objet */}
          {description && (
            <p style={{ marginBottom: '5mm', fontWeight: 600, color: '#374151', fontSize: '11px' }}>
              Objet&nbsp;: {description}
            </p>
          )}

          {/* ════ LINE ITEMS TABLE ══════════════════════════════════════ */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '6mm' }}>
            <thead>
              <tr style={{ background: '#1e3a5f', color: 'white' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', width: '39%' }}>Désignation</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', width: '8%' }}>Qté</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', width: '6%' }}>Unité</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', width: '12%' }}>PU HT</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', width: '8%' }}>Remise</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', width: '7%' }}>TVA</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', width: '12%' }}>Total HT</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '16px', color: '#9ca3af', fontStyle: 'italic' }}>
                    Aucune ligne
                  </td>
                </tr>
              )}
              {lineItems.map((item, idx) => {
                if (item.item_type === 'page_break') {
                  return (
                    <tr key={idx}>
                      <td colSpan={7} style={{ padding: '4px 0' }}>
                        <div style={{ borderTop: '1px dashed #d1d5db' }} />
                      </td>
                    </tr>
                  );
                }
                if (item.item_type === 'section') {
                  return (
                    <tr key={idx} style={{ background: '#eff6ff' }}>
                      <td colSpan={7} style={{ padding: '5px 8px', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1d4ed8', borderLeft: '3px solid #3b82f6' }}>
                        {item.description}
                      </td>
                    </tr>
                  );
                }
                if (item.item_type === 'text') {
                  return (
                    <tr key={idx}>
                      <td colSpan={7} style={{ padding: '4px 8px', fontStyle: 'italic', color: '#6b7280' }}>
                        {item.description}
                      </td>
                    </tr>
                  );
                }

                const base = item.quantity * item.unit_price;
                const lineDisc = item.discount_percent ? base * item.discount_percent / 100 : 0;
                const lineHt = base - lineDisc;
                const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

                return (
                  <tr key={idx} style={{ background: rowBg }}>
                    <td style={{ padding: '5px 8px', verticalAlign: 'top', borderBottom: '1px solid #f1f5f9' }}>
                      <p style={{ fontWeight: 600, margin: 0 }}>{item.description || '—'}</p>
                      {item.long_description && (
                        <p style={{ color: '#6b7280', fontSize: '9px', whiteSpace: 'pre-wrap', margin: '2px 0 0' }}>{item.long_description}</p>
                      )}
                      {item.reference && (
                        <p style={{ color: '#9ca3af', fontSize: '8px', margin: '1px 0 0' }}>Réf : {item.reference}</p>
                      )}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid #f1f5f9' }}>{item.quantity}</td>
                    <td style={{ padding: '5px 8px', borderBottom: '1px solid #f1f5f9' }}>{item.unit || 'u'}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid #f1f5f9' }}>{fmt(item.unit_price)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#6b7280', borderBottom: '1px solid #f1f5f9' }}>
                      {item.discount_percent ? `${item.discount_percent}%` : '—'}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>{item.vat_rate}%</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid #f1f5f9' }}>{fmt(lineHt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* ════ TOTALS ════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6mm' }}>
            <div style={{ minWidth: '240px', fontSize: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ color: '#6b7280' }}>Total HT brut</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(rawHt)}</span>
              </div>

              {discountPercent > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#16a34a' }}>
                  <span>Remise globale ({discountPercent}%)</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>- {fmt(globalDiscountAmt)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontWeight: 600 }}>
                <span>Total HT net</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(totalHt)}</span>
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', margin: '4px 0' }} />

              {Object.entries(vatBreakdown).sort(([a], [b]) => +b - +a).map(([rate, vals]) => (
                <div key={rate} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#6b7280' }}>
                  <span>TVA {rate}%</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>+ {fmt(vals.tva)}</span>
                </div>
              ))}

              <div style={{ borderTop: '2.5px solid #1e3a5f', margin: '5px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 2px', fontWeight: 800, fontSize: '12px', color: '#1d4ed8' }}>
                <span>TOTAL TTC</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(totalTtc)}</span>
              </div>
            </div>
          </div>

          {/* ════ BANK / VIREMENT ═══════════════════════════════════════ */}
          {bankInfo && (
            <div style={{ border: '1px solid #dbeafe', borderRadius: '6px', padding: '8px 12px', marginBottom: '5mm', background: '#eff6ff' }}>
              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#3b82f6', margin: '0 0 4px' }}>
                Règlement par virement bancaire
              </p>
              <p style={{ whiteSpace: 'pre-line', color: '#1e3a5f', margin: 0, fontWeight: 500 }}>{bankInfo}</p>
            </div>
          )}

          {/* Notes */}
          {notes && (
            <div style={{ marginBottom: '5mm' }}>
              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', margin: '0 0 3px' }}>Notes</p>
              <p style={{ whiteSpace: 'pre-line', color: '#374151', margin: 0 }}>{notes}</p>
            </div>
          )}

          {/* ════ CONDITIONS DE PAIEMENT ════════════════════════════════ */}
          {paymentConditions && (
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '5mm', marginTop: '3mm' }}>
              <p style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9ca3af', margin: '0 0 3px' }}>
                Conditions de paiement
              </p>
              <p style={{ fontSize: '8px', color: '#6b7280', whiteSpace: 'pre-line', lineHeight: 1.5, margin: 0 }}>{paymentConditions}</p>
            </div>
          )}

        </div>{/* end body padding */}

        {/* ════ FOOTER BAND ═══════════════════════════════════════════════ */}
        {footerLines.length > 0 && (
          <div style={{
            borderTop: '1px solid #e5e7eb',
            padding: '5mm 15mm 4mm',
            background: '#f8fafc',
          }}>
            {footerLines.map((line, i) => (
              <p key={i} style={{
                fontSize: i === 0 ? '8.5px' : '7.5px',
                color: i === 0 ? '#374151' : '#9ca3af',
                textAlign: 'center',
                margin: '1px 0',
                fontWeight: i === 0 ? 500 : 400,
              }}>
                {line}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
