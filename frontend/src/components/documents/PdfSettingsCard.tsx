'use client';

import Link from 'next/link';
import { CompanySettingsData } from '@/lib/company-settings';

type PdfSettingsCardProps = {
  company?: CompanySettingsData | null;
  documentLabel: string;
  className?: string;
};

type SettingItem = {
  label: string;
  ready: boolean;
  value: string;
  settingsUrl: string;
};

const truncate = (value: string, max = 88): string => {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
};

const firstUsefulLine = (value?: string | null): string => {
  const line = (value || '')
    .split('\n')
    .map((entry) => entry.trim())
    .find(Boolean);
  return line || '';
};

export function PdfSettingsCard({ company, documentLabel, className = '' }: PdfSettingsCardProps) {
  const items: SettingItem[] = [
    {
      label: 'Logo',
      ready: Boolean(company?.logo_url),
      value: company?.logo_url ? 'Logo entreprise prêt pour le PDF.' : 'Aucun logo configuré.',
      settingsUrl: '/settings?tab=entreprise',
    },
    {
      label: 'En-tête',
      ready: Boolean(firstUsefulLine(company?.header_text)),
      value: firstUsefulLine(company?.header_text) || "Aucun texte d'en-tête configuré.",
      settingsUrl: '/settings?tab=documents&doc=entetes',
    },
    {
      label: 'Pied de page',
      ready: Boolean(firstUsefulLine(company?.footer_text) || company?.legal_mentions),
      value: firstUsefulLine(company?.footer_text) || company?.legal_mentions || 'Aucun pied de page personnalisé configuré.',
      settingsUrl: '/settings?tab=documents&doc=pieds',
    },
    {
      label: 'Conditions',
      ready: Boolean(firstUsefulLine(company?.default_conditions)),
      value: firstUsefulLine(company?.default_conditions) || 'Aucune condition générale par défaut.',
      settingsUrl: '/settings?tab=documents&doc=cgv',
    },
    {
      label: 'Paiement',
      ready: Boolean(firstUsefulLine(company?.default_payment_terms)),
      value: firstUsefulLine(company?.default_payment_terms) || 'Aucune modalité de paiement par défaut.',
      settingsUrl: '/settings?tab=documents&doc=devis',
    },
    {
      label: 'Banque',
      ready: Boolean(company?.iban),
      value: company?.iban ? `IBAN ${company.iban}${company?.bic ? ` • BIC ${company.bic}` : ''}` : 'Aucun IBAN / BIC configuré.',
      settingsUrl: '/settings?tab=entreprise',
    },
  ];

  const configuredCount = items.filter((item) => item.ready).length;
  const missingCount = items.length - configuredCount;
  const allMissing = configuredCount === 0;

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm ${className}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Paramètres PDF mutualisés
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            Ce {documentLabel} reprend automatiquement votre identité PDF
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Logo, en-tête, pied de page, mentions et banque sont définis une seule fois dans les
            paramètres et réutilisés sur tous vos documents.
          </p>
          {company?.name && (
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              Société active · {company.name}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
              missingCount === 0
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-900 text-white'
            }`}
          >
            {configuredCount}/{items.length} éléments prêts
          </span>
          <Link
            href="/settings?tab=documents"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Configurer le PDF
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl border p-4 transition ${
              item.ready
                ? 'border-emerald-100 bg-emerald-50/70'
                : 'border-amber-100 bg-amber-50/70'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  item.ready ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${item.ready ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {item.ready ? 'Prêt' : 'À compléter'}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">{truncate(item.value)}</p>
            {!item.ready && (
              <Link
                href={item.settingsUrl}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline underline-offset-2"
              >
                Configurer →
              </Link>
            )}
          </div>
        ))}
      </div>

      <div
        className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
          allMissing
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : missingCount > 0
              ? 'border-blue-100 bg-blue-50 text-blue-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
        }`}
      >
        {allMissing && (
          <p>
            Aucun paramètre PDF n&apos;est encore défini. Le {documentLabel} restera utilisable, mais il sera
            moins professionnel tant que le logo, l&apos;en-tête, le pied de page et la banque ne sont pas
            renseignés.{' '}
            <Link href="/settings?tab=documents" className="font-semibold underline underline-offset-2">
              Accéder aux paramètres →
            </Link>
          </p>
        )}
        {!allMissing && missingCount > 0 && (
          <p>
            {missingCount} élément{missingCount > 1 ? 's' : ''} manque{missingCount > 1 ? 'nt' : ''} encore.
            Cliquez sur &laquo;&nbsp;Configurer&nbsp;&raquo; sous chaque carte pour y accéder directement.
          </p>
        )}
        {missingCount === 0 && !allMissing && (
          <p>
            Tout est prêt : vos PDF de {documentLabel} utiliseront automatiquement votre identité visuelle,
            vos conditions et vos coordonnées bancaires.
          </p>
        )}
      </div>
    </div>
  );
}
