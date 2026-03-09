'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Modal } from '@/components/ui';
import { quoteService, customerService, projectService, settingsService } from '@/services/api';
import { QuoteCreate, Customer, Project, LineItem, LineItemType } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { LineItemsEditor, LineItemData } from '@/components/quotes/LineItemsEditor';
import { CustomerSelector } from '@/components/customers/CustomerSelector';
import { NewCustomerForm } from '@/components/customers/NewCustomerForm';
import {
  CompanySettingsData,
  getDocumentDefaultsFromCompany,
} from '@/lib/company-settings';
import { buildDetailPath } from '@/lib/routes';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import Link from 'next/link';

type QuoteLineLike = LineItemData & { designation?: string };
type QuoteLike = QuoteCreate & {
  customerId?: number; projectId?: number;
  lineItems?: QuoteLineLike[]; expiry_date?: string; expiryDate?: string;
  quote_date?: string; quoteDate?: string; deposit_percentage?: number;
  global_discount_percent?: number; ceePremium?: number; mprPremium?: number;
  waste_management?: number; worksiteAddress?: string; footerNotes?: string;
  bankDetails?: string; legalMentions?: string; paymentTerms?: string;
};
type QuoteByIdResponseLike = { quote?: QuoteLike; data?: QuoteLike };

