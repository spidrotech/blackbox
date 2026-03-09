'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authService } from '@/services/api';

const CONTENT = {
  title: 'Nouveau mot de passe',
  subtitle: 'Choisissez un nouveau mot de passe pour votre compte.',
  label: 'Nouveau mot de passe',
  confirm: 'Confirmer le mot de passe',
  placeholder: 'Minimum 8 caractères',
  submit: 'Réinitialiser le mot de passe',
  submitting: 'Réinitialisation…',
  successTitle: 'Mot de passe mis à jour !',
  successMsg: 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.',
  backLogin: 'Se connecter',
  mismatch: 'Les mots de passe ne correspondent pas.',
  tooShort: 'Le mot de passe doit contenir au moins 8 caractères.',
  brandTitle: 'Créer un nouveau',
  brandAccent: 'mot de passe',
  brandDesc: 'Saisissez votre nouveau mot de passe ci-dessous. Il doit comporter au moins 8 caractères.',
  copyright: 'Gestar. Tous droits réservés.',
  backHome: "Retour à l'accueil",
} as const;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError(CONTENT.tooShort); return; }
    if (password !== confirm) { setError(CONTENT.mismatch); return; }
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-[55%] bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-blue-700/30 blur-3xl" />
        <div className="absolute top-1/3 right-0 w-96 h-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(90deg,#fff 1px,transparent 1px),linear-gradient(#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Gestar</span>
          </Link>
          <div className="mt-auto mb-auto pt-16 max-w-sm">
            <h1 className="text-3xl font-extrabold text-white leading-tight mb-4">
              {CONTENT.brandTitle}<br /><span className="text-sky-300">{CONTENT.brandAccent}</span>
            </h1>
            <p className="text-blue-200 text-sm leading-relaxed">{CONTENT.brandDesc}</p>
          </div>
          <p className="text-blue-400/60 text-xs">&copy; {new Date().getFullYear()} {CONTENT.copyright}</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12 bg-white">
        <div className="w-full max-w-sm">
          {done ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-emerald-100">
                <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{CONTENT.successTitle}</h2>
              <p className="text-sm text-gray-500 mb-6">{CONTENT.successMsg}</p>
              <Link href="/login" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">{CONTENT.backLogin}</Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{CONTENT.title}</h2>
              <p className="text-gray-500 text-sm mb-8">{CONTENT.subtitle}</p>

              {error && (
                <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 mb-4 border border-red-100">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{CONTENT.label}</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={CONTENT.placeholder} required minLength={8} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{CONTENT.confirm}</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={CONTENT.placeholder} required minLength={8} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all" />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-200">
                  {loading ? CONTENT.submitting : CONTENT.submit}
                </button>
              </form>
              <p className="text-center text-sm text-gray-400 mt-8">
                <Link href="/" className="text-gray-500 hover:text-blue-600 hover:underline">{CONTENT.backHome}</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
