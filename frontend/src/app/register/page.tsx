'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { CompanyLookupField } from '@/components/company/CompanyLookupField';
import { authService } from '@/services/api';
import { CompanyLookupResult } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
    company_name: '',
    company_siret: '',
    company_address: '',
    company_postal_code: '',
    company_city: '',
    company_country: 'France',
    company_ape_code: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.register({
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        company_name: formData.company_name,
        company_siret: formData.company_siret,
        company_address: formData.company_address,
        company_postal_code: formData.company_postal_code,
        company_city: formData.company_city,
        company_country: formData.company_country,
        company_ape_code: formData.company_ape_code,
      });
      if (response.success) {
        router.push('/login?registered=true');
      } else {
        setError(response.error || "Erreur lors de l'inscription");
      }
    } catch {
      setError("Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = ({ open }: { open: boolean }) => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {open
        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
      }
    </svg>
  );

  const handleCompanySelect = (company: CompanyLookupResult) => {
    setFormData((prev) => ({
      ...prev,
      company_name: company.name,
      company_siret: company.siret || '',
      company_address: company.address || '',
      company_postal_code: company.postal_code || '',
      company_city: company.city || '',
      company_country: company.country || 'France',
      company_ape_code: company.ape_code || '',
    }));
  };

  return (
    <AuthShell
      badge="Création de compte"
      title="Démarrez vite," 
      accent="sans friction"
      description="Créez votre espace Gestar et mettez en place votre gestion commerciale en quelques minutes, sans carte bancaire et sans configuration lourde."
      points={[
        'Essai gratuit pour structurer devis, factures et clients.',
        'Parcours simple pour les artisans et PME du bâtiment.',
        'Mise en route rapide avant votre première production.',
      ]}
    >
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] sm:p-10">
        <h2 className="mb-1 text-3xl font-black text-slate-950">Créer un compte</h2>
        <p className="mb-7 text-sm text-slate-500">Commencez gratuitement, sans carte bancaire.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Prénom</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Jean"
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-stone-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Nom</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Dupont"
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-stone-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950"
                />
              </div>
            </div>

            {/* Company */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Nom de l&apos;entreprise</label>
              <CompanyLookupField
                value={formData.company_name}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    company_name: value,
                    company_siret: '',
                    company_address: '',
                    company_postal_code: '',
                    company_city: '',
                    company_country: 'France',
                    company_ape_code: '',
                  }))
                }
                onSelect={handleCompanySelect}
                placeholder="Recherchez votre entreprise"
                inputClassName="w-full rounded-2xl border border-slate-300 bg-stone-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-950"
                helperText="Tapez au moins 3 caractères pour rechercher l'entreprise et préremplir ses informations légales." 
              />
              {formData.company_siret && (
                <div className="mt-2 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                  Entreprise trouvée: {formData.company_siret}{formData.company_city ? ` • ${formData.company_city}` : ''}
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Adresse email</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="votre@email.com"
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-stone-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-950"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Téléphone <span className="font-normal text-slate-400">(optionnel)</span></label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="06 12 34 56 78"
                  className="w-full rounded-2xl border border-slate-300 bg-stone-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-950"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Mot de passe</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPwd ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 caractères"
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-stone-50 py-3 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-950"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700">
                  <EyeIcon open={showPwd} />
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirmer le mot de passe</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-stone-50 py-3 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-950"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700">
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-400"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Création du compte...
                </>
              ) : "Créer mon compte"}
            </button>

            <p className="text-center text-xs text-slate-400">
              En créant un compte, vous acceptez nos{' '}
              <Link href="/cgu" className="text-slate-700 transition-colors hover:text-slate-950">CGU</Link>{' '}
              et notre{' '}
              <Link href="/privacy" className="text-slate-700 transition-colors hover:text-slate-950">politique de confidentialité</Link>.
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            <Link href="/" className="mr-2 text-slate-500 transition-colors hover:text-slate-950">
              Retour a l&apos;accueil
            </Link>
            <span className="text-slate-300">•</span>{' '}
            Déjà un compte ?{' '}
            <Link href="/login" className="font-medium text-slate-950 transition-colors hover:text-sky-700">
              Se connecter
            </Link>
          </p>
      </div>
    </AuthShell>
  );
}
