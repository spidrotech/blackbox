'use client';

import { useEffect, useState, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Input } from '@/components/ui';
import { quoteService, customerService } from '@/services/api';
import { Quote, Customer, QuoteStats } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { buildDetailPath, buildEditPath } from '@/lib/routes';

const BADGE: Record<string, { label: string; cls: string; dot: string }> = {
  draft:     { label: 'Brouillon', cls: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200', dot: 'bg-slate-400' },
  sent:      { label: 'Envoyé',    cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', dot: 'bg-blue-500' },
  viewed:    { label: 'Consulté',  cls: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200', dot: 'bg-purple-500' },
  signed:    { label: 'Signé',     cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  accepted:  { label: 'Accepté',   cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  refused:   { label: 'Refusé',    cls: 'bg-red-50 text-red-700 ring-1 ring-red-200', dot: 'bg-red-500' },
  rejected:  { label: 'Refusé',    cls: 'bg-red-50 text-red-700 ring-1 ring-red-200', dot: 'bg-red-500' },
  finalized: { label: 'Finalisé',  cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  expired:   { label: 'Expiré',    cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-500' },
  cancelled: { label: 'Annulé',    cls: 'bg-gray-50 text-gray-500 ring-1 ring-gray-200', dot: 'bg-gray-400' },
};

const TABS = [
  { value: '', label: 'Tous' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'sent', label: 'Envoyé' },
  { value: 'viewed', label: 'Consulté' },
  { value: 'signed', label: 'Signé' },
  { value: 'accepted', label: 'Accepté' },
  { value: 'finalized', label: 'Finalisé' },
  { value: 'rejected', label: 'Refusé' },
  { value: 'expired', label: 'Expiré' },
];

function StatCard({ label, value, sub, color = 'blue' }: { label: string; value: string; sub?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-50 to-white border-blue-100/50 text-blue-700',
    green: 'from-emerald-50 to-white border-emerald-100/50 text-emerald-700',
    orange: 'from-amber-50 to-white border-amber-100/50 text-amber-700',
    purple: 'from-violet-50 to-white border-violet-100/50 text-violet-700',
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm bg-gradient-to-br ${colorMap[color] || colorMap.blue}`}>
      <p className="text-xs font-semibold opacity-70 uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-extrabold mt-2 opacity-90">{value}</p>
      {sub && <p className="text-sm opacity-60 mt-1">{sub}</p>}
    </div>
  );
}

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<QuoteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      const [quotesRes, customersRes, statsRes] = await Promise.all([
        quoteService.getAll(),
        customerService.getAll(),
        quoteService.getStats(),
      ]);
      if (quotesRes.success) {
        const resShape = quotesRes as unknown as { data?: unknown; items?: unknown; quotes?: unknown };
        const data = resShape.data ?? resShape.items ?? resShape.quotes ?? quotesRes.data;
        setQuotes(Array.isArray(data) ? data : []);
      }
      if (customersRes.success) {
        setCustomers(Array.isArray(customersRes.data) ? customersRes.data : []);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getCustomerName = (quote: Quote): string => {
    if (quote.customer) {
      return quote.customer.name || `${quote.customer.firstName || ''} ${quote.customer.lastName || ''}`.trim() || '-';
    }
    const cid = quote.customer_id ?? quote.customerId;
    if (!cid) return '-';
    const c = customers.find(x => x.id === cid);
    if (!c) return '-';
    return c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || '-';
  };

  const getTotal = (quote: Quote): number =>
    quote.total_ttc ?? quote.total ?? 0;

  const getDaysUntilExpiry = (quote: Quote): number | null => {
    const d = quote.expiry_date ?? quote.expiryDate;
    if (!d) return null;
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  };

  const filteredQuotes = quotes.filter(q => {
    const matchSearch = search === '' ||
      q.reference.toLowerCase().includes(search.toLowerCase()) ||
      (q.subject || q.description || '').toLowerCase().includes(search.toLowerCase()) ||
      getCustomerName(q).toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === '' || q.status === tab;
    return matchSearch && matchTab;
  });

  const countByTab = (val: string) => val === '' ? quotes.length : quotes.filter(q => q.status === val).length;

  const handleDuplicate = async (id: number) => {
    setActionLoading(id);
    try {
      const res = await quoteService.duplicate(id);
      const duplicatedQuote = (res as unknown as { quote?: Quote }).quote ?? (res.data as Quote | undefined);
      if (res.success && duplicatedQuote?.id) {
        showToast('Devis dupliqué avec succès');
        router.push(buildEditPath('quotes', duplicatedQuote.id));
      }
    } catch { showToast('Erreur lors de la duplication', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleSend = async (id: number) => {
    setActionLoading(id);
    try {
      const res = await quoteService.send(id);
      if (res.success) { showToast('Devis marqué comme envoyé'); loadData(); }
    } catch { showToast('Erreur', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleDownloadPdf = async (id: number) => {
    setActionLoading(id);
    try { await quoteService.downloadPdf(id); }
    catch { showToast('Erreur génération PDF', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleConvert = async (id: number) => {
    if (!confirm('Convertir ce devis en facture ?')) return;
    setActionLoading(id);
    try {
      const res = await quoteService.convertToInvoice(id);
      if (res.success) {
        showToast('Facture créée avec succès');
        const inv = (res as unknown as { invoice?: { id?: number } }).invoice ?? (res.data as { id?: number } | undefined);
        const createdInvoiceId = inv?.id;
        if (typeof createdInvoiceId === 'number') {
          router.push(buildDetailPath('invoices', createdInvoiceId));
        } else {
          loadData();
        }
      }
    } catch { showToast('Erreur conversion', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce devis définitivement ?')) return;
    try { await quoteService.delete(id); showToast('Devis supprimé'); loadData(); }
    catch { showToast('Erreur suppression', 'error'); }
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

  return (
    <MainLayout>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Devis</h1>
            <p className="text-sm text-gray-500">{quotes.length} devis au total</p>
          </div>
          <Link href="/quotes/new" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nouveau devis
          </Link>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total devis" value={String(stats.total)} sub={`${stats.draft} brouillon(s)`} color="blue" />
            <StatCard label="CA total TTC" value={formatCurrency(stats.totalAmountTtc)} sub={`${formatCurrency(stats.totalAmountHt)} HT`} color="green" />
            <StatCard label="Taux de conversion" value={`${stats.conversionRate}%`} sub={`${stats.accepted + stats.signed + stats.finalized} accepté(s)`} color="purple" />
            <StatCard label="Expirent bientôt" value={String(stats.expiringIn7Days)} sub={`${stats.expiringIn30Days} dans 30 jours`} color={stats.expiringIn7Days > 0 ? 'orange' : 'blue'} />
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Répartition des statuts</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Brouillon', value: stats.draft, color: '#94a3b8' },
                        { name: 'Envoyé', value: stats.sent, color: '#3b82f6' },
                        { name: 'Consulté', value: stats.viewed, color: '#a855f7' },
                        { name: 'Accepté', value: stats.accepted + stats.signed + stats.finalized, color: '#10b981' },
                        { name: 'Refusé/Expiré', value: stats.rejected + stats.expired + stats.cancelled, color: '#ef4444' },
                      ]}
                      cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value"
                    >
                      {[{ name: 'Brouillon', value: stats.draft, color: '#94a3b8' }, { name: 'Envoyé', value: stats.sent, color: '#3b82f6' }, { name: 'Consulté', value: stats.viewed, color: '#a855f7' }, { name: 'Accepté', value: stats.accepted + stats.signed + stats.finalized, color: '#10b981' }, { name: 'Refusé/Expiré', value: stats.rejected + stats.expired + stats.cancelled, color: '#ef4444' }].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/95 backdrop-blur-sm border border-slate-100 p-3 rounded-xl shadow-lg">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0].payload.color }} />
                              <span className="text-slate-600">{payload[0].name}:</span>
                              <span className="font-bold text-slate-800">{payload[0].value}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Tunnel de conversion devis</h3>
              <div className="h-64">
                {(() => {
                  const step1 = stats.sent + stats.viewed + stats.signed + stats.accepted + stats.finalized + stats.rejected;
                  const step2 = stats.viewed + stats.signed + stats.accepted + stats.finalized;
                  const step3 = stats.accepted + stats.signed + stats.finalized;
                  const data = [
                    { name: 'Envoyés', value: step1, fill: '#3b82f6' },
                    { name: 'Consultés', value: step2, fill: '#8b5cf6' },
                    { name: 'Acceptés', value: step3, fill: '#10b981' }
                  ];
                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#475569', fontWeight: 500 }} />
                        <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white/95 backdrop-blur-sm border border-slate-100 p-3 rounded-xl shadow-lg">
                                <div className="flex items-center gap-2 text-sm">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0].payload.fill }} />
                                  <span className="text-slate-600">{payload[0].payload.name}:</span>
                                  <span className="font-bold text-slate-800">{payload[0].value}</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={32} label={{ position: 'right', fill: '#64748b', fontSize: 12, fontWeight: 600 }}>
                          {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-4 pt-3 pb-0 border-b border-gray-100 gap-4">
            <div className="flex gap-0.5 overflow-x-auto flex-nowrap">
              {TABS.map(t => (
                <button key={t.value} onClick={() => setTab(t.value)}
                  className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.value ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {t.label}
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === t.value ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{countByTab(t.value)}</span>
                </button>
              ))}
            </div>
            <div className="flex-shrink-0 pb-2 w-60">
              <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Référence</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Client</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Statut</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Expiration</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Montant TTC</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm">Aucun devis trouvé</p>
                        {tab === '' && search === '' && (
                          <Link href="/quotes/new" className="mt-1 text-blue-600 text-sm hover:underline">Créer votre premier devis &rarr;</Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredQuotes.map(quote => {
                    const b = BADGE[quote.status] ?? { label: quote.status, cls: 'bg-gray-100 text-gray-600' };
                    const daysLeft = getDaysUntilExpiry(quote);
                    const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && !['accepted','signed','finalized','rejected','cancelled'].includes(quote.status);
                    const isExpired = daysLeft !== null && daysLeft < 0 && !['accepted','signed','finalized','rejected','cancelled'].includes(quote.status);
                    const isActLoading = actionLoading === quote.id;
                    const total = getTotal(quote);
                    return (
                      <tr key={quote.id} className="hover:bg-gray-50/70 transition-colors group">
                        <td className="px-5 py-3.5">
                          <Link href={buildDetailPath('quotes', quote.id)} className="block">
                            <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{quote.reference}</div>
                            {(quote.subject || quote.description) && (
                              <div className="text-xs text-gray-400 truncate max-w-[180px] mt-0.5">{quote.subject || quote.description}</div>
                            )}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{getCustomerName(quote)}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${b.cls}`}>{b.label}</span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                          {(quote.quote_date ?? quote.quoteDate) ? formatDate(quote.quote_date ?? quote.quoteDate ?? '') : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-sm whitespace-nowrap">
                          {(quote.expiry_date ?? quote.expiryDate) ? (
                            <span className={`font-medium ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-orange-600' : 'text-gray-500'}`}>
                              {isExpired && '⚠ '}{isExpiringSoon && '⏱ '}
                              {formatDate(quote.expiry_date ?? quote.expiryDate ?? '')}
                              {daysLeft !== null && !isExpired && <span className="ml-1 text-xs opacity-70">({daysLeft}j)</span>}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-bold text-gray-900 text-right whitespace-nowrap">
                          {total ? formatCurrency(total) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={buildDetailPath('quotes', quote.id)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors" title="Voir">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </Link>
                            <Link href={buildEditPath('quotes', quote.id)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors" title="Modifier">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </Link>
                            <button onClick={() => handleDownloadPdf(quote.id)} disabled={isActLoading} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors" title="Télécharger PDF">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </button>
                            {quote.status === 'draft' && (
                              <button onClick={() => handleSend(quote.id)} disabled={isActLoading} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors" title="Envoyer">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                              </button>
                            )}
                            <button onClick={() => handleDuplicate(quote.id)} disabled={isActLoading} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors" title="Dupliquer">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </button>
                            {['signed','accepted','finalized'].includes(quote.status) && (
                              <button onClick={() => handleConvert(quote.id)} disabled={isActLoading} className="p-1.5 rounded-md hover:bg-green-50 text-gray-500 hover:text-green-600 transition-colors" title="Créer la facture">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
                              </button>
                            )}
                            <button onClick={() => handleDelete(quote.id)} disabled={isActLoading} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Supprimer">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
