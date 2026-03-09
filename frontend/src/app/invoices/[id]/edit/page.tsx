'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select } from '@/components/ui';
import { DocumentCompletionCard } from '@/components/documents/DocumentCompletionCard';
import { PdfSettingsCard } from '@/components/documents/PdfSettingsCard';
import { PresetChips } from '@/components/documents/PresetChips';
import { UnsavedChangesBadge } from '@/components/documents/UnsavedChangesBadge';
import { invoiceService, customerService, projectService, settingsService } from '@/services/api';
import { Customer, InvoiceCreate, LineItem, LineItemType, Project } from '@/types';
import { LineItemsEditor, LineItemData } from '@/components/quotes/LineItemsEditor';
import InvoicePreview, { InvoicePreviewData, InvoiceCustomer, InvoiceCompany } from '@/components/invoices/InvoicePreview';
import { CompanySettingsData, getDocumentDefaultsFromCompany } from '@/lib/company-settings';
import { buildDetailPath } from '@/lib/routes';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

type ApiListResponse<T> = { data?: T[]; items?: T[] };

type LineItemLike = Partial<LineItemData> & {
  designation?: string;
  description?: string;
  tax_rate?: number;
};

type InvoiceLike = {
  reference?: string;
  company?: InvoiceCompany | null;
  customer_id?: number;
  customerId?: number;
  project_id?: number;
  projectId?: number;
  description?: string;
  invoiceDate?: string;
  invoice_date?: string;
  dueDate?: string;
  due_date?: string;
  notes?: string;
  paymentTerms?: string;
  payment_terms?: string;
  bankDetails?: string;
  bank_details?: string;
  purchaseOrder?: string;
  purchase_order?: string;
  conditions?: string;
  terms_and_conditions?: string;
  lineItems?: LineItemLike[];
  line_items?: LineItemLike[];
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

const toPayload = (item: LineItemData): LineItem => ({
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
});

const customerDisplayName = (c: Customer) =>
  c.name ?? (`${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || `Client #${c.id}`);

/* ─── Main Page ─────────────────────────────────────────────────────────── */

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = parseInt(params.id as string);
  const draftHydratedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettingsData | null>(null);
  const [invoiceCompany, setInvoiceCompany] = useState<InvoiceCompany | null>(null);
  const [invoiceRef, setInvoiceRef] = useState<string | undefined>();
  const [draftMessage, setDraftMessage] = useState('');

  const [lineItems, setLineItems] = useState<LineItemData[]>([]);
  const INVOICE_EDIT_DRAFT_KEY = `blackbox.invoice.edit.draft.${invoiceId}.v1`;

  const [formData, setFormData] = useState({
    customer_id: 0,
    project_id: undefined as number | undefined,
    description: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: '',
    payment_terms: '',
    bank_details: '',
    purchase_order: '',
    conditions: '',
    discount_percent: 0,
  });
  const { isDirty, captureBaseline, confirmIfDirty } = useUnsavedChanges({ formData, lineItems });

  const clearDraft = () => {
    localStorage.removeItem(INVOICE_EDIT_DRAFT_KEY);
    setDraftMessage('Brouillon local supprimé.');
  };

  /* ── Load data ─────────────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    try {
      const [invoiceRes, customersRes, projectsRes, settingsRes] = await Promise.all([
        invoiceService.getById(invoiceId),
        customerService.getAll(),
        projectService.getAll(),
        settingsService.getCompany(),
      ]);

      const companyDefaults = settingsRes.success && settingsRes.data
        ? getDocumentDefaultsFromCompany(settingsRes.data as CompanySettingsData)
        : { conditions: '', paymentTerms: '', bankDetails: '', legalMentions: '', footerNotes: '' };

      if (settingsRes.success && settingsRes.data) {
        setCompanySettings(settingsRes.data as CompanySettingsData);
      }

      if (invoiceRes.success && invoiceRes.data) {
        const inv = invoiceRes.data as InvoiceLike;
        setInvoiceRef(inv.reference);
        setInvoiceCompany(inv.company ?? null);

        const loadedFormData = {
          customer_id: inv.customer_id ?? inv.customerId ?? 0,
          project_id: inv.project_id ?? inv.projectId ?? undefined,
          description: inv.description ?? '',
          invoice_date: inv.invoiceDate ? inv.invoiceDate.slice(0, 10) : inv.invoice_date?.slice(0, 10) ?? new Date().toISOString().split('T')[0],
          due_date: inv.dueDate ? inv.dueDate.slice(0, 10) : inv.due_date?.slice(0, 10) ?? '',
          notes: inv.notes ?? '',
          payment_terms: inv.paymentTerms ?? inv.payment_terms ?? companyDefaults.paymentTerms,
          bank_details: inv.bankDetails ?? inv.bank_details ?? companyDefaults.bankDetails,
          purchase_order: inv.purchaseOrder ?? inv.purchase_order ?? '',
          conditions: inv.conditions ?? inv.terms_and_conditions ?? companyDefaults.conditions,
          discount_percent: 0,
        };

        const rawItems = inv.lineItems ?? inv.line_items ?? [];
        const loadedItems = rawItems.map(toLineItemData);

        const savedDraft = localStorage.getItem(INVOICE_EDIT_DRAFT_KEY);
        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft) as {
              formData?: typeof loadedFormData;
              lineItems?: LineItemData[];
            };
            const restoredFormData = { ...loadedFormData, ...(parsed.formData || {}) };
            const restoredLineItems = Array.isArray(parsed.lineItems) ? parsed.lineItems : loadedItems;
            setFormData(restoredFormData);
            setLineItems(restoredLineItems);
            captureBaseline({ formData: restoredFormData, lineItems: restoredLineItems });
            setDraftMessage('Brouillon local restauré automatiquement.');
          } catch (error) {
            console.error('Error restoring invoice edit draft:', error);
            setFormData(loadedFormData);
            setLineItems(loadedItems);
            captureBaseline({ formData: loadedFormData, lineItems: loadedItems });
          }
        } else {
          setFormData(loadedFormData);
          setLineItems(loadedItems);
          captureBaseline({ formData: loadedFormData, lineItems: loadedItems });
        }
      }

      if (customersRes.success) {
        const list = getListData<Customer>(customersRes as ApiListResponse<Customer>);
        setCustomers(list.flat());
      }
      if (projectsRes.success) {
        const list = getListData<Project>(projectsRes as ApiListResponse<Project>);
        setProjects(list.flat());
      }
    } catch (err) {
      console.error('Error loading invoice:', err);
      setError('Impossible de charger la facture.');
    } finally {
      draftHydratedRef.current = true;
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!draftHydratedRef.current) return;

    const hasMeaningfulData = Boolean(
      formData.customer_id
      || (formData.description || '').trim()
      || (formData.notes || '').trim()
      || lineItems.length > 0
    );

    if (!hasMeaningfulData) return;

    const timeout = setTimeout(() => {
      localStorage.setItem(
        INVOICE_EDIT_DRAFT_KEY,
        JSON.stringify({
          formData,
          lineItems,
          updatedAt: new Date().toISOString(),
        }),
      );
      setDraftMessage('Brouillon local enregistré.');
    }, 500);

    return () => clearTimeout(timeout);
  }, [INVOICE_EDIT_DRAFT_KEY, formData, lineItems]);

  /* ── Handlers ──────────────────────────────────────────────────────── */
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

  /* ── Totals ────────────────────────────────────────────────────────── */
  const STRUCT = ['section', 'text', 'page_break'];
  const billable = lineItems.filter(i => !STRUCT.includes(i.item_type));
  const rawHt = billable.reduce((s, i) => {
    const base = i.quantity * i.unit_price;
    return s + base - (i.discount_percent ? base * i.discount_percent / 100 : 0);
  }, 0);
  const discountAmt = (rawHt * (formData.discount_percent || 0)) / 100;
  const totalHt = rawHt - discountAmt;
  const totalTva = billable.reduce((s, i) => {
    const base = i.quantity * i.unit_price;
    const lineHt = (base - (i.discount_percent ? base * i.discount_percent / 100 : 0)) * (rawHt > 0 ? totalHt / rawHt : 1);
    return s + lineHt * i.vat_rate / 100;
  }, 0);
  const totalTtc = totalHt + totalTva;
  const invoiceReadiness = [
    { label: 'Client sélectionné', done: Boolean(formData.customer_id), helper: 'La facture reste rattachée au bon client.' },
    { label: 'Objet renseigné', done: Boolean((formData.description || '').trim()), helper: 'Visible dans la liste et sur le PDF.' },
    { label: 'Date d’échéance définie', done: Boolean(formData.due_date), helper: 'Nécessaire pour le suivi d’échéance.' },
    { label: 'Au moins une ligne chiffrée', done: billable.length > 0, helper: 'Conservez au moins une ligne facturable.' },
    { label: 'Conditions de paiement', done: Boolean((formData.payment_terms || '').trim()), helper: 'Délais ou modalité claire pour le client.' },
    { label: 'Paramètres PDF configurés', done: Boolean(companySettings?.logo_url || companySettings?.header_text || companySettings?.footer_text || companySettings?.iban), helper: 'Logo, entête, pied de page ou banque.' },
  ];
  const fmt = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  /* ── Submit ────────────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.customer_id) {
      setError('Veuillez sélectionner un client.');
      return;
    }

    setSaving(true);
    try {
      const payload: InvoiceCreate = {
        customer_id: formData.customer_id,
        project_id: formData.project_id || undefined,
        description: formData.description || undefined,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        notes: formData.notes || undefined,
        payment_terms: formData.payment_terms || undefined,
        bank_details: formData.bank_details || undefined,
        purchase_order: formData.purchase_order || undefined,
        conditions: formData.conditions || undefined,
        line_items: lineItems.map(toPayload),
      };
      const res = await invoiceService.update(invoiceId, payload);

      if (res.success) {
        localStorage.removeItem(INVOICE_EDIT_DRAFT_KEY);
        captureBaseline({ formData, lineItems });
        router.push(buildDetailPath('invoices', invoiceId));
      } else {
        setError('Erreur lors de la sauvegarde.');
      }
    } catch (err: unknown) {
      const detail =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setError(detail || 'Erreur lors de la sauvegarde.');
      console.error('Error updating invoice:', err);
    } finally {
      setSaving(false);
    }
  };

  /* ── Build preview data ────────────────────────────────────────────── */
  const previewCustomer = customers.find(c => c.id === formData.customer_id);
  const previewData: InvoicePreviewData = {
    reference: invoiceRef,
    invoiceDate: formData.invoice_date,
    dueDate: formData.due_date,
    purchaseOrder: formData.purchase_order,
    description: formData.description,
    notes: formData.notes,
    conditions: formData.conditions,
    bankDetails: formData.bank_details,
    discountPercent: formData.discount_percent,
    lineItems,
    // Merge the invoice's stored company snapshot with the current PDF settings
    // so headerText / footerText (configured in settings) are always reflected.
    company: {
      ...(invoiceCompany ?? {}),
      headerText: companySettings?.header_text ?? undefined,
      footerText: companySettings?.footer_text ?? undefined,
      logoUrl: invoiceCompany?.logoUrl ?? companySettings?.logo_url ?? undefined,
    } as InvoiceCompany,
    customer: previewCustomer
      ? ({
          id: previewCustomer.id,
          name: customerDisplayName(previewCustomer),
          contactName: previewCustomer.contactName,
          email: previewCustomer.email,
          phone: previewCustomer.phone,
          vat: previewCustomer.vat,
          siret: previewCustomer.siret,
        } as InvoiceCustomer)
      : null,
  };

  /* ── Select options ────────────────────────────────────────────────── */
  const customerOptions = [
    { value: '', label: 'Sélectionner un client' },
    ...customers.map(c => ({ value: String(c.id), label: customerDisplayName(c) })),
  ];
  const projectOptions = [
    { value: '', label: 'Aucun projet' },
    ...projects.map(p => ({ value: String(p.id), label: p.name })),
  ];

  /* ── Render ────────────────────────────────────────────────────────── */
  if (loading) {
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
      <div className="max-w-5xl mx-auto space-y-4">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Modifier la facture {invoiceRef ? `· ${invoiceRef}` : ''}
            </h1>
            <p className="text-sm text-gray-500">Facture conforme aux exigences légales françaises</p>
            <div className="mt-2">
              <UnsavedChangesBadge isDirty={isDirty} />
            </div>
          </div>
          {/* Tab toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setTab('edit')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === 'edit' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              ✏️ Édition
            </button>
            <button
              type="button"
              onClick={() => setTab('preview')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${
                tab === 'preview' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              👁 Aperçu
            </button>
          </div>
        </div>

        <PdfSettingsCard company={companySettings} documentLabel="facture" />
        <DocumentCompletionCard
          title="Complétude de la facture"
          subtitle="Contrôle rapide avant sauvegarde ou impression."
          items={invoiceReadiness}
        />

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ════ PREVIEW TAB ════════════════════════════════════════════ */}
        {tab === 'preview' && (
          <div>
            <div className="flex justify-end mb-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const el = document.getElementById('invoice-preview');
                  if (el) {
                    const win = window.open('', '_blank');
                    if (win) {
                      win.document.write(`<html><head><title>Facture ${invoiceRef ?? ''}</title>
                        <style>
                          @page { size: A4; margin: 15mm; }
                          body { font-family: Arial, sans-serif; font-size: 11px; color: #111; }
                          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                        </style>
                      </head><body>`);
                      win.document.write(el.outerHTML);
                      win.document.write('</body></html>');
                      win.document.close();
                      win.print();
                    }
                  }
                }}
              >
                🖨️ Imprimer / PDF
              </Button>
            </div>
            <div className="overflow-auto bg-gray-200 p-4 rounded-lg" style={{ maxHeight: '80vh' }}>
              <InvoicePreview data={previewData} />
            </div>
          </div>
        )}

        {/* ════ EDIT TAB ══════════════════════════════════════════════ */}
        {tab === 'edit' && (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── Client & Projet ──────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle>Client et projet</CardTitle>
                <p className="text-sm text-slate-500">Étape 1 · vérifiez le client facturé et le projet rattaché.</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Client *"
                    name="customer_id"
                    options={customerOptions}
                    value={formData.customer_id ? String(formData.customer_id) : ''}
                    onChange={handleChange}
                  />
                  <Select
                    label="Projet"
                    name="project_id"
                    options={projectOptions}
                    value={formData.project_id ? String(formData.project_id) : ''}
                    onChange={handleChange}
                  />
                </div>
                <div className="mt-4">
                  <Input
                    label="Objet / Intitulé de la facture"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Ex : Travaux de rénovation salle de bain..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dates et références</CardTitle>
                <p className="text-sm text-slate-500">Étape 2 · contrôlez l’émission, l’échéance et les références client.</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="Date d'émission *"
                    name="invoice_date"
                    type="date"
                    value={formData.invoice_date}
                    onChange={handleChange}
                  />
                  <Input
                    label="Date d'échéance *"
                    name="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={handleChange}
                  />
                  <Input
                    label="N° bon de commande client"
                    name="purchase_order"
                    value={formData.purchase_order}
                    onChange={handleChange}
                    placeholder="Réf. client (si fourni)"
                  />
                </div>
                <div className="mt-4">
                  <PresetChips
                    label="Délais rapides"
                    options={[
                      { label: '15 jours', onClick: () => setFormData(prev => ({ ...prev, due_date: new Date(new Date(prev.invoice_date).getTime() + 15 * 24 * 3600 * 1000).toISOString().split('T')[0] })), active: Boolean(formData.invoice_date && formData.due_date === new Date(new Date(formData.invoice_date).getTime() + 15 * 24 * 3600 * 1000).toISOString().split('T')[0]) },
                      { label: '30 jours', onClick: () => setFormData(prev => ({ ...prev, due_date: new Date(new Date(prev.invoice_date).getTime() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0] })), active: Boolean(formData.invoice_date && formData.due_date === new Date(new Date(formData.invoice_date).getTime() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]) },
                      { label: '45 jours', onClick: () => setFormData(prev => ({ ...prev, due_date: new Date(new Date(prev.invoice_date).getTime() + 45 * 24 * 3600 * 1000).toISOString().split('T')[0] })), active: Boolean(formData.invoice_date && formData.due_date === new Date(new Date(formData.invoice_date).getTime() + 45 * 24 * 3600 * 1000).toISOString().split('T')[0]) },
                    ]}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Lignes de facturation</CardTitle>
                <p className="text-sm text-slate-500">Étape 3 · ajustez chaque ligne, quantité, remise et TVA avec précision.</p>
              </CardHeader>
              <CardContent>
                <LineItemsEditor items={lineItems} onChange={setLineItems} />
              </CardContent>
            </Card>

            {/* ── Totaux ──────────────────────────────────────────────── */}
            <Card>
              <CardHeader><CardTitle>Récapitulatif</CardTitle>
                <p className="text-sm text-slate-500">Étape 4 · validez le HT, la remise, la TVA et le TTC avant sauvegarde.</p>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 items-start">
                  <div className="w-40">
                    <Input
                      label="Remise globale (%)"
                      name="discount_percent"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.discount_percent || ''}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total HT brut</span>
                      <span>{fmt(rawHt)}</span>
                    </div>
                    {discountAmt > 0 && (
                      <div className="flex justify-between text-green-700">
                        <span>Remise {formData.discount_percent}%</span>
                        <span>- {fmt(discountAmt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium">
                      <span>Total HT net</span>
                      <span>{fmt(totalHt)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>TVA</span>
                      <span>{fmt(totalTva)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold border-t pt-1 mt-1">
                      <span>Total TTC</span>
                      <span>{fmt(totalTtc)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Informations de paiement ─────────────────────────── */}
            <Card>
              <CardHeader><CardTitle>Informations de paiement</CardTitle>
                <p className="text-sm text-slate-500">Étape 5 · précisez le règlement attendu sans doubler les données PDF globales.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modalités de paiement
                  </label>
                  <textarea
                    name="payment_terms"
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.payment_terms}
                    onChange={handleChange}
                    placeholder="Ex : Paiement à 30 jours fin de mois..."
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
                  Les coordonnées bancaires, le pied de page et les mentions légales proviennent des paramètres PDF.
                  Laissez-les centralisés pour garder des factures cohérentes et rapides à produire.
                </div>
              </CardContent>
            </Card>

            {/* ── Notes & Conditions ──────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
                <p className="text-sm text-slate-500">Étape 6 · ajoutez une note personnalisée visible sur la facture.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (visibles sur la facture)</label>
                  <textarea
                    name="notes"
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Informations complémentaires à destination du client..."
                  />
                </div>

                {/* Conditions légales – collapsible since auto-filled from settings */}
                <details className="group rounded-xl border border-slate-200 bg-slate-50">
                  <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 select-none list-none">
                    <span className="flex items-center gap-2">
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500">i</span>
                      Conditions &amp; mentions légales obligatoires
                      <span className="text-xs font-normal text-slate-400">(pénalités de retard, escompte…)</span>
                    </span>
                    <span className="text-slate-400 transition group-open:rotate-180">▾</span>
                  </summary>
                  <div className="border-t border-slate-200 px-4 pb-4 pt-3">
                    <p className="mb-2 text-xs text-slate-500">
                      Ces mentions sont pré-remplies depuis vos{' '}
                      <a href="/settings?tab=documents&doc=cgv" className="font-medium text-blue-600 hover:underline">
                        paramètres PDF
                      </a>
                      . Modifiez-les ici uniquement pour cette facture.
                    </p>
                    <textarea
                      name="conditions"
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.conditions}
                      onChange={handleChange}
                      placeholder="En cas de retard de paiement, des pénalités au taux de 3 fois le taux légal seront appliquées, ainsi qu'une indemnité forfaitaire de recouvrement de 40 €. Aucun escompte pour paiement anticipé."
                    />
                  </div>
                </details>
              </CardContent>
            </Card>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">Brouillon local de modification</p>
                  <p className="mt-1 text-xs text-slate-500">Les changements de cette facture sont enregistrés localement pendant l’édition.</p>
                </div>
                <button
                  type="button"
                  onClick={clearDraft}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  Vider le brouillon
                </button>
              </div>
              {draftMessage && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">{draftMessage}</p>}
            </div>

            {/* ── Actions ──────────────────────────────────────────────── */}
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => { if (confirmIfDirty()) router.push(buildDetailPath('invoices', invoiceId)); }}
              >
                Annuler
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTab('preview')}
                >
                  👁 Aperçu avant enregistrement
                </Button>
                <Button type="submit" loading={saving}>
                  💾 Enregistrer
                </Button>
              </div>
            </div>

          </form>
        )}
      </div>
    </MainLayout>
  );
}