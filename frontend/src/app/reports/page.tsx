'use client';

import { useCallback, useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { dashboardService } from '@/services/api';
import { FinancialReport, FinancialReportMonth } from '@/types';

/* ─── Helpers ─────────────────────────────────────────────────── */

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtFull = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

/* ─── Sub-components ──────────────────────────────────────────── */

function KPICard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 ${accent ?? ''}`}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function BarChart({ data, maxVal, colorClass, height = 60 }: {
  data: { label: string; value: number }[];
  maxVal: number;
  colorClass: string;
  height?: number;
}) {
  return (
    <div className="flex items-end gap-1.5" style={{ height: `${height}px` }}>
      {data.map((d) => {
        const pct = maxVal > 0 ? (d.value / maxVal) * 100 : 0;
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-gray-900 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none">
              {fmt(d.value)}
            </div>
            <div
              className={`w-full ${colorClass} rounded-t-lg transition-all duration-500`}
              style={{ height: `${pct}%`, minHeight: d.value > 0 ? '4px' : '0' }}
            />
          </div>
        );
      })}
    </div>
  );
}

function TVASection({ months, totals }: { months: FinancialReportMonth[]; totals: FinancialReport['totals'] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">Récapitulatif TVA annuel</h3>
        <p className="text-xs text-gray-400 mt-0.5">TVA collectée sur les factures payées</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Mois</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">CA HT</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">TVA collectée</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">CA TTC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {months.map((m) => (
              <tr key={m.month} className={`hover:bg-gray-50/50 ${m.paidHt === 0 ? 'opacity-40' : ''}`}>
                <td className="px-5 py-2.5 text-sm text-gray-700 font-medium">{m.label}</td>
                <td className="px-4 py-2.5 text-sm text-right text-gray-900">{fmtFull(m.paidHt)}</td>
                <td className="px-4 py-2.5 text-sm text-right text-blue-600">{fmtFull(m.paidTva)}</td>
                <td className="px-4 py-2.5 text-sm text-right font-semibold text-gray-900">{fmtFull(m.paidTtc)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-200">
            <tr>
              <td className="px-5 py-3 text-sm font-bold text-gray-900">TOTAL</td>
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
    ['Mois', 'CA HT (€)', 'TVA collectée (€)', 'CA TTC (€)', 'En attente HT (€)', 'Devis envoyés', 'Devis acceptés', 'Taux de conversion (%)'],
    ...report.months.map(m => [
      m.label, m.paidHt.toFixed(2), m.paidTva.toFixed(2), m.paidTtc.toFixed(2),
      m.pendingHt.toFixed(2), m.quotesSent, m.quotesAccepted, m.conversionRate.toFixed(1),
    ]),
    ['TOTAL', report.totals.paidHt.toFixed(2), report.totals.paidTva.toFixed(2), report.totals.paidTtc.toFixed(2),
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

  const maxRevenue = report ? Math.max(...report.months.map(m => m.paidTtc), 1) : 1;
  const maxPending = report ? Math.max(...report.months.map(m => m.pendingHt), 1) : 1;
  const maxQuotes = report ? Math.max(...report.months.map(m => m.quotesSent), 1) : 1;

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports financiers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Analyse de votre activité et de votre TVA</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Year selector */}
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
        </div>
      ) : !report ? (
        <div className="text-center py-16 text-gray-400">Données indisponibles</div>
      ) : (
        <>
          {/* KPI summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard
              label="CA encaissé HT"
              value={fmt(report.totals.paidHt)}
              sub={`TVA : ${fmt(report.totals.paidTva)}`}
            />
            <KPICard
              label="CA encaissé TTC"
              value={fmt(report.totals.paidTtc)}
              sub={`Année ${year}`}
              accent="border-blue-100"
            />
            <KPICard
              label="En attente d'encaissement"
              value={fmt(report.totals.pendingHt)}
              sub="factures envoyées"
              accent="border-amber-100"
            />
            <KPICard
              label="Taux de conversion devis"
              value={`${report.totals.conversionRate}%`}
              sub={`${report.totals.quotesAccepted} / ${report.totals.quotesSent} devis`}
              accent="border-green-100"
            />
          </div>

          {/* Chart tabs */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                {([['revenue', 'Chiffre d\'affaires'], ['quotes', 'Devis'], ['tva', 'TVA']] as const).map(
                  ([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setActiveTab(val)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${activeTab === val ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                {activeTab === 'revenue' && (
                  <>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block" />Encaissé TTC</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-300 inline-block" />En attente HT</span>
                  </>
                )}
                {activeTab === 'quotes' && (
                  <>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400 inline-block" />Envoyés</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400 inline-block" />Acceptés</span>
                  </>
                )}
                {activeTab === 'tva' && (
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-400 inline-block" />TVA collectée</span>
                )}
              </div>
            </div>

            {/* Month labels */}
            <div className="flex items-end gap-1.5 mb-1" style={{ paddingTop: '32px' }}>
              {report.months.map(m => (
                <div key={m.month} className="flex-1 flex justify-center">
                  {/* charts rendered below */}
                </div>
              ))}
            </div>

            {activeTab === 'revenue' && (
              <div className="space-y-2">
                <BarChart
                  data={report.months.map(m => ({ label: m.label, value: m.paidTtc }))}
                  maxVal={maxRevenue}
                  colorClass="bg-blue-500"
                  height={120}
                />
                <BarChart
                  data={report.months.map(m => ({ label: m.label, value: m.pendingHt }))}
                  maxVal={maxPending}
                  colorClass="bg-amber-300"
                  height={60}
                />
                <div className="flex items-center gap-1.5">
                  {report.months.map(m => (
                    <div key={m.month} className="flex-1 text-center text-xs text-gray-400">{m.label}</div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'quotes' && (
              <div className="space-y-2">
                <BarChart
                  data={report.months.map(m => ({ label: m.label, value: m.quotesSent }))}
                  maxVal={maxQuotes}
                  colorClass="bg-blue-400"
                  height={120}
                />
                <BarChart
                  data={report.months.map(m => ({ label: m.label, value: m.quotesAccepted }))}
                  maxVal={maxQuotes}
                  colorClass="bg-emerald-400"
                  height={60}
                />
                <div className="flex items-center gap-1.5">
                  {report.months.map(m => (
                    <div key={m.month} className="flex-1 text-center text-xs text-gray-400">{m.label}</div>
                  ))}
                </div>
                {/* Conversion rates row */}
                <div className="flex items-center gap-1.5 mt-1">
                  {report.months.map(m => (
                    <div key={m.month} className="flex-1 text-center">
                      {m.quotesSent > 0 ? (
                        <span className={`text-xs font-medium ${m.conversionRate >= 50 ? 'text-emerald-600' : m.conversionRate >= 25 ? 'text-amber-600' : 'text-gray-400'}`}>
                          {m.conversionRate.toFixed(0)}%
                        </span>
                      ) : <span className="text-xs text-gray-200">-</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'tva' && (
              <div className="space-y-2">
                <BarChart
                  data={report.months.map(m => ({ label: m.label, value: m.paidTva }))}
                  maxVal={Math.max(...report.months.map(m => m.paidTva), 1)}
                  colorClass="bg-indigo-400"
                  height={120}
                />
                <div className="flex items-center gap-1.5">
                  {report.months.map(m => (
                    <div key={m.month} className="flex-1 text-center text-xs text-gray-400">{m.label}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* TVA Table */}
          <TVASection months={report.months} totals={report.totals} />

          {/* Monthly breakdown table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mt-4">
            <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Détail mensuel</h3>
              <span className="text-xs text-gray-400">Année {year}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Mois</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">CA encaissé TTC</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">En attente HT</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Devis envoyés</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Devis acceptés</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Taux conv.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {report.months.map(m => (
                    <tr key={m.month} className={`hover:bg-gray-50/50 ${m.paidTtc === 0 && m.quotesSent === 0 ? 'opacity-40' : ''}`}>
                      <td className="px-5 py-2.5 text-sm font-medium text-gray-700">{m.label}</td>
                      <td className="px-4 py-2.5 text-sm text-right font-semibold text-gray-900">
                        {m.paidTtc > 0 ? fmtFull(m.paidTtc) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-right text-amber-600">
                        {m.pendingHt > 0 ? fmtFull(m.pendingHt) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-right text-gray-600">{m.quotesSent || '—'}</td>
                      <td className="px-4 py-2.5 text-sm text-right text-emerald-600">{m.quotesAccepted || '—'}</td>
                      <td className="px-4 py-2.5 text-sm text-right">
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
                    <td className="px-5 py-3 text-sm font-bold text-gray-900">TOTAL {year}</td>
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
        </>
      )}
    </MainLayout>
  );
}
