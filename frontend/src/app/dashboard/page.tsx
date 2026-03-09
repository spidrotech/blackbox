'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { dashboardService } from '@/services/api';
import { buildDetailPath } from '@/lib/routes';
import { ProjectRow } from '@/components/projects/ProjectRow';

/* ─── Formatters ──────────────────────────────────────────────── */

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const fmtFull = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

const fmtDate = (s?: string) => {
  if (!s) return '';
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

const fmtPct = (n: number) => `${Math.round(n)}%`;

/* ─── Badge maps ──────────────────────────────────────────────── */

const QUOTE_BADGE: Record<string, { label: string; cls: string; dot: string }> = {
  draft:     { label: 'Brouillon', cls: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',   dot: 'bg-slate-400' },
  sent:      { label: 'Envoyé',    cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',     dot: 'bg-blue-500' },
  viewed:    { label: 'Consulté',  cls: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200', dot: 'bg-violet-500' },
  signed:    { label: 'Signé',     cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  accepted:  { label: 'Accepté',   cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  refused:   { label: 'Refusé',    cls: 'bg-red-50 text-red-700 ring-1 ring-red-200',       dot: 'bg-red-500' },
  rejected:  { label: 'Refusé',    cls: 'bg-red-50 text-red-700 ring-1 ring-red-200',       dot: 'bg-red-500' },
  finalized: { label: 'Finalisé',  cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-500' },
  expired:   { label: 'Expiré',    cls: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200', dot: 'bg-orange-400' },
  cancelled: { label: 'Annulé',    cls: 'bg-gray-50 text-gray-400 ring-1 ring-gray-200',    dot: 'bg-gray-300' },
};

const INV_BADGE: Record<string, { label: string; cls: string; dot: string }> = {
  draft:    { label: 'Brouillon', cls: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',     dot: 'bg-slate-400' },
  sent:     { label: 'Envoyée',   cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',       dot: 'bg-blue-500' },
  partial:  { label: 'Partielle', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',     dot: 'bg-amber-400' },
  paid:     { label: 'Payée',     cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  overdue:  { label: 'En retard', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200',           dot: 'bg-red-500' },
  cancelled:{ label: 'Annulée',   cls: 'bg-gray-50 text-gray-400 ring-1 ring-gray-200',        dot: 'bg-gray-300' },
};

/* ─── Types ───────────────────────────────────────────────────── */

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
    key: string; label: string;
    paidRevenue: number; pendingInvoices: number;
    quotesCreated: number; quotesAccepted: number;
  }[];
  recentProjects: { id: number; name: string; status: string; customer_name?: string; budget?: number; worksite_address?: string; type?: string; createdAt?: string }[];
  recentQuotes: { id: number; reference: string; status: string; customer_name?: string; amount?: number; date?: string; createdAt?: string }[];
  recentInvoices: { id: number; reference: string; status: string; customer_name?: string; amount?: number; amount_paid?: number; date?: string; due_date?: string; createdAt?: string }[];
}

/* ─── Sub-components ──────────────────────────────────────────── */

function KPICard({ title, value, sub, icon, gradient, ring }: {
  title: string; value: string; sub?: React.ReactNode; icon: React.ReactNode; gradient: string; ring: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${ring} bg-white p-5 shadow-sm hover:shadow-md transition-shadow`}>
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-[0.07] ${gradient}`} />
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1.5 leading-tight">{value}</p>
          {sub && <div className="mt-1.5 text-xs text-gray-500">{sub}</div>}
        </div>
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${gradient} text-white shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color = 'text-gray-900' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="text-center px-3">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}

function StatusBadge({ label, cls, dot }: { label: string; cls: string; dot: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

/* ─── Quick action button ─────────────────────────────────────── */

function QuickAction({ href, icon, label, accent }: { href: string; icon: React.ReactNode; label: string; accent: string }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all group`}>
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent} text-white shadow-sm group-hover:scale-105 transition-transform`}>
        {icon}
      </span>
      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
    </Link>
  );
}

/* ─── SVG Icons (inline for zero deps) ────────────────────────── */

const IconRevenue = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const IconQuotes = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const IconInvoices = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
  </svg>
);

const IconProjects = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
  </svg>
);

const IconCustomers = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
  </svg>
);

const IconPlus = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const IconWarning = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
  </svg>
);

/* ─── Main Page ───────────────────────────────────────────────── */

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
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-blue-100" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 animate-spin" />
            </div>
            <p className="text-sm text-gray-400 font-medium">Chargement du tableau de bord...</p>
          </div>
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

  const monthly = d.monthlyAnalytics ?? [];
  const monthlyMax = Math.max(...monthly.map(m => m.paidRevenue + m.pendingInvoices), 1);

  return (
    <MainLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 capitalize">{monthLabel}</h1>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {d.projects.active} chantier{d.projects.active !== 1 ? 's' : ''} actif{d.projects.active !== 1 ? 's' : ''}
              </span>
              <span className="text-gray-300">|</span>
              <span>{d.customers.total} client{d.customers.total !== 1 ? 's' : ''}</span>
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Link href="/quotes/new" className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors">
              <IconPlus /> Nouveau devis
            </Link>
            <Link href="/invoices/new" className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800 shadow-sm transition-colors">
              <IconPlus /> Nouvelle facture
            </Link>
          </div>
        </div>

        {/* ── KPI Cards (5 columns) ──────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <KPICard
            title="CA du mois"
            value={fmt(d.ca_mois)}
            sub={<>Cumul : {fmt(d.ca_total)}</>}
            icon={<IconRevenue />}
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
            ring="border-blue-100"
          />
          <KPICard
            title="Devis en attente"
            value={fmt(d.quotes.pendingValue)}
            sub={<>{d.quotes.pending} sur {d.quotes.total} devis</>}
            icon={<IconQuotes />}
            gradient="bg-gradient-to-br from-amber-400 to-amber-500"
            ring="border-amber-100"
          />
          <KPICard
            title="Reste à encaisser"
            value={fmt(d.reste_a_encaisser)}
            sub={
              d.overdue_count > 0
                ? <span className="text-red-500 font-semibold inline-flex items-center gap-1"><IconWarning />{d.overdue_count} en retard</span>
                : <>{d.invoices.unpaid} facture{d.invoices.unpaid !== 1 ? 's' : ''} impayée{d.invoices.unpaid !== 1 ? 's' : ''}</>
            }
            icon={<IconInvoices />}
            gradient="bg-gradient-to-br from-rose-400 to-rose-500"
            ring={d.overdue_count > 0 ? 'border-red-200' : 'border-rose-100'}
          />
          <KPICard
            title="Chantiers actifs"
            value={String(d.projects.active)}
            sub={<>{d.projects.total} au total</>}
            icon={<IconProjects />}
            gradient="bg-gradient-to-br from-violet-400 to-violet-500"
            ring="border-violet-100"
          />
          <KPICard
            title="Clients"
            value={String(d.customers.total)}
            sub="Portefeuille"
            icon={<IconCustomers />}
            gradient="bg-gradient-to-br from-emerald-400 to-emerald-500"
            ring="border-emerald-100"
          />
        </div>

        {/* ── Quick Actions ──────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction href="/quotes/new" icon={<IconPlus />} label="Créer un devis" accent="bg-blue-500" />
          <QuickAction href="/invoices/new" icon={<IconPlus />} label="Créer une facture" accent="bg-gray-800" />
          <QuickAction href="/customers" icon={<IconCustomers />} label="Gérer les clients" accent="bg-emerald-500" />
          <QuickAction href="/projects" icon={<IconProjects />} label="Voir les chantiers" accent="bg-violet-500" />
        </div>

        {/* ── Monthly Chart ──────────────────────────────────── */}
        {monthly.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-gray-900">Tendance mensuelle</h2>
                <p className="text-xs text-gray-400 mt-0.5">Chiffre d&apos;affaires encaissé et factures en attente</p>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-500" /> Encaissé</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-200" /> En attente</span>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-4">
              {monthly.map(m => {
                const paidH = Math.max(Math.round((m.paidRevenue / monthlyMax) * 100), 2);
                const pendingH = Math.max(Math.round((m.pendingInvoices / monthlyMax) * 100), 0);
                const conv = m.quotesCreated > 0 ? Math.round((m.quotesAccepted / m.quotesCreated) * 100) : 0;
                return (
                  <div key={m.key} className="group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                      <div className="bg-gray-900 text-white rounded-lg px-3 py-1.5 text-[10px] whitespace-nowrap shadow-lg">
                        <p className="font-semibold">{fmtFull(m.paidRevenue)} encaissé</p>
                        <p className="opacity-70">{fmtFull(m.pendingInvoices)} en attente</p>
                      </div>
                    </div>
                    <div className="h-32 flex flex-col justify-end rounded-lg overflow-hidden bg-gray-50">
                      {pendingH > 0 && <div className="w-full bg-gradient-to-t from-blue-200 to-blue-100 rounded-t-sm transition-all duration-300" style={{ height: `${pendingH}%` }} />}
                      <div className="w-full bg-gradient-to-t from-blue-600 to-blue-500 transition-all duration-300" style={{ height: `${paidH}%`, borderRadius: pendingH ? '0' : '4px 4px 0 0' }} />
                    </div>
                    <div className="mt-2.5 text-center">
                      <p className="text-xs font-semibold text-gray-700">{m.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{conv > 0 ? `${conv}% conv.` : '—'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Summary row */}
            <div className="flex items-center justify-center gap-6 mt-5 pt-4 border-t border-gray-100">
              <MiniStat label="Total encaissé" value={fmt(monthly.reduce((s, m) => s + m.paidRevenue, 0))} color="text-blue-600" />
              <div className="w-px h-8 bg-gray-100" />
              <MiniStat label="Total en attente" value={fmt(monthly.reduce((s, m) => s + m.pendingInvoices, 0))} />
              <div className="w-px h-8 bg-gray-100" />
              <MiniStat label="Devis créés" value={monthly.reduce((s, m) => s + m.quotesCreated, 0)} />
              <div className="w-px h-8 bg-gray-100" />
              <MiniStat
                label="Taux conversion"
                value={fmtPct(
                  monthly.reduce((s, m) => s + m.quotesCreated, 0) > 0
                    ? (monthly.reduce((s, m) => s + m.quotesAccepted, 0) / monthly.reduce((s, m) => s + m.quotesCreated, 0)) * 100
                    : 0
                )}
                color="text-emerald-600"
              />
            </div>
          </div>
        )}

        {/* ── Bottom: Projects + Recent Documents ────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chantiers */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                  <IconProjects />
                </span>
                <h2 className="font-bold text-gray-900">Chantiers</h2>
              </div>
              <Link href="/projects" className="text-xs font-medium text-blue-600 hover:text-blue-700">Voir tout &rarr;</Link>
            </div>
            <div className="border-t border-gray-50">
              {d.recentProjects.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-3">
                    <IconProjects />
                  </div>
                  <p className="text-sm text-gray-400">Aucun chantier</p>
                  <Link href="/projects" className="text-xs text-blue-600 hover:underline mt-1">Créer un projet</Link>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {d.recentProjects.slice(0, 6).map(p => (
                    <ProjectRow key={`${p.type ?? 'project'}-${p.id}`} p={p} />
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Devis / Factures */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setTab('quotes')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    tab === 'quotes'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Devis
                  {d.quotes.total > 0 && <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-700">{d.quotes.total}</span>}
                </button>
                <button
                  onClick={() => setTab('invoices')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    tab === 'invoices'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Factures
                  {d.invoices.total > 0 && <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-red-100 text-red-600">{d.invoices.total}</span>}
                </button>
              </div>
              <Link href={tab === 'quotes' ? '/quotes' : '/invoices'} className="text-xs font-medium text-blue-600 hover:text-blue-700">Voir tout &rarr;</Link>
            </div>

            <div className="border-t border-gray-50">
              {tab === 'quotes' && (
                d.recentQuotes.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-3">
                      <IconQuotes />
                    </div>
                    <p className="text-sm text-gray-400">Aucun devis</p>
                    <Link href="/quotes/new" className="text-xs text-blue-600 hover:underline mt-1">Créer un devis</Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {d.recentQuotes.slice(0, 6).map(q => {
                      const b = QUOTE_BADGE[q.status] ?? { label: q.status, cls: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
                      return (
                        <li key={q.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                          <StatusBadge {...b} />
                          <div className="min-w-0 flex-1">
                            <Link href={buildDetailPath('quotes', q.id)} className="text-sm font-medium text-gray-800 hover:text-blue-600 block truncate">{q.reference}</Link>
                            <span className="text-xs text-gray-400">{q.customer_name || '—'}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-gray-800">{fmt(q.amount ?? 0)}</p>
                            <p className="text-[11px] text-gray-400">{fmtDate(q.date)}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )
              )}

              {tab === 'invoices' && (
                d.recentInvoices.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-3">
                      <IconInvoices />
                    </div>
                    <p className="text-sm text-gray-400">Aucune facture</p>
                    <Link href="/invoices/new" className="text-xs text-blue-600 hover:underline mt-1">Créer une facture</Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {d.recentInvoices.slice(0, 6).map(i => {
                      const b = INV_BADGE[i.status] ?? { label: i.status, cls: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
                      const reste = (i.amount ?? 0) - (i.amount_paid ?? 0);
                      return (
                        <li key={i.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                          <StatusBadge {...b} />
                          <div className="min-w-0 flex-1">
                            <Link href={buildDetailPath('invoices', i.id)} className="text-sm font-medium text-gray-800 hover:text-blue-600 block truncate">{i.reference}</Link>
                            <span className="text-xs text-gray-400">{i.customer_name || '—'}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-gray-800">{fmt(i.amount ?? 0)}</p>
                            {reste > 0
                              ? <p className="text-[11px] text-red-500 font-medium">Reste {fmt(reste)}</p>
                              : <p className="text-[11px] text-emerald-500 font-medium">Soldée</p>
                            }
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
      </div>
    </MainLayout>
  );
}