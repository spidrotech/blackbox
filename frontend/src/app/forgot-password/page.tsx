'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { authService } from '@/services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await authService.forgotPassword(email);
      setPreviewUrl(response.data?.reset_url ?? '');
      setSubmitted(true);
    } catch {
      setPreviewUrl('');
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Réinitialisation"
      title="Retrouvez vite"
      accent="l'accès à votre compte"
      description="Indiquez l'adresse email liée à votre compte. Nous vous envoyons un lien de réinitialisation pour repartir rapidement." 
      points={[
        'Lien envoyé à l’adresse associée au compte.',
        'Processus simple sans exposer vos informations sensibles.',
        'Retour rapide vers votre espace de gestion.',
      ]}
    >
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] sm:p-10">
          {submitted ? (
            /* Success state */
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50">
                <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="mb-2 text-2xl font-black text-slate-950">Email envoyé</h2>
              <p className="mb-6 text-sm leading-6 text-slate-500">
                Si un compte est associé à <strong>{email}</strong>, vous recevrez un email avec un lien de réinitialisation dans quelques minutes.
              </p>
              {previewUrl && (
                <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-left">
                  <p className="text-sm font-medium text-sky-900">Lien de test disponible</p>
                  <p className="mt-1 text-xs leading-5 text-sky-700">
                    Aucun SMTP n'est configuré. Utilisez ce lien pour valider le parcours avant la mise en production.
                  </p>
                  <Link href={previewUrl} className="mt-3 inline-flex text-sm font-medium text-sky-900 underline underline-offset-4">
                    Ouvrir le lien de réinitialisation
                  </Link>
                </div>
              )}
              <p className="mb-6 text-xs text-slate-400">Pensez à vérifier vos spams.</p>
              <Link
                href="/login"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Retour à la connexion
              </Link>
            </div>
          ) : (
            /* Form state */
            <>
              <Link href="/login" className="group mb-8 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-950">
                <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Retour à la connexion
              </Link>

              <h2 className="mb-1 text-3xl font-black text-slate-950">Mot de passe oublié ?</h2>
              <p className="mb-8 text-sm text-slate-500">Pas de panique, on vous envoie un lien de réinitialisation.</p>

              <form onSubmit={handleSubmit} className="space-y-5">
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
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      required
                      className="w-full rounded-2xl border border-slate-300 bg-stone-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-950"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-400"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Envoi en cours...
                    </>
                  ) : 'Envoyer le lien de réinitialisation'}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-slate-400">
                <Link href="/" className="mr-2 text-slate-500 transition-colors hover:text-slate-950">
                  Retour a l&apos;accueil
                </Link>
                <span className="text-slate-300">•</span>{' '}
                Vous vous souvenez ?{' '}
                <Link href="/login" className="font-medium text-slate-950 transition-colors hover:text-sky-700">
                  Se connecter
                </Link>
              </p>
            </>
          )}
      </div>
    </AuthShell>
  );
}
