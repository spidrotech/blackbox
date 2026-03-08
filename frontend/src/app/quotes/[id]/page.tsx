'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { quoteService } from '@/services/api';
import { LineItem, Quote } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { buildDetailPath, buildEditPath } from '@/lib/routes';

type QuoteView = Quote & {
  sent_at?: string;
  sentAt?: string;
  finalized_date?: string;
  global_discount?: number;
  customer?: Quote['customer'] & {
    phone_number?: string;
    address_line1?: string;
  };
};

const BADGE: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'Brouillon', cls: 'bg-gray-100 text-gray-600' },
  sent:      { label: 'Envoyé',    cls: 'bg-blue-100 text-blue-700' },
  viewed:    { label: 'Consulté',  cls: 'bg-purple-100 text-purple-700' },
  signed:    { label: 'Signé',     cls: 'bg-green-100 text-green-700' },
  accepted:  { label: 'Accepté',   cls: 'bg-green-100 text-green-700' },
  refused:   { label: 'Refusé',    cls: 'bg-red-100 text-red-700' },
  rejected:  { label: 'Refusé',    cls: 'bg-red-100 text-red-700' },
  finalized: { label: 'Finalisé',  cls: 'bg-emerald-100 text-emerald-700' },
  expired:   { label: 'Expiré',    cls: 'bg-orange-100 text-orange-600' },
  cancelled: { label: 'Annulé',    cls: 'bg-gray-100 text-gray-400' },
};

const WORKFLOW = ['draft', 'sent', 'viewed', 'signed', 'accepted', 'finalized'];

