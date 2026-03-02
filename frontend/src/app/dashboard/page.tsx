'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { dashboardService } from '@/services/api';
import { buildDetailPath } from '@/lib/routes';

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

const fmtDate = (s?: string) => {
  if (!s) return '';
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

const QUOTE_BADGE: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'Brouillon', cls: 'bg-gray-100 text-gray-600' },
  sent:      { label: 'Envoyé',    cls: 'bg-blue-100 text-blue-700' },
  viewed:    { label: 'Consulté',  cls: 'bg-purple-100 text-purple-700' },
  signed:    { label: 'Signé',     cls: 'bg-green-100 text-green-700' },
  accepted:  { label: 'Accepté',   cls: 'bg-green-100 text-green-700' },
  refused:   { label: 'Refusé',    cls: 'bg-red-100 text-red-700' },
  finalized: { label: 'Finalisé',  cls: 'bg-orange-100 text-orange-700' },
};

const INV_BADGE: Record<string, { label: string; cls: string }> = {
  draft:    { label: 'Brouillon', cls: 'bg-gray-100 text-gray-600' },
  sent:     { label: 'Envoyée',   cls: 'bg-blue-100 text-blue-700' },
  partial:  { label: 'Partielle', cls: 'bg-yellow-100 text-yellow-700' },
  paid:     { label: 'Payée',     cls: 'bg-green-100 text-green-700' },
  overdue:  { label: 'En retard', cls: 'bg-red-100 text-red-700' },
  cancelled:{ label: 'Annulée',   cls: 'bg-gray-100 text-gray-500' },
};

