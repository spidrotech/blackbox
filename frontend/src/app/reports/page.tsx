'use client';

import { useCallback, useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { dashboardService } from '@/services/api';
import { FinancialReport, FinancialReportMonth } from '@/types';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

/* ─── Constants ───────────────────────────────────────────────── */

const LABELS = {
  pageTitle: 'Rapports financiers',
  pageSubtitle: 'Analyse de votre activité et de votre TVA',
  exportCsv: 'Export CSV',
  noData: 'Données indisponibles',
  tabs: { revenue: "Chiffre d'affaires", quotes: 'Devis', tva: 'TVA' } as const,
  kpi: {
    paidHt: 'CA encaissé HT',
    paidTtc: 'CA encaissé TTC',
    pending: "En attente d'encaissement",
    conversion: 'Taux de conversion devis',
    pendingSub: 'factures envoyées',
  },
  legend: {
    paidTtc: 'Encaissé TTC',
    pendingHt: 'En attente HT',
    quotesSent: 'Envoyés',
    quotesAccepted: 'Acceptés',
    conversionRate: 'Taux de conversion',
    tvaCollected: 'TVA collectée',
  },
  tvaTable: {
    title: 'Récapitulatif TVA annuel',
    subtitle: 'TVA collectée sur les factures payées',
    month: 'Mois',
    caHt: 'CA HT',
    tva: 'TVA collectée',
    caTtc: 'CA TTC',
    total: 'TOTAL',
  },
  detail: {
    title: 'Détail mensuel',
    cols: { month: 'Mois', paidTtc: 'CA encaissé TTC', pending: 'En attente HT', sent: 'Devis envoyés', accepted: 'Devis acceptés', conv: 'Taux conv.' },
  },
  csvHeaders: ['Mois', 'CA HT (€)', 'TVA collectée (€)', 'CA TTC (€)', 'En attente HT (€)', 'Devis envoyés', 'Devis acceptés', 'Taux de conversion (%)'],
} as const;

/* ─── Helpers ─────────────────────────────────────────────────── */

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtFull = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

/* ─── Custom tooltip ──────────────────────────────────────────── */

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-500">{entry.name} :</span>
          <span className="font-medium text-gray-900">
            {entry.name === LABELS.legend.conversionRate ? `${entry.value.toFixed(1)}%` : fmt(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────── */

function KPICard({ label, value, sub, accent, icon }: { label: string; value: string; sub?: string; accent?: string; icon?: React.ReactNode }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-6 ${accent ?? 'border-gray-100'}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        {icon && <div className="text-gray-300">{icon}</div>}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function TVASection({ months, totals }: { months: FinancialReportMonth[]; totals: FinancialReport['totals'] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">{LABELS.tvaTable.title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{LABELS.tvaTable.subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">{LABELS.tvaTable.month}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{LABELS.tvaTable.caHt}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{LABELS.tvaTable.tva}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{LABELS.tvaTable.caTtc}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {months.map((m) => (
              <tr key={m.month} className={`hover:bg-gray-50/50 ${m.paidHt === 0 ? 'opacity-40' : ''}`}>
                <td className="px-6 py-3 text-sm text-gray-700 font-medium">{m.label}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-900">{fmtFull(m.paidHt)}</td>
                <td className="px-4 py-3 text-sm text-right text-blue-600">{fmtFull(m.paidTva)}</td>
                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">{fmtFull(m.paidTtc)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-200">
            <tr>
              <td className="px-6 py-3 text-sm font-bold text-gray-900">{LABELS.tvaTable.total}</td>
              <td className="px-4 py-3 text-sm font-bold text-right text-gray-900">{fmtFull(totals.paidHt)}</td>
              <td className="px-4 py-3 text-sm font-bold text-right text-blue-700">{fmtFull(totals.paidTva)}</td>
              <td className="px-4 py-3 text-sm font-bold text-right text-gray-900">{fmtFull(totals.paidTtc)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ─── CSV Export ──────────────────────────────────────────────── */

function exportTVACsv(report: FinancialReport) {
  const rows = [
    LABELS.csvHeaders,
    ...report.months.map(m => [
      m.label, m.paidHt.toFixed(2), m.paidTva.toFixed(2), m.paidTtc.toFixed(2),
      m.pendingHt.toFixed(2), m.quotesSent, m.quotesAccepted, m.conversionRate.toFixed(1),
    ]),
    [LABELS.tvaTable.total, report.totals.paidHt.toFixed(2), report.totals.paidTva.toFixed(2), report.totals.paidTtc.toFixed(2),
      report.totals.pendingHt.toFixed(2), report.totals.quotesSent, report.totals.quotesAccepted, report.totals.conversionRate.toFixed(1)],
  ];
  const csv = rows.map(r => r.map(c => `"${c}"`).join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rapport-financier-${report.year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Main page ───────────────────────────────────────────────── */

export default function ReportsPage() {
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [activeTab, setActiveTab] = useState<'revenue' | 'quotes' | 'tva'>('revenue');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getFinancialReport(year);
      if (res.success) setReport(res as unknown as FinancialReport);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  /* Chart data transforms */
  const revenueData = report?.months.map(m => ({
    name: m.label,
    [LABELS.legend.paidTtc]: m.paidTtc,
    [LABELS.legend.pendingHt]: m.pendingHt,
  })) ?? [];

  const quotesData = report?.months.map(m => ({
    name: m.label,
    [LABELS.legend.quotesSent]: m.quotesSent,
    [LABELS.legend.quotesAccepted]: m.quotesAccepted,
    [LABELS.legend.conversionRate]: m.conversionRate,
  })) ?? [];

  const tvaData = report?.months.map(m => ({
    name: m.label,
    [LABELS.legend.tvaCollected]: m.paidTva,
  })) ?? [];

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{LABELS.pageTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{LABELS.pageSubtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {YEARS.map(y => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${year === y ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {y}
              </button>
            ))}
          </div>
          {report && (
            <button
              onClick={() => exportTVACsv(report)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {LABELS.exportCsv}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
        </div>
      ) : !report ? (
        <div className="text-center py-16 text-gray-400">{LABELS.noData}</div>
      ) : (
        <div className="space-y-6">
          {/* KPI summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label={LABELS.kpi.paidHt}
              value={fmt(report.totals.paidHt)}
              sub={`TVA : ${fmt(report.totals.paidTva)}`}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 10v1" /></svg>}
            />
            <KPICard
              label={LABELS.kpi.paidTtc}
              value={fmt(report.totals.paidTtc)}
              sub={`Année ${year}`}
              accent="border-blue-200 bg-blue-50/30"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            />
            <KPICard
              label={LABELS.kpi.pending}
              value={fmt(report.totals.pendingHt)}
              sub={LABELS.kpi.pendingSub}
              accent="border-amber-200 bg-amber-50/30"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <KPICard
              label={LABELS.kpi.conversion}
              value={`${report.totals.conversionRate}%`}
              sub={`${report.totals.quotesAccepted} / ${report.totals.quotesSent} devis`}
              accent="border-emerald-200 bg-emerald-50/30"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
          </div>

          {/* Chart tabs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                {(Object.entries(LABELS.tabs) as [typeof activeTab, string][]).map(
                  ([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setActiveTab(val)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === val ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Revenue curves */}
            {activeTab === 'revenue' && (
              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPaid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmt(v)} width={90} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Area type="monotone" dataKey={LABELS.legend.paidTtc} stroke="#3B82F6" strokeWidth={2.5} fill="url(#gradPaid)" dot={{ r: 3, fill: '#3B82F6' }} activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey={LABELS.legend.pendingHt} stroke="#F59E0B" strokeWidth={2} fill="url(#gradPending)" dot={{ r: 3, fill: '#F59E0B' }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {/* Quotes curves + conversion line */}
            {activeTab === 'quotes' && (
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={quotesData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Line yAxisId="left" type="monotone" dataKey={LABELS.legend.quotesSent} stroke="#60A5FA" strokeWidth={2.5} dot={{ r: 3, fill: '#60A5FA' }} activeDot={{ r: 5 }} />
                  <Line yAxisId="left" type="monotone" dataKey={LABELS.legend.quotesAccepted} stroke="#34D399" strokeWidth={2.5} dot={{ r: 3, fill: '#34D399' }} activeDot={{ r: 5 }} />
                  <Line yAxisId="right" type="monotone" dataKey={LABELS.legend.conversionRate} stroke="#A78BFA" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: '#A78BFA' }} />
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* TVA curve */}
            {activeTab === 'tva' && (
              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={tvaData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTva" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818CF8" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#818CF8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmt(v)} width={90} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Area type="monotone" dataKey={LABELS.legend.tvaCollected} stroke="#818CF8" strokeWidth={2.5} fill="url(#gradTva)" dot={{ r: 3, fill: '#818CF8' }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* TVA Table */}
          <TVASection months={report.months} totals={report.totals} />

          {/* Monthly breakdown table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">{LABELS.detail.title}</h3>
              <span className="text-xs text-gray-400">Année {year}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">{LABELS.detail.cols.month}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{LABELS.detail.cols.paidTtc}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{LABELS.detail.cols.pending}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{LABELS.detail.cols.sent}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{LABELS.detail.cols.accepted}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{LABELS.detail.cols.conv}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {report.months.map(m => (
                    <tr key={m.month} className={`hover:bg-gray-50/50 ${m.paidTtc === 0 && m.quotesSent === 0 ? 'opacity-40' : ''}`}>
                      <td className="px-6 py-3 text-sm font-medium text-gray-700">{m.label}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                        {m.paidTtc > 0 ? fmtFull(m.paidTtc) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-amber-600">
                        {m.pendingHt > 0 ? fmtFull(m.pendingHt) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">{m.quotesSent || '—'}</td>
                      <td className="px-4 py-3 text-sm text-right text-emerald-600">{m.quotesAccepted || '—'}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        {m.quotesSent > 0 ? (
                          <span className={`font-medium ${m.conversionRate >= 50 ? 'text-emerald-600' : m.conversionRate >= 25 ? 'text-amber-600' : 'text-red-500'}`}>
                            {fmtPct(m.conversionRate)}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="px-6 py-3 text-sm font-bold text-gray-900">{LABELS.tvaTable.total} {year}</td>
                    <td className="px-4 py-3 text-sm font-bold text-right text-gray-900">{fmtFull(report.totals.paidTtc)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-right text-amber-600">{fmtFull(report.totals.pendingHt)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-right text-gray-600">{report.totals.quotesSent}</td>
                    <td className="px-4 py-3 text-sm font-bold text-right text-emerald-600">{report.totals.quotesAccepted}</td>
                    <td className="px-4 py-3 text-sm font-bold text-right text-gray-700">{fmtPct(report.totals.conversionRate)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
