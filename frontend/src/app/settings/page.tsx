'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE_URL, settingsService } from '@/services/api';

type MainTab = 'entreprise' | 'documents' | 'numerotation' | 'utilisateurs' | 'connexion';
type DocumentTab = 'entetes' | 'pieds' | 'conditions' | 'cgv';
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
  rm_number?: string;
  capital?: number | null;
  ape_code?: string;
  vat_subject?: boolean;
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

const ROLE_COLOR: Record<TeamRole, string> = {
  owner: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  commercial: 'bg-emerald-100 text-emerald-700',
  chef_chantier: 'bg-orange-100 text-orange-700',
  ouvrier: 'bg-slate-100 text-slate-700',
};

const teamInitials = (m: TeamMember) => {
  const f = m.first_name?.[0] || '';
  const l = m.last_name?.[0] || '';
  return (f + l).toUpperCase() || m.email[0].toUpperCase();
};

// ─── Icons ──────────────────────────────────────────────────────────────────

const IconBuilding = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);
const IconDocument = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const IconHash = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
  </svg>
);
const IconUsers = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconLock = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);
const IconCheckSmall = () => (
  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

// ─── Shared sub-components ────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors';

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 border-b border-slate-100 pb-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

// Mini A4 preview
function MiniA4Preview({
  header,
  footer,
  companyName,
}: {
  header: string;
  footer: string;
  companyName?: string;
}) {
  return (
    <div
      className="mx-auto w-full max-w-xs overflow-hidden rounded border border-slate-200 bg-white shadow-lg"
      style={{ aspectRatio: '210/297', display: 'flex', flexDirection: 'column', padding: '10px' }}
    >
      {header && (
        <div
          style={{
            borderBottom: '0.5px solid #e2e8f0',
            paddingBottom: '6px',
            marginBottom: '6px',
            fontSize: '5px',
            color: '#374151',
            whiteSpace: 'pre-line',
            lineHeight: 1.6,
            fontFamily: 'monospace',
          }}
        >
          {header.slice(0, 250)}
        </div>
      )}
      {/* Fake doc content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: '7px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
          DEVIS N° DE-2026-001
        </div>
        {[70, 50, 85, 40].map((w, i) => (
          <div
            key={i}
            style={{ height: '3px', width: `${w}%`, backgroundColor: '#e5e7eb', borderRadius: '2px', marginBottom: '3px' }}
          />
        ))}
        <div
          style={{
            marginTop: '6px',
            border: '0.5px solid #e5e7eb',
            borderRadius: '3px',
            padding: '3px',
            fontSize: '4px',
            color: '#6b7280',
          }}
        >
          {[
            ['Pose fenêtre double vitrage', '850 €'],
            ['Main-d\'œuvre 12h', '480 €'],
          ].map(([d, p], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5px' }}>
              <span>{d}</span>
              <span>{p}</span>
            </div>
          ))}
          <div
            style={{
              borderTop: '0.5px solid #d1d5db',
              marginTop: '2px',
              paddingTop: '2px',
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 700,
              color: '#111827',
            }}
          >
            <span>TOTAL TTC</span>
            <span>1 596 €</span>
          </div>
        </div>
      </div>
      {footer && (
        <div
          style={{
            borderTop: '0.5px solid #e2e8f0',
            paddingTop: '5px',
            marginTop: '5px',
            fontSize: '4px',
            color: '#6b7280',
            whiteSpace: 'pre-line',
            lineHeight: 1.5,
            fontFamily: 'monospace',
          }}
        >
          {footer.slice(0, 350)}
        </div>
      )}
      {!header && !footer && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '6px',
            color: '#94a3b8',
            textAlign: 'center',
          }}
        >
          {companyName || 'Aperçu PDF'}
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [mainTab, setMainTab] = useState<MainTab>('entreprise');
  const [documentTab, setDocumentTab] = useState<DocumentTab>('entetes');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as MainTab | null;
    const doc = params.get('doc') as DocumentTab | null;
    if (tab) setMainTab(tab);
    if (doc) setDocumentTab(doc);
  }, []);

  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showNewMemberForm, setShowNewMemberForm] = useState(false);

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

  const patchCompany = (data: Partial<CompanySettings>) =>
    setCompany((prev) => (prev ? { ...prev, ...data } : prev));

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  const visuals = useMemo<Record<string, string>>(() => {
    try {
      return company?.visuals_json ? JSON.parse(company.visuals_json) : {};
    } catch {
      return {};
    }
  }, [company?.visuals_json]);

  const setVisual = (key: string, value: string) =>
    patchCompany({ visuals_json: JSON.stringify({ ...visuals, [key]: value }) });

  const headerAutoText = useMemo(() => {
    if (!company) return '';
    const lines: string[] = [];
    if (company.name) lines.push(company.name);
    const addr = [
      company.address,
      [company.postal_code, company.city].filter(Boolean).join(' '),
    ]
      .filter(Boolean)
      .join(', ');
    if (addr) lines.push(addr);
    if (company.siret) lines.push(`SIRET : ${company.siret}`);
    if (company.vat_number) lines.push(`TVA : ${company.vat_number}`);
    if (company.phone) lines.push(`Tél : ${company.phone}`);
    if (company.email) lines.push(company.email);
    if (company.website) lines.push(company.website);
    return lines.join('\n');
  }, [company]);

  const footerAutoText = useMemo(() => {
    if (!company) return '';
    const lines: string[] = [];
    const l1 = [
      company.name,
      company.address,
      [company.postal_code, company.city].filter(Boolean).join(' '),
    ]
      .filter(Boolean)
      .join(' – ');
    if (l1) lines.push(l1);
    const legal = [
      company.capital ? `Capital ${company.capital.toLocaleString('fr-FR')} €` : '',
      company.rcs_city ? `RCS ${company.rcs_city}` : '',
      company.siret ? `SIRET ${company.siret}` : '',
    ]
      .filter(Boolean)
      .join(' – ');
    if (legal) lines.push(legal);
    const contact = [company.phone, company.email, company.website].filter(Boolean).join(' – ');
    if (contact) lines.push(contact);
    if (company.legal_mentions) lines.push(company.legal_mentions);
    return lines.join('\n');
  }, [company]);

  const headerMode: HeaderMode = (visuals.header_mode as HeaderMode) || 'auto';
  const footerMode: FooterMode = (visuals.footer_mode as FooterMode) || 'auto';
  const liveHeader = headerMode === 'auto' ? headerAutoText : company?.header_text || '';
  const liveFooter = footerMode === 'auto' ? footerAutoText : company?.footer_text || '';

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, tRes] = await Promise.all([
        settingsService.getCompany(),
        settingsService.getTeam(),
      ]);
      if (cRes.success) {
        setCompany(cRes.data as CompanySettings);
        setEmailForm((p) => ({ ...p, email: (cRes.data as CompanySettings).email || '' }));
      }
      if (tRes.success) setTeam((tRes.data || []) as TeamMember[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      timerRef.current = setTimeout(() => setSaved(false), 2500);
      showToast('Paramètres enregistrés avec succès.');
    } catch {
      showToast('Erreur lors de la sauvegarde.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    try {
      const r = await settingsService.uploadLogo(file);
      if (r.success && r.data) {
        patchCompany({ logo_url: r.data.logo_url });
        showToast('Logo mis à jour.');
      }
    } catch {
      showToast('Erreur upload logo.', 'error');
    }
  };

  const uploadCgv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const r = await settingsService.uploadCgv(file);
      if (r.success && r.data) {
        patchCompany({ cgv_url: r.data.cgv_url });
        showToast('CGV uploadées avec succès.');
      }
    } catch {
      showToast('Erreur upload CGV.', 'error');
    }
  };

  const createMember = async () => {
    if (!newMember.email.trim()) return;
    setMemberCreating(true);
    try {
      const r = await settingsService.createTeamMember(newMember);
      if (r.success && r.data) {
        setTeam((p) => [...p, r.data as TeamMember]);
        setNewMember({ email: '', first_name: '', last_name: '', phone: '', role: 'ouvrier' });
        setShowNewMemberForm(false);
        const tmp = (r.data as TeamMember).temporary_password;
        showToast(
          tmp
            ? `Utilisateur créé. Mot de passe temporaire : ${tmp}`
            : 'Utilisateur créé avec succès.'
        );
      }
    } catch {
      showToast("Impossible de créer l'utilisateur.", 'error');
    } finally {
      setMemberCreating(false);
    }
  };

  const updateMember = async (member: TeamMember) => {
    try {
      const r = await settingsService.updateTeamMember(member.id, {
        first_name: member.first_name,
        last_name: member.last_name,
        phone: member.phone,
        role: member.role,
        is_active: member.is_active,
      });
      if (r.success && r.data) {
        setTeam((p) => p.map((m) => (m.id === member.id ? (r.data as TeamMember) : m)));
        showToast('Utilisateur mis à jour.');
      }
    } catch {
      showToast('Erreur mise à jour utilisateur.', 'error');
    }
  };

  const disableMember = async (memberId: number) => {
    try {
      await settingsService.removeTeamMember(memberId);
      setTeam((p) => p.map((m) => (m.id === memberId ? { ...m, is_active: false } : m)));
      showToast('Utilisateur désactivé.');
    } catch {
      showToast('Impossible de désactiver.', 'error');
    }
  };

  const submitEmail = async () => {
    if (!emailForm.email || !emailForm.current_password) return;
    try {
      await settingsService.updateLoginEmail(emailForm);
      showToast('Email de connexion mis à jour.');
      setEmailForm((p) => ({ ...p, current_password: '' }));
    } catch {
      showToast('Refusé. Vérifiez votre mot de passe actuel.', 'error');
    }
  };

  const submitPassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password) return;
    if (passwordForm.new_password.length < 8) {
      showToast('Le nouveau mot de passe doit faire au moins 8 caractères.', 'error');
      return;
    }
    try {
      await settingsService.updatePassword(passwordForm);
      showToast('Mot de passe modifié.');
      setPasswordForm({ current_password: '', new_password: '' });
    } catch {
      showToast('Impossible de modifier le mot de passe.', 'error');
    }
  };

  const backToConnectedSpace = () => {
    if (typeof window !== 'undefined') {
      const ref = document.referrer;
      if (ref && ref.startsWith(window.location.origin) && !ref.includes('/login')) {
        router.back();
        return;
      }
    }
    router.push('/dashboard');
  };

  // ─── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <p className="text-sm text-slate-500">Chargement des paramètres…</p>
      </div>
    );
  }

  if (!company) {
    return <div className="p-8 text-red-600">Entreprise introuvable.</div>;
  }

  // ─── Config completeness ───────────────────────────────────────────────────

  const completenessItems = [
    { label: 'Logo', ready: Boolean(company.logo_url), link: '?tab=entreprise' },
    { label: 'En-tête', ready: Boolean(liveHeader), link: '?tab=documents&doc=entetes' },
    { label: 'Pied de page', ready: Boolean(liveFooter), link: '?tab=documents&doc=pieds' },
    { label: 'Conditions', ready: Boolean(company.default_conditions), link: '?tab=documents&doc=conditions' },
    { label: 'Paiement', ready: Boolean(company.default_payment_terms), link: '?tab=documents&doc=conditions' },
    { label: 'IBAN', ready: Boolean(company.iban), link: '?tab=entreprise' },
  ];
  const readyCount = completenessItems.filter((i) => i.ready).length;

  const MAIN_TABS: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'entreprise', label: 'Mon entreprise', icon: <IconBuilding /> },
    { id: 'documents', label: 'Mes documents', icon: <IconDocument /> },
    { id: 'numerotation', label: 'Numérotation', icon: <IconHash /> },
    { id: 'utilisateurs', label: 'Équipe', icon: <IconUsers /> },
    { id: 'connexion', label: 'Connexion', icon: <IconLock /> },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toast.type === 'success' && <IconCheckSmall />}
          {toast.msg}
        </div>
      )}

      {/* Sticky header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={backToConnectedSpace}
              className="flex items-center gap-1.5 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              title="Retour"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-base font-bold text-slate-900">Paramètres</h1>
              {company.name && <p className="text-xs text-slate-500">{company.name}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick navigation links */}
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/quotes"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Devis
              </Link>
              <Link
                href="/invoices"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Factures
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Tableau de bord
              </Link>
            </div>

            {saved && (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <IconCheckSmall /> Enregistré
              </span>
            )}
            <button
              onClick={saveCompany}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-opacity"
            >
              {saving ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Enregistrement…
                </>
              ) : (
                'Enregistrer'
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-6">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 space-y-4">
          <nav className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {MAIN_TABS.map((item) => (
              <button
                key={item.id}
                onClick={() => setMainTab(item.id)}
                className={`flex w-full items-center gap-3 border-r-2 px-4 py-3 text-left text-sm transition-colors ${
                  mainTab === item.id
                    ? 'border-blue-600 bg-blue-50 font-semibold text-blue-700'
                    : 'border-transparent text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={mainTab === item.id ? 'text-blue-600' : 'text-slate-400'}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </nav>

          {/* PDF completeness widget */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">Complétude PDF</p>
              <span className="text-xs font-bold text-slate-900">{readyCount}/6</span>
            </div>
            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${(readyCount / 6) * 100}%` }}
              />
            </div>
            <div className="space-y-1.5">
              {completenessItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-2">
                  <span className={`text-xs ${item.ready ? 'text-slate-600' : 'text-slate-400'}`}>
                    {item.label}
                  </span>
                  {item.ready ? (
                    <span className="text-emerald-500">
                      <IconCheckSmall />
                    </span>
                  ) : (
                    <Link
                      href={`/settings${item.link}`}
                      className="text-xs text-blue-500 hover:underline"
                      onClick={() => {
                        const params = new URLSearchParams(item.link.slice(1));
                        const t = params.get('tab') as MainTab | null;
                        const d = params.get('doc') as DocumentTab | null;
                        if (t) setMainTab(t);
                        if (d) setDocumentTab(d);
                      }}
                    >
                      Compléter
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 space-y-5">

          {/* ═══════════════ Mon entreprise ═══════════════ */}
          {mainTab === 'entreprise' && (
            <>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Mon entreprise</h2>
                <p className="text-sm text-slate-500">
                  Ces informations alimentent vos devis, factures et documents PDF.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* Coordonnées */}
                <SectionCard
                  title="Coordonnées"
                  description="Nom, adresse et contacts affichés sur vos documents"
                >
                  <div className="space-y-3">
                    <Field label="Nom de l'entreprise *">
                      <input
                        className={inputCls}
                        placeholder="Ex : BTP Pro SAS"
                        value={company.name || ''}
                        onChange={(e) => patchCompany({ name: e.target.value })}
                      />
                    </Field>
                    <Field label="Adresse">
                      <input
                        className={inputCls}
                        placeholder="Ex : 12 Rue de la Paix"
                        value={company.address || ''}
                        onChange={(e) => patchCompany({ address: e.target.value })}
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Code postal">
                        <input
                          className={inputCls}
                          placeholder="75001"
                          value={company.postal_code || ''}
                          onChange={(e) => patchCompany({ postal_code: e.target.value })}
                        />
                      </Field>
                      <Field label="Ville">
                        <input
                          className={inputCls}
                          placeholder="Paris"
                          value={company.city || ''}
                          onChange={(e) => patchCompany({ city: e.target.value })}
                        />
                      </Field>
                    </div>
                    <Field label="Téléphone">
                      <input
                        className={inputCls}
                        placeholder="06 00 00 00 00"
                        value={company.phone || ''}
                        onChange={(e) => patchCompany({ phone: e.target.value })}
                      />
                    </Field>
                    <Field label="Email de contact">
                      <input
                        className={inputCls}
                        type="email"
                        placeholder="contact@entreprise.fr"
                        value={company.email || ''}
                        onChange={(e) => patchCompany({ email: e.target.value })}
                      />
                    </Field>
                    <Field label="Site web">
                      <input
                        className={inputCls}
                        placeholder="https://www.entreprise.fr"
                        value={company.website || ''}
                        onChange={(e) => patchCompany({ website: e.target.value })}
                      />
                    </Field>
                  </div>
                </SectionCard>

                {/* Logo */}
                <SectionCard title="Logo" description="Apparaît en haut de chaque document PDF">
                  <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                    {logoPreview || company.logo_url ? (
                      <div className="mb-4">
                        <Image
                          src={logoPreview || toAbsUrl(company.logo_url) || ''}
                          alt="Logo entreprise"
                          width={240}
                          height={96}
                          className="mx-auto max-h-20 w-auto object-contain"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-slate-200 text-slate-400">
                        <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                      </div>
                    )}
                    <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                      {company.logo_url ? 'Changer le logo' : 'Ajouter un logo'}
                      <input className="hidden" type="file" accept="image/*" onChange={uploadLogo} />
                    </label>
                    <p className="mt-2 text-xs text-slate-400">PNG, JPG, SVG • max 2 Mo</p>
                  </div>

                  {/* Bank quick-fill in same column */}
                  <div className="mt-5 space-y-3">
                    <div className="border-b border-slate-100 pb-2">
                      <p className="text-xs font-semibold text-slate-700">Coordonnées bancaires</p>
                      <p className="text-xs text-slate-400">Affichées sur les factures</p>
                    </div>
                    <Field label="IBAN">
                      <input
                        className={inputCls}
                        placeholder="FR76 1234 5678 9012 3456 7890 123"
                        value={company.iban || ''}
                        onChange={(e) => patchCompany({ iban: e.target.value })}
                      />
                    </Field>
                    <Field label="BIC / SWIFT">
                      <input
                        className={inputCls}
                        placeholder="BNPAFRPP"
                        value={company.bic || ''}
                        onChange={(e) => patchCompany({ bic: e.target.value })}
                      />
                    </Field>
                    {company.iban && (
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                        <IconCheckSmall />
                        Coordonnées bancaires prêtes pour vos factures
                      </div>
                    )}
                  </div>
                </SectionCard>

                {/* Identité juridique */}
                <SectionCard
                  title="Identité juridique"
                  description="Mentions légales obligatoires sur vos documents"
                >
                  <div className="space-y-3">
                    <Field label="SIRET">
                      <input
                        className={inputCls}
                        placeholder="123 456 789 00012"
                        value={company.siret || ''}
                        onChange={(e) => patchCompany({ siret: e.target.value })}
                      />
                    </Field>
                    <Field label="N° TVA intracommunautaire">
                      <input
                        className={inputCls}
                        placeholder="FR12 345678901"
                        value={company.vat_number || ''}
                        onChange={(e) => patchCompany({ vat_number: e.target.value })}
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Ville RCS">
                        <input
                          className={inputCls}
                          placeholder="Paris"
                          value={company.rcs_city || ''}
                          onChange={(e) => patchCompany({ rcs_city: e.target.value })}
                        />
                      </Field>
                      <Field label="Capital social (€)">
                        <input
                          className={inputCls}
                          type="number"
                          min={0}
                          placeholder="10000"
                          value={company.capital ?? ''}
                          onChange={(e) =>
                            patchCompany({ capital: parseFloat(e.target.value) || null })
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Code APE / NAF">
                      <input
                        className={inputCls}
                        placeholder="4321A"
                        value={company.ape_code || ''}
                        onChange={(e) => patchCompany({ ape_code: e.target.value })}
                      />
                    </Field>
                    <Field label="Mentions légales additionnelles">
                      <textarea
                        className={`${inputCls} h-20`}
                        placeholder="Ex : Exonéré de TVA – Art. 293B du CGI"
                        value={company.legal_mentions || ''}
                        onChange={(e) => patchCompany({ legal_mentions: e.target.value })}
                      />
                    </Field>
                  </div>
                </SectionCard>
              </div>
            </>
          )}

          {/* ═══════════════ Mes documents ═══════════════ */}
          {mainTab === 'documents' && (
            <>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Mes documents</h2>
                <p className="text-sm text-slate-500">
                  Personnalisez l&apos;apparence et le contenu de vos devis et factures PDF.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[200px_1fr]">
                {/* Doc sub-nav */}
                <nav className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {[
                    { id: 'entetes', label: 'En-têtes' },
                    { id: 'pieds', label: 'Pieds de page' },
                    { id: 'conditions', label: 'Conditions & paiement' },
                    { id: 'cgv', label: 'CGV' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setDocumentTab(item.id as DocumentTab)}
                      className={`flex w-full items-center border-r-2 px-4 py-3 text-left text-sm transition-colors ${
                        documentTab === item.id
                          ? 'border-blue-600 bg-blue-50 font-semibold text-blue-700'
                          : 'border-transparent text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>

                <div>
                  {/* En-têtes */}
                  {documentTab === 'entetes' && (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      <SectionCard
                        title="En-tête des documents"
                        description="Apparaît en haut de chaque devis et facture PDF"
                      >
                        <div className="mb-4 grid grid-cols-2 gap-2">
                          {(['auto', 'free'] as HeaderMode[]).map((mode) => (
                            <label
                              key={mode}
                              className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-sm transition-colors ${
                                headerMode === mode
                                  ? 'border-blue-400 bg-blue-50 font-semibold text-blue-700'
                                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="radio"
                                className="hidden"
                                checked={headerMode === mode}
                                onChange={() => setVisual('header_mode', mode)}
                              />
                              {mode === 'auto' ? 'Automatique' : 'Texte libre'}
                            </label>
                          ))}
                        </div>
                        {headerMode === 'auto' && (
                          <div className="mb-3 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
                            <span>ℹ️</span>
                            <span>
                              Généré depuis <button onClick={() => setMainTab('entreprise')} className="font-semibold underline">vos coordonnées entreprise</button>.
                            </span>
                          </div>
                        )}
                        <textarea
                          className={`${inputCls} h-44 font-mono`}
                          value={liveHeader}
                          onChange={(e) => patchCompany({ header_text: e.target.value })}
                          disabled={headerMode === 'auto'}
                          placeholder="Texte de l'en-tête…"
                        />
                      </SectionCard>

                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Aperçu PDF en direct
                        </p>
                        <MiniA4Preview header={liveHeader} footer="" companyName={company.name} />
                      </div>
                    </div>
                  )}

                  {/* Pieds de page */}
                  {documentTab === 'pieds' && (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      <SectionCard
                        title="Pied de page"
                        description="Mentions légales, RCS, SIRET, coord. bancaires…"
                      >
                        <div className="mb-4 grid grid-cols-2 gap-2">
                          {(['auto', 'free'] as FooterMode[]).map((mode) => (
                            <label
                              key={mode}
                              className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-sm transition-colors ${
                                footerMode === mode
                                  ? 'border-blue-400 bg-blue-50 font-semibold text-blue-700'
                                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="radio"
                                className="hidden"
                                checked={footerMode === mode}
                                onChange={() => setVisual('footer_mode', mode)}
                              />
                              {mode === 'auto' ? 'Automatique' : 'Texte libre'}
                            </label>
                          ))}
                        </div>
                        {footerMode === 'auto' && (
                          <div className="mb-3 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
                            <span>ℹ️</span>
                            <span>
                              Construit à partir de votre nom, RCS, SIRET, capital et contacts.
                            </span>
                          </div>
                        )}
                        <textarea
                          className={`${inputCls} h-44 font-mono`}
                          value={liveFooter}
                          onChange={(e) => patchCompany({ footer_text: e.target.value })}
                          disabled={footerMode === 'auto'}
                          placeholder="Texte du pied de page…"
                        />
                      </SectionCard>

                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Aperçu PDF en direct
                        </p>
                        <MiniA4Preview header="" footer={liveFooter} companyName={company.name} />
                      </div>
                    </div>
                  )}

                  {/* Conditions & paiement */}
                  {documentTab === 'conditions' && (
                    <div className="space-y-5">
                      <SectionCard
                        title="Conditions générales par défaut"
                        description="Pré-remplies dans chaque nouveau devis — modifiables devis par devis"
                      >
                        <textarea
                          className={`${inputCls} h-44`}
                          placeholder="Ex : Le présent devis est valable 30 jours à compter de sa date d'émission…"
                          value={company.default_conditions || ''}
                          onChange={(e) => patchCompany({ default_conditions: e.target.value })}
                        />
                        <div className="mt-1 flex items-center justify-between">
                          <Link
                            href="/quotes/new"
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            Créer un devis avec ces conditions →
                          </Link>
                          <p className="text-xs text-slate-400">
                            {(company.default_conditions || '').length} cars
                          </p>
                        </div>
                      </SectionCard>

                      <SectionCard
                        title="Modalités de paiement par défaut"
                        description="Pré-remplies dans chaque nouvelle facture — modifiables facture par facture"
                      >
                        <textarea
                          className={`${inputCls} h-28`}
                          placeholder="Ex : Paiement à 30 jours. Pénalités de retard : 3× taux légal. Escompte : néant."
                          value={company.default_payment_terms || ''}
                          onChange={(e) => patchCompany({ default_payment_terms: e.target.value })}
                        />
                        <div className="mt-1 flex items-center justify-between">
                          <Link
                            href="/invoices/new"
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            Créer une facture →
                          </Link>
                          <p className="text-xs text-slate-400">
                            {(company.default_payment_terms || '').length} cars
                          </p>
                        </div>
                      </SectionCard>

                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                        <p className="font-semibold">Utilisation dans l&apos;application</p>
                        <ul className="mt-2 space-y-1 text-xs">
                          <li>
                            • Les <strong>conditions générales</strong> sont copiées dans chaque nouveau devis et éditables au cas par cas.
                          </li>
                          <li>
                            • Les <strong>modalités de paiement</strong> apparaissent en bas de chaque facture.
                          </li>
                          <li>
                            • Si une CGV (PDF) est uploadée, un lien y est automatiquement ajouté.
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* CGV */}
                  {documentTab === 'cgv' && (
                    <SectionCard
                      title="Conditions Générales de Vente (PDF)"
                      description="Uploadez votre PDF de CGV pour l'annexer ou le référencer dans vos documents"
                    >
                      <div className="space-y-4">
                        {company.cgv_url ? (
                          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                              <IconDocument />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-emerald-800">
                                CGV configurées
                              </p>
                              <a
                                href={toAbsUrl(company.cgv_url) || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-medium text-emerald-600 underline"
                              >
                                Voir le PDF actuel
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                            <svg
                              className="mx-auto mb-3 h-10 w-10 text-slate-300"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.5}
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            <p className="text-sm text-slate-500">Aucun PDF de CGV uploadé</p>
                          </div>
                        )}
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          {company.cgv_url ? 'Remplacer le PDF' : 'Uploader les CGV'}
                          <input className="hidden" type="file" accept="application/pdf" onChange={uploadCgv} />
                        </label>
                      </div>
                    </SectionCard>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ═══════════════ Numérotation ═══════════════ */}
          {mainTab === 'numerotation' && (
            <>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Numérotation des documents</h2>
                <p className="text-sm text-slate-500">
                  Définissez les préfixes et la séquence de vos devis et factures.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* Devis */}
                <SectionCard title="Devis" description="Numérotation appliquée sur tous vos nouveaux devis">
                  <div className="space-y-4">
                    <Field label="Préfixe">
                      <input
                        className={inputCls}
                        placeholder="DE"
                        value={company.quote_prefix || 'DE'}
                        onChange={(e) => patchCompany({ quote_prefix: e.target.value })}
                      />
                    </Field>
                    <Field label="Prochain numéro">
                      <input
                        className={inputCls}
                        type="number"
                        min={1}
                        value={company.next_quote_number ?? 1}
                        onChange={(e) =>
                          patchCompany({ next_quote_number: parseInt(e.target.value, 10) || 1 })
                        }
                      />
                    </Field>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                      <span className="text-xs text-slate-500">Prochain numéro généré :</span>
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {company.quote_prefix || 'DE'}-2026-
                        {String(company.next_quote_number ?? 1).padStart(3, '0')}
                      </span>
                    </div>
                    <Link
                      href="/quotes"
                      className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline"
                    >
                      Voir tous les devis →
                    </Link>
                  </div>
                </SectionCard>

                {/* Factures */}
                <SectionCard title="Factures" description="Numérotation appliquée sur toutes vos nouvelles factures">
                  <div className="space-y-4">
                    <Field label="Préfixe">
                      <input
                        className={inputCls}
                        placeholder="FA"
                        value={company.invoice_prefix || 'FA'}
                        onChange={(e) => patchCompany({ invoice_prefix: e.target.value })}
                      />
                    </Field>
                    <Field label="Prochain numéro">
                      <input
                        className={inputCls}
                        type="number"
                        min={1}
                        value={company.next_invoice_number ?? 1}
                        onChange={(e) =>
                          patchCompany({
                            next_invoice_number: parseInt(e.target.value, 10) || 1,
                          })
                        }
                      />
                    </Field>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                      <span className="text-xs text-slate-500">Prochain numéro généré :</span>
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {company.invoice_prefix || 'FA'}-2026-
                        {String(company.next_invoice_number ?? 1).padStart(3, '0')}
                      </span>
                    </div>
                    <Link
                      href="/invoices"
                      className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline"
                    >
                      Voir toutes les factures →
                    </Link>
                  </div>
                </SectionCard>
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">⚠ Attention</p>
                <p className="mt-1 text-xs text-amber-700">
                  Modifier le numéro de départ ne réattribue pas les documents existants. Vérifiez vos
                  archives pour éviter les doublons.
                </p>
              </div>
            </>
          )}

          {/* ═══════════════ Équipe ═══════════════ */}
          {mainTab === 'utilisateurs' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Équipe</h2>
                  <p className="text-sm text-slate-500">Gérez les accès et rôles de votre équipe.</p>
                </div>
                <button
                  onClick={() => setShowNewMemberForm((v) => !v)}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-opacity"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Inviter un utilisateur
                </button>
              </div>

              {showNewMemberForm && (
                <SectionCard title="Inviter un utilisateur">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
                    <Field label="Email *">
                      <input
                        className={inputCls}
                        type="email"
                        placeholder="prenom@entreprise.fr"
                        value={newMember.email}
                        onChange={(e) => setNewMember((p) => ({ ...p, email: e.target.value }))}
                      />
                    </Field>
                    <Field label="Prénom">
                      <input
                        className={inputCls}
                        placeholder="Jean"
                        value={newMember.first_name}
                        onChange={(e) => setNewMember((p) => ({ ...p, first_name: e.target.value }))}
                      />
                    </Field>
                    <Field label="Nom">
                      <input
                        className={inputCls}
                        placeholder="Dupont"
                        value={newMember.last_name}
                        onChange={(e) => setNewMember((p) => ({ ...p, last_name: e.target.value }))}
                      />
                    </Field>
                    <Field label="Rôle">
                      <select
                        className={inputCls}
                        value={newMember.role}
                        onChange={(e) =>
                          setNewMember((p) => ({ ...p, role: e.target.value as TeamRole }))
                        }
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="flex items-end">
                      <button
                        onClick={createMember}
                        disabled={memberCreating || !newMember.email.trim()}
                        className="w-full rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {memberCreating ? 'Création…' : 'Inviter'}
                      </button>
                    </div>
                  </div>
                </SectionCard>
              )}

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {team.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-500">
                    Aucun membre dans l&apos;équipe.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Membre
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Rôle
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Statut
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.map((member, idx) => (
                        <tr
                          key={member.id}
                          className={`border-t border-slate-100 ${idx % 2 === 1 ? 'bg-slate-50/40' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                {teamInitials(member)}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {`${member.first_name || ''} ${member.last_name || ''}`.trim() ||
                                    '—'}
                                </p>
                                <p className="text-xs text-slate-500">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {member.role === 'owner' ? (
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLOR.owner}`}
                              >
                                Propriétaire
                              </span>
                            ) : (
                              <select
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium focus:outline-none"
                                value={member.role}
                                onChange={(e) =>
                                  setTeam((p) =>
                                    p.map((u) =>
                                      u.id === member.id
                                        ? { ...u, role: e.target.value as TeamRole }
                                        : u
                                    )
                                  )
                                }
                              >
                                {ROLE_OPTIONS.map((r) => (
                                  <option key={r} value={r}>
                                    {ROLE_LABEL[r]}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                member.is_active
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  member.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                              {member.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {member.role !== 'owner' && (
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => updateMember(member)}
                                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                  Enregistrer
                                </button>
                                <button
                                  onClick={() => disableMember(member.id)}
                                  className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  Désactiver
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* ═══════════════ Connexion ═══════════════ */}
          {mainTab === 'connexion' && (
            <>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Connexion & Sécurité</h2>
                <p className="text-sm text-slate-500">
                  Modifiez votre email de connexion ou votre mot de passe.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <SectionCard
                  title="Email de connexion"
                  description="Adresse utilisée pour vous connecter à l'application"
                >
                  <div className="space-y-3">
                    <Field label="Nouvelle adresse email">
                      <input
                        className={inputCls}
                        type="email"
                        placeholder="vous@exemple.fr"
                        value={emailForm.email}
                        onChange={(e) => setEmailForm((p) => ({ ...p, email: e.target.value }))}
                      />
                    </Field>
                    <Field label="Mot de passe actuel (confirmation)">
                      <input
                        className={inputCls}
                        type="password"
                        placeholder="••••••••"
                        value={emailForm.current_password}
                        onChange={(e) =>
                          setEmailForm((p) => ({ ...p, current_password: e.target.value }))
                        }
                      />
                    </Field>
                    <button
                      onClick={submitEmail}
                      disabled={!emailForm.email || !emailForm.current_password}
                      className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      Mettre à jour l&apos;email
                    </button>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Changer de mot de passe"
                  description="Choisissez un mot de passe fort d'au moins 8 caractères"
                >
                  <div className="space-y-3">
                    <Field label="Mot de passe actuel">
                      <input
                        className={inputCls}
                        type="password"
                        placeholder="••••••••"
                        value={passwordForm.current_password}
                        onChange={(e) =>
                          setPasswordForm((p) => ({ ...p, current_password: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Nouveau mot de passe">
                      <input
                        className={inputCls}
                        type="password"
                        placeholder="8 caractères minimum"
                        value={passwordForm.new_password}
                        onChange={(e) =>
                          setPasswordForm((p) => ({ ...p, new_password: e.target.value }))
                        }
                      />
                    </Field>
                    {passwordForm.new_password.length > 0 &&
                      passwordForm.new_password.length < 8 && (
                        <p className="flex items-center gap-1 text-xs text-amber-600">
                          ⚠ Le mot de passe est trop court (minimum 8 caractères).
                        </p>
                      )}
                    <button
                      onClick={submitPassword}
                      disabled={
                        !passwordForm.current_password || !passwordForm.new_password
                      }
                      className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      Changer le mot de passe
                    </button>
                  </div>
                </SectionCard>
              </div>
            </>
          )}

          {/* Bottom save bar (skipped on connexion tab — has its own submit buttons) */}
          {mainTab !== 'connexion' && mainTab !== 'utilisateurs' && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
              <p className="text-xs text-slate-500">
                Les modifications ne sont pas automatiquement sauvegardées.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={load}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={saveCompany}
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
