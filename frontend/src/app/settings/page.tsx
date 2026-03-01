'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { settingsService, API_BASE_URL } from '@/services/api';

/** Converts a relative API static path to an absolute URL. */
const toAbsUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
};

type Tab = 'entreprise' | 'juridique' | 'bancaire' | 'assurance' | 'visuels' | 'devis' | 'factures' | 'mentions';

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'entreprise', label: 'Mon entreprise',        icon: '' },
  { id: 'juridique',  label: 'Informations juridiques', icon: '' },
  { id: 'bancaire',   label: 'Informations bancaires',  icon: '' },
  { id: 'assurance',  label: 'Garantie & Assurance',    icon: '' },
  { id: 'visuels',    label: 'Charte graphique',        icon: '' },
  { id: 'devis',      label: 'Devis',                   icon: '' },
  { id: 'factures',   label: 'Factures',                icon: '' },
  { id: 'mentions',   label: 'Mentions légales & CGV',  icon: '' },
];

function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700 mb-1">{children}</label>;
}
function F({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}
function H({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-6 pb-4 border-b border-slate-200">
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      {desc && <p className="text-sm text-slate-500 mt-1">{desc}</p>}
    </div>
  );
}
function Inp({ label, value, onChange, placeholder, type = 'text', hint, readOnly }: {
  label: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; type?: string; hint?: string; readOnly?: boolean;
}) {
  return (
    <F>
      <Lbl>{label}</Lbl>
      <input type={type} value={value} readOnly={readOnly}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
      />
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </F>
  );
}
function Txt({ label, value, onChange, rows = 4, hint }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string;
}) {
  return (
    <F>
      <Lbl>{label}</Lbl>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </F>
  );
}
function Sel({ label, value, onChange, options, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; hint?: string;
}) {
  return (
    <F>
      <Lbl>{label}</Lbl>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </F>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('entreprise');
  const [co, setCo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout>>();
  const s = (p: any) => setCo((c: any) => ({ ...c, ...p }));

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const r = await settingsService.getCompany(); if (r.success) setCo(r.data); }
    finally { setLoading(false); }
  };

  const save = async () => {
    if (!co) return;
    setSaving(true);
    try {
      await settingsService.updateCompany(co);
      setSaved(true); clearTimeout(t.current);
      t.current = setTimeout(() => setSaved(false), 2500);
    } catch { alert('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  };

  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setLogoPreview(URL.createObjectURL(f));
    try { const r = await settingsService.uploadLogo(f); if (r.success) s({ logo_url: (r.data as any).logo_url }); }
    catch { alert('Erreur upload logo'); }
  };
  const onCgv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    try { const r = await settingsService.uploadCgv(f); if (r.success) { s({ cgv_url: (r.data as any).cgv_url }); alert('CGV uploadée'); } }
    catch { alert('Erreur upload CGV'); }
  };

  const vis: Record<string, string> = (() => { try { return co?.visuals_json ? JSON.parse(co.visuals_json) : {}; } catch { return {}; } })();
  const sv = (k: string, v: string) => s({ visuals_json: JSON.stringify({ ...vis, [k]: v }) });

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Chargement</div>;
  if (!co) return <div className="p-6 text-red-500">Entreprise introuvable.</div>;

  const SaveBtn = ({ bottom }: { bottom?: boolean }) => (
    <button onClick={save} disabled={saving}
      className={`px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors ${bottom ? 'w-full sm:w-auto' : ''}`}>
      {saving ? 'Enregistrement' : 'Enregistrer'}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Paramètres du compte</h1>
            <p className="text-sm text-slate-500 mt-0.5">Gérez les informations et préférences de votre entreprise</p>
          </div>
          <div className="flex items-center gap-3">
            {saved && <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium"> Enregistré</span>}
            <Link href="/" className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 font-medium">
               Accueil
            </Link>
            <SaveBtn />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="w-56 shrink-0">
          <nav className="space-y-0.5">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${tab === n.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}>
                <span>{n.icon}</span>{n.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">

            {/*  Mon entreprise  */}
            {tab === 'entreprise' && <>
              <H title="Mon entreprise" desc="Informations affichées sur vos documents (en-tête)." />
              <div className="grid grid-cols-2 gap-x-8">
                <div>
                  <Inp label="Nom de l'entreprise *" value={co.name || ''} onChange={v => s({ name: v })} />
                  <Inp label="Adresse" value={co.address || ''} onChange={v => s({ address: v })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Inp label="Code postal" value={co.postal_code || ''} onChange={v => s({ postal_code: v })} />
                    <Inp label="Ville" value={co.city || ''} onChange={v => s({ city: v })} />
                  </div>
                  <Inp label="Pays" value={co.country || 'France'} onChange={v => s({ country: v })} />
                  <Inp label="Téléphone" value={co.phone || ''} onChange={v => s({ phone: v })} type="tel" />
                  <Inp label="Email professionnel" value={co.email || ''} onChange={v => s({ email: v })} type="email" />
                  <Inp label="Site web" value={co.website || ''} onChange={v => s({ website: v })} />
                </div>
                <div>
                  <F>
                    <Lbl>Logo</Lbl>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center bg-slate-50 mb-2">
                      {(logoPreview || co.logo_url)
                        ? <img src={logoPreview || toAbsUrl(co.logo_url) || ''} alt="logo" className="max-h-24 mx-auto object-contain mb-2" />
                        : <div className="text-4xl mb-2"></div>}
                      <p className="text-xs text-slate-500 mb-2">PNG, JPG, SVG  max 2 Mo</p>
                      <label className="cursor-pointer px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50">
                        Choisir un fichier<input type="file" accept="image/*" onChange={onLogo} className="hidden" />
                      </label>
                    </div>
                  </F>
                </div>
              </div>
            </>}

            {/*  Juridique  */}
            {tab === 'juridique' && <>
              <H title="Informations juridiques" desc="Mentions obligatoires sur vos documents (SIRET, RCS, capital)." />
              <div className="grid grid-cols-2 gap-x-8 max-w-3xl">
                <Inp label="N° SIRET" value={co.siret || ''} onChange={v => s({ siret: v })} placeholder="941 003 675 00019" />
                <Inp label="Ville du RCS" value={co.rcs_city || ''} onChange={v => s({ rcs_city: v })} placeholder="Paris" />
                <Inp label="N° d'inscription au RM" value={co.rm_number || ''} onChange={v => s({ rm_number: v })} hint="Registre des Métiers" />
                <Inp label="Capital social (€)" value={co.capital?.toString() || ''} onChange={v => s({ capital: parseFloat(v) || null })} type="number" placeholder="10000" />
                <Inp label="Code APE / NAF" value={co.ape_code || ''} onChange={v => s({ ape_code: v })} placeholder="4322B" />
                <div>
                  <F>
                    <Lbl>N° de TVA intracommunautaire</Lbl>
                    <div className="flex gap-3 items-start">
                      <input type="text" value={co.vat_number || ''} onChange={e => s({ vat_number: e.target.value })}
                        placeholder="FR55 941 003 675"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input type="checkbox" checked={co.vat_subject === false}
                        onChange={e => s({ vat_subject: !e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-600">Non assujetti à la TVA</span>
                    </label>
                  </F>
                </div>
                <Sel label="Régime de TVA"
                  value={co.vat_collection_type || ''}
                  onChange={v => s({ vat_collection_type: v })}
                  options={[
                    { value: '', label: ' Choisir ' },
                    { value: 'debit', label: 'TVA sur les débits' },
                    { value: 'encaissement', label: 'TVA sur les encaissements' },
                  ]}
                />
              </div>
              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                <p className="font-semibold">Ces informations apparaissent sur vos documents dans le pied de page.</p>
                <p>Ex : SAS au capital de 50 000 €  RCS Paris  SIRET 941 003 675 00019  APE 4322B</p>
              </div>
            </>}

            {/*  Bancaire  */}
            {tab === 'bancaire' && <>
              <H title="Informations bancaires" desc="Affichées dans le bloc de signature de vos devis et factures." />
              <div className="max-w-lg">
                <Inp label="IBAN" value={co.iban || ''} onChange={v => s({ iban: v })}
                  placeholder="FR76 3000 6000 0112 3456 7890 189"
                  hint="Affiché dans le bloc 'Bon pour accord' de vos devis." />
                <Inp label="BIC / SWIFT" value={co.bic || ''} onChange={v => s({ bic: v })} placeholder="BNPAFRPPXXX" />
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <strong>Conseil</strong> : Renseignez vos coordonnées bancaires pour faciliter le paiement par virement.
                </div>
              </div>
            </>}

            {/*  Assurance  */}
            {tab === 'assurance' && <>
              <H title="Garantie & Assurance" desc="Informations sur votre assurance professionnelle et garantie décennale." />
              <div className="grid grid-cols-2 gap-x-8 max-w-3xl">
                <Sel label="Type de garantie"
                  value={co.guarantee_type || ''}
                  onChange={v => s({ guarantee_type: v })}
                  options={[
                    { value: '', label: ' Choisir ' },
                    { value: 'biennale', label: 'Biennale' },
                    { value: 'decennale', label: 'Décennale' },
                    { value: 'rc', label: 'Responsabilité civile' },
                  ]}
                />
                <Inp label="Nom de l'assureur" value={co.insurance_name || ''} onChange={v => s({ insurance_name: v })} placeholder="ex : Orus, Allianz" />
                <Inp label="Zone de couverture" value={co.insurance_coverage || ''} onChange={v => s({ insurance_coverage: v })} placeholder="France métropolitaine" hint="Telle qu'indiquée dans votre contrat." />
              </div>
              <p className="text-sm font-semibold text-slate-600 mt-4 mb-3">Adresse de l'assureur</p>
              <div className="grid grid-cols-2 gap-x-8 max-w-3xl">
                <Inp label="Rue et n° de rue" value={co.insurance_address || ''} onChange={v => s({ insurance_address: v })} />
                <div className="grid grid-cols-2 gap-3">
                  <Inp label="Code postal" value={co.insurance_zipcode || ''} onChange={v => s({ insurance_zipcode: v })} />
                  <Inp label="Ville" value={co.insurance_city || ''} onChange={v => s({ insurance_city: v })} />
                </div>
              </div>
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                Ces informations sont affichées dans les mentions légales de vos devis et factures.
              </div>
            </>}

            {/*  Visuels  */}
            {tab === 'visuels' && <>
              <H title="Charte graphique" desc="Personnalisez l'apparence de vos PDF." />
              <div className="grid grid-cols-2 gap-x-8 max-w-2xl">
                <F>
                  <Lbl>Couleur principale</Lbl>
                  <div className="flex items-center gap-3">
                    <input type="color" value={vis.primary || '#1E3A5F'} onChange={e => sv('primary', e.target.value)} className="w-12 h-10 rounded cursor-pointer border border-slate-300" />
                    <input type="text" value={vis.primary || '#1E3A5F'} onChange={e => sv('primary', e.target.value)} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono" />
                  </div>
                </F>
                <F>
                  <Lbl>Couleur d'accent</Lbl>
                  <div className="flex items-center gap-3">
                    <input type="color" value={vis.accent || '#2563EB'} onChange={e => sv('accent', e.target.value)} className="w-12 h-10 rounded cursor-pointer border border-slate-300" />
                    <input type="text" value={vis.accent || '#2563EB'} onChange={e => sv('accent', e.target.value)} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono" />
                  </div>
                </F>
                <Sel label="Style du tableau" value={vis.table_style || 'standard'} onChange={v => sv('table_style', v)}
                  options={[{value:'standard',label:'Fond alternés'},{value:'minimal',label:'Lignes seules'},{value:'bordered',label:'Encadré complet'}]} />
                <Sel label="Affichage des prix" value={vis.price_display || 'ht'} onChange={v => sv('price_display', v)}
                  options={[{value:'ht',label:'HT uniquement'},{value:'ttc',label:'TTC uniquement'},{value:'both',label:'HT + TTC'}]} />
              </div>
              <div className="flex gap-3 mt-4">
                <div className="w-24 h-12 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow" style={{ backgroundColor: vis.primary || '#1E3A5F' }}>Primaire</div>
                <div className="w-24 h-12 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow" style={{ backgroundColor: vis.accent || '#2563EB' }}>Accent</div>
              </div>
            </>}

            {/*  Devis  */}
            {tab === 'devis' && <>
              <H title="Paramètres des devis" desc="Valeurs par défaut pour chaque nouveau devis." />
              <div className="grid grid-cols-2 gap-x-8">
                <div>
                  <Inp label="Préfixe" value={co.quote_prefix || 'DE'} onChange={v => s({ quote_prefix: v })} hint="Ex : DE  DE2024-0001" />
                  <F>
                    <Lbl>Prochain numéro</Lbl>
                    <input type="number" min={1} value={co.next_quote_number ?? 1} onChange={e => s({ next_quote_number: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </F>
                  <Txt label="Conditions générales (devis)" value={co.default_conditions || ''} onChange={v => s({ default_conditions: v })} rows={5} hint="Modifiables par devis." />
                </div>
                <div>
                  <Txt label="Modalités de paiement par défaut" value={co.default_payment_terms || ''} onChange={v => s({ default_payment_terms: v })} rows={3} hint="Ex : 30% à la signature, solde à réception." />
                  <Txt label="Entête PDF" value={co.header_text || ''} onChange={v => s({ header_text: v })} rows={3} />
                  <Txt label="Pied de page PDF" value={co.footer_text || ''} onChange={v => s({ footer_text: v })} rows={3} />
                </div>
              </div>
            </>}

            {/*  Factures  */}
            {tab === 'factures' && <>
              <H title="Paramètres des factures" desc="Valeurs par défaut pour chaque nouvelle facture." />
              <div className="grid grid-cols-2 gap-x-8">
                <div>
                  <Inp label="Préfixe" value={co.invoice_prefix || 'FA'} onChange={v => s({ invoice_prefix: v })} hint="Ex : FA  FA2024-0001" />
                  <F>
                    <Lbl>Prochain numéro</Lbl>
                    <input type="number" min={1} value={co.next_invoice_number ?? 1} onChange={e => s({ next_invoice_number: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </F>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 mt-2">
                    Numérotation chronologique et sans rupture de séquence  obligation légale.
                  </div>
                </div>
                <div>
                  <Txt label="Note de pied de facture" value={co.footer_text || ''} onChange={v => s({ footer_text: v })} rows={4} hint="IBAN, pénalités de retard" />
                  <Sel label="Délai de paiement par défaut" value="30" onChange={() => {}}
                    options={[{value:'0',label:'Comptant'},{value:'15',label:'15 jours'},{value:'30',label:'30 jours'},{value:'45',label:'45 jours'},{value:'60',label:'60 jours fin de mois'}]} />
                </div>
              </div>
            </>}

            {/*  Mentions & CGV  */}
            {tab === 'mentions' && <>
              <H title="Mentions légales & CGV" desc="Affichées dans le pied de page de vos documents." />
              <div className="grid grid-cols-2 gap-x-8">
                <Txt label="Mentions légales" value={co.legal_mentions || ''} onChange={v => s({ legal_mentions: v })} rows={8} hint="Assurance décennale, garantie, RGE" />
                <F>
                  <Lbl>CGV (PDF)</Lbl>
                  {co.cgv_url
                    ? <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
                        <a href={toAbsUrl(co.cgv_url) || '#'} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline"> Voir les CGV</a>
                      </div>
                    : <div className="mb-3 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500">Aucune CGV uploadée</div>
                  }
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm hover:bg-slate-50 font-medium shadow-sm">
                     Uploader un PDF
                    <input type="file" accept="application/pdf" onChange={onCgv} className="hidden" />
                  </label>
                </F>
              </div>
            </>}

          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button onClick={load} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600">Annuler</button>
            <SaveBtn bottom />
          </div>
        </main>
      </div>
    </div>
  );
}
