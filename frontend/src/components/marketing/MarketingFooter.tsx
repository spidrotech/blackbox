import Link from 'next/link';
import { GestarLogo } from '@/components/ui/GestarLogo';

const footerLinks = {
  Produit: [
    { label: 'Fonctionnalités', href: '/#features' },
    { label: 'Tarifs', href: '/pricing' },
    { label: 'Contact', href: '/contact' },
    { label: 'Essai gratuit', href: '/register' },
  ],
  Légal: [
    { label: 'CGU', href: '/cgu' },
    { label: 'Politique de confidentialité', href: '/privacy' },
    { label: 'Mentions légales', href: '/legal' },
  ],
  Société: [
    { label: 'À propos', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Tarifs', href: '/pricing' },
  ],
};

export function MarketingFooter(): JSX.Element {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <GestarLogo size={32} />
              <span className="text-xl font-bold text-slate-950">Gestar</span>
            </div>
            <p className="mb-6 max-w-sm text-sm leading-relaxed text-slate-600">
              Logiciel de gestion pour artisans et PME du batiment. Devis, facturation, chantiers et relation client dans un seul outil.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <a href="mailto:contact@gestar.fr" className="rounded-2xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950">
                contact@gestar.fr
              </a>
              <div className="rounded-2xl border border-slate-200 bg-stone-50 px-4 py-3 text-sm text-slate-700">
                Hébergé et opéré en France
              </div>
            </div>
          </div>

          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-950">{section}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-slate-500 transition-colors hover:text-slate-950">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} Gestar. Tous droits reserves.</p>
          <p className="text-sm text-slate-500">Concu pour une gestion simple, rapide et claire.</p>
        </div>
      </div>
    </footer>
  );
}