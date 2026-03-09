'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select } from '@/components/ui';
import { DocumentCompletionCard } from '@/components/documents/DocumentCompletionCard';
import { DocumentTemplatePicker } from '@/components/documents/DocumentTemplatePicker';
import { PresetChips } from '@/components/documents/PresetChips';
import { UnsavedChangesBadge } from '@/components/documents/UnsavedChangesBadge';
import { invoiceService, quoteService, customerService, projectService, settingsService } from '@/services/api';
import { InvoiceCreate, Quote, Customer, Project, LineItem, LineItemType } from '@/types';
import { LineItemsEditor, LineItemData } from '@/components/quotes/LineItemsEditor';
import InvoicePreview, { InvoicePreviewData, InvoiceCustomer, InvoiceCompany } from '@/components/invoices/InvoicePreview';
import { PdfSettingsCard } from '@/components/documents/PdfSettingsCard';
import {
  CompanySettingsData,
  getDocumentDefaultsFromCompany,
  mapCompanySettingsToDocumentCompany,
} from '@/lib/company-settings';
import { buildDetailPath } from '@/lib/routes';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';

type ApiListResponse<T> = {
  data?: T[];
  items?: T[];
};

type LineItemLike = Partial<LineItemData> & {
  designation?: string;
  description?: string;
  tax_rate?: number;
};

const getListData = <T,>(response: ApiListResponse<T>): T[] => {
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.items)) return response.items;
  return [];
};

