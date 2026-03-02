'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { API_BASE_URL, settingsService } from '@/services/api';

type MainTab = 'entreprise' | 'documents' | 'utilisateurs' | 'connexion';
type DocumentTab = 'entetes' | 'pieds' | 'devis' | 'factures' | 'cgv';
type HeaderMode = 'auto' | 'free';
type FooterMode = 'auto' | 'free';
type TeamRole = 'owner' | 'manager' | 'commercial' | 'chef_chantier' | 'ouvrier';

type TeamMember = {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: TeamRole;
  is_active: boolean;
  temporary_password?: string;
};

type CompanySettings = {
  id?: number;
  name?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  siret?: string;
  vat_number?: string;
  rcs_city?: string;
  capital?: number | null;
  iban?: string;
  bic?: string;
  invoice_prefix?: string;
  quote_prefix?: string;
  next_invoice_number?: number;
  next_quote_number?: number;
  default_payment_terms?: string;
  default_conditions?: string;
  legal_mentions?: string;
  header_text?: string;
  footer_text?: string;
  visuals_json?: string;
  cgv_url?: string;
};

const toAbsUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
};

const ROLE_LABEL: Record<TeamRole, string> = {
  owner: 'Propriétaire',
  manager: 'Administrateur',
  commercial: 'Commercial',
  chef_chantier: 'Chef de chantier',
  ouvrier: 'Ouvrier',
};

const ROLE_OPTIONS: TeamRole[] = ['manager', 'commercial', 'chef_chantier', 'ouvrier'];

