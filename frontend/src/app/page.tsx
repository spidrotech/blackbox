'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { GestarLogoFull } from '@/components/ui/GestarLogo';
import { LANDING } from '@/lib/content';

/* ─── Feature SVG icons ──────────────────────────────────────── */

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  document: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  invoice: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  map: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  ),
  clients: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  chart: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  library: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
};

const HERO_PILLARS = [
  'Devis et factures centralisés',
  'Suivi chantier en temps réel',
  'Documents conformes et partageables',
];

const HERO_METRICS = [
  { value: '14 j', label: 'Essai gratuit' },
  { value: '< 10 min', label: 'Mise en route' },
  { value: 'France', label: 'Hébergement' },
];

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    setIsAuthenticated(!!token);
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-stone-50/90 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/"><GestarLogoFull size={32} /></Link>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              {LANDING.nav.map((tab) =>
                tab.href.startsWith('/') ? (
                  <Link key={tab.id} href={tab.href} className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-950">
                    {tab.label}
                  </Link>
                ) : (
                  <a key={tab.id} href={tab.href} className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-950">
                    {tab.label}
                  </a>
                ),
              )}
            </div>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800">
                  {LANDING.hero.loginCta}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </Link>
              ) : (
                <>
                  <Link href="/login" className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 sm:block">
                    Se connecter
                  </Link>
                  <Link href="/register" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800">
                    {LANDING.hero.cta}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-stone-50">
        <div className="absolute left-[-6rem] top-16 h-56 w-56 rounded-full bg-sky-100/80 blur-3xl" />
        <div className="absolute bottom-0 right-[-5rem] h-64 w-64 rounded-full bg-slate-200/70 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_420px] lg:items-center">
            <div className="max-w-3xl">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-1.5 text-sm font-medium text-sky-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
              {LANDING.hero.badge}
              </div>
              <h1 className="mb-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl lg:leading-[1.02]">
                {LANDING.hero.title}
                <span className="mt-2 block text-sky-700">{LANDING.hero.titleAccent}</span>
              </h1>
              <p className="mb-8 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                {LANDING.hero.subtitle}
              </p>

              <div className="mb-8 flex flex-wrap gap-3">
                {HERO_PILLARS.map((pillar) => (
                  <span
                    key={pillar}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
                  >
                    <span className="h-2 w-2 rounded-full bg-slate-950" />
                    {pillar}
                  </span>
                ))}
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                {isAuthenticated ? (
                  <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-slate-950/10 transition-all hover:-translate-y-0.5 hover:bg-slate-800">
                    {LANDING.hero.loginCta}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </Link>
                ) : (
                  <>
                    <Link href="/register" className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-slate-950/10 transition-all hover:-translate-y-0.5 hover:bg-slate-800">
                      {LANDING.hero.cta}
                    </Link>
                    <a href="#features" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-8 py-4 text-lg font-medium text-slate-700 transition-colors hover:border-slate-950 hover:text-slate-950">
                      {LANDING.hero.ctaSecondary}
                    </a>
                  </>
                )}
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
                <div className="mb-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-950 px-5 py-4 text-white">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/60">Cockpit Gestar</p>
                    <p className="mt-1 text-lg font-semibold">Vue rapide de l'activité</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">Temps réel</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {HERO_METRICS.map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-slate-200 bg-stone-50 px-5 py-4">
                      <p className="text-2xl font-black text-slate-950">{metric.value}</p>
                      <p className="mt-1 text-sm text-slate-500">{metric.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-3xl border border-slate-200 bg-stone-50 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Flux de gestion</p>
                      <p className="text-sm text-slate-500">Une chaîne simple, du devis au règlement</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Stable</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      ['01', 'Création du devis', 'Bibliothèque prix, lots, options'],
                      ['02', 'Validation client', 'Signature, suivi et relances'],
                      ['03', 'Facturation', 'Acompte, situation, export et PDF'],
                    ].map(([step, title, description]) => (
                      <div key={step} className="flex items-start gap-4 rounded-2xl bg-white px-4 py-4 shadow-sm">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sm font-bold text-sky-700">{step}</span>
                        <div>
                          <p className="font-semibold text-slate-950">{title}</p>
                          <p className="text-sm text-slate-500">{description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Band */}
      <section className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {LANDING.stats.map((stat, i) => (
              <div key={i} className="rounded-3xl border border-slate-200 bg-stone-50 px-5 py-6 text-center shadow-sm">
                <p className="text-3xl font-black text-slate-950 lg:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm font-medium text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-sm font-medium text-sky-700">
              {LANDING.features.badge}
            </div>
            <h2 className="mb-4 text-3xl font-black text-slate-950 sm:text-4xl">
              {LANDING.features.title}
            </h2>
            <p className="text-lg text-slate-500">
              {LANDING.features.subtitle}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {LANDING.features.items.map((feature, i) => (
              <div
                key={i}
                className="group relative rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white transition-colors duration-300 group-hover:bg-sky-700">
                  {FEATURE_ICONS[feature.icon] ?? <span className="text-xl">&#9733;</span>}
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-950">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="border-y border-slate-200 bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-3xl font-black text-slate-950 sm:text-4xl">
              Ils nous font confiance
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-500">
              Des équipes terrain, PME et dirigeants utilisent Gestar pour réduire l'administratif et garder une vision claire de leur activité.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {LANDING.testimonials.map((t, i) => (
              <div key={i} className="rounded-[1.75rem] border border-slate-200 bg-stone-50 p-8 shadow-sm">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="mb-6 leading-relaxed text-slate-600">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div>
                  <p className="font-semibold text-slate-950">{t.author}</p>
                  <p className="text-sm text-slate-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 p-12 text-center lg:p-16">
            <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-sky-500/15 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-44 w-44 rounded-full bg-slate-400/10 blur-3xl" />
            <div className="relative">
              <h2 className="mb-4 text-3xl font-black text-white sm:text-4xl">
                {LANDING.cta.title}
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-lg text-slate-300">
                {LANDING.cta.subtitle}
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-lg font-semibold text-slate-950 shadow-lg transition-colors hover:bg-slate-100"
              >
                {LANDING.cta.button}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="border-t border-slate-200 bg-stone-100 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-3xl font-black text-slate-950 sm:text-4xl">
              {LANDING.pricing.title}
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-500">
              {LANDING.pricing.subtitle}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {LANDING.pricing.plans.map((plan, i) => (
              <div
                key={i}
                className={`rounded-[1.75rem] border bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl ${
                  plan.popular
                    ? 'border-slate-950 ring-1 ring-slate-950 scale-[1.02]'
                    : 'border-slate-200'
                }`}
              >
                {plan.popular && (
                  <div className="mb-4 inline-block rounded-full bg-slate-950 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                    Plus populaire
                  </div>
                )}
                <h3 className="mb-2 text-xl font-bold text-slate-950">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-slate-950">{plan.price}</span>
                  <span className="font-medium text-slate-400">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className="flex items-center gap-2 text-sm text-slate-600">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/pricing"
                  className={`block w-full py-3 rounded-xl text-center font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-slate-950 text-white hover:bg-slate-800'
                      : 'bg-stone-100 text-slate-900 hover:bg-stone-200'
                  }`}
                >
                  Voir le détail
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/pricing" className="inline-flex items-center gap-2 font-medium text-slate-700 transition-colors hover:text-slate-950">
              {LANDING.pricing.detail}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