interface DashData {
  ca_mois: number;
  ca_total: number;
  reste_a_encaisser: number;
  overdue_count: number;
  projects: { total: number; active: number };
  customers: { total: number };
  quotes: { total: number; pending: number; pendingValue: number };
  invoices: { total: number; unpaid: number; unpaidValue: number };
  monthlyAnalytics?: {
    key: string;
    label: string;
    paidRevenue: number;
    pendingInvoices: number;
    quotesCreated: number;
    quotesAccepted: number;
  }[];
  recentProjects: { id: number; name: string; status: string; customer_name?: string; budget?: number; worksite_address?: string; type?: string; createdAt?: string }[];
  recentQuotes: { id: number; reference: string; status: string; customer_name?: string; amount?: number; date?: string; createdAt?: string }[];
  recentInvoices: { id: number; reference: string; status: string; customer_name?: string; amount?: number; amount_paid?: number; date?: string; due_date?: string; createdAt?: string }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [tab, setTab] = useState<'quotes' | 'invoices'>('quotes');
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  useEffect(() => {
    dashboardService.getData().then(res => {
      if (res.success && res.data) setData(res.data as DashData);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </MainLayout>
    );
  }

  const d = data ?? {
    ca_mois: 0, ca_total: 0, reste_a_encaisser: 0, overdue_count: 0,
    projects: { total: 0, active: 0 }, customers: { total: 0 },
    quotes: { total: 0, pending: 0, pendingValue: 0 },
    invoices: { total: 0, unpaid: 0, unpaidValue: 0 },
    recentProjects: [], recentQuotes: [], recentInvoices: [],
  };

  const caRatio = d.ca_total > 0 ? Math.min(100, Math.round((d.ca_mois / d.ca_total) * 100)) : 0;
  const pendingQuoteRatio = d.quotes.total > 0 ? Math.min(100, Math.round((d.quotes.pending / d.quotes.total) * 100)) : 0;
  const unpaidInvoiceRatio = d.invoices.total > 0 ? Math.min(100, Math.round((d.invoices.unpaid / d.invoices.total) * 100)) : 0;
  const monthly = d.monthlyAnalytics ?? [];
  const monthlyMax = Math.max(...monthly.map(m => m.paidRevenue + m.pendingInvoices), 1);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 capitalize">{monthLabel}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{d.projects.active} chantier(s) actif(s)  {d.customers.total} client(s)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">CA encaissé ce mois</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{fmt(d.ca_mois)}</p>
            <p className="text-xs text-gray-400 mt-1">Total all time : {fmt(d.ca_total)}</p>
            <div className="mt-3 h-1 rounded-full bg-blue-50"><div className="h-1 rounded-full bg-blue-500" style={{ width: `${caRatio}%` }} /></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Devis en attente</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{fmt(d.quotes.pendingValue)}</p>
            <p className="text-xs text-gray-400 mt-1">{d.quotes.pending} devis  {d.quotes.total} au total</p>
            <div className="mt-3 h-1 rounded-full bg-orange-50"><div className="h-1 rounded-full bg-orange-400" style={{ width: `${pendingQuoteRatio}%` }} /></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Reste à encaisser</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{fmt(d.reste_a_encaisser)}</p>
            {d.overdue_count > 0 ? (
              <p className="text-xs text-red-500 mt-1 font-medium">{d.overdue_count} facture(s) en retard</p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">{d.invoices.unpaid} facture(s) impayée(s)</p>
            )}
            <div className="mt-3 h-1 rounded-full bg-red-50"><div className="h-1 rounded-full bg-red-400" style={{ width: `${unpaidInvoiceRatio}%` }} /></div>
          </div>
        </div>

        {monthly.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-800">Tendance mensuelle</h2>
                <p className="text-xs text-gray-400">CA encaissé, reste à encaisser et conversion devis</p>
              </div>
              <div className="flex gap-3 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"/> Encaissé</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-200"/> En attente</span>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-3">
              {monthly.map(m => {
                const paidH = Math.round((m.paidRevenue / monthlyMax) * 100);
                const pendingH = Math.round((m.pendingInvoices / monthlyMax) * 100);
                const conv = m.quotesCreated > 0 ? Math.round((m.quotesAccepted / m.quotesCreated) * 100) : 0;
                return (
                  <div key={m.key} className="group">
                    <div className="h-28 flex flex-col justify-end">
                      <div className="w-full bg-blue-200 rounded-t" style={{ height: `${pendingH}%` }} />
                      <div className="w-full bg-blue-500" style={{ height: `${paidH}%`, borderRadius: pendingH ? '0' : '4px 4px 0 0' }} />
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-[11px] font-semibold text-gray-600">{m.label}</p>
                      <p className="text-[10px] text-gray-400">{conv}% conv.</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-50">
              <h2 className="font-semibold text-gray-800">Chantiers</h2>
              <Link href="/projects" className="text-xs text-blue-600 hover:underline">Voir tout</Link>
            </div>
            {d.recentProjects.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">Aucun chantier</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {d.recentProjects.slice(0, 8).map(p => (
                  <li key={`${p.type ?? 'project'}-${p.id}`} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      {p.type === 'quote_worksite' ? (
                        <Link href={buildDetailPath('quotes', p.id)} className="text-sm font-medium text-gray-800 hover:text-blue-600 truncate block">{p.name}</Link>
                      ) : (
                        <Link href={buildDetailPath('projects', p.id)} className="text-sm font-medium text-gray-800 hover:text-blue-600 truncate block">{p.name}</Link>
                      )}
                      <span className="text-xs text-gray-400">
                        {p.customer_name || ''}
                        {p.worksite_address && <span className="ml-1 text-purple-500">📍 {p.worksite_address.slice(0, 30)}{p.worksite_address.length > 30 ? '…' : ''}</span>}
                      </span>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      {p.type === 'quote_worksite'
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Devis</span>
                        : p.budget ? <span className="text-sm font-medium text-gray-700">{fmt(p.budget)}</span> : null
                      }
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-50">
              <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                <button onClick={() => setTab('quotes')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === 'quotes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Devis</button>
                <button onClick={() => setTab('invoices')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === 'invoices' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Factures</button>
              </div>
              <Link href={tab === 'quotes' ? '/quotes' : '/invoices'} className="text-xs text-blue-600 hover:underline">Voir tout</Link>
            </div>

            {tab === 'quotes' && (
              d.recentQuotes.length === 0 ? <p className="px-5 py-8 text-sm text-gray-400 text-center">Aucun devis</p> : (
                <ul className="divide-y divide-gray-50">
                  {d.recentQuotes.slice(0, 8).map(q => {
                    const b = QUOTE_BADGE[q.status] ?? { label: q.status, cls: 'bg-gray-100 text-gray-600' };
                    return (
                      <li key={q.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                        <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${b.cls}`}>{b.label}</span>
                        <div className="min-w-0 flex-1">
                          <Link href={buildDetailPath('quotes', q.id)} className="text-sm font-medium text-gray-800 hover:text-blue-600 block truncate">{q.reference}</Link>
                          <span className="text-xs text-gray-400">{q.customer_name || ''}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium text-gray-800">{fmt(q.amount ?? 0)}</p>
                          <p className="text-xs text-gray-400">{fmtDate(q.date)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )
            )}

            {tab === 'invoices' && (
              d.recentInvoices.length === 0 ? <p className="px-5 py-8 text-sm text-gray-400 text-center">Aucune facture</p> : (
                <ul className="divide-y divide-gray-50">
                  {d.recentInvoices.slice(0, 8).map(i => {
                    const b = INV_BADGE[i.status] ?? { label: i.status, cls: 'bg-gray-100 text-gray-600' };
                    const reste = (i.amount ?? 0) - (i.amount_paid ?? 0);
                    return (
                      <li key={i.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                        <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${b.cls}`}>{b.label}</span>
                        <div className="min-w-0 flex-1">
                          <Link href={buildDetailPath('invoices', i.id)} className="text-sm font-medium text-gray-800 hover:text-blue-600 block truncate">{i.reference}</Link>
                          <span className="text-xs text-gray-400">{i.customer_name || ''}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium text-gray-800">{fmt(i.amount ?? 0)}</p>
                          {reste > 0 ? <p className="text-xs text-red-400">Reste {fmt(reste)}</p> : <p className="text-xs text-green-500">Soldée</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
