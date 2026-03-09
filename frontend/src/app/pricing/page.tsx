'use client';

import Link from 'next/link';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors">GESTAR</Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium">Accueil</Link>
              <Link href="/#features" className="text-gray-700 hover:text-blue-600 font-medium">Fonctionnalites</Link>
              <Link href="/pricing" className="text-blue-600 font-medium border-b-2 border-blue-600">Tarifs</Link>
              <Link href="/contact" className="text-gray-700 hover:text-blue-600 font-medium">Contact</Link>
            </div>
            <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">Se connecter</Link>
          </div>
        </div>
      </nav>

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Des tarifs clairs pour votre activite</h1>
          <p className="text-xl text-gray-600">Choisissez un plan adapte a votre taille dentreprise, avec une montée en puissance simple quand votre activite evolue.</p>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {pricingPlans.map((plan) => (
            <div key={plan.name} className={`bg-white p-8 rounded-2xl shadow-lg ${plan.popular ? 'ring-2 ring-blue-600 scale-105' : ''}`}>
              {plan.popular && (
                <div className="bg-blue-600 text-white text-sm font-medium px-3 py-1 rounded-full inline-block mb-4">Le plus populaire</div>
              )}
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h2>
              <p className="text-sm text-gray-500 mb-5">{plan.description}</p>
              <div className="text-4xl font-bold text-blue-600 mb-6">{plan.price}<span className="text-lg text-gray-600">{plan.period}</span></div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center text-gray-600">
                    <span className="text-green-500 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/register" className={`block w-full py-3 px-6 rounded-lg text-center font-medium transition-colors ${plan.popular ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}>
                Commencer
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="py-4 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">14 jours</div>
            <div className="text-sm text-gray-500 mt-1">Dessai gratuit</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">Sans engagement</div>
            <div className="text-sm text-gray-500 mt-1">Changez de plan quand vous voulez</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">Support humain</div>
            <div className="text-sm text-gray-500 mt-1">Une equipe disponible pour vous aider</div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}