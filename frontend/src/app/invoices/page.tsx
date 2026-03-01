'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Input } from '@/components/ui';
import { invoiceService, customerService } from '@/services/api';
import { Invoice, Customer } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';

const BADGE: Record<string, { label: string; cls: string }> = {
  draft:    { label: 'Brouillon', cls: 'bg-gray-100 text-gray-600' },
  sent:     { label: 'Envoyée',   cls: 'bg-blue-100 text-blue-700' },
  partial:  { label: 'Partielle', cls: 'bg-yellow-100 text-yellow-700' },
  paid:     { label: 'Payée',     cls: 'bg-green-100 text-green-700' },
  overdue:  { label: 'En retard', cls: 'bg-red-100 text-red-700' },
  cancelled:{ label: 'Annulée',   cls: 'bg-gray-100 text-gray-400' },
};

const TABS = [
  { value: '', label: 'Toutes' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'sent', label: 'Envoyée' },
  { value: 'partial', label: 'Partielle' },
  { value: 'overdue', label: 'En retard' },
  { value: 'paid', label: 'Payée' },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invoicesRes, customersRes] = await Promise.all([
        invoiceService.getAll(),
        customerService.getAll(),
      ]);
      
      if (invoicesRes.success) {
        const allInvoices = Array.isArray(invoicesRes.data) ? invoicesRes.data : [];
        setInvoices(allInvoices);
      }
      if (customersRes.success) {
        const allCustomers = Array.isArray(customersRes.data) ? customersRes.data : [];
        setCustomers(allCustomers);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (customerId?: number) => {
    if (!customerId) return '-';
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return '-';
    return customer.customer_type === 'company' 
      ? customer.company_name 
      : `${customer.first_name} ${customer.last_name}`;
  };

  const calculateTotal = (invoice: Invoice): number => {
    // Use precomputed backend value when available
    if (invoice.totalTtc !== undefined) return invoice.totalTtc;
    if (invoice.total !== undefined) return invoice.total;
    if (!invoice.line_items?.length) return 0;
    return invoice.line_items.reduce((sum, item) => {
      const subtotal = item.quantity * item.unit_price;
      const discount = (subtotal * (item.discount_percent || 0)) / 100;
      const ht = subtotal - discount;
      const tva = (ht * (item.vat_rate ?? 0)) / 100;
      return sum + ht + tva;
    }, 0);
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = search === '' || 
      invoice.reference.toLowerCase().includes(search.toLowerCase()) ||
      invoice.subject?.toLowerCase().includes(search.toLowerCase());
    const matchesTab = tab === '' || invoice.status === tab;
    return matchesSearch && matchesTab;
  });

  const countByTab = (val: string) => val === '' ? invoices.length : invoices.filter(i => i.status === val).length;

  const handleSend = async (id: number) => {
    try {
      await invoiceService.send(id);
      loadData();
    } catch (error) {
      console.error('Error sending invoice:', error);
    }
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
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
            <p className="text-sm text-gray-500">{invoices.length} facture(s) au total</p>
          </div>
          <Link href="/invoices/new" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nouvelle facture
          </Link>
        </div>

        {/* Status tabs + search */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-4 pt-3 pb-0 border-b border-gray-100">
            <div className="flex gap-1 overflow-x-auto">
              {TABS.map(t => (
                <button key={t.value} onClick={() => setTab(t.value)}
                  className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    tab === t.value ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  {t.label}
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    tab === t.value ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}>{countByTab(t.value)}</span>
                </button>
              ))}
            </div>
            <div className="w-56 pb-2">
              <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Référence</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Client</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Statut</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase">Montant TTC</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase">Reste</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredInvoices.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">Aucune facture trouvée</td></tr>
                ) : (
                  filteredInvoices.map(invoice => {
                    const total = calculateTotal(invoice);
                    const paid = invoice.amountPaid ?? invoice.amount_paid ?? 0;
                    const remaining = invoice.remainingAmount ?? (total - paid);
                    const b = BADGE[invoice.status] ?? { label: invoice.status, cls: 'bg-gray-100 text-gray-600' };
                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="text-sm font-medium text-gray-900">{invoice.reference}</div>
                          {invoice.subject && <div className="text-xs text-gray-400 truncate max-w-xs">{invoice.subject}</div>}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{getCustomerName(invoice.customer_id ?? invoice.customerId)}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${b.cls}`}>{b.label}</span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">
                          <div>{(invoice.invoice_date ?? invoice.invoiceDate) ? formatDate((invoice.invoice_date ?? invoice.invoiceDate)!) : '—'}</div>
                          {(invoice.due_date ?? invoice.dueDate) && <div className="text-xs text-gray-400">Éch. {formatDate((invoice.due_date ?? invoice.dueDate)!)}</div>}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 text-right">{formatCurrency(total)}</td>
                        <td className="px-5 py-3.5 text-sm text-right">
                          {remaining > 0 ? (
                            <span className={invoice.status === 'overdue' ? 'text-red-600 font-medium' : 'text-orange-600'}>{formatCurrency(remaining)}</span>
                          ) : (
                            <span className="text-green-500">✔</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm">
                          <Link href={`/invoices/${invoice.id}`} className="text-blue-600 hover:underline mr-3">Voir</Link>
                          {invoice.status === 'draft' && (
                            <>
                              <Link href={`/invoices/${invoice.id}/edit`} className="text-gray-500 hover:underline mr-3">Modifier</Link>
                              <button onClick={() => handleSend(invoice.id)} className="text-green-600 hover:underline">Envoyer</button>
                            </>
                          )}
                          {['sent', 'partial', 'overdue'].includes(invoice.status) && (
                            <Link href={`/invoices/${invoice.id}`} className="text-green-600 hover:underline">Encaisser</Link>
                          )}
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
