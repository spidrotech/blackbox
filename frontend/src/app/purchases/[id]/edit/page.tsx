'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select } from '@/components/ui';
import { purchaseService, supplierService, projectService } from '@/services/api';
import { PurchaseCreate, Supplier, Project, PaymentMethod } from '@/types';
import { buildDetailPath } from '@/lib/routes';

const categoryOptions = [
  { value: 'materials', label: 'Matériaux' },
  { value: 'tools', label: 'Outils' },
  { value: 'equipment_rental', label: 'Location équipement' },
  { value: 'services', label: 'Services' },
  { value: 'consumables', label: 'Consommables' },
  { value: 'other', label: 'Autre' },
];

const vatRateOptions = [
  { value: '20', label: '20%' },
  { value: '10', label: '10%' },
  { value: '5.5', label: '5.5%' },
  { value: '0', label: '0%' },
];

const paymentMethodOptions = [
  { value: '', label: 'Non payé' },
  { value: 'cash', label: 'Espèces' },
  { value: 'check', label: 'Chèque' },
  { value: 'bank_transfer', label: 'Virement' },
  { value: 'card', label: 'Carte bancaire' },
];

export default function EditPurchasePage() {
  const router = useRouter();
  const params = useParams();
  const purchaseId = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [formData, setFormData] = useState<PurchaseCreate>({
    description: '',
    category: 'materials',
    purchase_date: new Date().toISOString().split('T')[0],
    amount_ht: 0,
    vat_rate: 20,
    invoice_number: '',
    is_paid: false,
    payment_method: undefined,
    notes: '',
    supplier_id: undefined,
    project_id: undefined,
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseId]);

  const loadData = async () => {
    try {
      const [purchaseRes, suppliersRes, projectsRes] = await Promise.all([
        purchaseService.getById(purchaseId),
        supplierService.getAll(),
        projectService.getAll(),
      ]);
      
      if (purchaseRes.success && purchaseRes.data) {
        const purchase = purchaseRes.data;
        setFormData({
          description: purchase.description || '',
          category: purchase.category || 'materials',
          purchase_date: purchase.purchase_date?.split('T')[0] || '',
          amount_ht: purchase.amount_ht || 0,
          vat_rate: purchase.vat_rate || 20,
          invoice_number: purchase.invoice_number || '',
          is_paid: purchase.is_paid || false,
          payment_method: purchase.payment_method,
          notes: purchase.notes || '',
          supplier_id: purchase.supplier_id,
          project_id: purchase.project_id,
        });
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

  const supplierOptions = [
    { value: '', label: 'Sélectionner un fournisseur' },
    ...suppliers.map(s => ({ value: String(s.id), label: s.name })),
  ];

  const projectOptions = [
    { value: '', label: 'Aucun projet' },
    ...projects.map(p => ({ value: String(p.id), label: p.name })),
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (['supplier_id', 'project_id'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value ? parseInt(value) : undefined }));
    } else if (['amount_ht', 'vat_rate'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value ? parseFloat(value) : 0 }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (name === 'payment_method') {
      setFormData(prev => ({ 
        ...prev, 
        payment_method: (value as PaymentMethod) || undefined,
        is_paid: !!value,
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const calculateTTC = () => {
    const ht = formData.amount_ht || 0;
    const vat = (ht * (formData.vat_rate || 0)) / 100;
    return ht + vat;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await purchaseService.update(purchaseId, formData);
      if (response.success) {
        router.push(buildDetailPath('purchases', purchaseId));
      }
    } catch (error) {
      console.error('Error updating purchase:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Chargement...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modifier l&apos;achat</h1>
          <p className="text-gray-500">Mettre à jour les informations de l&apos;achat</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Informations de l&apos;achat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Description *"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Catégorie"
                  name="category"
                  options={categoryOptions}
                  value={formData.category}
                  onChange={handleChange}
                />
                <Input
                  label="Date d'achat"
                  name="purchase_date"
                  type="date"
                  value={formData.purchase_date}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Fournisseur"
                  name="supplier_id"
                  options={supplierOptions}
                  value={formData.supplier_id?.toString() || ''}
                  onChange={handleChange}
                />
                <Select
                  label="Projet"
                  name="project_id"
                  options={projectOptions}
                  value={formData.project_id?.toString() || ''}
                  onChange={handleChange}
                />
              </div>

              <Input
                label="N° de facture fournisseur"
                name="invoice_number"
                value={formData.invoice_number}
                onChange={handleChange}
              />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Montants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Montant HT (€) *"
                  name="amount_ht"
                  type="number"
                  step="0.01"
                  value={formData.amount_ht || ''}
                  onChange={handleChange}
                  required
                />
                <Select
                  label="TVA"
                  name="vat_rate"
                  options={vatRateOptions}
                  value={formData.vat_rate?.toString() || '20'}
                  onChange={handleChange}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total TTC</label>
                  <div className="h-10 flex items-center text-lg font-bold text-gray-900">
                    {calculateTTC().toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Paiement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="Mode de paiement"
                name="payment_method"
                options={paymentMethodOptions}
                value={formData.payment_method || ''}
                onChange={handleChange}
              />
              
              {formData.is_paid && (
                <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                  Cet achat est marqué comme payé.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                name="notes"
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Notes internes..."
              />
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(buildDetailPath('purchases', purchaseId))}
            >
              Annuler
            </Button>
            <Button type="submit" loading={saving}>
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
