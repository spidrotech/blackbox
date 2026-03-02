'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { settingsService } from '@/services/api';
import { Company } from '@/types';

type SubscriptionCompany = Partial<Company> & {
  default_conditions?: string;
  cgv_url?: string;
};

export default function SubscriptionPage() {
  const [company, setCompany] = useState<SubscriptionCompany | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await settingsService.getCompany();
      if (res.success) setCompany(res.data ?? null);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  if (loading || !company) return <div className="p-6">Chargement...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Abonnement et facturation</h1>

      <section className="mb-6 p-4 bg-white rounded shadow">
        <h2 className="font-semibold">Informations de facturation</h2>
        <div className="mt-3 text-sm text-slate-700">
          <div><strong>Préfixe factures:</strong> {company.invoice_prefix || '—'}</div>
          <div><strong>Prochaine facture n°:</strong> {company.next_invoice_number ?? '—'}</div>
          <div className="mt-2"><strong>Préfixe devis:</strong> {company.quote_prefix || '—'}</div>
          <div><strong>Prochain devis n°:</strong> {company.next_quote_number ?? '—'}</div>
          <div className="mt-2"><strong>Conditions par défaut:</strong> {company.default_conditions ? <span>{company.default_conditions}</span> : <em>Non définies</em>}</div>
          {company.cgv_url ? (<div className="mt-2"><a href={company.cgv_url} target="_blank" rel="noreferrer" className="text-blue-600">Voir CGV</a></div>) : null}
        </div>
      </section>

      <section className="p-4 bg-white rounded shadow">
        <h2 className="font-semibold">Plan actuel</h2>
        <div className="mt-3 text-sm text-slate-700">
          <div>Votre plan et gestion des paiements sont gérés séparément.</div>
          <div className="mt-2">Pour modifier les paramètres de facturation, mettez à jour votre entreprise:</div>
          <div className="mt-4">
            <Link href="/settings" className="inline-block bg-blue-600 text-white px-4 py-2 rounded">Ouvrir Configuration de compte</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
