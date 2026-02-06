'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select } from '@/components/ui';
import { invoiceService, quoteService, customerService, projectService } from '@/services/api';
import { InvoiceCreate, Quote, Customer, Project, LineItem } from '@/types';

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

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [fromQuote, setFromQuote] = useState<boolean>(false);
  
  const [formData, setFormData] = useState<InvoiceCreate>({
    customer_id: 0,
    project_id: undefined,
    quote_id: undefined,
    subject: '',
    notes: '',
    terms_and_conditions: 'Pénalités de retard : 3 fois le taux d\'intérêt légal. Indemnité forfaitaire pour frais de recouvrement : 40€.',
    discount_percent: 0,
    line_items: [],
  });

  const [items, setItems] = useState<LineItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [quotesRes, customersRes, projectsRes] = await Promise.all([
        quoteService.getAll(),
        customerService.getAll(),
        projectService.getAll(),
      ]);
      
      if (quotesRes.success) {
        const allQuotes = Array.isArray(quotesRes.data) ? quotesRes.data : [];
        // Only show accepted quotes that haven't been invoiced
        setQuotes(allQuotes.filter((q: Quote) => q.status === 'accepted'));
      }
      if (customersRes.success) {
        const allCustomers = Array.isArray(customersRes.data) ? customersRes.data : [];
        setCustomers(allCustomers);
      }
      if (projectsRes.success) {
        const allProjects = Array.isArray(projectsRes.data) ? projectsRes.data : [];
        setProjects(allProjects);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const quoteOptions = [
    { value: '', label: 'Créer sans devis' },
    ...quotes.map(q => ({ value: String(q.id), label: q.reference })),
  ];

  const customerOptions = [
    { value: '', label: 'Sélectionner un client' },
    ...customers.map(c => ({ value: String(c.id), label: c.company_name || `${c.first_name} ${c.last_name}` })),
  ];

  const projectOptions = [
    { value: '', label: 'Aucun projet' },
    ...projects.map(p => ({ value: String(p.id), label: p.name })),
  ];

  const handleQuoteSelect = async (quoteId: string) => {
    if (!quoteId) {
      setFromQuote(false);
      setFormData(prev => ({ ...prev, quote_id: undefined }));
      setItems([]);
      return;
    }

    const quote = quotes.find(q => q.id === parseInt(quoteId));
    if (quote) {
      setFromQuote(true);
      setFormData(prev => ({
        ...prev,
        quote_id: quote.id,
        customer_id: quote.customer_id || prev.customer_id,
        project_id: quote.project_id || prev.project_id,
        discount_percent: quote.discount_percent || 0,
      }));
      setItems(quote.line_items || []);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (['customer_id', 'project_id', 'payment_terms'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value ? parseInt(value) : undefined }));
    } else if (['discount_percent'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value ? parseFloat(value) : 0 }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
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

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate totals
  const totalHT = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const discountAmount = (totalHT * (formData.discount_percent || 0)) / 100;
  const totalHTAfterDiscount = totalHT - discountAmount;
  const totalVAT = items.reduce((sum, item) => {
    const lineTotal = item.quantity * item.unit_price;
    const lineDiscount = (lineTotal / totalHT) * discountAmount;
    return sum + ((lineTotal - lineDiscount) * item.vat_rate / 100);
  }, 0);
  const totalTTC = totalHTAfterDiscount + totalVAT;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await invoiceService.create({
        ...formData,
        line_items: items,
      });
      if (response.success) {
        router.push('/invoices');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle facture</h1>
          <p className="text-gray-500">Créer une facture à partir d&apos;un devis ou manuellement</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Source selection */}
          <Card>
            <CardHeader>
              <CardTitle>Source</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                label="Créer à partir d'un devis"
                name="quote_id"
                options={quoteOptions}
                value={formData.quote_id?.toString() || ''}
                onChange={(e) => handleQuoteSelect(e.target.value)}
              />
              {fromQuote && (
                <p className="mt-2 text-sm text-green-600">
                  Les informations du devis ont été importées.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Client and project */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Client et projet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Client *"
                  name="customer_id"
                  options={customerOptions}
                  value={formData.customer_id?.toString() || ''}
                  onChange={handleChange}
                  disabled={fromQuote}
                />
                <Select
                  label="Projet"
                  name="project_id"
                  options={projectOptions}
                  value={formData.project_id?.toString() || ''}
                  onChange={handleChange}
                  disabled={fromQuote}
                />
              </div>
            </CardContent>
          </Card>

          {/* Dates and payment terms */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Détails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
              </div>
            </CardContent>
          </Card>

          {/* Line items */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Lignes de facture</span>
                {!fromQuote && (
                  <Button type="button" size="sm" onClick={addItem}>
                    + Ajouter une ligne
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Aucune ligne. {!fromQuote && 'Ajoutez des lignes manuellement.'}
                </p>
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
                            disabled={fromQuote}
                          />
                        </div>
                        <div className="col-span-1">
                          <Input
                            label="Qté"
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            disabled={fromQuote}
                          />
                        </div>
                        <div className="col-span-1">
                          <Input
                            label="Unité"
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            disabled={fromQuote}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            label="PU HT (€)"
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                            disabled={fromQuote}
                          />
                        </div>
                        <div className="col-span-1">
                          <Select
                            label="TVA"
                            options={vatRateOptions}
                            value={item.vat_rate?.toString() || '20'}
                            onChange={(e) => handleItemChange(index, 'vat_rate', e.target.value)}
                            disabled={fromQuote}
                          />
                        </div>
                        <div className="col-span-2">
                          <Select
                            label="Type"
                            options={itemTypeOptions}
                            value={item.item_type || 'supply'}
                            onChange={(e) => handleItemChange(index, 'item_type', e.target.value)}
                            disabled={fromQuote}
                          />
                        </div>
                        <div className="col-span-1 flex items-end">
                          {!fromQuote && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="text-red-600"
                            >
                              ✕
                            </Button>
                          )}
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

          {/* Totals */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <Input
                    label="Remise (%)"
                    name="discount_percent"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.discount_percent || ''}
                    onChange={handleChange}
                    disabled={fromQuote}
                  />
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Total HT:</span>
                    <span className="font-medium">{totalHT.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Remise ({formData.discount_percent}%):</span>
                      <span>-{discountAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>TVA:</span>
                    <span className="font-medium">{totalVAT.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total TTC:</span>
                    <span>{totalTTC.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                  </div>

                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes and terms */}
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
                  placeholder="Notes visibles sur la facture..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conditions de paiement</label>
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
              onClick={() => router.push('/invoices')}
            >
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              Créer la facture
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
