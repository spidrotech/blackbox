'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { invoiceService } from '@/services/api';
import { Invoice } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

/* ─── Formatters ──────────────────────────────────────────────── */

const fmtDate = (s?: string | null) => s ? formatDate(s) : '-';
const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

/* ─── Helpers ─────────────────────────────────────────────────── */

function urgencyColor(days: number) {
  if (days >= 30) return { bar: 'bg-red-500', badge: 'bg-red-100 text-red-700', ring: 'border-red-200' };
  if (days >= 14) return { bar: 'bg-orange-400', badge: 'bg-orange-100 text-orange-700', ring: 'border-orange-200' };
  if (days >= 7)  return { bar: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700', ring: 'border-amber-200' };
  return { bar: 'bg-blue-400', badge: 'bg-blue-100 text-blue-700', ring: 'border-blue-200' };
}

function reminderBadge(count: number) {
  if (count === 0) return { label: 'Aucune relance', cls: 'bg-gray-100 text-gray-500' };
  if (count === 1) return { label: '1re relance', cls: 'bg-yellow-100 text-yellow-700' };
  if (count === 2) return { label: '2e relance', cls: 'bg-orange-100 text-orange-700' };
  return { label: `${count}e relance`, cls: 'bg-red-100 text-red-700' };
}

/* ─── Stats card ──────────────────────────────────────────────── */

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-5 ${color}`}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────── */

export default function RelancesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    overdue_count: number;
    pending_count: number;
    total_overdue_amount: number;
    total_pending_amount: number;
    total_amount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'pending'>('all');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoiceService.getOverdueInvoices();
      if (res.success) {
        setInvoices(res.invoices);
        setStats(res.stats);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSendReminder = async (invoice: Invoice) => {
    if (!invoice.id) return;
    setSending(invoice.id);
    try {
      const res = await invoiceService.sendReminder(invoice.id);
      if (res.success) {
        showToast(`Relance n°${res.reminder_count} enregistrée pour ${invoice.reference}`);
        load();
      }
    } catch { showToast('Erreur lors de l\'envoi', 'error'); }
    finally { setSending(null); }
  };

  const filtered = invoices.filter(inv => {
    if (filter === 'overdue') return inv.isOverdue;
    if (filter === 'pending') return !inv.isOverdue;
    return true;
  });

  const totalRelances = invoices.reduce((acc, inv) => acc + (inv.reminderCount ?? inv.reminder_count ?? 0), 0);

  return (
    <MainLayout>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relances clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">Suivi des factures impayées et retards de paiement</p>
        </div>
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
          Toutes les factures
        </Link>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Factures concernées"
            value={String(stats.total)}
            sub={`${stats.overdue_count} en retard · ${stats.pending_count} en attente`}
            color="border-gray-100"
          />
          <StatCard
            label="Montant total dû"
            value={fmt(stats.total_amount)}
            color="border-gray-100"
          />
          <StatCard
            label="Retard de paiement"
            value={fmt(stats.total_overdue_amount)}
            sub={`${stats.overdue_count} facture${stats.overdue_count > 1 ? 's' : ''} échue${stats.overdue_count > 1 ? 's' : ''}`}
            color="border-red-100"
          />
          <StatCard
            label="Relances envoyées"
            value={String(totalRelances)}
            sub="total cumulé"
            color="border-blue-100"
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Aucune facture impayée 🎉</h3>
          <p className="text-sm text-gray-400">Toutes vos factures sont réglées ou en brouillon.</p>
        </div>
      ) : (
        <>
          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-4">
            {([['all', 'Toutes'], ['overdue', 'En retard'], ['pending', 'En attente']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${filter === val ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {label}
                {val === 'overdue' && stats && stats.overdue_count > 0 && (
                  <span className="ml-1.5 text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">{stats.overdue_count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Invoice list */}
          <div className="space-y-3">
            {filtered.map((inv) => {
              const remaining = inv.remainingAmount ?? inv.remaining_amount ?? 0;
              const days = inv.daysOverdue ?? 0;
              const isOverdue = inv.isOverdue ?? false;
              const reminderCount = inv.reminderCount ?? inv.reminder_count ?? 0;
              const customerName = (inv.customer as { name?: string })?.name ?? 
                (inv.customer ? `${(inv.customer as { firstName?: string }).firstName ?? ''} ${(inv.customer as { lastName?: string }).lastName ?? ''}`.trim() : '-');
              const urgency = isOverdue ? urgencyColor(days) : { bar: 'bg-blue-300', badge: 'bg-blue-50 text-blue-600', ring: 'border-blue-100' };
              const rBadge = reminderBadge(reminderCount);

              return (
                <div key={inv.id} className={`bg-white rounded-xl border ${urgency.ring} shadow-sm overflow-hidden`}>
                  {/* Urgency bar */}
                  {isOverdue && (
                    <div className={`h-1 ${urgency.bar}`} style={{ width: `${Math.min(days / 60 * 100, 100)}%` }} />
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: invoice info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Link href={`/invoices/${inv.id}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                            {inv.reference}
                          </Link>
                          {isOverdue ? (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${urgency.badge}`}>
                              {days} jour{days > 1 ? 's' : ''} de retard
                            </span>
                          ) : (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                              À échéance le {fmtDate(inv.due_date ?? inv.dueDate)}
                            </span>
                          )}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rBadge.cls}`}>
                            {rBadge.label}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            {customerName}
                          </span>
                          <span>Facturée le {fmtDate(inv.invoice_date ?? inv.invoiceDate)}</span>
                          {inv.lastReminderAt && (
                            <span className="text-xs text-gray-400">
                              Dernière relance : {fmtDate(inv.lastReminderAt)}
                            </span>
                          )}
                        </div>

                        {/* Progress bar for partial payment */}
                        {inv.status === 'partial' && (inv.amountPaid ?? inv.amount_paid) && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>Payé : {fmt(Number(inv.amountPaid ?? inv.amount_paid ?? 0))}</span>
                              <span>Reste : {fmt(Number(remaining))}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full"
                                style={{
                                  width: `${Math.min(
                                    (Number(inv.amountPaid ?? inv.amount_paid ?? 0) /
                                      (Number(inv.totalTtc ?? inv.total_ttc ?? 1))) * 100,
                                    100
                                  )}%`
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: amount + actions */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{fmt(Number(remaining))}</div>
                          <div className="text-xs text-gray-400">restant à encaisser</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                          >
                            Voir
                          </Link>
                          <button
                            onClick={() => handleSendReminder(inv)}
                            disabled={sending === inv.id}
                            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                          >
                            {sending === inv.id ? (
                              <span className="animate-spin w-3 h-3 border-2 border-white/40 border-t-white rounded-full" />
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                            )}
                            Relancer
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              Aucune facture dans cette catégorie
            </div>
          )}
        </>
      )}
    </MainLayout>
  );
}