const toLineItemType = (itemType?: LineItemData['item_type']): LineItemType => {
  if (itemType === 'supply' || itemType === 'labor' || itemType === 'other') return itemType;
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
  const draftHydratedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeTab, setActiveTab] = useState<'edition' | 'preview'>('edition');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettingsData | null>(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [quoteReference, setQuoteReference] = useState('');
  const [durationQty, setDurationQty] = useState('');
  const [durationUnit, setDurationUnit] = useState('Jour');

  const QUOTE_EDIT_DRAFT_KEY = `blackbox.quote.edit.draft.${quoteId}.v1`;

  const [formData, setFormData] = useState<QuoteCreate>({
    customer_id: 0,
    project_id: undefined,
    subject: '',
    description: '',
    notes: '',
    terms_and_conditions: '',
    conditions: '',
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
  const { confirmIfDirty, captureBaseline } = useUnsavedChanges({ formData, items });

  const clearDraft = () => {
    localStorage.removeItem(QUOTE_EDIT_DRAFT_KEY);
    setDraftMessage('Brouillon supprime.');
  };

  useEffect(() => { loadData(); }, [quoteId]);

  useEffect(() => {
    if (!formData.customer_id || items.length === 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { generatePdfPreview(); }, 1500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, items]);

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
        : { conditions: '', paymentTerms: '', bankDetails: '', legalMentions: '', footerNotes: '' };

      if (settingsRes.success && settingsRes.data) {
        setCompanySettings(settingsRes.data as CompanySettingsData);
      }

      const quoteData = (quoteRes as QuoteByIdResponseLike).quote ?? quoteRes.data;
      if (quoteRes.success && quoteData) {
        const q = quoteData as QuoteLike;
        const ref = (q as { reference?: string }).reference || (q as { number?: string }).number || '';
        setQuoteReference(ref);
        setShowDescription(Boolean((q.description || '').trim()));
        setShowDiscount((q.global_discount_percent || q.discount_percent || 0) > 0);

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

        const loadedFormData: QuoteCreate = {
          customer_id: q.customer_id || q.customerId || 0,
          project_id: q.project_id || q.projectId,
          subject: q.subject || '',
          description: q.description || '',
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
          estimated_duration: q.estimated_duration || '',
          work_start_date: q.work_start_date || '',
          line_items: normalizedLineItems,
        };

        const estDur = q.estimated_duration || '';
        if (estDur) {
          const match = estDur.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
          if (match) { setDurationQty(match[1]); setDurationUnit(match[2]); }
        }

        const loadedItems = normalizedLineItems.map((li) => ({
          item_type: li.item_type as LineItemData['item_type'],
          description: li.description || li.designation || '',
          long_description: li.long_description || '',
          quantity: li.quantity ?? 1,
          unit: li.unit || 'u',
          unit_price: li.unit_price ?? 0,
          vat_rate: li.vat_rate ?? 20,
          discount_percent: li.discount_percent ?? 0,
          section: li.section || '',
        }));

        const savedDraft = localStorage.getItem(QUOTE_EDIT_DRAFT_KEY);
        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft) as { formData?: QuoteCreate; items?: LineItemData[] };
            const restoredFormData = { ...loadedFormData, ...(parsed.formData || {}), line_items: loadedFormData.line_items };
            const restoredItems = Array.isArray(parsed.items) ? parsed.items : loadedItems;
            setFormData(restoredFormData);
            setItems(restoredItems);
            captureBaseline({ formData: restoredFormData, items: restoredItems });
            setDraftMessage('Brouillon restaure.');
          } catch {
            setFormData(loadedFormData);
            setItems(loadedItems);
            captureBaseline({ formData: loadedFormData, items: loadedItems });
          }
        } else {
          setFormData(loadedFormData);
          setItems(loadedItems);
          captureBaseline({ formData: loadedFormData, items: loadedItems });
        }
      }

      if (customersRes.success) setCustomers(Array.isArray(customersRes.data) ? customersRes.data : []);
      if (projectsRes.success) setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      draftHydratedRef.current = true;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!draftHydratedRef.current) return;
    const hasMeaningfulData = Boolean(formData.customer_id || (formData.subject || '').trim() || items.length > 0);
    if (!hasMeaningfulData) return;
    const timeout = setTimeout(() => {
      localStorage.setItem(QUOTE_EDIT_DRAFT_KEY, JSON.stringify({ formData, items, updatedAt: new Date().toISOString() }));
      setDraftMessage('Brouillon enregistre.');
    }, 500);
    return () => clearTimeout(timeout);
  }, [QUOTE_EDIT_DRAFT_KEY, formData, items]);

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

  const calculateTotals = () => {
    let totalHT = 0; let totalTVA = 0;
    const tvaByRate: Record<number, number> = {};
    items.forEach((item: LineItemData) => {
      if (['section', 'text', 'page_break'].includes(item.item_type)) return;
      const qty = item.quantity ?? 1; const pu = item.unit_price ?? 0; const disc = item.discount_percent ?? 0;
      const ht = qty * pu * (1 - disc / 100); const tva = ht * (item.vat_rate ?? 20) / 100;
      totalHT += ht; totalTVA += tva;
      tvaByRate[item.vat_rate ?? 20] = (tvaByRate[item.vat_rate ?? 20] || 0) + tva;
    });
    const discount = (totalHT * (formData.discount_percent || 0)) / 100;
    const finalHT = totalHT - discount;
    const waste = formData.waste_management_fee || 0;
    const finalTTC = finalHT + totalTVA + waste;
    const premiums = (formData.cee_premium || 0) + (formData.mpr_premium || 0);
    const finalNet = finalTTC - premiums;
    const deposit = (finalNet * (formData.deposit_percent || 0)) / 100;
    return { totalHT, totalTVA, tvaByRate, discount, finalHT, waste, finalTTC, premiums, finalNet, deposit };
  };

  const generatePdfPreview = async () => {
    if (!formData.customer_id || items.length === 0) { setPdfUrl(null); return; }
    setPdfLoading(true);
    try {
      const payload: QuoteCreate = {
        ...formData,
        line_items: items.map(toQuoteLineItem),
        work_start_date: formData.work_start_date || undefined,
        cee_premium: (formData.cee_premium && formData.cee_premium > 0) ? formData.cee_premium : undefined,
        mpr_premium: (formData.mpr_premium && formData.mpr_premium > 0) ? formData.mpr_premium : undefined,
        waste_management_fee: (formData.waste_management_fee && formData.waste_management_fee > 0) ? formData.waste_management_fee : undefined,
      };
      const response = await quoteService.generatePreviewPdf(payload);
      if (response.success && response.data) setPdfUrl(response.data);
    } catch (error) { console.error('Error generating PDF:', error); }
    finally { setPdfLoading(false); }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const response = await quoteService.update(quoteId, {
        ...formData,
        line_items: items.map(toQuoteLineItem),
      });
      if (response.success) {
        localStorage.removeItem(QUOTE_EDIT_DRAFT_KEY);
        captureBaseline({ formData, items });
        router.push(buildDetailPath('quotes', quoteId));
      }
    } catch (error) {
      console.error('Error updating quote:', error);
    } finally {
      setSaving(false);
    }
  };

  const projectOptions = [
    { value: '', label: 'Selectionner un chantier' },
    ...projects.map(p => ({ value: String(p.id), label: p.name })),
  ];

  const totals = calculateTotals();
  const bankLine = companySettings?.iban
    ? `IBAN ${companySettings.iban}${companySettings.bic ? `\nBIC ${companySettings.bic}` : ''}`
    : formData.bank_details || '';

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Chargement du devis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">

      {/* ─── TOP BAR ──────────────────────────────────────────────────── */}
      <div className="flex-none bg-white border-b border-gray-200 z-40">
        <div className="flex items-center h-14 px-4 gap-2">

          {/* Back + title */}
          <button
            type="button"
            onClick={() => { if (confirmIfDirty()) router.push(buildDetailPath('quotes', quoteId)); }}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900 mr-2 shrink-0"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {quoteReference ? `Devis n° ${quoteReference}` : 'Modifier le devis'}
          </button>

          {/* Tabs */}
          <div className="flex flex-1">
            <button
              type="button"
              onClick={() => setActiveTab('edition')}
              className={`flex items-center gap-1.5 px-4 h-14 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'edition' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edition
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('preview'); generatePdfPreview(); }}
              className={`flex items-center gap-1.5 px-4 h-14 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'preview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Previsualisation
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {draftMessage && <span className="text-xs text-gray-400 hidden md:block">{draftMessage}</span>}
            <button
              type="button"
              onClick={() => { if (confirmIfDirty()) router.push(buildDetailPath('quotes', quoteId)); }}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving
                ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              }
              Enregistrer
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => { if (confirmIfDirty()) router.push(buildDetailPath('quotes', quoteId)); }}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ─── CONTENT ──────────────────────────────────────────────────── */}

      {activeTab === 'edition' ? (
        /* ═══ EDITION MODE ═════════════════════════════════════════════ */
        <div className="flex-1 overflow-y-auto bg-gray-100">
          <div className="max-w-5xl mx-auto py-6 px-4">
            <form id="quote-edit-form" onSubmit={handleSubmit}>

              {/* White document panel */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

                {/* ── DOCUMENT HEADER ─────────────────────────────────── */}
                <div className="px-8 pt-6 pb-5 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <p className="text-lg font-bold text-gray-900 mb-1">
                        {quoteReference ? `Devis n° ${quoteReference}` : 'Modifier le devis'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <div>
                          <span className="text-xs text-gray-400">Debut des travaux&nbsp;</span>
                          <input
                            type="date"
                            name="work_start_date"
                            value={formData.work_start_date || ''}
                            onChange={handleChange}
                            className="text-sm text-blue-600 border-0 border-b border-dashed border-blue-300 focus:outline-none focus:border-blue-500 bg-transparent"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">Dur&eacute;e estim&eacute;e&nbsp;</span>
                          <input
                            type="number"
                            min="1"
                            value={durationQty}
                            onChange={e => {
                              setDurationQty(e.target.value);
                              setFormData(prev => ({ ...prev, estimated_duration: e.target.value ? `${e.target.value} ${durationUnit}` : '' }));
                            }}
                            placeholder="—"
                            className="text-sm text-blue-600 border-0 border-b border-dashed border-blue-300 focus:outline-none focus:border-blue-500 bg-transparent w-10 text-center"
                          />
                          <select
                            value={durationUnit}
                            onChange={e => {
                              setDurationUnit(e.target.value);
                              setFormData(prev => ({ ...prev, estimated_duration: durationQty ? `${durationQty} ${e.target.value}` : '' }));
                            }}
                            className="text-sm text-blue-600 border-0 border-b border-dashed border-blue-300 focus:outline-none bg-transparent"
                          >
                            {['Heure', 'Jour', 'Semaine', 'Mois', 'Ann\u00e9e'].map(u => <option key={u}>{u}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="w-72 space-y-2 shrink-0">
                      <CustomerSelector
                        label=""
                        customers={customers}
                        value={formData.customer_id}
                        onChange={(id) => setFormData(prev => ({ ...prev, customer_id: id }))}
                        onNewCustomer={() => setShowNewCustomerModal(true)}
                        required
                      />
                      <select
                        name="project_id"
                        value={formData.project_id?.toString() || ''}
                        onChange={handleChange}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        {projectOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Subject + description */}
                  <div className="mt-4 space-y-2">
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject || ''}
                      onChange={handleChange}
                      placeholder="Objet du devis..."
                      className="w-full text-sm font-medium text-gray-700 border-0 border-b border-dashed border-gray-200 focus:outline-none focus:border-blue-400 bg-transparent py-1 placeholder:font-normal placeholder:text-gray-300"
                    />
                    {!showDescription ? (
                      <button
                        type="button"
                        onClick={() => setShowDescription(true)}
                        className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Ajouter une description
                      </button>
                    ) : (
                      <textarea
                        name="description"
                        rows={2}
                        value={formData.description || ''}
                        onChange={handleChange}
                        placeholder="Description du chantier..."
                        className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    )}
                  </div>
                </div>

                {/* ── LINE ITEMS ──────────────────────────────────────── */}
                <div className="px-4 py-4">
                  <LineItemsEditor items={items} onChange={setItems} />
                </div>

                {/* Adjustment link */}
                <div className="px-8 pb-3 flex justify-end">
                  <button type="button" className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Definir un ajustement
                  </button>
                </div>

                {/* ── PAYMENT CONDITIONS + TOTALS ─────────────────────── */}
                <div className="px-8 py-5 border-t border-gray-100">
                  <div className="grid grid-cols-3 gap-8">

                    {/* Left 2/3 – payment conditions */}
                    <div className="col-span-2 space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-800">Conditions de paiement</h3>
                        <button type="button" className="flex items-center gap-0.5 text-xs text-blue-500 hover:text-blue-700">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Ajouter une condition
                        </button>
                      </div>
                      <input
                        type="text"
                        name="payment_terms"
                        value={formData.payment_terms || ''}
                        onChange={handleChange}
                        placeholder="Methodes de paiement acceptees..."
                        className="w-full text-sm text-gray-600 border-0 border-b border-dashed border-gray-200 focus:outline-none focus:border-blue-400 bg-transparent py-0.5 placeholder:text-gray-300"
                      />
                      {(formData.deposit_percent || 0) > 0 && (
                        <div className="flex items-center gap-2 text-orange-600 text-sm">
                          <span>Acompte de {formData.deposit_percent || 0}% a la signature soit <strong>{formatCurrency(totals.deposit)}</strong> TTC</span>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, deposit_percent: 0 }))}
                            className="text-gray-300 hover:text-red-400 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                      <p className="text-sm text-gray-500">
                        Reste a facturer : <strong className="text-gray-700">{formatCurrency(totals.finalNet - totals.deposit)}</strong> TTC
                      </p>
                      <div className="flex items-center gap-3 pt-1 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs text-gray-400">Acompte (%)</label>
                          <input type="number" name="deposit_percent" min="0" max="100" step="5"
                            value={formData.deposit_percent || ''}
                            onChange={handleChange}
                            className="w-14 text-sm border border-gray-200 rounded-md px-2 py-0.5 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs text-gray-400">Validite (j)</label>
                          <input type="number" name="validity_days" min="1" step="1"
                            value={formData.validity_days || ''}
                            onChange={handleChange}
                            className="w-14 text-sm border border-gray-200 rounded-md px-2 py-0.5 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        {!showDiscount ? (
                          <button type="button" onClick={() => setShowDiscount(true)}
                            className="text-xs text-blue-500 hover:text-blue-700 border-b border-dashed border-blue-300">
                            + Remise globale
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs text-gray-400">Remise (%)</label>
                            <input type="number" name="discount_percent" min="0" max="100" step="0.5"
                              value={formData.discount_percent || ''}
                              onChange={handleChange}
                              className="w-14 text-sm border border-gray-200 rounded-md px-2 py-0.5 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right 1/3 – totals */}
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between py-1.5 border-b border-gray-100">
                        <span className="text-gray-500">Total net HT</span>
                        <span className="font-medium text-gray-800">{formatCurrency(totals.finalHT)}</span>
                      </div>
                      {Object.entries(totals.tvaByRate).sort().map(([rate, amount]) => (
                        <div key={rate} className="flex justify-between py-0.5 text-gray-400 text-xs">
                          <span>TVA {rate}%</span>
                          <span>{formatCurrency(amount)}</span>
                        </div>
                      ))}
                      {totals.waste > 0 && (
                        <div className="flex justify-between py-0.5 text-gray-400 text-xs">
                          <span>Frais dechetterie</span>
                          <span>+ {formatCurrency(totals.waste)}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1.5 border-b border-gray-100">
                        <span className="text-gray-500">Total TTC</span>
                        <span className="font-medium text-gray-800">{formatCurrency(totals.finalTTC)}</span>
                      </div>
                      {totals.premiums > 0 && (
                        <div className="flex justify-between py-0.5 text-green-600 text-xs">
                          <span>Primes CEE + MPR</span>
                          <span>- {formatCurrency(totals.premiums)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-2.5 px-3 bg-blue-600 text-white rounded-lg mt-2">
                        <span className="font-bold text-sm">NET A PAYER</span>
                        <span className="font-bold text-xl">{formatCurrency(totals.finalNet)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── WASTE MANAGEMENT & PREMIUMS ─────────────────────── */}
                <div className="px-8 py-3 border-t border-gray-100 flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-700">Gestion des dechets</h3>
                    {(formData.waste_management_fee || 0) === 0 ? (
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, waste_management_fee: 0.01 }))}
                        className="flex items-center gap-0.5 text-xs text-blue-500 hover:text-blue-700">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Definir
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input type="number" name="waste_management_fee" step="0.01"
                          value={formData.waste_management_fee || ''}
                          onChange={handleChange}
                          className="w-20 text-sm border border-gray-200 rounded-md px-2 py-0.5 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-400">EUR</span>
                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, waste_management_fee: 0 }))}
                          className="text-gray-300 hover:text-red-400 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-gray-700">Primes</h3>
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-gray-400">CEE (EUR)</label>
                      <input type="number" name="cee_premium" step="0.01" value={formData.cee_premium || ''} onChange={handleChange} placeholder="0"
                        className="w-20 text-sm border border-gray-200 rounded-md px-2 py-0.5 text-right focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-gray-400">MPR (EUR)</label>
                      <input type="number" name="mpr_premium" step="0.01" value={formData.mpr_premium || ''} onChange={handleChange} placeholder="0"
                        className="w-20 text-sm border border-gray-200 rounded-md px-2 py-0.5 text-right focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                  </div>
                </div>

                {/* ── NOTES ───────────────────────────────────────────── */}
                <div className="px-8 py-4 border-t border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes / message au client</h3>
                  <textarea
                    name="notes"
                    rows={2}
                    value={formData.notes || ''}
                    onChange={handleChange}
                    placeholder="Remarques, precisions techniques..."
                    className="w-full text-sm text-gray-600 border-0 border-b border-dashed border-gray-200 focus:outline-none focus:border-blue-400 bg-transparent resize-none py-1 placeholder:text-gray-300"
                  />
                </div>

                {/* ── NOTES DE BAS DE PAGE ────────────────────────────── */}
                <div className="px-8 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl space-y-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pied de document (apparaît sur chaque page PDF)</h3>
                  <div>
                    <p className="text-[11px] font-medium text-gray-400 mb-1.5">Coordonnées bancaires</p>
                    <div className="border border-gray-200 rounded-lg bg-white px-4 py-3">
                      {bankLine ? (
                        <pre className="text-xs text-gray-600 font-sans whitespace-pre-wrap">{bankLine}</pre>
                      ) : (
                        <Link href="/settings?tab=entreprise" className="text-xs text-blue-600 hover:underline">
                          + Configurer les coordonnées bancaires dans les paramètres
                        </Link>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-gray-400 mb-1.5">Mentions complémentaires (RGE, certification, qualifications…)</p>
                    <textarea
                      name="footer_notes"
                      rows={2}
                      value={formData.footer_notes || ''}
                      onChange={handleChange}
                      placeholder="Ex : Entreprise certifiée RGE QualiPV — Assurance décennale n° … — SIRET …"
                      className="w-full text-xs text-gray-600 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                    />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-gray-400 mb-1.5">Mentions légales obligatoires</p>
                    <textarea
                      name="legal_mentions"
                      rows={2}
                      value={formData.legal_mentions || ''}
                      onChange={handleChange}
                      placeholder="Ex : TVA non applicable, art. 293B du CGI — Délai de rétractation 14 jours…"
                      className="w-full text-xs text-gray-600 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                    />
                  </div>
                  <details className="group">
                    <summary className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-400 select-none list-none hover:text-gray-600 w-fit">
                      <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Conditions générales de vente
                      <span className="text-gray-300">(pré-remplies depuis les paramètres)</span>
                    </summary>
                    <div className="mt-2">
                      <textarea
                        name="terms_and_conditions"
                        rows={3}
                        className="w-full text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        value={formData.terms_and_conditions || ''}
                        onChange={handleChange}
                        placeholder="Conditions générales de vente..."
                      />
                    </div>
                  </details>
                </div>

              </div>
              {/* end document panel */}

              {/* Bottom action bar */}
              <div className="mt-4 flex items-center justify-between">
                <button type="button" onClick={clearDraft}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                  Vider le brouillon
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { if (confirmIfDirty()) router.push(buildDetailPath('quotes', quoteId)); }}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    Enregistrer les modifications
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      ) : (
        /* ═══ PREVIEW MODE ═════════════════════════════════════════════ */
        <div className="flex-1 bg-gray-700 flex flex-col items-center overflow-y-auto py-6">
          <div className="w-full max-w-4xl px-4 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-300 text-sm font-medium">Previsualisation PDF</span>
              {pdfLoading && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <div className="w-3 h-3 border-2 border-gray-500 border-t-gray-200 rounded-full animate-spin" />
                  Generation...
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Link href="/settings?tab=documents"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-200 hover:text-white bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors">
                Apparence
              </Link>
              {pdfUrl && (
                <button type="button"
                  onClick={() => quoteService.downloadPdf(quoteId, quoteReference || undefined)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-200 hover:text-white bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Telecharger
                </button>
              )}
            </div>
          </div>

          {!formData.customer_id || items.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 bg-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-300 text-sm mb-4">Ajoutez des lignes pour generer l&apos;apercu</p>
              <button type="button" onClick={() => setActiveTab('edition')}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                Retour a l&apos;edition
              </button>
            </div>
          ) : pdfUrl ? (
            <div className="w-full max-w-4xl px-4">
              <iframe src={pdfUrl} className="w-full rounded-lg shadow-2xl bg-white" style={{ height: '85vh' }} title="Previsualisation PDF" />
            </div>
          ) : (
            <div className="text-center py-24">
              <p className="text-gray-400 text-sm mb-3">Generation de l&apos;apercu en cours...</p>
              <button type="button" onClick={generatePdfPreview} disabled={pdfLoading}
                className="flex items-center gap-2 mx-auto px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50">
                {pdfLoading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Generer l&apos;apercu
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── MODALS ──────────────────────────────────────────────────── */}
      <Modal isOpen={showNewCustomerModal} title="Nouveau client" onClose={() => setShowNewCustomerModal(false)} size="lg">
        <NewCustomerForm onSuccess={async () => { await loadData(); }} onClose={() => setShowNewCustomerModal(false)} />
      </Modal>
    </div>
  );
}