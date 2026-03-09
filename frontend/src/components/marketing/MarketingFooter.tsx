import Link from 'next/link';

const footerLinks = {
  Produit: [
    { label: 'Fonctionnalités', href: '/#features' },
    { label: 'Tarifs', href: '/pricing' },
    { label: 'Contact', href: '/contact' },
    { label: 'Essai gratuit', href: '/register' },
  ],
  Ressources: [
    { label: 'Connexion', href: '/login' },
    { label: 'Mot de passe oublié', href: '/forgot-password' },
    { label: 'Accueil', href: '/' },
  ],
  Legal: [
    { label: 'CGU', href: '#' },
    { label: 'Politique de confidentialite', href: '#' },
    { label: 'Mentions legales', href: '#' },
  ],
  Societe: [
    { label: 'A propos', href: '#' },
    { label: 'Contact', href: '/contact' },
    { label: 'Tarifs', href: '/pricing' },
  ],
};

export function MarketingFooter(): JSX.Element {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-xl font-bold">Gestar</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-xs">
              Logiciel de gestion pour artisans et PME du batiment. Devis, facturation, chantiers et relation client dans un seul outil.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" aria-label="LinkedIn" className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-blue-600 text-gray-400 hover:text-white flex items-center justify-center transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a href="#" aria-label="Twitter" className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-blue-600 text-gray-400 hover:text-white flex items-center justify-center transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">{section}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-gray-400 hover:text-white text-sm transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} Gestar. Tous droits reserves.</p>
          <p className="text-gray-600 text-sm">Concu et heberge en France</p>
        </div>
      </div>
    </footer>
  );
}