const toLineItemData = (item: LineItemLike): LineItemData => ({
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

const toLineItemType = (itemType: LineItemData['item_type']): LineItemType => {
  if (itemType === 'supply' || itemType === 'labor' || itemType === 'other') {
    return itemType;
  }
  return 'other';
};

const toInvoiceLineItem = (item: LineItemData, position: number): LineItem => ({
  designation: item.description,
  description: item.description,
  long_description: item.long_description,
  item_type: toLineItemType(item.item_type),
  quantity: item.quantity,
  unit: item.unit,
  unit_price: item.unit_price,
  discount_percent: item.discount_percent,
  vat_rate: item.vat_rate,
  reference: item.reference,
  position,
});

function NewInvoicePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteIdParam = searchParams.get('quoteId');
  const draftHydratedRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [company, setCompany] = useState<InvoiceCompany | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettingsData | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [fromQuote, setFromQuote] = useState<boolean>(false);
  const [lineItems, setLineItems] = useState<LineItemData[]>([]);
  const [draftMessage, setDraftMessage] = useState('');

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

  const INVOICE_DRAFT_KEY = 'blackbox.invoice.create.draft.v2';
  const { isDirty, captureBaseline, confirmIfDirty } = useUnsavedChanges({ formData, lineItems });

  const clearDraft = () => {
    localStorage.removeItem(INVOICE_DRAFT_KEY);
    setDraftMessage('Brouillon supprimé.');
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setDataLoading(true);
    let baseline = { formData, lineItems };

    try {
      const [quotesRes, customersRes, projectsRes, companyRes] = await Promise.all([
        quoteService.getAll(),
        customerService.getAll(),
        projectService.getAll(),
        settingsService.getCompany(),
      ]);

      const allQuotes = getListData<Quote>(quotesRes as ApiListResponse<Quote>);
      const allCustomers = getListData<Customer>(customersRes as ApiListResponse<Customer>);
      const allProjects = getListData<Project>(projectsRes as ApiListResponse<Project>);

      setQuotes(allQuotes);
      setCustomers(allCustomers);
      setProjects(allProjects);

      if (companyRes.success && companyRes.data) {
        const companyData = companyRes.data as CompanySettingsData;
        setCompanySettings(companyData);
        setCompany(mapCompanySettingsToDocumentCompany(companyData) as InvoiceCompany);
        const defaults = getDocumentDefaultsFromCompany(companyData);
        const baseData = {
          ...formData,
          terms_and_conditions: formData.terms_and_conditions || defaults.conditions,
          payment_terms: formData.payment_terms || defaults.paymentTerms,
          bank_details: formData.bank_details || defaults.bankDetails,
        };

        const savedDraft = localStorage.getItem(INVOICE_DRAFT_KEY);
        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft) as {
              formData?: InvoiceCreate & { invoice_date?: string; due_date?: string };
              lineItems?: LineItemData[];
            };
            const restoredFormData = { ...baseData, ...(parsed.formData || {}) };
            const restoredLineItems = Array.isArray(parsed.lineItems) ? parsed.lineItems : [];
            setFormData(restoredFormData);
            setLineItems(restoredLineItems);
            baseline = { formData: restoredFormData, lineItems: restoredLineItems };
            setDraftMessage('Brouillon restauré automatiquement.');
          } catch (error) {
            console.error('Error restoring invoice draft:', error);
            setFormData(baseData);
            baseline = { formData: baseData, lineItems: [] };
          }
        } else {
          setFormData(baseData);
          baseline = { formData: baseData, lineItems: [] };
        }
      }

      if (quoteIdParam) {
        const q = allQuotes.find(q => q.id === parseInt(quoteIdParam));
        if (q) {
          const quoteWithExtras = q as Quote & { discount_percent?: number; subject?: string };
          const importedLineItems = (q.line_items ?? []).map(item => toLineItemData(item as LineItemLike));
          const importedFormData = {
            ...baseline.formData,
            quote_id: q.id,
            customer_id: q.customer_id ?? baseline.formData.customer_id,
            project_id: q.project_id ?? baseline.formData.project_id,
            discount_percent: quoteWithExtras.discount_percent ?? baseline.formData.discount_percent,
            subject: quoteWithExtras.subject ?? baseline.formData.subject,
          };
          setFromQuote(true);
          setLineItems(importedLineItems);
          setFormData(importedFormData);
          baseline = { formData: importedFormData, lineItems: importedLineItems };
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      captureBaseline(baseline);
      setDataLoading(false);
      draftHydratedRef.current = true;
    }
  };

  useEffect(() => {
    if (!draftHydratedRef.current) return;

    const hasMeaningfulData = Boolean(
      formData.customer_id
      || (formData.subject || '').trim()
      || (formData.notes || '').trim()
      || lineItems.length > 0
    );

    if (!hasMeaningfulData) return;

    const timeout = setTimeout(() => {
      localStorage.setItem(INVOICE_DRAFT_KEY, JSON.stringify({ formData, lineItems, updatedAt: new Date().toISOString() }));
      setDraftMessage('Brouillon enregistré localement.');
    }, 500);

    return () => clearTimeout(timeout);
  }, [formData, lineItems]);

  const importQuote = (quote: Quote) => {
    const quoteWithExtras = quote as Quote & { discount_percent?: number; subject?: string };
    setFromQuote(true);
    setLineItems((quote.line_items ?? []).map(item => toLineItemData(item as LineItemLike)));
    setFormData(prev => ({
      ...prev,
      quote_id: quote.id,
      customer_id: quote.customer_id ?? prev.customer_id,
      project_id: quote.project_id ?? prev.project_id,
      discount_percent: quoteWithExtras.discount_percent ?? prev.discount_percent,
      subject: quoteWithExtras.subject ?? prev.subject,
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
  const invoiceReadiness = [
    { label: 'Client sélectionné', done: Boolean(formData.customer_id), helper: 'Rattache la facture au bon client.' },
    { label: 'Objet renseigné', done: Boolean((formData.subject || '').trim()), helper: 'Clarifie le document et facilite la recherche.' },
    { label: 'Date d’échéance définie', done: Boolean(formData.due_date), helper: 'Indispensable pour le recouvrement et les relances.' },
    { label: 'Au moins une ligne chiffrée', done: lineItems.some((item) => !['section', 'text', 'page_break'].includes(item.item_type)), helper: 'La facture doit contenir un montant facturable.' },
    { label: 'Conditions de paiement', done: Boolean((formData.payment_terms || '').trim()), helper: 'Ex. à réception, 30 jours, acompte.' },
    { label: 'Paramètres PDF configurés', done: Boolean(companySettings?.logo_url || companySettings?.header_text || companySettings?.footer_text || companySettings?.iban), helper: 'Logo, entête, pied de page ou banque.' },
  ];

  const invoiceTemplates = [
    {
      label: 'Facture classique',
      description: 'Base standard pour une facturation nette, claire et rapide à envoyer.',
      bullets: ['Échéance 30 jours', 'Texte de règlement standard', 'Message client simple'],
      accent: 'blue' as const,
      onApply: () => setFormData(prev => ({
        ...prev,
        subject: prev.subject || 'Facture travaux réalisés',
        payment_terms: 'Paiement à 30 jours fin de mois.',
        notes: prev.notes || 'Merci pour votre confiance.',
      })),
    },
    {
      label: 'Facture de situation',
      description: 'Idéale pour l’avancement de chantier, appels de fonds et situations intermédiaires.',
      bullets: ['Situation chantier', 'Paiement à réception', 'Texte d’avancement'],
      accent: 'violet' as const,
      onApply: () => setFormData(prev => ({
        ...prev,
        subject: prev.subject || 'Facture de situation',
        payment_terms: 'Paiement à réception de facture.',
        notes: 'Facture correspondant à l’avancement du chantier selon situation validée.',
      })),
    },
    {
      label: 'Solde de chantier',
      description: 'Format de clôture avec message final et encaissement rapide du solde.',
      bullets: ['Solde final', 'Règlement à réception', 'Remerciement client'],
      accent: 'emerald' as const,
      onApply: () => setFormData(prev => ({
        ...prev,
        subject: prev.subject || 'Facture de solde de chantier',
        payment_terms: 'Solde payable à réception de facture.',
        notes: 'Nous vous remercions pour votre confiance et restons disponibles pour toute question.',
      })),
    },
  ];

  const fmt = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) {
      alert('Veuillez sélectionner un client.');
      return;
    }
    setLoading(true);
    try {
      const payload: InvoiceCreate = {
        ...formData,
        conditions: formData.terms_and_conditions,
        line_items: lineItems.map((item, i) => toInvoiceLineItem(item, i)),
      };
      const res = await invoiceService.create(payload);
      if (res.success && res.data) {
        localStorage.removeItem(INVOICE_DRAFT_KEY);
        captureBaseline({ formData, lineItems });
        router.push(buildDetailPath('invoices', res.data.id));
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
      label: (c.name ?? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim())
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
            <div className="mt-2">
              <UnsavedChangesBadge isDirty={isDirty} />
            </div>
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

        <DocumentTemplatePicker
          title="Démarrer avec un modèle de facture"
          subtitle="Sélectionnez une base adaptée, puis complétez chaque étape avec les bons détails métier."
          templates={invoiceTemplates}
        />

        <PdfSettingsCard company={companySettings} documentLabel="facture" />
        <DocumentCompletionCard
          title="Complétude de la facture"
          subtitle="Vue synthétique avant création et envoi au client."
          items={invoiceReadiness}
        />

        {/* Preview tab */}
        {tab === 'preview' && (() => {
          const previewCustomer = customers.find(c => c.id === formData.customer_id);
          const previewData: InvoicePreviewData = {
            invoiceDate: formData.invoice_date,
            dueDate: formData.due_date,
            purchaseOrder: formData.purchase_order,
            description: formData.subject ?? '',
            notes: formData.notes ?? '',
            conditions: formData.terms_and_conditions,
            bankDetails: formData.bank_details,
            discountPercent: formData.discount_percent,
            lineItems,
            company,
            customer: previewCustomer
              ? ({ id: previewCustomer.id, name: previewCustomer.name ?? `${previewCustomer.firstName ?? ''} ${previewCustomer.lastName ?? ''}`.trim(), contactName: previewCustomer.contactName, email: previewCustomer.email, phone: previewCustomer.phone, vat: previewCustomer.vat, siret: previewCustomer.siret } as InvoiceCustomer)
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
            <CardHeader><CardTitle>Source</CardTitle>
              <p className="text-sm text-slate-500">Étape 1 · importez un devis existant ou démarrez une facture totalement manuelle.</p>
            </CardHeader>
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
            <CardHeader><CardTitle>Client et projet</CardTitle>
              <p className="text-sm text-slate-500">Étape 2 · confirmez le client facturé et le projet concerné.</p>
            </CardHeader>
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
            <CardHeader><CardTitle>Détails</CardTitle>
              <p className="text-sm text-slate-500">Étape 3 · définissez l’objet, la date d’émission et l’échéance client.</p>
            </CardHeader>
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
                value={formData.invoice_date ?? today}
                onChange={handleChange}
              />
              <Input
                label="Date d'échéance"
                name="due_date"
                type="date"
                value={formData.due_date ?? thirtyDays}
                onChange={handleChange}
              />
            </CardContent>
              <CardContent className="pt-0">
                <PresetChips
                  label="Délais rapides"
                  options={[
                    { label: '15 jours', onClick: () => setFormData(prev => ({ ...prev, due_date: new Date(new Date(prev.invoice_date || today).getTime() + 15 * 24 * 3600 * 1000).toISOString().split('T')[0] })), active: Boolean(formData.invoice_date && formData.due_date === new Date(new Date(formData.invoice_date).getTime() + 15 * 24 * 3600 * 1000).toISOString().split('T')[0]) },
                    { label: '30 jours', onClick: () => setFormData(prev => ({ ...prev, due_date: new Date(new Date(prev.invoice_date || today).getTime() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0] })), active: Boolean(formData.invoice_date && formData.due_date === new Date(new Date(formData.invoice_date).getTime() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]) },
                    { label: '45 jours', onClick: () => setFormData(prev => ({ ...prev, due_date: new Date(new Date(prev.invoice_date || today).getTime() + 45 * 24 * 3600 * 1000).toISOString().split('T')[0] })), active: Boolean(formData.invoice_date && formData.due_date === new Date(new Date(formData.invoice_date).getTime() + 45 * 24 * 3600 * 1000).toISOString().split('T')[0]) },
                  ]}
                />
              </CardContent>
          </Card>

          {/* Line items */}
          <Card>
            <CardHeader><CardTitle>Lignes de facturation</CardTitle>
              <p className="text-sm text-slate-500">Étape 4 · ajustez précisément les postes, quantités, unités, remises et TVA.</p>
            </CardHeader>
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
            <CardHeader><CardTitle>Notes et conditions</CardTitle>
              <p className="text-sm text-slate-500">Étape 5 · finalisez le message client, les conditions générales et les modalités de paiement.</p>
            </CardHeader>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conditions de paiement</label>
                <textarea
                  name="payment_terms"
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.payment_terms ?? ''}
                  onChange={handleChange}
                  placeholder="Ex : Paiement à 30 jours fin de mois"
                />
              </div>
              <PresetChips
                label="Formules rapides"
                options={[
                  { label: 'À réception', onClick: () => setFormData(prev => ({ ...prev, payment_terms: 'Paiement à réception de facture.' })), active: formData.payment_terms === 'Paiement à réception de facture.' },
                  { label: '30 jours', onClick: () => setFormData(prev => ({ ...prev, payment_terms: 'Paiement à 30 jours fin de mois.' })), active: formData.payment_terms === 'Paiement à 30 jours fin de mois.' },
                  { label: 'Virement SEPA', onClick: () => setFormData(prev => ({ ...prev, payment_terms: 'Paiement par virement SEPA.' })), active: formData.payment_terms === 'Paiement par virement SEPA.' },
                ]}
              />
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Les coordonnées bancaires et le pied de page sont repris depuis les paramètres PDF pour éviter toute double saisie.
              </div>
              
            </CardContent>
          </Card>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">Brouillon local</p>
                <p className="mt-1 text-xs text-slate-500">La facture en cours est sauvegardée localement pendant toute la saisie.</p>
              </div>
              <button type="button" onClick={clearDraft} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                Vider le brouillon
              </button>
            </div>
            {draftMessage && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">{draftMessage}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pb-6">
            <Button type="button" variant="outline" onClick={() => { if (confirmIfDirty()) router.push('/invoices'); }}>
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

export default function NewInvoicePage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </MainLayout>
      }
    >
      <NewInvoicePageContent />
    </Suspense>
  );
}