export default function SettingsPage() {
  const router = useRouter();
  const [mainTab, setMainTab] = useState<MainTab>('entreprise');
  const [documentTab, setDocumentTab] = useState<DocumentTab>('entetes');
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [newMember, setNewMember] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'ouvrier' as TeamRole,
  });
  const [memberCreating, setMemberCreating] = useState(false);

  const [emailForm, setEmailForm] = useState({ email: '', current_password: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' });

  const patchCompany = (data: Partial<CompanySettings>) => {
    setCompany((prev) => (prev ? { ...prev, ...data } : prev));
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  const visuals = useMemo<Record<string, string>>(() => {
    try {
      return company?.visuals_json ? JSON.parse(company.visuals_json) : {};
    } catch {
      return {};
    }
  }, [company?.visuals_json]);

  const setVisual = (key: string, value: string) => {
    const next = { ...visuals, [key]: value };
    patchCompany({ visuals_json: JSON.stringify(next) });
  };

  const headerAutoText = useMemo(() => {
    if (!company) return '';
    const lines: string[] = [];
    if (company.name) lines.push(company.name);
    const addressLine = [company.address, [company.postal_code, company.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    if (addressLine) lines.push(addressLine);
    if (company.country) lines.push(company.country);
    if (company.siret) lines.push(`SIRET : ${company.siret}`);
    if (company.vat_number) lines.push(`TVA : ${company.vat_number}`);
    if (company.phone) lines.push(`Tél : ${company.phone}`);
    if (company.email) lines.push(`Email : ${company.email}`);
    return lines.join('\n');
  }, [company]);

  const footerAutoText = useMemo(() => {
    if (!company) return '';
    const lines: string[] = [];
    const line1 = [company.name, company.address, [company.postal_code, company.city].filter(Boolean).join(' ')].filter(Boolean).join(' - ');
    if (line1) lines.push(line1);
    const legalLine = [
      company.capital ? `Capital : ${company.capital} €` : '',
      company.rcs_city ? `RCS ${company.rcs_city}` : '',
      company.siret ? `SIRET ${company.siret}` : '',
    ].filter(Boolean).join(' - ');
    if (legalLine) lines.push(legalLine);
    const contactLine = [company.phone, company.website, company.email].filter(Boolean).join(' - ');
    if (contactLine) lines.push(contactLine);
    if (company.legal_mentions) lines.push(company.legal_mentions);
    return lines.join('\n');
  }, [company]);

  const headerMode: HeaderMode = (visuals.header_mode as HeaderMode) || 'auto';
  const footerMode: FooterMode = (visuals.footer_mode as FooterMode) || 'auto';

  const load = async () => {
    setLoading(true);
    try {
      const [companyResponse, teamResponse] = await Promise.all([
        settingsService.getCompany(),
        settingsService.getTeam(),
      ]);
      if (companyResponse.success) {
        setCompany(companyResponse.data as CompanySettings);
        setEmailForm((prev) => ({ ...prev, email: (companyResponse.data as CompanySettings).email || '' }));
      }
      if (teamResponse.success) {
        setTeam((teamResponse.data || []) as TeamMember[]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const saveCompany = async () => {
    if (!company) return;
    const payload = { ...company };
    if (headerMode === 'auto') payload.header_text = headerAutoText;
    if (footerMode === 'auto') payload.footer_text = footerAutoText;

    setSaving(true);
    try {
      await settingsService.updateCompany(payload);
      setSaved(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setSaved(false), 2200);
      showToast('Paramètres enregistrés avec succès.');
    } catch {
      showToast('Erreur lors de la sauvegarde des paramètres.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    try {
      const response = await settingsService.uploadLogo(file);
      if (response.success && response.data) {
        patchCompany({ logo_url: response.data.logo_url });
        showToast('Logo mis à jour.');
      }
    } catch {
      showToast('Erreur lors de l\'upload du logo.', 'error');
    }
  };

  const uploadCgv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const response = await settingsService.uploadCgv(file);
      if (response.success && response.data) {
        patchCompany({ cgv_url: response.data.cgv_url });
        showToast('CGV uploadées avec succès.');
      }
    } catch {
      showToast('Erreur lors de l\'upload des CGV.', 'error');
    }
  };

  const createMember = async () => {
    if (!newMember.email.trim()) return;
    setMemberCreating(true);
    try {
      const response = await settingsService.createTeamMember(newMember);
      if (response.success && response.data) {
        setTeam((prev) => [...prev, response.data as TeamMember]);
        setNewMember({ email: '', first_name: '', last_name: '', phone: '', role: 'ouvrier' });
        if ((response.data as TeamMember).temporary_password) {
          showToast(`Utilisateur créé. Mot de passe temporaire : ${(response.data as TeamMember).temporary_password}`);
        } else {
          showToast('Utilisateur créé avec succès.');
        }
      }
    } catch {
      showToast('Impossible de créer l\'utilisateur.', 'error');
    } finally {
      setMemberCreating(false);
    }
  };

  const updateMember = async (member: TeamMember) => {
    try {
      const response = await settingsService.updateTeamMember(member.id, {
        first_name: member.first_name,
        last_name: member.last_name,
        phone: member.phone,
        role: member.role,
        is_active: member.is_active,
      });
      if (response.success && response.data) {
        setTeam((prev) => prev.map((m) => (m.id === member.id ? (response.data as TeamMember) : m)));
        showToast('Utilisateur mis à jour.');
      }
    } catch {
      showToast('Erreur lors de la mise à jour de l\'utilisateur.', 'error');
    }
  };

  const disableMember = async (memberId: number) => {
    try {
      await settingsService.removeTeamMember(memberId);
      setTeam((prev) => prev.map((m) => (m.id === memberId ? { ...m, is_active: false } : m)));
      showToast('Utilisateur désactivé.');
    } catch {
      showToast('Impossible de désactiver cet utilisateur.', 'error');
    }
  };

  const submitEmail = async () => {
    if (!emailForm.email || !emailForm.current_password) return;
    try {
      await settingsService.updateLoginEmail(emailForm);
      showToast('Adresse email de connexion mise à jour.');
      setEmailForm((prev) => ({ ...prev, current_password: '' }));
    } catch {
      showToast('Mise à jour email refusée. Vérifiez votre mot de passe actuel.', 'error');
    }
  };

  const submitPassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password) return;
    try {
      await settingsService.updatePassword(passwordForm);
      showToast('Mot de passe modifié avec succès.');
      setPasswordForm({ current_password: '', new_password: '' });
    } catch {
      showToast('Impossible de modifier le mot de passe.', 'error');
    }
  };

  const backToConnectedSpace = () => {
    if (typeof window === 'undefined') {
      router.push('/dashboard');
      return;
    }
    const referrer = document.referrer;
    const hasInternalReferrer = referrer && referrer.startsWith(window.location.origin);
    const fromPublicPage = referrer.includes('/login') || referrer.endsWith('/') || referrer.includes('/register');
    if (hasInternalReferrer && !fromPublicPage) {
      router.back();
      return;
    }
    router.push('/dashboard');
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-slate-500">Chargement des paramètres...</div>;
  }
  if (!company) {
    return <div className="p-6 text-red-600">Entreprise introuvable.</div>;
  }

  const saveButton = (
    <button
      onClick={saveCompany}
      disabled={saving}
      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
    >
      {saving ? 'Enregistrement...' : 'Enregistrer'}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <div className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Configuration de votre compte</h1>
            <p className="mt-1 text-sm text-slate-500">Optimisez entreprise, documents et accès équipe.</p>
          </div>
          <div className="flex items-center gap-3">
            {saved && <span className="text-sm font-medium text-emerald-600">Modifications enregistrées</span>}
            <button
              onClick={backToConnectedSpace}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Retour à l&apos;espace connecté
            </button>
            {saveButton}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-6 py-8">
        <aside className="w-64 shrink-0 rounded-xl border border-slate-200 bg-white p-2">
          {[
            { id: 'entreprise', label: 'Mon entreprise' },
            { id: 'documents', label: 'Mes documents' },
            { id: 'utilisateurs', label: 'Utilisateurs' },
            { id: 'connexion', label: 'Connexion' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setMainTab(item.id as MainTab)}
              className={`w-full rounded-lg px-4 py-2.5 text-left text-sm ${mainTab === item.id ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              {item.label}
            </button>
          ))}
        </aside>

        <main className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-7">
          {mainTab === 'entreprise' && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <section>
                <h2 className="mb-4 text-2xl font-bold text-slate-900">Mon entreprise</h2>
                <p className="mb-6 text-sm text-slate-500">Ces données alimentent les documents et les entêtes générés automatiquement.</p>
                <div className="space-y-3">
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Nom entreprise" value={company.name || ''} onChange={(e) => patchCompany({ name: e.target.value })} />
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Adresse" value={company.address || ''} onChange={(e) => patchCompany({ address: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Code postal" value={company.postal_code || ''} onChange={(e) => patchCompany({ postal_code: e.target.value })} />
                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Ville" value={company.city || ''} onChange={(e) => patchCompany({ city: e.target.value })} />
                  </div>
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Téléphone" value={company.phone || ''} onChange={(e) => patchCompany({ phone: e.target.value })} />
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Email entreprise" value={company.email || ''} onChange={(e) => patchCompany({ email: e.target.value })} />
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Site web" value={company.website || ''} onChange={(e) => patchCompany({ website: e.target.value })} />
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="SIRET" value={company.siret || ''} onChange={(e) => patchCompany({ siret: e.target.value })} />
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="TVA intracommunautaire" value={company.vat_number || ''} onChange={(e) => patchCompany({ vat_number: e.target.value })} />
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-lg font-semibold text-slate-900">Logo</h3>
                <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  {(logoPreview || company.logo_url) && (
                    <Image
                      src={logoPreview || toAbsUrl(company.logo_url) || ''}
                      alt="Logo"
                      width={240}
                      height={96}
                      className="mx-auto mb-3 max-h-24 w-auto object-contain"
                      unoptimized
                    />
                  )}
                  <label className="inline-flex cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Choisir un logo
                    <input className="hidden" type="file" accept="image/*" onChange={uploadLogo} />
                  </label>
                </div>

                <h3 className="mb-3 mt-6 text-lg font-semibold text-slate-900">Banque & mentions</h3>
                <div className="space-y-3">
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="IBAN" value={company.iban || ''} onChange={(e) => patchCompany({ iban: e.target.value })} />
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="BIC" value={company.bic || ''} onChange={(e) => patchCompany({ bic: e.target.value })} />
                  <textarea className="h-32 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Mentions légales" value={company.legal_mentions || ''} onChange={(e) => patchCompany({ legal_mentions: e.target.value })} />
                </div>
              </section>
            </div>
          )}

          {mainTab === 'documents' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
              <aside className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                {[
                  { id: 'entetes', label: 'Entêtes' },
                  { id: 'pieds', label: 'Pieds de pages' },
                  { id: 'devis', label: 'Devis' },
                  { id: 'factures', label: 'Factures' },
                  { id: 'cgv', label: 'CGV' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setDocumentTab(item.id as DocumentTab)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${documentTab === item.id ? 'bg-white font-semibold text-blue-700 shadow-sm' : 'text-slate-700 hover:bg-white'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </aside>

              <section>
                {documentTab === 'entetes' && (
                  <div>
                    <h2 className="mb-2 text-2xl font-bold text-slate-900">Entêtes</h2>
                    <p className="mb-4 text-sm text-slate-500">Choisissez entre génération automatique ou texte libre, comme sur Obat.</p>
                    <div className="mb-4 space-y-2">
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="radio" checked={headerMode === 'auto'} onChange={() => setVisual('header_mode', 'auto')} />
                        Texte généré automatiquement
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="radio" checked={headerMode === 'free'} onChange={() => setVisual('header_mode', 'free')} />
                        Texte libre
                      </label>
                    </div>
                    <textarea
                      className="h-56 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={headerMode === 'auto' ? headerAutoText : company.header_text || ''}
                      onChange={(e) => patchCompany({ header_text: e.target.value })}
                      disabled={headerMode === 'auto'}
                    />
                  </div>
                )}

                {documentTab === 'pieds' && (
                  <div>
                    <h2 className="mb-2 text-2xl font-bold text-slate-900">Pieds de pages</h2>
                    <p className="mb-4 text-sm text-slate-500">Le mode automatique construit un pied propre à partir de vos données entreprise.</p>
                    <div className="mb-4 space-y-2">
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="radio" checked={footerMode === 'auto'} onChange={() => setVisual('footer_mode', 'auto')} />
                        Texte généré automatiquement
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="radio" checked={footerMode === 'free'} onChange={() => setVisual('footer_mode', 'free')} />
                        Texte libre
                      </label>
                    </div>
                    <textarea
                      className="h-56 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={footerMode === 'auto' ? footerAutoText : company.footer_text || ''}
                      onChange={(e) => patchCompany({ footer_text: e.target.value })}
                      disabled={footerMode === 'auto'}
                    />
                  </div>
                )}

                {documentTab === 'devis' && (
                  <div className="max-w-2xl space-y-4">
                    <h2 className="text-2xl font-bold text-slate-900">Devis</h2>
                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Préfixe devis" value={company.quote_prefix || 'DE'} onChange={(e) => patchCompany({ quote_prefix: e.target.value })} />
                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" type="number" min={1} placeholder="Prochain numéro" value={company.next_quote_number ?? 1} onChange={(e) => patchCompany({ next_quote_number: parseInt(e.target.value, 10) || 1 })} />
                    <textarea className="h-36 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Conditions par défaut" value={company.default_conditions || ''} onChange={(e) => patchCompany({ default_conditions: e.target.value })} />
                  </div>
                )}

                {documentTab === 'factures' && (
                  <div className="max-w-2xl space-y-4">
                    <h2 className="text-2xl font-bold text-slate-900">Factures</h2>
                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Préfixe facture" value={company.invoice_prefix || 'FA'} onChange={(e) => patchCompany({ invoice_prefix: e.target.value })} />
                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" type="number" min={1} placeholder="Prochain numéro" value={company.next_invoice_number ?? 1} onChange={(e) => patchCompany({ next_invoice_number: parseInt(e.target.value, 10) || 1 })} />
                    <textarea className="h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Modalités de paiement" value={company.default_payment_terms || ''} onChange={(e) => patchCompany({ default_payment_terms: e.target.value })} />
                  </div>
                )}

                {documentTab === 'cgv' && (
                  <div>
                    <h2 className="mb-2 text-2xl font-bold text-slate-900">CGV</h2>
                    <p className="mb-4 text-sm text-slate-500">Ajoutez votre PDF de CGV pour l&apos;afficher et le partager.</p>
                    {company.cgv_url ? (
                      <a className="mb-4 inline-block text-sm font-medium text-blue-600 hover:underline" href={toAbsUrl(company.cgv_url) || '#'} target="_blank" rel="noreferrer">
                        Voir le PDF actuel
                      </a>
                    ) : (
                      <div className="mb-4 text-sm text-slate-500">Aucun PDF de CGV uploadé.</div>
                    )}
                    <label className="inline-flex cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      Uploader un PDF
                      <input className="hidden" type="file" accept="application/pdf" onChange={uploadCgv} />
                    </label>
                  </div>
                )}
              </section>
            </div>
          )}

          {mainTab === 'utilisateurs' && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Utilisateurs</h2>
              <p className="mt-1 text-sm text-slate-500">Gestion d&apos;équipe inspirée Obat : rôles, activation et onboarding rapide.</p>

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Inviter un utilisateur</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
                  <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Email" value={newMember.email} onChange={(e) => setNewMember((prev) => ({ ...prev, email: e.target.value }))} />
                  <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Prénom" value={newMember.first_name} onChange={(e) => setNewMember((prev) => ({ ...prev, first_name: e.target.value }))} />
                  <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Nom" value={newMember.last_name} onChange={(e) => setNewMember((prev) => ({ ...prev, last_name: e.target.value }))} />
                  <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={newMember.role} onChange={(e) => setNewMember((prev) => ({ ...prev, role: e.target.value as TeamRole }))}>
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>{ROLE_LABEL[role]}</option>
                    ))}
                  </select>
                  <button onClick={createMember} disabled={memberCreating} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                    {memberCreating ? 'Création...' : 'Inviter'}
                  </button>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Nom</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Rôle</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.map((member) => (
                      <tr key={member.id} className="border-t border-slate-200">
                        <td className="px-4 py-3">{`${member.first_name || ''} ${member.last_name || ''}`.trim() || '-'}</td>
                        <td className="px-4 py-3">{member.email}</td>
                        <td className="px-4 py-3">
                          {member.role === 'owner' ? (
                            <span className="font-medium text-slate-700">Propriétaire</span>
                          ) : (
                            <select
                              className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                              value={member.role}
                              onChange={(e) => setTeam((prev) => prev.map((u) => (u.id === member.id ? { ...u, role: e.target.value as TeamRole } : u)))}
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role} value={role}>{ROLE_LABEL[role]}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={member.is_active} onChange={(e) => setTeam((prev) => prev.map((u) => (u.id === member.id ? { ...u, is_active: e.target.checked } : u)))} />
                            <span className={member.is_active ? 'text-emerald-600' : 'text-slate-500'}>{member.is_active ? 'Actif' : 'Inactif'}</span>
                          </label>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => updateMember(member)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Mettre à jour</button>
                            {member.role !== 'owner' && (
                              <button onClick={() => disableMember(member.id)} className="rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">Désactiver</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {mainTab === 'connexion' && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <section>
                <h2 className="mb-2 text-2xl font-bold text-slate-900">Connexion</h2>
                <p className="mb-4 text-sm text-slate-500">Modifiez l&apos;adresse email de connexion du compte.</p>
                <div className="space-y-3">
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" type="email" placeholder="Nouvelle adresse email" value={emailForm.email} onChange={(e) => setEmailForm((prev) => ({ ...prev, email: e.target.value }))} />
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" type="password" placeholder="Mot de passe actuel" value={emailForm.current_password} onChange={(e) => setEmailForm((prev) => ({ ...prev, current_password: e.target.value }))} />
                  <button onClick={submitEmail} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Enregistrer</button>
                </div>
              </section>

              <section>
                <h2 className="mb-2 text-2xl font-bold text-slate-900">Changer de mot de passe</h2>
                <p className="mb-4 text-sm text-slate-500">Pour la sécurité, confirmez d&apos;abord votre mot de passe actuel.</p>
                <div className="space-y-3">
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" type="password" placeholder="Mot de passe actuel" value={passwordForm.current_password} onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))} />
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" type="password" placeholder="Nouveau mot de passe (8 caractères min.)" value={passwordForm.new_password} onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))} />
                  <button onClick={submitPassword} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Changer de mot de passe</button>
                </div>
              </section>
            </div>
          )}

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button onClick={load} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Annuler</button>
            {saveButton}
          </div>
        </main>
      </div>
    </div>
  );
}
