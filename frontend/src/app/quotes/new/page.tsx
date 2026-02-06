'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select } from '@/components/ui';
import { quoteService, customerService, projectService, priceLibraryService } from '@/services/api';
import { QuoteCreate, Customer, Project, LineItem, PriceLibraryItem } from '@/types';
import { formatCurrency } from '@/lib/utils';

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

export default function NewQuotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [priceLibrary, setPriceLibrary] = useState<PriceLibraryItem[]>([]);
  
  const [formData, setFormData] = useState<QuoteCreate>({
    customer_id: 0,
    project_id: undefined,
    subject: '',
    notes: '',
    terms_and_conditions: '',
    validity_days: 30,
    deposit_percent: 30,
    discount_percent: 0,
    cee_premium: 0,
    mpr_premium: 0,
    waste_management_fee: 0,
    line_items: [],
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [customersRes, projectsRes, priceRes] = await Promise.all([
        customerService.getAll(),
        projectService.getAll(),
        priceLibraryService.getFavorites(),
      ]);
      
      if (customersRes.success) {
        setCustomers(Array.isArray(customersRes.data) ? customersRes.data : []);
      }
      if (projectsRes.success) {
        setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
      }
      if (priceRes.success) {
        setPriceLibrary(Array.isArray(priceRes.data) ? priceRes.data : []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const getCustomerName = (customer: Customer) => {
    return customer.customer_type === 'company' 
      ? customer.company_name 
      : `${customer.first_name} ${customer.last_name}`;
  };

  const customerOptions = [
    { value: '', label: 'Sélectionner un client' },
    ...customers.map(c => ({ value: String(c.id), label: getCustomerName(c) || '' })),
  ];

  const projectOptions = [
    { value: '', label: 'Aucun projet' },
    ...projects.map(p => ({ value: String(p.id), label: p.name })),
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (['customer_id', 'project_id'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value ? parseInt(value) : undefined }));
    } else if (['validity_days', 'deposit_percent', 'discount_percent', 'cee_premium', 'mpr_premium', 'waste_management_fee'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value ? parseFloat(value) : 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      designation: '',
      description: '',
      unit: 'u',
      quantity: 1,
      unit_price: 0,
      vat_rate: 20,
      discount_percent: 0,
      item_type: 'supply',
      position: lineItems.length,
      is_optional: false,
    }]);
  };

  const addFromLibrary = (item: PriceLibraryItem) => {
    setLineItems([...lineItems, {
      designation: item.name,
      description: item.description || '',
      unit: item.unit || 'u',
      quantity: 1,
      unit_price: item.unit_price,
      vat_rate: item.tax_rate || 20,
      discount_percent: 0,
      item_type: item.item_type,
      position: lineItems.length,
      is_optional: false,
    }]);
    
    // Track usage
    priceLibraryService.recordUsage(item.id);
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number | boolean) => {
    const updated = [...lineItems];
    const item = { ...updated[index] };
    (item as any)[field] = value;
    updated[index] = item;
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateLineTotal = (item: LineItem) => {
    const subtotal = item.quantity * item.unit_price;
    const discount = (subtotal * (item.discount_percent || 0)) / 100;
    const ht = subtotal - discount;
    const tva = (ht * item.vat_rate) / 100;
    return { ht, tva, ttc: ht + tva };
  };

  const calculateTotals = () => {
    let totalHT = 0;
    let totalTVA = 0;
    
    lineItems.forEach(item => {
      const { ht, tva } = calculateLineTotal(item);
      totalHT += ht;
      totalTVA += tva;
    });
    
    const discount = (totalHT * (formData.discount_percent || 0)) / 100;
    const finalHT = totalHT - discount;
    const finalTTC = finalHT + totalTVA + (formData.waste_management_fee || 0);
    const premiums = (formData.cee_premium || 0) + (formData.mpr_premium || 0);
    const finalNet = finalTTC - premiums;
    const deposit = (finalTTC * (formData.deposit_percent || 0)) / 100;
    
    return { totalHT, totalTVA, discount, finalHT, finalTTC, premiums, finalNet, deposit };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_id) {
      alert('Veuillez sélectionner un client');
      return;
    }
    
    if (lineItems.length === 0) {
      alert('Veuillez ajouter au moins une ligne');
      return;
    }
    
    setLoading(true);

    try {
      const response = await quoteService.create({
        ...formData,
        line_items: lineItems,
      });
      if (response.success) {
        router.push('/quotes');
      }
    } catch (error) {
      console.error('Error creating quote:', error);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau devis</h1>
          <p className="text-gray-500">Créer un nouveau devis</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Info générale */}
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
                  required
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
                label="Objet du devis"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="Ex: Rénovation salle de bain"
              />

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Validité (jours)"
                  name="validity_days"
                  type="number"
                  value={formData.validity_days || ''}
                  onChange={handleChange}
                />
                <Input
                  label="Acompte (%)"
                  name="deposit_percent"
                  type="number"
                  step="0.1"
                  value={formData.deposit_percent || ''}
                  onChange={handleChange}
                />
                <Input
                  label="Remise globale (%)"
                  name="discount_percent"
                  type="number"
                  step="0.1"
                  value={formData.discount_percent || ''}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Lignes */}
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Lignes du devis</CardTitle>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                    + Ajouter une ligne
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Favoris bibliothèque */}
              {priceLibrary.length > 0 && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Ajouter depuis la bibliothèque :</p>
                  <div className="flex flex-wrap gap-2">
                    {priceLibrary.slice(0, 5).map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addFromLibrary(item)}
                        className="px-3 py-1 text-sm bg-white border rounded-full hover:bg-blue-50 hover:border-blue-300"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Lignes */}
              <div className="space-y-4">
                {lineItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucune ligne. Cliquez sur &quot;Ajouter une ligne&quot; pour commencer.
                  </div>
                ) : (
                  lineItems.map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm font-medium text-gray-500">Ligne {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <Input
                          label="Désignation"
                          value={item.designation}
                          onChange={(e) => updateLineItem(index, 'designation', e.target.value)}
                          required
                        />
                        <Select
                          label="Type"
                          options={itemTypeOptions}
                          value={item.item_type}
                          onChange={(e) => updateLineItem(index, 'item_type', e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <Input
                          label="Quantité"
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                        <Input
                          label="Unité"
                          value={item.unit}
                          onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                        />
                        <Input
                          label="Prix unitaire"
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        />
                        <Select
                          label="TVA"
                          options={vatRateOptions}
                          value={item.vat_rate.toString()}
                          onChange={(e) => updateLineItem(index, 'vat_rate', parseFloat(e.target.value))}
                        />
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Total HT</label>
                          <div className="h-10 flex items-center font-medium">
                            {formatCurrency(calculateLineTotal(item).ht)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Options */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Options et primes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Frais déchetterie (€)"
                  name="waste_management_fee"
                  type="number"
                  step="0.01"
                  value={formData.waste_management_fee || ''}
                  onChange={handleChange}
                />
                <Input
                  label="Prime CEE (€)"
                  name="cee_premium"
                  type="number"
                  step="0.01"
                  value={formData.cee_premium || ''}
                  onChange={handleChange}
                />
                <Input
                  label="Prime MPR (€)"
                  name="mpr_premium"
                  type="number"
                  step="0.01"
                  value={formData.mpr_premium || ''}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Totaux */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-right">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total HT</span>
                  <span className="font-medium">{formatCurrency(totals.totalHT)}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Remise</span>
                    <span>-{formatCurrency(totals.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">TVA</span>
                  <span className="font-medium">{formatCurrency(totals.totalTVA)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total TTC</span>
                  <span>{formatCurrency(totals.finalTTC)}</span>
                </div>
                {totals.premiums > 0 && (
                  <>
                    <div className="flex justify-between text-green-600">
                      <span>Primes déduites</span>
                      <span>-{formatCurrency(totals.premiums)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Net à payer</span>
                      <span>{formatCurrency(totals.finalNet)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-blue-600 border-t pt-2">
                  <span>Acompte à la commande ({formData.deposit_percent}%)</span>
                  <span className="font-medium">{formatCurrency(totals.deposit)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
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
              onClick={() => router.push('/quotes')}
            >
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              Créer le devis
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
