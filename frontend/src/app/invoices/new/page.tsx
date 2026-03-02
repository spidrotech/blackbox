'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select } from '@/components/ui';
import { invoiceService, quoteService, customerService, projectService, settingsService } from '@/services/api';
import { InvoiceCreate, Quote, Customer, Project } from '@/types';
import { LineItemsEditor, LineItemData } from '@/components/quotes/LineItemsEditor';
import InvoicePreview, { InvoicePreviewData, InvoiceCustomer, InvoiceCompany } from '@/components/invoices/InvoicePreview';
import {
  CompanySettingsData,
  getDocumentDefaultsFromCompany,
  mapCompanySettingsToDocumentCompany,
} from '@/lib/company-settings';

const toLineItemData = (item: any): LineItemData => ({
  id: item.id,
  description: item.designation ?? item.description ?? '',
  long_description: item.long_description,
  item_type: item.item_type ?? 'supply',
  quantity: Number(item.quantity ?? 1),
  unit: item.unit ?? 'u',
  unit_price: Number(item.unit_price ?? 0),
  discount_percent: item.discount_percent ? Number(item.discount_percent) : undefined,
  vat_rate: Number(item.vat_rate ?? item.tax_rate ?? 20),
  reference: item.reference,
});

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteIdParam = searchParams.get('quoteId');

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [company, setCompany] = useState<InvoiceCompany | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [fromQuote, setFromQuote] = useState<boolean>(false);
  const [lineItems, setLineItems] = useState<LineItemData[]>([]);

  const today = new Date().toISOString().split('T')[0];
  const thirtyDays = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];

  const [formData, setFormData] = useState<InvoiceCreate & { invoice_date?: string; due_date?: string }>({
    customer_id: 0,
    project_id: undefined,
    quote_id: undefined,
    subject: '',
    notes: '',
    terms_and_conditions: '',
    payment_terms: '',
    bank_details: '',
    discount_percent: 0,
    invoice_date: today,
    due_date: thirtyDays,
    line_items: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const [quotesRes, customersRes, projectsRes, companyRes] = await Promise.all([
        quoteService.getAll(),
        customerService.getAll(),
        projectService.getAll(),
        settingsService.getCompany(),
      ]);

      const allQuotes: Quote[] = Array.isArray(quotesRes.data)
        ? quotesRes.data
        : (quotesRes as any).items ?? [];
      const allCustomers: Customer[] = Array.isArray(customersRes.data)
        ? customersRes.data
        : (customersRes as any).items ?? [];
      const allProjects: Project[] = Array.isArray(projectsRes.data)
        ? projectsRes.data
        : (projectsRes as any).items ?? [];

      setQuotes(allQuotes);
      setCustomers(allCustomers);
      setProjects(allProjects);

      if (companyRes.success && companyRes.data) {
        const companyData = companyRes.data as CompanySettingsData;
        setCompany(mapCompanySettingsToDocumentCompany(companyData) as InvoiceCompany);
        const defaults = getDocumentDefaultsFromCompany(companyData);
        setFormData(prev => ({
          ...prev,
          terms_and_conditions: prev.terms_and_conditions || defaults.conditions,
          payment_terms: prev.payment_terms || defaults.paymentTerms,
          bank_details: prev.bank_details || defaults.bankDetails,
        }));
      }

      if (quoteIdParam) {
        const q = allQuotes.find(q => q.id === parseInt(quoteIdParam));
        if (q) importQuote(q);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const importQuote = (quote: Quote) => {
    setFromQuote(true);
    setLineItems((quote.line_items ?? []).map(toLineItemData));
    setFormData(prev => ({
      ...prev,
      quote_id: quote.id,
      customer_id: quote.customer_id ?? prev.customer_id,
      project_id: quote.project_id ?? prev.project_id,
      discount_percent: (quote as any).discount_percent ?? prev.discount_percent,
      subject: (quote as any).subject ?? prev.subject,
    }));
  };

  const handleQuoteSelect = (quoteId: string) => {
    if (!quoteId) {
      setFromQuote(false);
      setLineItems([]);
      setFormData(prev => ({ ...prev, quote_id: undefined }));
      return;
    }
    const q = quotes.find(q => q.id === parseInt(quoteId));
    if (q) importQuote(q);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (['customer_id', 'project_id'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value ? parseInt(value) : undefined }));
    } else if (name === 'discount_percent') {
      setFormData(prev => ({ ...prev, discount_percent: value ? parseFloat(value) : 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const totalHT = lineItems
    .filter(i => !['section', 'text', 'page_break'].includes(i.item_type))
    .reduce((sum, i) => {
      const base = i.quantity * i.unit_price;
      const disc = i.discount_percent ? base * i.discount_percent / 100 : 0;
      return sum + base - disc;
    }, 0);
  const discountAmount = (totalHT * (formData.discount_percent ?? 0)) / 100;
  const totalHtAfterDiscount = totalHT - discountAmount;
  const totalVAT = lineItems
    .filter(i => !['section', 'text', 'page_break'].includes(i.item_type))
    .reduce((sum, i) => {
      const base = i.quantity * i.unit_price;
      const disc = i.discount_percent ? base * i.discount_percent / 100 : 0;
      const lineHt = totalHT > 0 ? ((base - disc) / totalHT) * totalHtAfterDiscount : 0;
      return sum + lineHt * i.vat_rate / 100;
    }, 0);
  const totalTTC = totalHtAfterDiscount + totalVAT;

  const fmt = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) {
      alert('Veuillez sélectionner un client.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...formData,
        conditions: formData.terms_and_conditions,
        line_items: lineItems.map((item, i) => ({ ...item, display_order: i })),
      };
      const res = await invoiceService.create(payload as InvoiceCreate);
      if (res.success && res.data) {
        router.push(`/invoices/${res.data.id}`);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const quoteOptions = [
    { value: '', label: 'Créer sans devis (manuel)' },
    ...quotes.map(q => {
      const s: Record<string, string> = {
        draft: 'Brouillon', sent: 'Envoyé', accepted: 'Accepté',
        signed: 'Signé', finalized: 'Finalisé', viewed: 'Consulté',
      };
      return { value: String(q.id), label: `${q.reference}${q.status ? ' – ' + (s[q.status] ?? q.status) : ''}` };
    }),
  ];

  const customerOptions = [
    { value: '', label: 'Sélectionner un client' },
    ...customers.map(c => ({
      value: String(c.id),
      label: ((c as any).name ?? (c as any).company_name
        ?? `${(c as any).first_name ?? ''} ${(c as any).last_name ?? ''}`.trim())
        || `Client #${c.id}`,
    })),
  ];

  const projectOptions = [
    { value: '', label: 'Aucun projet' },
    ...projects.map(p => ({ value: String(p.id), label: p.name })),
  ];

  if (dataLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nouvelle facture</h1>
            <p className="text-gray-500 text-sm mt-1">Créer une facture à partir d&apos;un devis ou manuellement</p>
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button type="button" onClick={() => setTab('edit')} className={`px-4 py-2 text-sm font-medium transition-colors ${ tab === 'edit' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50' }`}>
              ✏️ Édition
            </button>
            <button type="button" onClick={() => setTab('preview')} className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${ tab === 'preview' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50' }`}>
              👁 Aperçu
            </button>
          </div>
        </div>

        {/* Preview tab */}
        {tab === 'preview' && (() => {
          const previewCustomer = customers.find(c => c.id === formData.customer_id);
          const previewData: InvoicePreviewData = {
            invoiceDate: (formData as any).invoice_date,
            dueDate: (formData as any).due_date,
            description: formData.subject ?? '',
            notes: formData.notes ?? '',
            conditions: (formData as any).terms_and_conditions,
            lineItems,
            company,
            customer: previewCustomer
              ? ({ id: previewCustomer.id, name: (previewCustomer as any).name ?? `${previewCustomer.firstName ?? ''} ${previewCustomer.lastName ?? ''}`.trim(), contactName: previewCustomer.contactName, email: previewCustomer.email, phone: previewCustomer.phone, vat: previewCustomer.vat, siret: previewCustomer.siret } as InvoiceCustomer)
              : null,
          };
          return (
            <div className="overflow-auto bg-gray-200 p-4 rounded-lg" style={{ maxHeight: '80vh' }}>
              <InvoicePreview data={previewData} />
            </div>
          );
        })()}

        {tab === 'edit' && (
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Source */}
          <Card>
            <CardHeader><CardTitle>Source</CardTitle></CardHeader>
            <CardContent>
              <Select
                label="Importer depuis un devis"
                name="quote_id"
                options={quoteOptions}
                value={formData.quote_id?.toString() ?? ''}
                onChange={e => handleQuoteSelect(e.target.value)}
              />
              {fromQuote && (
                <p className="mt-2 text-sm text-green-600">✓ Lignes importées depuis le devis</p>
              )}
            </CardContent>
          </Card>

          {/* Client and project */}
          <Card>
            <CardHeader><CardTitle>Client et projet</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Client *"
                name="customer_id"
                options={customerOptions}
                value={formData.customer_id?.toString() ?? ''}
                onChange={handleChange}
                disabled={fromQuote}
              />
              <Select
                label="Projet"
                name="project_id"
                options={projectOptions}
                value={formData.project_id?.toString() ?? ''}
                onChange={handleChange}
                disabled={fromQuote}
              />
            </CardContent>
          </Card>

          {/* Dates and subject */}
          <Card>
            <CardHeader><CardTitle>Détails</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Objet"
                name="subject"
                value={formData.subject ?? ''}
                onChange={handleChange}
                placeholder="Ex. Travaux de plomberie..."
              />
              <Input
                label="Date d'émission"
                name="invoice_date"
                type="date"
                value={(formData as any).invoice_date ?? today}
                onChange={handleChange}
              />
              <Input
                label="Date d'échéance"
                name="due_date"
                type="date"
                value={(formData as any).due_date ?? thirtyDays}
                onChange={handleChange}
              />
            </CardContent>
          </Card>

          {/* Line items */}
          <Card>
            <CardHeader><CardTitle>Lignes de facturation</CardTitle></CardHeader>
            <CardContent className="p-0 sm:p-0">
              <LineItemsEditor items={lineItems} onChange={setLineItems} />
            </CardContent>
          </Card>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full sm:w-80 bg-white border rounded-xl p-4 shadow-sm space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total HT :</span>
                <span className="font-medium">{fmt(totalHT)}</span>
              </div>
              {(formData.discount_percent ?? 0) > 0 && (
                <>
                  <div className="flex justify-between text-gray-500">
                    <span>Remise ({formData.discount_percent}%) :</span>
                    <span>-{fmt(discountAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">HT après remise :</span>
                    <span className="font-medium">{fmt(totalHtAfterDiscount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">TVA :</span>
                <span className="font-medium">{fmt(totalVAT)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                <span>Total TTC :</span>
                <span>{fmt(totalTTC)}</span>
              </div>
              <div className="pt-1">
                <Input
                  label="Remise globale (%)"
                  name="discount_percent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.discount_percent?.toString() ?? '0'}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Notes and terms */}
          <Card>
            <CardHeader><CardTitle>Notes et conditions</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (visibles sur la facture)</label>
                <textarea
                  name="notes"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.notes ?? ''}
                  onChange={handleChange}
                  placeholder="Notes ou informations complémentaires..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conditions générales de vente</label>
                <textarea
                  name="terms_and_conditions"
                  rows={5}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.terms_and_conditions ?? ''}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pb-6">
            <Button type="button" variant="outline" onClick={() => router.push('/invoices')}>
              Annuler
            </Button>
            <Button type="button" variant="outline" onClick={() => setTab('preview')}>
              👁 Aperçu
            </Button>
            <Button type="submit" loading={loading}>
              Créer la facture
            </Button>
          </div>

        </form>
        )}
      </div>
    </MainLayout>
  );
}
