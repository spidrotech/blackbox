'use client';

import Link from 'next/link';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';

const pricingPlans = [
  {
    name: 'Starter',
    price: '29€',
    period: '/mois',
    description: 'Pour les independants qui veulent structurer leur gestion.',
    features: ['Jusqua 5 projets', 'Facturation basique', 'Support email', 'Documents PDF'],
    popular: false,
  },
  {
    name: 'Pro',
    price: '79€',
    period: '/mois',
    description: 'Le plan le plus adapte aux PME du batiment.',
    features: ['Projets illimites', 'Facturation avancee', 'Support prioritaire', 'Rapports detailles', 'Gestion clients'],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '199€',
    period: '/mois',
    description: 'Pour les structures qui ont besoin daccompagnement et de personnalisation.',
    features: ['Tout inclus', 'API personnalisee', 'Support 24/7', 'Formation equipe', 'Accompagnement dedie'],
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <MarketingLayout>
      <section className="relative overflow-hidden border-b border-slate-200 bg-stone-50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="absolute left-[-5rem] top-8 h-48 w-48 rounded-full bg-sky-100/80 blur-3xl" />
        <div className="absolute right-[-5rem] top-20 h-56 w-56 rounded-full bg-slate-200/70 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_380px] lg:items-center">
            <div>
              <span className="inline-flex rounded-full border border-sky-200 bg-white px-4 py-1.5 text-sm font-medium text-sky-700 shadow-sm">
                Tarification claire
              </span>
              <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                Des offres simples pour accompagner votre croissance.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Choisissez un plan adapte a votre structure, avec une mise en route rapide, un support humain et une progression sans friction quand l'activite monte.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {['Essai gratuit 14 jours', 'Sans engagement', 'Support base en France'].map((item) => (
                  <span key={item} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Ce qui est inclus</p>
              <div className="mt-5 space-y-4">
                {[
                  ['Demarrage rapide', 'Configuration initiale et prise en main en moins de 10 minutes.'],
                  ['Documents centralises', 'Devis, factures et suivi client accessibles dans une interface unique.'],
                  ['Accompagnement evolutif', 'Passez d\'un plan a l\'autre sans migration ni reprise manuelle.'],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-2xl border border-slate-200 bg-stone-50 p-4">
                    <p className="font-semibold text-slate-950">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-stone-100 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-3 items-stretch">
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-[1.75rem] border p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl ${
                plan.popular
                  ? 'border-slate-950 bg-slate-950 text-white'
                  : 'border-slate-200 bg-white text-slate-900'
              }`}
            >
              {plan.popular && (
                <div className="mb-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white">
                  Le plus populaire
                </div>
              )}
              <h2 className="text-2xl font-bold">{plan.name}</h2>
              <p className={`mt-2 text-sm ${plan.popular ? 'text-slate-300' : 'text-slate-500'}`}>{plan.description}</p>
              <div className="mt-6">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className={`ml-1 text-lg ${plan.popular ? 'text-slate-300' : 'text-slate-400'}`}>{plan.period}</span>
              </div>
              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm leading-6">
                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${plan.popular ? 'bg-sky-300' : 'bg-emerald-500'}`} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`mt-10 block w-full rounded-2xl px-6 py-3 text-center font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-white text-slate-950 hover:bg-slate-100'
                    : 'bg-slate-950 text-white hover:bg-slate-800'
                }`}
              >
                Commencer
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ['14 jours', 'Essai gratuit pour tester les flux et documents.'],
            ['Sans engagement', 'Montez ou ajustez votre plan au rythme de l\'entreprise.'],
            ['Support humain', 'Une equipe disponible pour repondre rapidement.'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-3xl border border-slate-200 bg-stone-50 p-6 text-center shadow-sm">
              <p className="text-2xl font-black text-slate-950">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}