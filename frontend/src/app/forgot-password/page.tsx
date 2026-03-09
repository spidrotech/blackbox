'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate async request — replace with real API call when available
    await new Promise(r => setTimeout(r, 800));
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-[55%] bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-blue-700/30 blur-3xl" />
        <div className="absolute top-1/3 right-0 w-96 h-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(90deg,#fff 1px,transparent 1px),linear-gradient(#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Gestar</span>
          </Link>

          <div className="mt-auto mb-auto pt-16 max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-6">
              <svg className="w-7 h-7 text-sky-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold text-white leading-tight mb-4">
              Réinitialiser<br />
              <span className="text-sky-300">votre mot de passe</span>
            </h1>
            <p className="text-blue-200 text-sm leading-relaxed">
              Saisissez l&apos;adresse email associée à votre compte. Nous vous enverrons un lien pour créer un nouveau mot de passe.
            </p>
          </div>

          <p className="text-blue-400/60 text-xs">&copy; {new Date().getFullYear()} Gestar. Tous droits réservés.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12 bg-white">
        {/* Mobile logo */}
        <Link href="/" className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900">Gestar</span>
        </Link>

        <div className="w-full max-w-sm">
          {submitted ? (
            /* Success state */
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-emerald-100">
                <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Email envoyé !</h2>
              <p className="text-sm text-gray-500 mb-6">
                Si un compte est associé à <strong>{email}</strong>, vous recevrez un email avec un lien de réinitialisation dans quelques minutes.
              </p>
              <p className="text-xs text-gray-400 mb-6">Pensez à vérifier vos spams.</p>
              <Link
                href="/login"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                Retour à la connexion
              </Link>
            </div>
          ) : (
            /* Form state */
            <>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-8 group">
                <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Retour à la connexion
              </Link>

              <h2 className="text-2xl font-bold text-gray-900 mb-1">Mot de passe oublié ?</h2>
              <p className="text-gray-500 text-sm mb-8">Pas de panique, on vous envoie un lien de réinitialisation.</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse email</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
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
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-200"
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

              <p className="text-center text-sm text-gray-400 mt-8">
                <Link href="/" className="text-gray-500 hover:text-blue-600 hover:underline mr-2">
                  Retour a l&apos;accueil
                </Link>
                <span className="text-gray-300">•</span>{' '}
                Vous vous souvenez ?{' '}
                <Link href="/login" className="text-blue-600 font-medium hover:underline">
                  Se connecter
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
