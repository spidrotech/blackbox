'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Select } from '@/components/ui';
import { purchaseService, supplierService, projectService } from '@/services/api';
import { Purchase, Supplier, Project } from '@/types';
import { formatDate, formatCurrency, getStatusLabel } from '@/lib/utils';

const categoryOptions = [
  { value: '', label: 'Toutes les catégories' },
  { value: 'materials', label: 'Matériaux' },
  { value: 'tools', label: 'Outils' },
  { value: 'equipment_rental', label: 'Location' },
  { value: 'services', label: 'Services' },
  { value: 'consumables', label: 'Consommables' },
  { value: 'other', label: 'Autre' },
];

const paymentOptions = [
  { value: '', label: 'Tous les paiements' },
  { value: 'paid', label: 'Payé' },
  { value: 'unpaid', label: 'Non payé' },
];

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [purchasesRes, suppliersRes, projectsRes] = await Promise.all([
        purchaseService.getAll(),
        supplierService.getAll(),
        projectService.getAll(),
      ]);
      
      if (purchasesRes.success) {
        setPurchases(Array.isArray(purchasesRes.data) ? purchasesRes.data : []);
      }
      if (suppliersRes.success) {
        setSuppliers(Array.isArray(suppliersRes.data) ? suppliersRes.data : []);
      }
      if (projectsRes.success) {
        setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSupplierName = (supplierId?: number) => {
    if (!supplierId) return '-';
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || '-';
  };

  const getProjectName = (projectId?: number) => {
    if (!projectId) return '-';
    const project = projects.find(p => p.id === projectId);
    return project?.name || '-';
  };

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = search === '' || 
      purchase.description?.toLowerCase().includes(search.toLowerCase()) ||
      purchase.reference?.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = categoryFilter === '' || purchase.category === categoryFilter;
    
    const matchesPayment = paymentFilter === '' || 
      (paymentFilter === 'paid' && purchase.is_paid) ||
      (paymentFilter === 'unpaid' && !purchase.is_paid);
    
    return matchesSearch && matchesCategory && matchesPayment;
  });

  const handleMarkPaid = async (id: number) => {
    try {
      await purchaseService.markAsPaid(id, 'bank_transfer');
      loadData();
    } catch (error) {
      console.error('Error marking as paid:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet achat ?')) return;
    
    try {
      await purchaseService.delete(id);
      setPurchases(purchases.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting purchase:', error);
    }
  };

  const totalUnpaid = filteredPurchases
    .filter(p => !p.is_paid)
    .reduce((sum, p) => sum + (p.total_ttc || 0), 0);

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
            <h1 className="text-2xl font-bold text-gray-900">Achats</h1>
            <p className="text-gray-500">{purchases.length} achat(s) au total</p>
          </div>
          <Link href="/purchases/new">
            <Button>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouvel achat
            </Button>
          </Link>
        </div>

        {/* Stats */}
        {totalUnpaid > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total impayé</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totalUnpaid)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Rechercher un achat..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="w-full md:w-48">
                <Select
                  options={categoryOptions}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                />
              </div>
              <div className="w-full md:w-48">
                <Select
                  options={paymentOptions}
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purchases list */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des achats</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fournisseur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant TTC
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payé
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      Aucun achat trouvé
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{purchase.description}</div>
                          {purchase.reference && (
                            <div className="text-sm text-gray-500">{purchase.reference}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getSupplierName(purchase.supplier_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getProjectName(purchase.project_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge status={purchase.category} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {purchase.purchase_date ? formatDate(purchase.purchase_date) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(purchase.total_ttc || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {purchase.is_paid ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Oui
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Non
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {!purchase.is_paid && (
                          <button
                            onClick={() => handleMarkPaid(purchase.id)}
                            className="text-green-600 hover:text-green-900 mr-4"
                          >
                            Payer
                          </button>
                        )}
                        <Link
                          href={`/purchases/${purchase.id}/edit`}
                          className="text-gray-600 hover:text-gray-900 mr-4"
                        >
                          Modifier
                        </Link>
                        <button
                          onClick={() => handleDelete(purchase.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Supprimer
                        </button>
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
