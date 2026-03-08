'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select } from '@/components/ui';
import { PdfSettingsCard } from '@/components/documents/PdfSettingsCard';
import { invoiceService, customerService, projectService, settingsService } from '@/services/api';
import { Customer, InvoiceCreate, LineItem, LineItemType, Project } from '@/types';
import { LineItemsEditor, LineItemData } from '@/components/quotes/LineItemsEditor';
import InvoicePreview, { InvoicePreviewData, InvoiceCustomer, InvoiceCompany } from '@/components/invoices/InvoicePreview';
import { CompanySettingsData, getDocumentDefaultsFromCompany } from '@/lib/company-settings';
import { buildDetailPath } from '@/lib/routes';

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettingsData | null>(null);
  const [invoiceCompany, setInvoiceCompany] = useState<InvoiceCompany | null>(null);
  const [invoiceRef, setInvoiceRef] = useState<string | undefined>();

  const [lineItems, setLineItems] = useState<LineItemData[]>([]);

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

        setFormData({
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
        });

        const rawItems = inv.lineItems ?? inv.line_items ?? [];
        setLineItems(rawItems.map(toLineItemData));
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
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => { loadData(); }, [loadData]);

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
    company: invoiceCompany,
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
              <CardHeader><CardTitle>Client et projet</CardTitle></CardHeader>
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

            {/* ── Dates & Référence commande ────────────────────────── */}
            <Card>
              <CardHeader><CardTitle>Dates et références</CardTitle></CardHeader>
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
              </CardContent>
            </Card>

            {/* ── Lignes ──────────────────────────────────────────────── */}
            <Card>
              <CardHeader><CardTitle>Lignes de facturation</CardTitle></CardHeader>
              <CardContent>
                <LineItemsEditor items={lineItems} onChange={setLineItems} />
              </CardContent>
            </Card>

            {/* ── Totaux ──────────────────────────────────────────────── */}
            <Card>
              <CardHeader><CardTitle>Récapitulatif</CardTitle></CardHeader>
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
              <CardHeader><CardTitle>Informations de paiement</CardTitle></CardHeader>
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
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Les coordonnées bancaires, le pied de page et les mentions légales proviennent des paramètres PDF.
                  Laissez-les centralisés pour garder des factures cohérentes et rapides à produire.
                </div>
              </CardContent>
            </Card>

            {/* ── Notes & Conditions ──────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle>Notes et conditions légales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (visibles sur la facture)</label>
                  <textarea
                    name="notes"
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.notes}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conditions & mentions légales obligatoires
                    <span className="ml-2 text-xs font-normal text-blue-600">(pénalités de retard, escompte, etc.)</span>
                  </label>
                  <textarea
                    name="conditions"
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.conditions}
                    onChange={handleChange}
                    placeholder="En cas de retard de paiement, des pénalités au taux de 3 fois le taux légal seront appliquées, ainsi qu'une indemnité forfaitaire de recouvrement de 40 €. Aucun escompte pour paiement anticipé."
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── Actions ──────────────────────────────────────────────── */}
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(buildDetailPath('invoices', invoiceId))}
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