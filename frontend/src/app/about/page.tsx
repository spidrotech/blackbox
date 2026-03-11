import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { ABOUT } from '@/lib/content';
import Link from 'next/link';

const VALUE_ICONS = ['M13 10V3L4 14h7v7l9-11h-7z', 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'];

export default function AboutPage() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-stone-50 py-20">
        <div className="absolute -left-16 top-8 h-56 w-56 rounded-full bg-sky-100/80 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-slate-200/70 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <span className="inline-flex rounded-full border border-sky-200 bg-white px-4 py-1.5 text-sm font-medium text-sky-700 shadow-sm">
            A propos de Gestar
          </span>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">{ABOUT.title}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">{ABOUT.subtitle}</p>
        </div>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm md:p-10">
          <h2 className="mb-4 text-2xl font-black text-slate-950">{ABOUT.mission.title}</h2>
          <p className="leading-8 text-slate-600">{ABOUT.mission.text}</p>
        </div>
      </section>

      {/* Values */}
      <section className="bg-stone-100 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="mb-10 text-center text-2xl font-black text-slate-950">Nos valeurs</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {ABOUT.values.map((v, i) => (
              <div key={v.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={VALUE_ICONS[i]} />
                  </svg>
                </div>
                <h3 className="mb-1 font-bold text-slate-950">{v.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-white shadow-sm md:p-10">
          <h2 className="mb-4 text-2xl font-black">{ABOUT.team.title}</h2>
          <p className="mb-8 max-w-2xl leading-8 text-slate-300">{ABOUT.team.text}</p>
          <Link href="/register" className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 font-semibold text-slate-950 transition-colors hover:bg-slate-100">
          {ABOUT.cta}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
        </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
