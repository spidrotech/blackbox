'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [activeTab, setActiveTab] = useState('home');

  // DEBUG: Log que la page d'accueil est chargée
  console.log('📍 Page d\'accueil chargée!');

  const tabs = [
    { id: 'home', label: 'Accueil', href: '#home' },
    { id: 'features', label: 'Fonctionnalités', href: '#features' },
    { id: 'pricing', label: 'Tarifs', href: '#pricing' },
    { id: 'contact', label: 'Contact', href: '/contact' },
  ];

  const features = [
    {
      title: 'Gestion des Projets',
      description: 'Organisez et suivez vos projets avec une interface intuitive.',
      icon: '📋'
    },
    {
      title: 'Facturation Automatisée',
      description: 'Générez des factures et devis automatiquement.',
      icon: '💰'
    },
    {
      title: 'Suivi du Temps',
      description: 'Enregistrez et analysez le temps passé sur vos tâches.',
      icon: '⏱️'
    },
    {
      title: 'Gestion des Clients',
      description: 'Centralisez toutes les informations de vos clients.',
      icon: '👥'
    }
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: '29€',
      period: '/mois',
      features: ['Jusqu\'à 5 projets', 'Facturation basique', 'Support email'],
      popular: false
    },
    {
      name: 'Pro',
      price: '79€',
      period: '/mois',
      features: ['Projets illimités', 'Facturation avancée', 'Support prioritaire', 'Rapports détaillés'],
      popular: true
    },
    {
      name: 'Enterprise',
      price: '199€',
      period: '/mois',
      features: ['Tout inclus', 'API personnalisée', 'Support 24/7', 'Formation équipe'],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">GESTAR</h1>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              {tabs.map((tab) => (
                tab.href.startsWith('/') ? (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                  >
                    {tab.label}
                  </Link>
                ) : (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              ))}
            </div>
            <div className="flex items-center">
              <Link
                href="/login"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Gérez vos projets avec
            <span className="text-blue-600 block">GESTAR</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            La solution SaaS complète pour la gestion de projets, facturation et suivi du temps.
            Simplifiez votre workflow et boostez votre productivité.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
            >
              Commencer gratuitement
            </Link>
            <Link
              href="/login"
              className="border border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-3 rounded-lg text-lg font-medium transition-colors"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Fonctionnalités puissantes
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tout ce dont vous avez besoin pour gérer efficacement vos projets et votre entreprise.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-lg hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Tarifs adaptés à vos besoins
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choisissez le plan qui correspond à votre entreprise.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`bg-white p-8 rounded-lg shadow-lg ${
                  plan.popular ? 'ring-2 ring-blue-600 scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="bg-blue-600 text-white text-sm font-medium px-3 py-1 rounded-full inline-block mb-4">
                    Plus populaire
                  </div>
                )}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold text-blue-600 mb-6">
                  {plan.price}<span className="text-lg text-gray-600">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-gray-600">
                      <span className="text-green-500 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`w-full py-3 px-6 rounded-lg text-center font-medium transition-colors ${
                    plan.popular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  Commencer
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">GESTAR</h3>
            <p className="text-gray-400 mb-8">
              La solution SaaS pour la gestion de projets moderne.
            </p>
            <div className="flex justify-center space-x-6">
              <Link href="/login" className="text-gray-400 hover:text-white transition-colors">
                Se connecter
              </Link>
              <Link href="/register" className="text-gray-400 hover:text-white transition-colors">
                S'inscrire
              </Link>
              <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
