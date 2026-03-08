'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select } from '@/components/ui';
import { PdfSettingsCard } from '@/components/documents/PdfSettingsCard';
import { quoteService, customerService, projectService, settingsService } from '@/services/api';
import { QuoteCreate, Customer, Project, LineItem, LineItemType } from '@/types';
import { LineItemsEditor, LineItemData } from '@/components/quotes/LineItemsEditor';
import {
  CompanySettingsData,
  getDocumentDefaultsFromCompany,
} from '@/lib/company-settings';
import { buildDetailPath } from '@/lib/routes';

type QuoteLineLike = LineItemData & {
  designation?: string;
};

type QuoteLike = QuoteCreate & {
  customerId?: number;
  projectId?: number;
  lineItems?: QuoteLineLike[];
  expiry_date?: string;
  expiryDate?: string;
  quote_date?: string;
  quoteDate?: string;
  deposit_percentage?: number;
  global_discount_percent?: number;
  ceePremium?: number;
  mprPremium?: number;
  waste_management?: number;
  worksiteAddress?: string;
  footerNotes?: string;
  bankDetails?: string;
  legalMentions?: string;
  paymentTerms?: string;
};

type QuoteByIdResponseLike = {
  quote?: QuoteLike;
  data?: QuoteLike;
};

const toLineItemType = (itemType?: LineItemData['item_type']): LineItemType => {
  if (itemType === 'supply' || itemType === 'labor' || itemType === 'other') {
    return itemType;
  }
  return 'other';
};

const toQuoteLineItem = (item: LineItemData): LineItem => ({
  designation: item.description,
  description: item.description,
  long_description: item.long_description,
  item_type: toLineItemType(item.item_type),
  quantity: item.quantity,
  unit: item.unit,
  unit_price: item.unit_price,
  vat_rate: item.vat_rate,
  discount_percent: item.discount_percent,
  section: item.section,
  reference: item.reference,
});

