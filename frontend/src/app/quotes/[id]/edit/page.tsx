'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select } from '@/components/ui';
import { quoteService, customerService, projectService, priceLibraryService } from '@/services/api';
import { Quote, QuoteCreate, Customer, Project, PriceLibraryItem, LineItem } from '@/types';

const vatRateOptions = [
  { value: '20', label: '20%' },
  { value: '10', label: '10%' },
  { value: '5.5', label: '5.5%' },
  { value: '2.1', label: '2.1%' },
  { value: '0', label: '0%' },
];

const itemTypeOptions = [
  { value: 'supply', label: 'Fourniture' },
  { value: 'labor', label: 'Main d\'œuvre' },
  { value: 'other', label: 'Autre' },
];

export default function EditQuotePage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [favorites, setFavorites] = useState<PriceLibraryItem[]>([]);
  
  const [formData, setFormData] = useState<QuoteCreate>({
    customer_id: 0,
    project_id: undefined,
    subject: '',
    notes: '',
    terms_and_conditions: '',
    validity_days: 30,
    deposit_percent: 0,
    discount_percent: 0,
    cee_premium: 0,
    mpr_premium: 0,
    waste_management_fee: 0,
    line_items: [],
  });

  const [items, setItems] = useState<LineItem[]>([]);

  useEffect(() => {
    loadData();
  }, [quoteId]);

  const loadData = async () => {
    try {
      const [quoteRes, customersRes, projectsRes, favoritesRes] = await Promise.all([
        quoteService.getById(quoteId),
        customerService.getAll(),
        projectService.getAll(),
        priceLibraryService.getFavorites(),
      ]);
      
      if (quoteRes.success && quoteRes.data) {
        const quote = quoteRes.data;
        setFormData({
          customer_id: quote.customer_id || 0,
          project_id: quote.project_id,
          subject: quote.subject || '',
          notes: quote.notes || '',
          terms_and_conditions: quote.terms_and_conditions || '',
          validity_days: quote.validity_date ? Math.ceil((new Date(quote.validity_date).getTime() - (new Date(quote.quote_date || '').getTime())) / (1000 * 60 * 60 * 24)) : 30,
          deposit_percent: quote.deposit_percent || 0,
          discount_percent: quote.discount_percent || 0,
          cee_premium: quote.cee_premium || 0,
          mpr_premium: quote.mpr_premium || 0,
          waste_management_fee: quote.waste_management_fee || 0,
          line_items: quote.line_items || [],
        });
        setItems(quote.line_items || []);
      }
      
      if (customersRes.success) {
        setCustomers(Array.isArray(customersRes.data) ? customersRes.data : []);
      }
      if (projectsRes.success) {
        setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
      }
      if (favoritesRes.success) {
        setFavorites(Array.isArray(favoritesRes.data) ? favoritesRes.data : []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const customerOptions = [
    { value: '', label: 'Sélectionner un client' },
    ...customers.map(c => ({ value: String(c.id), label: c.company_name || `${c.first_name} ${c.last_name}` })),
  ];

  const projectOptions = [
    { value: '', label: 'Aucun projet' },
    ...projects.map(p => ({ value: String(p.id), label: p.name })),
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (['customer_id', 'project_id', 'validity_days'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value ? parseInt(value) : undefined }));
    } else if (['discount_percent', 'deposit_percent', 'deposit_amount'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value ? parseFloat(value) : 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...items];
    if (field === 'quantity' || field === 'unit_price' || field === 'vat_rate') {
      updated[index] = { ...updated[index], [field]: parseFloat(value as string) || 0 };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, {
      designation: '',
      description: '',
      quantity: 1,
      unit: 'u',
      unit_price: 0,
      vat_rate: 20,
      item_type: 'supply',
    }]);
  };

  const addFavorite = (item: PriceLibraryItem) => {
    setItems([...items, {
      designation: item.name,
      description: item.description,
      quantity: 1,
      unit: item.unit,
      unit_price: item.unit_price,
      vat_rate: item.tax_rate || 20,
      item_type: item.item_type || 'supply',
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalHT = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const discountAmount = (totalHT * (formData.discount_percent || 0)) / 100;
  const totalHTAfterDiscount = totalHT - discountAmount;
  const totalVAT = items.reduce((sum, item) => {
    const lineTotal = item.quantity * item.unit_price;
    const lineDiscount = (lineTotal / totalHT) * discountAmount;
    return sum + ((lineTotal - lineDiscount) * item.vat_rate / 100);
  }, 0);
  const totalTTC = totalHTAfterDiscount + totalVAT;
  const depositAmount = totalTTC * (formData.deposit_percent || 0) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await quoteService.update(quoteId, {
        ...formData,
        line_items: items,
      });
      if (response.success) {
        router.push(`/quotes/${quoteId}`);
      }
    } catch (error) {
      console.error('Error updating quote:', error);
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
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modifier le devis</h1>
          <p className="text-gray-500">Mettre à jour les informations du devis</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Client *"
                  name="customer_id"
                  options={customerOptions}
                  value={formData.customer_id?.toString() || ''}
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
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Validité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Validité (jours)"
                name="validity_days"
                type="number"
                value={formData.validity_days || ''}
                onChange={handleChange}
              />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Lignes du devis</span>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={addItem}>
                    + Ligne manuelle
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {favorites.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2">Favoris</p>
                  <div className="flex flex-wrap gap-2">
                    {favorites.map(fav => (
                      <button
                        key={fav.id}
                        type="button"
                        onClick={() => addFavorite(fav)}
                        className="text-xs bg-white border border-blue-200 px-3 py-1 rounded hover:bg-blue-50"
                      >
                        ⭐ {fav.description}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {items.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune ligne. Ajoutez des lignes ci-dessus.</p>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50">
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-4">
                          <Input
                            label="Description"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          />
                        </div>
                        <div className="col-span-1">
                          <Input
                            label="Qté"
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          />
                        </div>
                        <div className="col-span-1">
                          <Input
                            label="Unité"
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            label="PU HT (€)"
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                          />
                        </div>
                        <div className="col-span-1">
                          <Select
                            label="TVA"
                            options={vatRateOptions}
                            value={item.vat_rate?.toString() || '20'}
                            onChange={(e) => handleItemChange(index, 'vat_rate', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Select
                            label="Type"
                            options={itemTypeOptions}
                            value={item.item_type || 'supply'}
                            onChange={(e) => handleItemChange(index, 'item_type', e.target.value)}
                          />
                        </div>
                        <div className="col-span-1 flex items-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-600"
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 text-right text-sm font-medium">
                        Total ligne: {(item.quantity * item.unit_price).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} HT
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Conditions commerciales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Remise (%)"
                  name="discount_percent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.discount_percent || ''}
                  onChange={handleChange}
                />
                <Input
                  label="Acompte demandé (%)"
                  name="deposit_percent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.deposit_percent || ''}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Récapitulatif financier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Total HT :</span>
                <span className="font-medium">{totalHT.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Remise ({formData.discount_percent}%) :</span>
                  <span>-{discountAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>TVA :</span>
                <span className="font-medium">{totalVAT.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total TTC :</span>
                <span className="text-blue-600">{totalTTC.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
              </div>
              {formData.deposit_percent && formData.deposit_percent > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Acompte ({formData.deposit_percent}%) :</span>
                  <span>{depositAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Notes et conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.notes}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conditions générales</label>
                <textarea
                  name="terms_and_conditions"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.terms_and_conditions}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/quotes/${quoteId}`)}
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