function StatusStepper({ status }: { status: string }) {
  const currentIdx = WORKFLOW.indexOf(status);
  const labels: Record<string, string> = {
    draft: 'Brouillon', sent: 'Envoyé', viewed: 'Consulté',
    signed: 'Signé', accepted: 'Accepté', finalized: 'Finalisé',
  };
  if (!WORKFLOW.includes(status)) return null;
  return (
    <div className="flex items-center gap-0">
      {WORKFLOW.map((s, i) => {
        const done = i <= currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s} className="flex items-center">
            <div className={`flex flex-col items-center gap-1 ${active ? 'scale-105' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                ${done ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-300'}`}>
                {done ? (active ? i + 1 : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>) : i + 1}
              </div>
              <span className={`text-xs whitespace-nowrap ${active ? 'text-blue-600 font-semibold' : done ? 'text-gray-500' : 'text-gray-300'}`}>{labels[s]}</span>
            </div>
            {i < WORKFLOW.length - 1 && (
              <div className={`w-8 h-0.5 mx-0.5 -mt-4 ${i < currentIdx ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = parseInt(params.id as string);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [statusMenu, setStatusMenu] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadQuote = useCallback(async () => {
    try {
      const res = await quoteService.getById(quoteId);
      const quoteData = (res as unknown as { quote?: QuoteView }).quote ?? (res.data as QuoteView | undefined);
      if (res.success && quoteData) {
        setQuote(quoteData);
        try {
          const blobUrl = await quoteService.getPdfBlobUrl(quoteId);
          setPdfUrl(blobUrl);
        } catch { /* PDF not available yet */ }
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [quoteId]);

  useEffect(() => { loadQuote(); }, [loadQuote]);

  const handleSend = async () => {
    setActionLoading('send');
    try {
      const res = await quoteService.send(quoteId);
      if (res.success) { showToast('Devis marqué comme envoyé'); loadQuote(); }
      else showToast('Erreur', 'error');
    } catch { showToast('Erreur', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleDuplicate = async () => {
    setActionLoading('dup');
    try {
      const res = await quoteService.duplicate(quoteId);
      const duplicatedQuote = (res as unknown as { quote?: Quote }).quote ?? (res.data as Quote | undefined);
      if (res.success && duplicatedQuote?.id) {
        showToast('Dupliqué avec succès');
        setTimeout(() => router.push(buildEditPath('quotes', duplicatedQuote.id)), 800);
      } else showToast('Erreur', 'error');
    } catch { showToast('Erreur', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleConvert = async () => {
    if (!confirm('Convertir ce devis en facture ?')) return;
    setActionLoading('convert');
    try {
      const res = await quoteService.convertToInvoice(quoteId);
      if (res.success) {
        showToast('Facture créée !');
        const inv = (res as unknown as { invoice?: { id?: number } }).invoice ?? (res.data as { id?: number } | undefined);
        const createdInvoiceId = inv?.id;
        if (typeof createdInvoiceId === 'number') {
          setTimeout(() => router.push(buildDetailPath('invoices', createdInvoiceId)), 800);
        }
      } else showToast('Erreur', 'error');
    } catch { showToast('Erreur', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer ce devis définitivement ?')) return;
    setActionLoading('del');
    try {
      const res = await quoteService.delete(quoteId);
      if (res.success) { showToast('Supprimé'); setTimeout(() => router.push('/quotes'), 600); }
      else showToast('Erreur', 'error');
    } catch { showToast('Erreur', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatusMenu(false);
    setActionLoading('status');
    try {
      const res = await quoteService.updateStatus(quoteId, newStatus);
      if (res.success) { showToast('Statut mis à jour'); loadQuote(); }
      else showToast('Erreur', 'error');
    } catch { showToast('Erreur', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleDownloadPdf = async () => {
    setActionLoading('pdf');
    try { await quoteService.downloadPdf(quoteId, quote?.reference); }
    catch { showToast('Erreur PDF', 'error'); }
    finally { setActionLoading(null); }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </MainLayout>
    );
  }

  if (!quote) {
    return (
      <MainLayout>
        <div className="text-center py-16">
          <p className="text-gray-500">Devis introuvable.</p>
          <Link href="/quotes" className="mt-3 inline-block text-blue-600 hover:underline text-sm">Retour aux devis</Link>
        </div>
      </MainLayout>
    );
  }

  const q = quote as QuoteView;
  const b = BADGE[quote.status] ?? { label: quote.status, cls: 'bg-gray-100 text-gray-600' };
  const customerName = q.customer ? (q.customer.name || `${q.customer.firstName || ''} ${q.customer.lastName || ''}`.trim()) : '-';
  const customerEmail = q.customer?.email || '-';
  const customerPhone = q.customer?.phone || q.customer?.phone_number || q.customer?.mobile || '';
  const customerAddress = q.customer?.address?.street || q.customer?.billingAddress?.street || q.customer?.address_line1 || '';
  const totalHt = q.total_ht ?? 0;
  const totalTtc = q.total_ttc ?? 0;
  const totalTva = q.total_tva ?? (totalTtc - totalHt);
  const globalDiscount = q.global_discount ?? 0;
  const ceePremium = q.cee_premium ?? 0;
  const mprPremium = q.mpr_premium ?? 0;
  const netAfterPremiums = q.net_after_premiums ?? (totalTtc - ceePremium - mprPremium);
  const depositPct = q.deposit_percent ?? 0;
  const depositAmt = q.deposit_amount ?? (totalTtc * depositPct / 100);
  const canConvert = ['signed', 'accepted', 'finalized'].includes(quote.status);
  const lineItems: LineItem[] = q.line_items || [];

  // Group line items by section
  const sections: Record<string, LineItem[]> = {};
  lineItems.forEach((item) => {
    const sec = item.section || 'G\u00e9n\u00e9ral';
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(item);
  });

  const STATUS_OPTIONS = [
    { value: 'draft', label: 'Brouillon' },
    { value: 'sent', label: 'Envoyé' },
    { value: 'viewed', label: 'Consulté' },
    { value: 'signed', label: 'Signé' },
    { value: 'accepted', label: 'Accepté' },
    { value: 'rejected', label: 'Refusé' },
    { value: 'finalized', label: 'Finalisé' },
    { value: 'expired', label: 'Expiré' },
    { value: 'cancelled', label: 'Annulé' },
  ].filter(s => s.value !== quote.status);

  return (
    <MainLayout>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link href="/quotes" className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{quote.reference}</h1>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${b.cls}`}>{b.label}</span>
            </div>
            {(q.subject || quote.description) && (
              <p className="text-sm text-gray-500 mt-0.5">{q.subject || quote.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {quote.status === 'draft' && (
            <button onClick={handleSend} disabled={actionLoading === 'send'} className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              Envoyer
            </button>
          )}
          {canConvert && (
            <button onClick={handleConvert} disabled={actionLoading === 'convert'} className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              Créer la facture
            </button>
          )}
          <Link href={buildEditPath('quotes', quoteId)} className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Modifier
          </Link>
          <button onClick={handleDownloadPdf} disabled={actionLoading === 'pdf'} className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            PDF
          </button>
          <button onClick={handleDuplicate} disabled={actionLoading === 'dup'} className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            Dupliquer
          </button>
          <div className="relative">
            <button onClick={() => setStatusMenu(v => !v)} className="inline-flex items-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-medium px-2.5 py-2 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
              Statut
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {statusMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                {STATUS_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => handleStatusChange(opt.value)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">{opt.label}</button>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleDelete} disabled={actionLoading === 'del'} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Supprimer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>

      {/* Status Stepper */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4 mb-4 overflow-x-auto">
        <StatusStepper status={quote.status} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Left: Main content */}
        <div className="col-span-2 space-y-4">
          {/* Client + Dates */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 grid grid-cols-2 gap-5">
            <Section title="Client">
              <p className="font-semibold text-gray-900">{customerName}</p>
              {customerEmail !== '-' && <p className="text-sm text-gray-500">{customerEmail}</p>}
              {customerPhone && <p className="text-sm text-gray-500">{customerPhone}</p>}
              {customerAddress && <p className="text-sm text-gray-500">{customerAddress}</p>}
            </Section>
            <Section title="Informations">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Date du devis</span>
                  <span className="text-gray-900">{formatDate(q.quote_date || q.created_at || '')}</span>
                </div>
                {(q.expiry_date || q.expiryDate) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Validité</span>
                    <span className="text-gray-900">{formatDate(q.expiry_date || q.expiryDate || '')}</span>
                  </div>
                )}
                {(q.worksite_address || q.worksiteAddress) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Chantier</span>
                    <span className="text-gray-900 text-right max-w-[180px]">{q.worksite_address || q.worksiteAddress}</span>
                  </div>
                )}
                {(q.sent_at || q.sentAt) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Envoyé le</span>
                    <span className="text-gray-900">{formatDate(q.sent_at || q.sentAt || '')}</span>
                  </div>
                )}
                {(q.finalized_date || q.finalizedDate) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Finalisé le</span>
                    <span className="text-gray-900">{formatDate(q.finalized_date || q.finalizedDate || '')}</span>
                  </div>
                )}
              </div>
            </Section>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">Détail des prestations</h2>
            </div>
            {Object.keys(sections).length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">Aucune ligne</p>
            ) : (
              <div>
                {Object.entries(sections).map(([sectionName, items]) => (
                  <div key={sectionName}>
                    {Object.keys(sections).length > 1 && (
                      <div className="px-5 py-2.5 bg-gray-50 border-y border-gray-100">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{sectionName}</span>
                      </div>
                    )}
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-50">
                          <th className="px-5 py-2.5 text-left text-xs text-gray-400 font-medium">Désignation</th>
                          <th className="px-3 py-2.5 text-center text-xs text-gray-400 font-medium">Qte</th>
                          <th className="px-3 py-2.5 text-center text-xs text-gray-400 font-medium">Unité</th>
                          <th className="px-3 py-2.5 text-right text-xs text-gray-400 font-medium">P.U. HT</th>
                          <th className="px-3 py-2.5 text-right text-xs text-gray-400 font-medium">Remise</th>
                          <th className="px-3 py-2.5 text-right text-xs text-gray-400 font-medium">TVA</th>
                          <th className="px-5 py-2.5 text-right text-xs text-gray-400 font-medium">Total HT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {items.map((item) => {
                          const qty = item.quantity ?? 1;
                          const pu = item.unit_price ?? 0;
                          const disc = item.discount_percent ?? 0;
                          const lineTotal = qty * pu * (1 - disc / 100);
                          return (
                            <tr key={item.id} className="hover:bg-gray-50/50">
                              <td className="px-5 py-3">
                                <div className="text-sm text-gray-900">{item.description || item.designation}</div>
                                {(item.long_description) && (
                                  <div className="text-xs text-gray-400 mt-0.5">{item.long_description}</div>
                                )}
                              </td>
                              <td className="px-3 py-3 text-sm text-center text-gray-600">{qty}</td>
                              <td className="px-3 py-3 text-sm text-center text-gray-400">{item.unit || ''}</td>
                              <td className="px-3 py-3 text-sm text-right text-gray-700">{formatCurrency(pu)}</td>
                              <td className="px-3 py-3 text-sm text-right text-gray-500">{disc ? `${disc}%` : '-'}</td>
                              <td className="px-3 py-3 text-sm text-right text-gray-500">{item.vat_rate ?? 20}%</td>
                              <td className="px-5 py-3 text-sm font-medium text-right text-gray-900">{formatCurrency(lineTotal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes / Footer */}
          {(q.conditions || q.payment_terms) && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
              
              {q.conditions && (
                <Section title="Conditions générales">
                  <p className="text-sm text-gray-600 whitespace-pre-line">{q.conditions}</p>
                </Section>
              )}
              {q.payment_terms && (
                <Section title="Conditions de paiement">
                  <p className="text-sm text-gray-600 whitespace-pre-line">{q.payment_terms}</p>
                </Section>
              )}
              
            </div>
          )}
        </div>

        {/* Right: Financials + PDF */}
        <div className="col-span-1 space-y-4">
          {/* Financial Summary */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Récapitulatif</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total HT</span>
                <span className="text-gray-900 font-medium">{formatCurrency(totalHt)}</span>
              </div>
              {globalDiscount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Remise globale</span>
                  <span>-{formatCurrency(globalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">TVA</span>
                <span className="text-gray-900">{formatCurrency(totalTva)}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between font-bold text-base">
                <span className="text-gray-900">Total TTC</span>
                <span className="text-blue-700">{formatCurrency(totalTtc)}</span>
              </div>
              {ceePremium > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Prime CEE</span>
                  <span>-{formatCurrency(ceePremium)}</span>
                </div>
              )}
              {mprPremium > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>MaPrimeRénov&apos;</span>
                  <span>-{formatCurrency(mprPremium)}</span>
                </div>
              )}
              {(ceePremium > 0 || mprPremium > 0) && (
                <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between font-bold text-sm">
                  <span className="text-gray-700">Net client</span>
                  <span className="text-emerald-700">{formatCurrency(netAfterPremiums)}</span>
                </div>
              )}
              {depositPct > 0 && (
                <div className="bg-blue-50 rounded-lg p-3 mt-2">
                  <div className="flex justify-between text-sm text-blue-800">
                    <span className="font-medium">Acompte ({depositPct}%)</span>
                    <span className="font-bold">{formatCurrency(depositAmt)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bank details */}
          {q.bank_details && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              
            </div>
          )}

          {/* PDF Preview */}
          {pdfUrl && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-50 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Aperçu PDF</span>
                <div className="flex items-center gap-3">
                    <button onClick={() => window.open('/settings?tab=documents&doc=entetes', '_blank')} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1" title="Configurer l'en-tête et pied de page">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Paramètres PDF
                    </button>
                    <button onClick={handleDownloadPdf} className="text-xs text-blue-600 hover:underline">Télécharger</button>
                  </div>
              </div>
              <iframe
                src={pdfUrl}
                className="w-full"
                style={{ height: '500px' }}
                title="Aper\u00e7u du devis"
              />
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
