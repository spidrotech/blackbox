'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { invoiceService } from '@/services/api';
import { Invoice } from '@/types';

/* ─── Status helpers ──────────────────────────────────────────────────────── */

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  paid: 'Payée',
  partial: 'Paiement partiel',
  overdue: 'En retard',
  cancelled: 'Annulée',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  partial: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-50 text-red-400 line-through',
};

const fmt = (n: number | undefined) =>
  (n ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const fmtDate = (d: string | undefined) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '—';

/* ─── Payment Modal ───────────────────────────────────────────────────────── */

interface PaymentModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSuccess: (updated: Invoice) => void;
}

function PaymentModal({ invoice, onClose, onSuccess }: PaymentModalProps) {
  const totalTtc = invoice.totalTtc ?? 0;
  const alreadyPaid = invoice.amountPaid ?? invoice.amount_paid ?? 0;
  const remaining = invoice.remainingAmount ?? totalTtc - alreadyPaid;

  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [method, setMethod] = useState('bank_transfer');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Montant invalide');
      return;
    }
    setSaving(true);
    try {
      const res = await invoiceService.addPayment(invoice.id, numAmount, method);
      if (res.success && res.data) {
        onSuccess(res.data);
      }
    } catch {
      setError('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-bold mb-4">Enregistrer un paiement</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Total TTC :</span>
              <span className="font-medium">{fmt(totalTtc)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Déjà payé :</span>
              <span className="font-medium text-green-600">{fmt(alreadyPaid)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 mt-1">
              <span className="text-gray-700 font-medium">Reste à payer :</span>
              <span className="font-bold text-red-600">{fmt(remaining)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Montant (€) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Moyen de paiement</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="bank_transfer">Virement bancaire</option>
              <option value="check">Chèque</option>
              <option value="cash">Espèces</option>
              <option value="card">Carte bancaire</option>
              <option value="other">Autre</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" loading={saving}>Enregistrer</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = parseInt(params.id as string);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const loadInvoice = useCallback(async () => {
    try {
      const res = await invoiceService.getById(invoiceId);
      if (res.success && res.data) setInvoice(res.data);
    } catch (e) {
      console.error('Error loading invoice:', e);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => { loadInvoice(); }, [loadInvoice]);

  const handleSend = async () => {
    setActionLoading(true);
    try {
      const res = await invoiceService.send(invoiceId);
      if (res.success && res.data) setInvoice(res.data);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!invoice) return;
    if (!confirm('Marquer cette facture comme entièrement payée ?')) return;
    setActionLoading(true);
    try {
      const res = await invoiceService.updateStatus(invoiceId, 'paid');
      if (res.success && res.data) setInvoice(res.data);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer définitivement cette facture ?')) return;
    setDeleting(true);
    try {
      const res = await invoiceService.delete(invoiceId);
      if (res.success) router.push('/invoices');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </MainLayout>
    );
  }

  if (!invoice) {
    return (
      <MainLayout>
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">Facture introuvable</p>
          <Button variant="outline" onClick={() => router.push('/invoices')}>Retour</Button>
        </div>
      </MainLayout>
    );
  }

  /* Normalize camelCase vs snake_case from backend */
  const status = invoice.status as string;
  const totalHt = invoice.totalHt ?? 0;
  const totalTva = invoice.totalTva ?? 0;
  const totalTtc = invoice.totalTtc ?? invoice.total ?? 0;
  const amountPaid = invoice.amountPaid ?? invoice.amount_paid ?? 0;
  const remaining = invoice.remainingAmount ?? totalTtc - amountPaid;
  const invoiceDate = invoice.invoiceDate ?? invoice.invoice_date;
  const dueDate = invoice.dueDate ?? invoice.due_date;
  const paidDate = invoice.paidDate ?? invoice.paid_date;
  const lineItems = invoice.lineItems ?? invoice.line_items ?? [];
  const customer = invoice.customer;
  const quoteId = invoice.quoteId ?? invoice.quote_id;

  const isOverdue =
    status === 'sent' && dueDate && new Date(dueDate) < new Date();

  return (
    <MainLayout>
      {showPaymentModal && (
        <PaymentModal
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={(updated) => { setInvoice(updated); setShowPaymentModal(false); }}
        />
      )}

      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Header ────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Link href="/invoices" className="hover:underline">Factures</Link>
              <span>/</span>
              <span className="font-medium text-gray-700">{invoice.reference}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{invoice.reference}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-sm font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
                {STATUS_LABELS[status] ?? status}
              </span>
              {isOverdue && (
                <span className="inline-flex items-center rounded-full px-3 py-0.5 text-sm font-medium bg-red-100 text-red-700">
                  En retard
                </span>
              )}
              {quoteId && (
                <Link href={`/quotes/${quoteId}`} className="text-sm text-blue-600 hover:underline">
                  Devis #{quoteId}
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Actions selon statut */}
            {status === 'draft' && (
              <Button onClick={handleSend} loading={actionLoading} variant="secondary">
                📤 Envoyer
              </Button>
            )}
            {(status === 'sent' || status === 'partial' || status === 'overdue') && (
              <>
                <Button onClick={() => setShowPaymentModal(true)} variant="secondary">
                  💳 Paiement
                </Button>
                <Button onClick={handleMarkPaid} loading={actionLoading} variant="secondary">
                  ✅ Marquer payée
                </Button>
              </>
            )}
            <Button
              onClick={() => invoiceService.downloadPdf(invoiceId, invoice.reference).catch(() => alert('PDF non disponible'))}
              variant="outline"
            >
              📄 PDF
            </Button>
            <Button variant="outline" onClick={() => router.push(`/invoices/${invoiceId}/edit`)}>
              Modifier
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              Supprimer
            </Button>
          </div>
        </div>

        {/* ── Info cards ────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Client */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Client</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {customer ? (
                <>
                  <Link
                    href={`/customers/${invoice.customerId ?? invoice.customer_id}`}
                    className="font-medium text-blue-600 hover:underline block"
                  >
                    {(customer as any).name ?? (customer as any).company_name ?? '—'}
                  </Link>
                  {(customer as any).contact_name && (
                    <p className="text-gray-600 text-xs">{(customer as any).contact_name}</p>
                  )}
                  {(customer as any).email && (
                    <p className="text-gray-500">{(customer as any).email}</p>
                  )}
                  {((customer as any).phone || (customer as any).mobile) && (
                    <p className="text-gray-500">{(customer as any).phone ?? (customer as any).mobile}</p>
                  )}
                </>
              ) : (
                <p className="text-gray-400">—</p>
              )}
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Dates</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Émission :</span>
                <span>{fmtDate(invoiceDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Échéance :</span>
                <span className={isOverdue ? 'text-red-600 font-medium' : ''}>{fmtDate(dueDate)}</span>
              </div>
              {paidDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Paiement :</span>
                  <span className="text-green-600">{fmtDate(paidDate)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Résumé financier */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Montants</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total HT :</span>
                <span>{fmt(totalHt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">TVA :</span>
                <span>{fmt(totalTva)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                <span>Total TTC :</span>
                <span>{fmt(totalTtc)}</span>
              </div>
              {amountPaid > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Payé :</span>
                  <span>{fmt(amountPaid)}</span>
                </div>
              )}
              {remaining > 0.01 && (
                <div className="flex justify-between font-bold text-red-600 border-t pt-1 mt-1">
                  <span>Reste à payer :</span>
                  <span>{fmt(remaining)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Line items ────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Lignes de facturation</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {lineItems.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Aucune ligne</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-2.5 px-4 font-medium text-gray-600">Désignation</th>
                      <th className="text-right py-2.5 px-3 font-medium text-gray-600 w-16">Qté</th>
                      <th className="text-left py-2.5 px-3 font-medium text-gray-600 w-12">U.</th>
                      <th className="text-right py-2.5 px-3 font-medium text-gray-600 w-28">PU HT</th>
                      <th className="text-right py-2.5 px-3 font-medium text-gray-600 w-16">TVA</th>
                      <th className="text-right py-2.5 px-4 font-medium text-gray-600 w-28">Total HT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lineItems.map((item, idx) => {
                      const itemType = (item as any).item_type;
                      const isSection = itemType === 'section';
                      const isText = itemType === 'text';
                      const isPageBreak = itemType === 'page_break';
                      const isStructural = isSection || isText || isPageBreak;

                      if (isPageBreak) {
                        return (
                          <tr key={idx} className="bg-gray-50">
                            <td colSpan={6} className="py-1.5 px-4 text-center text-xs text-gray-400 italic border-dashed border-b border-gray-300">
                              — Saut de page —
                            </td>
                          </tr>
                        );
                      }

                      if (isSection) {
                        return (
                          <tr key={idx} className="bg-blue-50">
                            <td colSpan={6} className="py-2 px-4 font-semibold text-blue-800 uppercase text-xs tracking-wide">
                              {(item as any).description ?? (item as any).designation}
                            </td>
                          </tr>
                        );
                      }

                      if (isText) {
                        return (
                          <tr key={idx} className="bg-gray-50">
                            <td colSpan={6} className="py-2 px-4 text-xs text-gray-600 italic">
                              {(item as any).description ?? (item as any).designation}
                            </td>
                          </tr>
                        );
                      }

                      const qty = (item as any).quantity ?? 0;
                      const up = (item as any).unit_price ?? 0;
                      const totalHtLine = (item as any).total_ht ?? qty * up;
                      const vatRate = (item as any).vat_rate ?? (item as any).tax_rate ?? 0;

                      return (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 px-4">
                            <p className="font-medium">{(item as any).designation ?? (item as any).description}</p>
                            {(item as any).long_description && (
                              <p className="text-gray-500 text-xs mt-0.5">{(item as any).long_description}</p>
                            )}
                          </td>
                          <td className="text-right py-2.5 px-3 tabular-nums">{qty}</td>
                          <td className="py-2.5 px-3 text-gray-500">{(item as any).unit ?? 'u'}</td>
                          <td className="text-right py-2.5 px-3 tabular-nums">{fmt(up)}</td>
                          <td className="text-right py-2.5 px-3 text-gray-500">{vatRate}%</td>
                          <td className="text-right py-2.5 px-4 font-medium tabular-nums">{fmt(totalHtLine)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2">
                    <tr>
                      <td colSpan={5} className="text-right py-2 px-3 text-sm font-medium text-gray-600">Total HT :</td>
                      <td className="text-right py-2 px-4 font-semibold tabular-nums">{fmt(totalHt)}</td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="text-right py-2 px-3 text-sm text-gray-500">TVA :</td>
                      <td className="text-right py-2 px-4 tabular-nums text-gray-600">{fmt(totalTva)}</td>
                    </tr>
                    <tr className="bg-gray-100">
                      <td colSpan={5} className="text-right py-2.5 px-3 text-sm font-bold text-gray-800">Total TTC :</td>
                      <td className="text-right py-2.5 px-4 font-bold text-lg tabular-nums">{fmt(totalTtc)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Notes & Conditions ───────────────────────── */}
        {(invoice.notes || invoice.paymentTerms || invoice.payment_terms || invoice.bankDetails || invoice.bank_details) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {invoice.notes && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
                </CardContent>
              </Card>
            )}
            {(invoice.paymentTerms || invoice.payment_terms) && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Conditions de paiement</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {invoice.paymentTerms ?? invoice.payment_terms}
                  </p>
                </CardContent>
              </Card>
            )}
            {(invoice.bankDetails || invoice.bank_details) && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Coordonnées bancaires</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {invoice.bankDetails ?? invoice.bank_details}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── Footer nav ───────────────────────────────── */}
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => router.push('/invoices')}>
            ← Retour à la liste
          </Button>
          <div className="flex gap-2">
            {(status === 'sent' || status === 'partial' || status === 'overdue') && (
              <Button onClick={() => setShowPaymentModal(true)}>
                💳 Enregistrer un paiement
              </Button>
            )}
          </div>
        </div>

      </div>
    </MainLayout>
  );
}
