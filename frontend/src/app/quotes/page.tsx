'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Select } from '@/components/ui';
import { quoteService, customerService } from '@/services/api';
import { Quote, Customer } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'sent', label: 'Envoyé' },
  { value: 'viewed', label: 'Vu' },
  { value: 'signed', label: 'Signé' },
  { value: 'accepted', label: 'Accepté' },
  { value: 'rejected', label: 'Refusé' },
  { value: 'expired', label: 'Expiré' },
  { value: 'cancelled', label: 'Annulé' },
];

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [quotesRes, customersRes] = await Promise.all([
        quoteService.getAll(),
        customerService.getAll(),
      ]);
      
      if (quotesRes.success) {
        setQuotes(Array.isArray(quotesRes.data) ? quotesRes.data : []);
      }
      if (customersRes.success) {
        setCustomers(Array.isArray(customersRes.data) ? customersRes.data : []);
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

  const calculateTotal = (quote: Quote): number => {
    if (!quote.line_items?.length) return 0;
    return quote.line_items.reduce((sum, item) => {
      const subtotal = item.quantity * item.unit_price;
      const discount = (subtotal * (item.discount_percent || 0)) / 100;
      const ht = subtotal - discount;
      const tva = (ht * item.vat_rate) / 100;
      return sum + ht + tva;
    }, 0);
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = search === '' || 
      quote.reference.toLowerCase().includes(search.toLowerCase()) ||
      quote.subject?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === '' || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleConvertToInvoice = async (id: number) => {
    if (!confirm('Convertir ce devis en facture ?')) return;
    
    try {
      const response = await quoteService.convertToInvoice(id);
      if (response.success) {
        alert('Facture créée avec succès');
        loadData();
      }
    } catch (error) {
      console.error('Error converting quote:', error);
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
            <h1 className="text-2xl font-bold text-gray-900">Devis</h1>
            <p className="text-gray-500">{quotes.length} devis au total</p>
          </div>
          <Link href="/quotes/new">
            <Button>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouveau devis
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Rechercher un devis..."
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

        {/* Quotes list */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des devis</CardTitle>
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
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Aucun devis trouvé
                    </td>
                  </tr>
                ) : (
                  filteredQuotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{quote.reference}</div>
                          {quote.subject && (
                            <div className="text-sm text-gray-500">{quote.subject}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getCustomerName(quote.customer_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge status={quote.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {quote.quote_date ? formatDate(quote.quote_date) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(calculateTotal(quote))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/quotes/${quote.id}`}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Voir
                        </Link>
                        <Link
                          href={`/quotes/${quote.id}/edit`}
                          className="text-gray-600 hover:text-gray-900 mr-4"
                        >
                          Modifier
                        </Link>
                        {['signed', 'accepted'].includes(quote.status) && (
                          <button
                            onClick={() => handleConvertToInvoice(quote.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Facturer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
