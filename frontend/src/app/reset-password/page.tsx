'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
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
    <AuthShell
      badge="Nouveau mot de passe"
      title={CONTENT.brandTitle}
      accent={CONTENT.brandAccent}
      description={CONTENT.brandDesc}
      points={[
        'Choisissez un mot de passe robuste pour sécuriser votre accès.',
        'Le changement est appliqué immédiatement après validation.',
        'Vous pourrez ensuite vous reconnecter normalement.',
      ]}
    >
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] sm:p-10">
          {done ? (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50">
                <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="mb-2 text-2xl font-black text-slate-950">{CONTENT.successTitle}</h2>
              <p className="mb-6 text-sm leading-6 text-slate-500">{CONTENT.successMsg}</p>
              <Link href="/login" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800">{CONTENT.backLogin}</Link>
            </div>
          ) : (
            <>
              <h2 className="mb-1 text-3xl font-black text-slate-950">{CONTENT.title}</h2>
              <p className="mb-8 text-sm text-slate-500">{CONTENT.subtitle}</p>

              {error && (
                <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{CONTENT.label}</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={CONTENT.placeholder} required minLength={8} className="w-full rounded-2xl border border-slate-300 bg-stone-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{CONTENT.confirm}</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={CONTENT.placeholder} required minLength={8} className="w-full rounded-2xl border border-slate-300 bg-stone-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950" />
                </div>
                <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-400">
                  {loading ? CONTENT.submitting : CONTENT.submit}
                </button>
              </form>
              <p className="mt-8 text-center text-sm text-slate-400">
                <Link href="/" className="text-slate-500 transition-colors hover:text-slate-950">{CONTENT.backHome}</Link>
              </p>
            </>
          )}
      </div>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-stone-50"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-950" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
