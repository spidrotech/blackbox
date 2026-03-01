'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Select } from '@/components/ui';
import { customerService } from '@/services/api';
import { Customer } from '@/types';
import { getStatusLabel, formatDate } from '@/lib/utils';

const typeOptions = [
  { value: '', label: 'Tous les types' },
  { value: 'INDIVIDUAL', label: 'Particulier' },
  { value: 'COMPANY', label: 'Entreprise' },
];

const sortOptions = [
  { value: 'name', label: 'Nom' },
  { value: 'created_at', label: 'Date de création' },
  { value: 'updated_at', label: 'Dernière modification' },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await customerService.getAll();
      if (response.success && response.data) {
        setCustomers(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (customer: Customer) => {
    if (customer.type === 'COMPANY') {
      return customer.name;
    }
    return `${customer.firstName || customer.first_name || ''} ${customer.lastName || customer.last_name || ''}`.trim();
  };

  const getTimeSinceUpdate = (date: string | undefined) => {
    if (!date) return 'N/A';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
    if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
    return `Il y a ${Math.floor(diffDays / 365)} ans`;
  };

  const getTypeLabel = (type: string) => {
    return type === 'INDIVIDUAL' ? 'Particulier' : 'Entreprise';
  };

  const filteredAndSortedCustomers = customers
    .filter(customer => {
      const name = getCustomerName(customer)?.toLowerCase() || '';
      const email = customer.email?.toLowerCase() || '';
      const phone = customer.phone || customer.mobile || '';
      
      const matchesSearch = search === '' || 
        name.includes(search.toLowerCase()) ||
        email.includes(search.toLowerCase()) ||
        phone.includes(search);
      
      const matchesType = typeFilter === '' || customer.type === typeFilter;
      
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'created_at':
          return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
        case 'updated_at':
          return new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime();
        default:
          return getCustomerName(a).localeCompare(getCustomerName(b));
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = filteredAndSortedCustomers.slice(startIndex, endIndex);

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;
    
    try {
      await customerService.delete(id);
      setCustomers(customers.filter(c => c.id !== id));
      if (currentPage > totalPages - 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600 text-sm mt-1">
              {filteredAndSortedCustomers.length} client(s) {search || typeFilter ? 'trouvé(s)' : 'au total'}
            </p>
          </div>
          <Link href="/customers/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouveau client
            </Button>
          </Link>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1">
              <Input
                placeholder="Accès rapide à un chantier, document, client..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter by type */}
            <div className="w-48">
              <Select
                options={typeOptions}
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Sort */}
            <div className="w-48">
              <Select
                options={sortOptions}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              />
            </div>

            {/* View options */}
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 5a2 2 0 012-2h3.28a1 1 0 00.948-.684l1.498-4.493a1 1 0 011.502-.684l1.498 4.493a1 1 0 00.948.684H19a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Nom</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Type</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Email(s)</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Téléphone(s)</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Modifié il y a</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Date de création</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Résumé</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                      </div>
                    </td>
                  </tr>
                ) : paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      Aucun client trouvé
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 h-16">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-600 font-medium text-sm">
                              {getCustomerName(customer)?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="font-medium text-gray-900">
                            {getCustomerName(customer)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          customer.type === 'INDIVIDUAL' 
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {getTypeLabel(customer.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {customer.email ? (
                          <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                            {customer.email}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {customer.phone || customer.mobile ? (
                          <div>
                            {customer.phone && <div>{customer.phone}</div>}
                            {customer.mobile && <div className="text-gray-500 text-xs">{customer.mobile}</div>}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <div className="flex items-center gap-2">
                          {getTimeSinceUpdate(customer.updatedAt)}
                          <span className="bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">!</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="space-y-0.5">
                          <div>Factures en attente: 0</div>
                          <div className="text-xs text-gray-500">Chantiers: 0</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/customers/${customer.id}`}>
                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          </Link>
                          <Link href={`/customers/${customer.id}/edit`}>
                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </Link>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between text-sm text-gray-600">
            <div>
              {filteredAndSortedCustomers.length > 0 ? (
                <>
                  <span>
                    {startIndex + 1} à {Math.min(endIndex, filteredAndSortedCustomers.length)} sur{' '}
                    {filteredAndSortedCustomers.length} éléments
                  </span>
                  <span className="mx-4 text-gray-400">•</span>
                  <span>
                    <select 
                      value={itemsPerPage} 
                      onChange={(e) => {}}
                      className="text-gray-600 font-medium border-0 bg-transparent"
                    >
                      <option value={25}>25 par page</option>
                      <option value={50}>50 par page</option>
                      <option value={100}>100 par page</option>
                    </select>
                  </span>
                </>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Précédent
              </button>

              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, currentPage - 2) + i;
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded ${
                        pageNum === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
