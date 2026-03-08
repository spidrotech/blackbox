'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, Modal } from '@/components/ui';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { CustomerSelector } from '@/components/customers/CustomerSelector';
import { NewCustomerForm } from '@/components/customers/NewCustomerForm';
import { quoteService, customerService, projectService, priceLibraryService, settingsService } from '@/services/api';
import { QuoteCreate, Customer, Project, PriceLibraryItem, LineItem, LineItemType } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { LineItemsEditor, LineItemData } from '@/components/quotes/LineItemsEditor';
import { PdfSettingsCard } from '@/components/documents/PdfSettingsCard';
import {
  CompanySettingsData,
  getDocumentDefaultsFromCompany,
} from '@/lib/company-settings';

const toLineItemType = (itemType: LineItemData['item_type']): LineItemType => {
  if (itemType === 'supply' || itemType === 'labor' || itemType === 'other') {
    return itemType;
  }
  return 'other';
};

const toQuoteLineItem = (item: LineItemData, position: number): LineItem => ({
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
  position,
});


export default function NewQuotePage() {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [showFullPdfPreview, setShowFullPdfPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [priceLibrary, setPriceLibrary] = useState<PriceLibraryItem[]>([]);
  const [priceSearch, setPriceSearch] = useState('');
  const [companySettings, setCompanySettings] = useState<CompanySettingsData | null>(null);

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
    deposit_percent: 30,
    discount_percent: 0,
    cee_premium: 0,
    mpr_premium: 0,
    waste_management_fee: 0,
    worksite_address: '',
    work_start_date: '',
    estimated_duration: '',
    line_items: [],
  });

  const [lineItems, setLineItems] = useState<LineItemData[]>([]);

  const addFromLibrary = (item: PriceLibraryItem) => {
    const details = [
      item.description,
      item.long_description,
      item.brand ? `Marque : ${item.brand}` : undefined,
    ].filter(Boolean).join('\n');

    setLineItems(prev => [...prev, {
      description: item.name || item.description || '',
      long_description: details || undefined,
      item_type: item.item_type || 'supply',
      quantity: 1,
      unit: item.unit || 'u',
      unit_price: item.unit_price || 0,
      vat_rate: item.tax_rate || 20,
      reference: item.reference,
    }]);
    priceLibraryService.recordUsage(item.id);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!formData.customer_id || lineItems.length === 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { generatePdfPreview(); }, 1500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, lineItems]);

  const loadData = async () => {
    try {
      const [customersRes, projectsRes, priceRes, companyRes] = await Promise.all([
        customerService.getAll(),
        projectService.getAll(),
        priceLibraryService.getAll(),
        settingsService.getCompany(),
      ]);
      if (customersRes.success) setCustomers(Array.isArray(customersRes.data) ? customersRes.data : []);
      if (projectsRes.success) setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
      if (priceRes.success) setPriceLibrary(Array.isArray(priceRes.data) ? priceRes.data : []);
      if (companyRes.success && companyRes.data) {
        const companyData = companyRes.data as CompanySettingsData;
        setCompanySettings(companyData);
        const defaults = getDocumentDefaultsFromCompany(companyData);
        setFormData(prev => ({
          ...prev,
          conditions: prev.conditions || defaults.conditions,
          terms_and_conditions: prev.terms_and_conditions || defaults.conditions,
          payment_terms: prev.payment_terms || defaults.paymentTerms,
          bank_details: prev.bank_details || defaults.bankDetails,
          legal_mentions: prev.legal_mentions || defaults.legalMentions,
          footer_notes: prev.footer_notes || defaults.footerNotes,
        }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

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


  const calculateTotals = () => {
    let totalHT = 0; let totalTVA = 0;
    const tvaByRate: Record<number, number> = {};
    lineItems.forEach((item: LineItemData) => {
      if (['section', 'text', 'page_break'].includes(item.item_type)) return;
      const qty = item.quantity ?? 1;
      const pu = item.unit_price ?? 0;
      const disc = item.discount_percent ?? 0;
      const ht = qty * pu * (1 - disc / 100);
      const tva = ht * (item.vat_rate ?? 20) / 100;
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
    if (!formData.customer_id || lineItems.length === 0) { setPdfUrl(null); return; }
    setPdfLoading(true);
    try {
      const payload: QuoteCreate = {
        ...formData,
        line_items: lineItems.map((item, i) => toQuoteLineItem(item, i)),
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) { alert('Veuillez selectionner un client'); return; }
    if (lineItems.length === 0) { alert('Veuillez ajouter au moins une ligne'); return; }
    setLoading(true);
    try {
      // Sanitize: strip empty strings for Optional[date] fields
      const payload: QuoteCreate = {
        ...formData,
        line_items: lineItems.map((item, i) => toQuoteLineItem(item, i)),
        work_start_date: formData.work_start_date || undefined,
        quote_date: formData.quote_date || undefined,
        expiry_date: formData.expiry_date || undefined,
        deposit_percent: formData.deposit_percent || undefined,
        cee_premium: (formData.cee_premium && formData.cee_premium > 0) ? formData.cee_premium : undefined,
        mpr_premium: (formData.mpr_premium && formData.mpr_premium > 0) ? formData.mpr_premium : undefined,
        waste_management_fee: (formData.waste_management_fee && formData.waste_management_fee > 0) ? formData.waste_management_fee : undefined,
      };
      const response = await quoteService.create(payload);
      if (response.success) router.push('/quotes');
    } catch (error) { console.error('Error creating quote:', error); }
    finally { setLoading(false); }
  };

  const totals = calculateTotals();
  const allSections = [...new Set(lineItems.map(i => i.section).filter(Boolean))];
  const filteredPriceLibrary = useMemo(() => {
    const query = priceSearch.trim().toLowerCase();
    const source = [...priceLibrary].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
    if (!query) return source.slice(0, 12);
    return source.filter((item) =>
      [item.name, item.reference, item.description, item.long_description, item.brand]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    ).slice(0, 12);
  }, [priceLibrary, priceSearch]);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-8">

        {/* Header sticky */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => router.push('/quotes')} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Nouveau devis</h1>
                <p className="text-xs text-slate-500">Previsualisation PDF en temps reel</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push('/quotes')}>Annuler</Button>
              <Button type="button" size="sm" variant="outline" onClick={generatePdfPreview} loading={pdfLoading} className="gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Apercu PDF
              </Button>
              <Button type="submit" form="quote-form" loading={loading} size="sm" className="gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Enregistrer le devis
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <div className="mb-6">
            <PdfSettingsCard company={companySettings} documentLabel="devis" />
          </div>

          <form id="quote-form" onSubmit={handleSubmit}>
            <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 420px' }}>

              {/* COLONNE GAUCHE */}
              <div className="space-y-5">

                {/* 1. Client & Projet */}
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</span>
                    Client et Projet
                  </CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <CustomerSelector label="Client *" customers={customers} value={formData.customer_id}
                        onChange={(id) => setFormData(prev => ({ ...prev, customer_id: id }))}
                        onNewCustomer={() => setShowNewCustomerModal(true)} required />
                      <Select label="Projet associe" name="project_id" options={projectOptions}
                        value={formData.project_id?.toString() || ''} onChange={handleChange} />
                    </div>
                    <Input label="Objet du devis" name="subject" value={formData.subject || ''} onChange={handleChange}
                      placeholder="Ex : Renovation salle de bain - Lot plomberie" />
                  </CardContent>
                </Card>

                {/* 2. Dates & Conditions */}
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</span>
                    Dates et Conditions
                  </CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <Input label="Validite (jours)" name="validity_days" type="number"
                        value={formData.validity_days || ''} onChange={handleChange} placeholder="30" />
                      <Input label="Acompte a la commande (%)" name="deposit_percent" type="number" step="0.1"
                        value={formData.deposit_percent || ''} onChange={handleChange} />
                      <Input label="Remise globale (%)" name="discount_percent" type="number" step="0.1"
                        value={formData.discount_percent || ''} onChange={handleChange} />
                    </div>
                    <Input label="Conditions de reglement" name="payment_terms"
                      value={formData.payment_terms || ''} onChange={handleChange}
                      placeholder="Ex : Virement bancaire a 30 jours" />
                  </CardContent>
                </Card>

                {/* 3. Chantier */}
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">3</span>
                    Lieu des travaux
                  </CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <AddressAutocomplete
                      label="Adresse du chantier"
                      value={formData.worksite_address || ''}
                      onChange={v => setFormData(prev => ({ ...prev, worksite_address: v }))}
                      onSelect={r => setFormData(prev => ({ ...prev, worksite_address: `${r.street}, ${r.postalCode} ${r.city}` }))}
                      placeholder="Ex : 12 rue de la Paix, 75001 Paris"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Date de debut des travaux" name="work_start_date" type="date"
                        value={formData.work_start_date || ''} onChange={handleChange} />
                      <Input label="Duree estimee" name="estimated_duration"
                        value={formData.estimated_duration || ''} onChange={handleChange} placeholder="Ex : 2 semaines" />
                    </div>
                  </CardContent>
                </Card>

                {/* 4. Lignes */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">4</span>
                        Lignes du devis
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {priceLibrary.length > 0 && (
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-xs font-semibold text-amber-800 mb-2">Bibliothèque de prix</p>
                        <input
                          type="text"
                          value={priceSearch}
                          onChange={(e) => setPriceSearch(e.target.value)}
                          placeholder="Rechercher BAR-TH-171, PAC, marque..."
                          className="w-full mb-2 rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                        <div className="flex flex-wrap gap-1.5">
                          {filteredPriceLibrary.map(item => (
                            <button key={item.id} type="button" onClick={() => addFromLibrary(item)}
                              className="px-2.5 py-1 text-xs bg-white border border-amber-200 rounded-full hover:bg-amber-100 transition-colors">
                              {item.reference ? `${item.reference} — ` : ''}{item.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <LineItemsEditor
                      items={lineItems}
                      onChange={setLineItems}
                    />
                  </CardContent>
                </Card>
                {/* 5. Primes */}
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">5</span>
                    Primes et Frais annexes
                  </CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Prime CEE (EUR)</label>
                        <input type="number" step="0.01" name="cee_premium"
                          value={formData.cee_premium || ''} onChange={handleChange} placeholder="0"
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-right" />
                        <p className="text-xs text-slate-400 mt-0.5">Deduite du net a payer</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Aide MaPrimeRenov (EUR)</label>
                        <input type="number" step="0.01" name="mpr_premium"
                          value={formData.mpr_premium || ''} onChange={handleChange} placeholder="0"
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-right" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Frais dechetterie (EUR)</label>
                        <input type="number" step="0.01" name="waste_management_fee"
                          value={formData.waste_management_fee || ''} onChange={handleChange} placeholder="0"
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 text-right" />
                        <p className="text-xs text-slate-400 mt-0.5">Ajoute au TTC</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 6. Notes */}
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">6</span>
                    Contenu visible sur le PDF
                  </CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Notes / message au client</label>
                      <textarea name="notes" rows={3}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        value={formData.notes || ''} onChange={handleChange}
                        placeholder="Remarques, precisions techniques, etc." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Conditions generales de vente</label>
                      <textarea name="conditions" rows={4}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        value={formData.conditions || ''} onChange={handleChange}
                        placeholder="CGV apparaissant sur le devis PDF..." />
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Le pied de page, les mentions légales et les coordonnées bancaires sont pilotés depuis les
                      paramètres PDF pour éviter les doubles saisies.
                    </div>
                  </CardContent>
                </Card>

              </div>

              {/* COLONNE DROITE */}
              <div className="space-y-5">

                {/* Recap totaux sticky */}
                <Card className="sticky top-24">
                  <CardHeader><CardTitle className="text-base">Recapitulatif</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Sous-total HT brut</span>
                        <span className="font-medium text-slate-800">{formatCurrency(totals.totalHT)}</span>
                      </div>
                      {totals.discount > 0 && (
                        <div className="flex justify-between py-1.5 border-b border-slate-100 text-blue-600">
                          <span>Remise ({formData.discount_percent}%)</span>
                          <span className="font-medium">- {formatCurrency(totals.discount)}</span>
                        </div>
                      )}
                      {totals.discount > 0 && (
                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                          <span className="text-slate-500">Total HT net</span>
                          <span className="font-semibold text-slate-800">{formatCurrency(totals.finalHT)}</span>
                        </div>
                      )}
                      {Object.entries(totals.tvaByRate).sort().map(([rate, amount]) => (
                        <div key={rate} className="flex justify-between py-1 text-slate-500">
                          <span>TVA {rate}%</span>
                          <span>{formatCurrency(amount)}</span>
                        </div>
                      ))}
                      {totals.waste > 0 && (
                        <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-500">
                          <span>Frais dechetterie</span>
                          <span>+ {formatCurrency(totals.waste)}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-2 px-3 bg-blue-600 text-white rounded-lg mt-1">
                        <span className="font-bold">Total TTC</span>
                        <span className="font-bold text-lg">{formatCurrency(totals.finalTTC)}</span>
                      </div>
                      {totals.premiums > 0 && (
                        <>
                          <div className="flex justify-between py-1.5 border-b border-slate-100 text-green-600">
                            <span>Primes (CEE + MPR)</span>
                            <span className="font-medium">- {formatCurrency(totals.premiums)}</span>
                          </div>
                          <div className="flex justify-between py-2 px-3 bg-green-50 text-green-800 rounded-lg">
                            <span className="font-bold">Net a payer</span>
                            <span className="font-bold text-lg">{formatCurrency(totals.finalNet)}</span>
                          </div>
                        </>
                      )}
                      {(formData.deposit_percent || 0) > 0 && (
                        <div className="flex justify-between py-1.5 mt-1 border-t border-slate-200 text-blue-600">
                          <span>Acompte ({formData.deposit_percent}%)</span>
                          <span className="font-semibold">{formatCurrency(totals.deposit)}</span>
                        </div>
                      )}
                      <div className="pt-2 text-xs text-slate-400 text-center">
                        {lineItems.length} ligne{lineItems.length !== 1 ? 's' : ''} - {allSections.length} lot{allSections.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Apercu PDF */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-base">Aperçu PDF</CardTitle>
                        <button type="button" onClick={() => window.open('/settings?tab=documents&doc=entetes', '_blank')} className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1" title="Modifier l'en-tête et le pied de page du document">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          Paramètres du PDF
                        </button>
                      </div>
                      {pdfLoading && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <div className="w-3 h-3 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                          Generation...
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!formData.customer_id || lineItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                        <svg className="w-10 h-10 text-slate-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-xs text-center">Selectionnez un client et ajoutez des lignes</p>
                      </div>
                    ) : pdfUrl ? (
                      <div className="space-y-2">
                        <iframe src={pdfUrl} className="w-full border border-slate-200 rounded-lg"
                          style={{ height: '500px' }} title="Apercu devis PDF" />
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" className="flex-1 gap-1"
                            onClick={() => { const a = document.createElement('a'); a.href = pdfUrl; a.download = 'devis-preview.pdf'; a.click(); }}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Telecharger
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="flex-1"
                            onClick={() => setShowFullPdfPreview(true)}>
                            Plein ecran
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-8">
                        <p className="text-xs text-slate-500 mb-3">L&apos;apercu se genere automatiquement...</p>
                        <Button type="button" size="sm" onClick={generatePdfPreview} loading={pdfLoading} className="gap-1">
                          Generer l&apos;apercu
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>
            </div>
          </form>
        </div>
      </div>

      <Modal isOpen={showNewCustomerModal} title="Nouveau client"
        onClose={() => setShowNewCustomerModal(false)} size="lg">
        <NewCustomerForm onSuccess={async () => { await loadData(); }} onClose={() => setShowNewCustomerModal(false)} />
      </Modal>

      <Modal isOpen={showFullPdfPreview} title="Apercu du devis"
        onClose={() => setShowFullPdfPreview(false)} size="lg">
        {pdfUrl
          ? <iframe src={pdfUrl} className="w-full" style={{ height: '80vh' }} title="Apercu complet PDF" />
          : <div className="p-6 text-center text-slate-400">Aucun PDF genere.</div>
        }
      </Modal>
    </MainLayout>
  );
}