export default function EditQuotePage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettingsData | null>(null);
  
  const DEFAULT_CGV = '';

  const [formData, setFormData] = useState<QuoteCreate>({
    customer_id: 0,
    project_id: undefined,
    subject: '',
    description: '',
    notes: '',
    terms_and_conditions: DEFAULT_CGV,
    conditions: DEFAULT_CGV,
    payment_terms: '',
    validity_days: 30,
    deposit_percent: 0,
    discount_percent: 0,
    cee_premium: 0,
    mpr_premium: 0,
    waste_management_fee: 0,
    worksite_address: '',
    footer_notes: '',
    bank_details: '',
    legal_mentions: '',
    line_items: [],
  });

  const [items, setItems] = useState<LineItemData[]>([]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId]);

  const loadData = async () => {
    try {
      const [quoteRes, customersRes, projectsRes, settingsRes] = await Promise.all([
        quoteService.getById(quoteId),
        customerService.getAll(),
        projectService.getAll(),
        settingsService.getCompany(),
      ]);

      const defaults = settingsRes.success && settingsRes.data
        ? getDocumentDefaultsFromCompany(settingsRes.data as CompanySettingsData)
        : { conditions: DEFAULT_CGV, paymentTerms: '', bankDetails: '', legalMentions: '', footerNotes: '' };
      if (settingsRes.success && settingsRes.data) {
        setCompanySettings(settingsRes.data as CompanySettingsData);
      }
      
      const quoteData = (quoteRes as QuoteByIdResponseLike).quote ?? quoteRes.data;
      if (quoteRes.success && quoteData) {
        const q = quoteData as QuoteLike;
        const lineItems = q.line_items || q.lineItems || [];
        const normalizedLineItems: LineItem[] = lineItems.map((li) => ({
          designation: li.designation || li.description || '',
          description: li.description || li.designation || '',
          long_description: li.long_description,
          item_type: toLineItemType(li.item_type),
          quantity: li.quantity ?? 1,
          unit: li.unit || 'u',
          unit_price: li.unit_price ?? 0,
          vat_rate: li.vat_rate ?? 20,
          discount_percent: li.discount_percent,
          section: li.section,
          reference: li.reference,
        }));
        const expiryDate = q.expiry_date ?? q.expiryDate;
        const quoteDate = q.quote_date ?? q.quoteDate;
        const validityDays = expiryDate
          ? Math.ceil((new Date(expiryDate).getTime() - new Date(quoteDate ?? Date.now()).getTime()) / (1000 * 60 * 60 * 24))
          : 30;
        setFormData({
          customer_id: q.customer_id || q.customerId || 0,
          project_id: q.project_id || q.projectId,
          subject: q.subject || q.description || '',
          description: q.description || q.subject || '',
          notes: q.notes || '',
          terms_and_conditions: q.conditions || q.terms_and_conditions || defaults.conditions,
          conditions: q.conditions || q.terms_and_conditions || defaults.conditions,
          validity_days: validityDays,
          deposit_percent: q.deposit_percentage || q.deposit_percent || 0,
          discount_percent: q.global_discount_percent || q.discount_percent || 0,
          cee_premium: q.cee_premium || q.ceePremium || 0,
          mpr_premium: q.mpr_premium || q.mprPremium || 0,
          waste_management_fee: q.waste_management || q.waste_management_fee || 0,
          worksite_address: q.worksite_address || q.worksiteAddress || '',
          footer_notes: q.footer_notes || q.footerNotes || defaults.footerNotes,
          bank_details: q.bank_details || q.bankDetails || defaults.bankDetails,
          legal_mentions: q.legal_mentions || q.legalMentions || defaults.legalMentions,
          payment_terms: q.payment_terms || q.paymentTerms || defaults.paymentTerms,
          line_items: normalizedLineItems,
        });
        setItems(normalizedLineItems.map((li) => ({
          item_type: li.item_type,
          description: li.description || li.designation || '',
          long_description: li.long_description || '',
          quantity: li.quantity ?? 1,
          unit: li.unit || 'u',
          unit_price: li.unit_price ?? 0,
          vat_rate: li.vat_rate ?? 20,
          discount_percent: li.discount_percent ?? 0,
          section: li.section || '',
        })));
      }
      
      if (customersRes.success) {
        setCustomers(Array.isArray(customersRes.data) ? customersRes.data : []);
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

  const customerOptions = [
    { value: '', label: 'Sélectionner un client' },
    ...customers.map(c => ({ value: String(c.id), label: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || `Client #${c.id}` })),
  ];

  const projectOptions = [
    { value: '', label: 'Aucun projet' },
    ...projects.map(p => ({ value: String(p.id), label: p.name })),
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (['customer_id', 'project_id', 'validity_days'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value ? parseInt(value) : undefined }));
    } else if (['discount_percent', 'deposit_percent', 'deposit_amount'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value ? parseFloat(value) : 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const priceItems = items.filter(i => !['section', 'text', 'page_break'].includes(i.item_type));
  const totalHT = priceItems.reduce((sum, item) => sum + ((item.quantity ?? 1) * (item.unit_price ?? 0) * (1 - (item.discount_percent ?? 0) / 100)), 0);
  const discountAmount = (totalHT * (formData.discount_percent || 0)) / 100;
  const totalHTAfterDiscount = totalHT - discountAmount;
  const totalVAT = priceItems.reduce((sum, item) => {
    const ht = (item.quantity ?? 1) * (item.unit_price ?? 0) * (1 - (item.discount_percent ?? 0) / 100);
    return sum + (ht * (item.vat_rate ?? 20) / 100);
  }, 0);
  const totalTTC = totalHTAfterDiscount + totalVAT;
  const depositAmount = totalTTC * (formData.deposit_percent || 0) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await quoteService.update(quoteId, {
        ...formData,
        line_items: items.map(toQuoteLineItem),
      });
      if (response.success) {
        router.push(buildDetailPath('quotes', quoteId));
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

        <PdfSettingsCard company={companySettings} documentLabel="devis" />

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
              <CardTitle>Informations du devis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Objet du devis"
                name="subject"
                value={formData.subject || ''}
                onChange={handleChange}
                placeholder="Ex: Rénovation salle de bain..."
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Validité (jours)"
                  name="validity_days"
                  type="number"
                  value={formData.validity_days || ''}
                  onChange={handleChange}
                />
                <Input
                  label="Adresse du chantier"
                  name="worksite_address"
                  value={formData.worksite_address || ''}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Lignes du devis</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <LineItemsEditor items={items} onChange={setItems} />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Conditions commerciales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Prime CEE (€)"
                  name="cee_premium"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cee_premium || ''}
                  onChange={handleChange}
                />
                <Input
                  label="MaPrimeRénov' (€)"
                  name="mpr_premium"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.mpr_premium || ''}
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
              <CardTitle>Contenu visible sur le PDF</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (visibles sur le devis)</label>
                <textarea
                  name="notes"
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.notes || ''}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conditions générales</label>
                <textarea
                  name="terms_and_conditions"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.terms_and_conditions || ''}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conditions de paiement</label>
                <textarea
                  name="payment_terms"
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.payment_terms || ''}
                  onChange={handleChange}
                  placeholder="Ex : Chèque, espèces, virement bancaire"
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Le pied de page, les mentions légales et les coordonnées bancaires sont centralisés dans les paramètres PDF.
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(buildDetailPath('quotes', quoteId))}
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
