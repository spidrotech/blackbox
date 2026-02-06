'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Select } from '@/components/ui';
import { invoiceService, customerService } from '@/services/api';
import { Invoice, Customer } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'sent', label: 'Envoyée' },
  { value: 'paid', label: 'Payée' },
  { value: 'partial', label: 'Paiement partiel' },
  { value: 'overdue', label: 'En retard' },
  { value: 'cancelled', label: 'Annulée' },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

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
    if (!invoice.line_items?.length) return 0;
    return invoice.line_items.reduce((sum, item) => {
      const subtotal = item.quantity * item.unit_price;
      const discount = (subtotal * (item.discount_percent || 0)) / 100;
      const ht = subtotal - discount;
      const tva = (ht * item.vat_rate) / 100;
      return sum + ht + tva;
    }, 0);
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = search === '' || 
      invoice.reference.toLowerCase().includes(search.toLowerCase()) ||
      invoice.subject?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === '' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
            <p className="text-gray-500">{invoices.length} facture(s) au total</p>
          </div>
          <Link href="/invoices/new">
            <Button>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle facture
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Rechercher une facture..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="w-full md:w-48">
                <Select
                  options={statusOptions}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices list */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des factures</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Référence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant TTC
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payé
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Aucune facture trouvée
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const total = calculateTotal(invoice);
                    const paid = invoice.amount_paid || 0;
                    const remaining = total - paid;
                    
                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{invoice.reference}</div>
                            {invoice.subject && (
                              <div className="text-sm text-gray-500">{invoice.subject}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getCustomerName(invoice.customer_id)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge status={invoice.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>{invoice.invoice_date ? formatDate(invoice.invoice_date) : '-'}</div>
                          {invoice.due_date && (
                            <div className="text-xs text-gray-400">
                              Éch: {formatDate(invoice.due_date)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <div className={paid >= total ? 'text-green-600' : 'text-orange-600'}>
                            {formatCurrency(paid)}
                          </div>
                          {remaining > 0 && (
                            <div className="text-xs text-gray-400">
                              Reste: {formatCurrency(remaining)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/invoices/${invoice.id}`}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Voir
                          </Link>
                          {invoice.status === 'draft' && (
                            <>
                              <Link
                                href={`/invoices/${invoice.id}/edit`}
                                className="text-gray-600 hover:text-gray-900 mr-4"
                              >
                                Modifier
                              </Link>
                              <button
                                onClick={() => handleSend(invoice.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Envoyer
                              </button>
                            </>
                          )}
                          {['sent', 'partial', 'overdue'].includes(invoice.status) && (
                            <Link
                              href={`/invoices/${invoice.id}/payment`}
                              className="text-green-600 hover:text-green-900"
                            >
                              Encaisser
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
