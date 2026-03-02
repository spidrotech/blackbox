'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { invoiceService, customerService } from '@/services/api';
import { Invoice, Customer } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { buildDetailPath, buildEditPath } from '@/lib/routes';

/* ─── Constants ─────────────────────────────────────────────── */

const BADGE: Record<string, { label: string; cls: string; dot: string }> = {
  draft:    { label: 'Brouillon', cls: 'bg-gray-100 text-gray-600',      dot: 'bg-gray-400' },
  sent:     { label: 'Envoyée',   cls: 'bg-blue-50 text-blue-700',       dot: 'bg-blue-500' },
  partial:  { label: 'Partielle', cls: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-400' },
  paid:     { label: 'Payée',     cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  overdue:  { label: 'En retard', cls: 'bg-red-50 text-red-700',         dot: 'bg-red-500' },
  cancelled:{ label: 'Annulée',   cls: 'bg-gray-100 text-gray-400',      dot: 'bg-gray-300' },
};

const TABS = [
  { value: '',        label: 'Toutes',    color: 'text-gray-600' },
  { value: 'draft',   label: 'Brouillon', color: 'text-gray-500' },
  { value: 'sent',    label: 'Envoyée',   color: 'text-blue-600' },
  { value: 'partial', label: 'Partielle', color: 'text-amber-600' },
  { value: 'overdue', label: 'En retard', color: 'text-red-600' },
  { value: 'paid',    label: 'Payée',     color: 'text-emerald-600' },
];

const MONTH_FR = ['Jan','Fév','Mar','Avr','Mai','Jui','Jul','Aoû','Sep','Oct','Nov','Déc'];

type InvoiceListItemLike = Invoice & {
  total_ttc?: number;
  amount_paid?: number;
  due_date?: string;
  customerId?: number;
};

/* ─── Helpers ────────────────────────────────────────────────── */

function calcTotal(invoice: Invoice): number {
  if (invoice.totalTtc !== undefined) return invoice.totalTtc;
  if ((invoice as InvoiceListItemLike).total_ttc !== undefined) return (invoice as InvoiceListItemLike).total_ttc ?? 0;
  if (invoice.total !== undefined) return invoice.total;
  if (!invoice.line_items?.length) return 0;
  return invoice.line_items.reduce((sum, item) => {
    const sub = item.quantity * item.unit_price;
    const disc = (sub * (item.discount_percent || 0)) / 100;
    const ht = sub - disc;
    return sum + ht + (ht * (item.vat_rate ?? 20)) / 100;
  }, 0);
}

function getInvoiceDate(inv: InvoiceListItemLike): string | undefined {
  return inv.invoice_date ?? inv.invoiceDate;
}

function getInvoiceDueDate(inv: InvoiceListItemLike): string | undefined {
  return inv.due_date ?? inv.dueDate;
}

function getInvoiceAmountPaid(inv: InvoiceListItemLike): number {
  return inv.amountPaid ?? inv.amount_paid ?? 0;
}

function getInvoiceCustomerId(inv: InvoiceListItemLike): number | undefined {
  return inv.customer_id ?? inv.customerId;
}

function customerLabel(id: number | undefined, customers: Customer[]): string {
  if (!id) return '—';
  const c = customers.find(x => x.id === id);
  if (!c) return '—';
  if (c.name) return c.name;
  return `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || '—';
}

function fmtAmt(amount: number): string {
  if (amount === 0) return '—';
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace('.0','')}\u202fM€`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1).replace('.0','')}\u202fk€`;
  return `${Math.round(amount)}\u202f€`;
}

/* ─── Sub-components ─────────────────────────────────────────── */

function KPICard({ title, value, sub, accent, icon }: {
  title: string; value: string; sub?: string; accent: string; icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{title}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function RevenueChart({ invoices }: { invoices: Invoice[] }) {
  const months = useMemo(() => {
    const now = new Date();
    const buckets: { label: string; paid: number; pending: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ label: MONTH_FR[d.getMonth()], paid: 0, pending: 0 });
    }
    invoices.forEach(inv => {
      const dateStr = getInvoiceDate(inv as InvoiceListItemLike);
      if (!dateStr) return;
      const d = new Date(dateStr);
      const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (monthsAgo < 0 || monthsAgo > 5) return;
      const idx = 5 - monthsAgo;
      const total = calcTotal(inv);
      if (inv.status === 'paid') {
        buckets[idx].paid += total;
      } else if (['sent', 'partial', 'overdue'].includes(inv.status)) {
        buckets[idx].pending += total;
      }
    });
    return buckets;
  }, [invoices]);

  const maxVal = Math.max(...months.map(m => m.paid + m.pending), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Revenus — 6 derniers mois</h2>
          <p className="text-xs text-gray-400">Encaissé + En attente</p>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"/>
            <span className="text-gray-500">Encaissé</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-200 inline-block"/>
            <span className="text-gray-500">En attente</span>
          </span>
        </div>
      </div>
      <div className="flex items-end gap-3 h-28">
        {months.map((m, i) => {
          const paidH = Math.round((m.paid / maxVal) * 100);
          const pendH = Math.round((m.pending / maxVal) * 100);
          const hasData = m.paid > 0 || m.pending > 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
              {hasData && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {formatCurrency(m.paid + m.pending)}
                </div>
              )}
              <div className="w-full flex flex-col justify-end" style={{ height: '96px' }}>
                <div className="w-full rounded-t-sm bg-blue-200" style={{ height: `${pendH}%` }} />
                <div className="w-full bg-blue-500" style={{ height: `${paidH}%`, borderRadius: pendH > 0 ? '0' : '4px 4px 0 0' }} />
              </div>
              <span className="text-[10px] text-gray-400 font-medium">{m.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaymentBar({ total, paid, status }: { total: number; paid: number; status: string }) {
  if (total <= 0) return null;
  const pct = Math.min(100, Math.round((paid / total) * 100));
  const barColor = status === 'paid' ? 'bg-emerald-500' : status === 'overdue' ? 'bg-red-400' : 'bg-blue-400';
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-400">{pct}%</span>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [invRes, custRes] = await Promise.all([invoiceService.getAll(), customerService.getAll()]);
      if (invRes.success) setInvoices(Array.isArray(invRes.data) ? invRes.data : []);
      if (custRes.success) setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSend = async (id: number) => {
    try { await invoiceService.send(id); loadData(); }
    catch (e) { console.error(e); }
  };

  // ── KPIs ──
  const kpis = useMemo(() => {
    let totalTtc = 0, collected = 0, pending = 0, overdueAmt = 0, overdueCount = 0;
    invoices.forEach(inv => {
      const ttc = calcTotal(inv);
      const paid = getInvoiceAmountPaid(inv as InvoiceListItemLike);
      const remaining = inv.remainingAmount ?? (ttc - paid);
      totalTtc += ttc;
      collected += paid;
      if (['sent', 'partial', 'overdue'].includes(inv.status)) pending += remaining;
      if (inv.status === 'overdue') { overdueAmt += remaining; overdueCount++; }
    });
    return { totalTtc, collected, pending, overdueAmt, overdueCount };
  }, [invoices]);

  // ── Tab counts + amounts ──
  const tabStats = useMemo(() => {
    const stats: Record<string, { count: number; amount: number }> = {
      '': { count: invoices.length, amount: invoices.reduce((s, i) => s + calcTotal(i), 0) },
    };
    ['draft','sent','partial','overdue','paid','cancelled'].forEach(st => {
      const rows = invoices.filter(i => i.status === st);
      stats[st] = { count: rows.length, amount: rows.reduce((s, i) => s + calcTotal(i), 0) };
    });
    return stats;
  }, [invoices]);

  const aging = useMemo(() => {
    const buckets = { current: 0, d0_30: 0, d31_60: 0, d60p: 0 };
    const today = new Date();
    invoices.forEach(inv => {
      if (!['sent', 'partial', 'overdue'].includes(inv.status)) return;
      const total = calcTotal(inv);
      const paid = getInvoiceAmountPaid(inv as InvoiceListItemLike);
      const remaining = Math.max(inv.remainingAmount ?? (total - paid), 0);
      if (remaining <= 0) return;
      const dueStr = getInvoiceDueDate(inv as InvoiceListItemLike);
      if (!dueStr) {
        buckets.current += remaining;
        return;
      }
      const due = new Date(dueStr);
      const days = Math.floor((today.getTime() - due.getTime()) / 86400000);
      if (days <= 0) buckets.current += remaining;
      else if (days <= 30) buckets.d0_30 += remaining;
      else if (days <= 60) buckets.d31_60 += remaining;
      else buckets.d60p += remaining;
    });
    return buckets;
  }, [invoices]);

  // ── Filtered list ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return invoices.filter(inv => {
      const matchTab = tab === '' || inv.status === tab;
      const matchSearch = q === '' ||
        inv.reference.toLowerCase().includes(q) ||
        (inv.subject ?? '').toLowerCase().includes(q) ||
        customerLabel(getInvoiceCustomerId(inv as InvoiceListItemLike), customers).toLowerCase().includes(q);
      return matchTab && matchSearch;
    });
  }, [invoices, customers, tab, search]);

  /* ── Loading state ── */
  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
            <p className="text-sm text-gray-400">{invoices.length} facture{invoices.length !== 1 ? 's' : ''} au total</p>
          </div>
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-sm shadow-blue-200 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle facture
          </Link>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard
            title="Total facturé"
            value={formatCurrency(kpis.totalTtc)}
            sub={`${invoices.length} facture(s)`}
            accent="bg-blue-50 text-blue-600"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>}
          />
          <KPICard
            title="Encaissé"
            value={formatCurrency(kpis.collected)}
            sub={kpis.totalTtc > 0 ? `${Math.round((kpis.collected / kpis.totalTtc) * 100)}% du total` : undefined}
            accent="bg-emerald-50 text-emerald-600"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
          />
          <KPICard
            title="À encaisser"
            value={formatCurrency(kpis.pending)}
            sub="Envoyées + partielles"
            accent="bg-amber-50 text-amber-600"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <KPICard
            title="En retard"
            value={formatCurrency(kpis.overdueAmt)}
            sub={kpis.overdueCount > 0 ? `${kpis.overdueCount} facture(s) échue(s)` : 'Aucune facture échue'}
            accent={kpis.overdueCount > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
          />
        </div>

        {/* ── Revenue chart ── */}
        <RevenueChart invoices={invoices} />

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-800">Vieillissement des créances</h2>
            <span className="text-xs text-gray-400">Montants restants à encaisser</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-gray-100 p-3 bg-gray-50">
              <p className="text-[11px] text-gray-500 uppercase">À terme</p>
              <p className="text-sm font-bold text-gray-800 mt-1">{formatCurrency(aging.current)}</p>
            </div>
            <div className="rounded-lg border border-amber-100 p-3 bg-amber-50">
              <p className="text-[11px] text-amber-700 uppercase">0–30 jours</p>
              <p className="text-sm font-bold text-amber-800 mt-1">{formatCurrency(aging.d0_30)}</p>
            </div>
            <div className="rounded-lg border border-orange-100 p-3 bg-orange-50">
              <p className="text-[11px] text-orange-700 uppercase">31–60 jours</p>
              <p className="text-sm font-bold text-orange-800 mt-1">{formatCurrency(aging.d31_60)}</p>
            </div>
            <div className="rounded-lg border border-red-100 p-3 bg-red-50">
              <p className="text-[11px] text-red-700 uppercase">+60 jours</p>
              <p className="text-sm font-bold text-red-800 mt-1">{formatCurrency(aging.d60p)}</p>
            </div>
          </div>
        </div>

        {/* ── Tabs + table ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Tab bar */}
          <div className="flex items-center justify-between px-4 pt-3 border-b border-gray-100">
            <div className="flex gap-0.5 overflow-x-auto">
              {TABS.map(t => {
                const st = tabStats[t.value];
                const active = tab === t.value;
                return (
                  <button key={t.value} onClick={() => setTab(t.value)}
                    className={`flex flex-col items-center px-3.5 py-2 border-b-2 transition-colors ${
                      active ? `border-current ${t.color}` : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <span className="text-sm font-medium whitespace-nowrap">{t.label}</span>
                    <span className={`text-[10px] font-semibold mt-0.5 ${active ? '' : 'text-gray-400'}`}>
                      {st?.count ?? 0} · {fmtAmt(st?.amount ?? 0)}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="w-52 pb-2 shrink-0">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                  placeholder="Recherche…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">Aucune facture trouvée</p>
              <p className="text-xs text-gray-400 text-center max-w-xs">
                {search ? 'Essayez un autre terme de recherche.' : 'Créez votre première facture en cliquant sur le bouton ci-dessus.'}
              </p>
              {!search && (
                <Link href="/invoices/new" className="mt-1 text-sm text-blue-600 font-medium hover:underline">
                  + Créer une facture
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/60">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Référence</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Dates</th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Montant TTC</th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Règlement</th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(invoice => {
                    const total = calcTotal(invoice);
                    const paid = getInvoiceAmountPaid(invoice as InvoiceListItemLike);
                    const remaining = invoice.remainingAmount ?? (total - paid);
                    const b = BADGE[invoice.status] ?? BADGE.draft;
                    const custId = getInvoiceCustomerId(invoice as InvoiceListItemLike);
                    const isOverdue = invoice.status === 'overdue';
                    const invoiceDate = getInvoiceDate(invoice as InvoiceListItemLike);
                    const dueDate = getInvoiceDueDate(invoice as InvoiceListItemLike);

                    return (
                      <tr key={invoice.id} className={`group hover:bg-blue-50/30 transition-colors ${isOverdue ? 'bg-red-50/20' : ''}`}>
                        {/* Référence */}
                        <td className="px-5 py-4">
                          <Link href={buildDetailPath('invoices', invoice.id)} className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                            {invoice.reference}
                          </Link>
                          {invoice.subject && (
                            <p className="text-xs text-gray-400 truncate max-w-[180px] mt-0.5">{invoice.subject}</p>
                          )}
                        </td>
                        {/* Client */}
                        <td className="px-5 py-4">
                          <span className="text-sm text-gray-700">{customerLabel(custId, customers)}</span>
                        </td>
                        {/* Statut */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${b.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`} />
                            {b.label}
                          </span>
                        </td>
                        {/* Dates */}
                        <td className="px-5 py-4">
                          <div className="text-sm text-gray-600">
                            {invoiceDate
                              ? formatDate(invoiceDate)
                              : '—'}
                          </div>
                          {dueDate && (
                            <div className={`text-xs mt-0.5 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                              Éch. {formatDate(dueDate)}
                            </div>
                          )}
                        </td>
                        {/* Montant */}
                        <td className="px-5 py-4 text-right">
                          <span className="text-sm font-bold text-gray-900">{formatCurrency(total)}</span>
                        </td>
                        {/* Règlement */}
                        <td className="px-5 py-4 text-right min-w-[120px]">
                          {invoice.status === 'paid' ? (
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Soldée</span>
                          ) : total > 0 ? (
                            <div>
                              <span className={`text-sm font-semibold ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                                {formatCurrency(remaining)}
                              </span>
                              <PaymentBar total={total} paid={paid} status={invoice.status} />
                            </div>
                          ) : null}
                        </td>
                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={buildDetailPath('invoices', invoice.id)}
                              className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                              Voir
                            </Link>
                            {invoice.status === 'draft' && (
                              <>
                                <Link href={buildEditPath('invoices', invoice.id)}
                                  className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                                  Modifier
                                </Link>
                                <button onClick={() => handleSend(invoice.id)}
                                  className="px-2.5 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                                  Envoyer
                                </button>
                              </>
                            )}
                            {['sent', 'partial', 'overdue'].includes(invoice.status) && (
                              <Link href={buildDetailPath('invoices', invoice.id)}
                                className="px-2.5 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                                Encaisser
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Footer summary */}
              <div className="px-5 py-3 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">{filtered.length} facture{filtered.length > 1 ? 's' : ''} affichée{filtered.length > 1 ? 's' : ''}</span>
                <span className="text-xs font-semibold text-gray-700">
                  Total affiché: {formatCurrency(filtered.reduce((s, i) => s + calcTotal(i), 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
