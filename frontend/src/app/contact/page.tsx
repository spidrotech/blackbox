'use client';

import { useState } from 'react';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Simuler l'envoi du formulaire
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du formulaire', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MarketingLayout>
      <section className="relative overflow-hidden border-b border-slate-200 bg-stone-50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="absolute left-[-4rem] top-12 h-44 w-44 rounded-full bg-sky-100/80 blur-3xl" />
        <div className="absolute right-[-4rem] bottom-0 h-56 w-56 rounded-full bg-slate-200/70 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
            <div>
              <span className="inline-flex rounded-full border border-sky-200 bg-white px-4 py-1.5 text-sm font-medium text-sky-700 shadow-sm">
                Contact commercial et support
              </span>
              <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                Une equipe disponible pour vous repondre rapidement.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Question produit, demo, accompagnement ou support: nous revenons vers vous sous 24 heures ouvrées avec une réponse claire et exploitable.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {[
                  ['Email', 'contact@gestar.fr', 'Reponse en 24h'],
                  ['Telephone', '+33 1 23 45 67 89', 'Lun-Ven, 9h-18h'],
                  ['Adresse', '123 Rue de la Tech, 75001 Paris', 'Rendez-vous sur demande'],
                ].map(([title, value, hint]) => (
                  <div key={title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
                    <p className="mt-3 text-lg font-semibold text-slate-950">{value}</p>
                    <p className="mt-1 text-sm text-slate-500">{hint}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] md:p-10">
              <h2 className="text-3xl font-black text-slate-950">Envoyez-nous un message</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Décrivez votre besoin, votre contexte ou votre volume d'activité. Nous pourrons vous orienter vers la bonne réponse ou une demo pertinente.
              </p>

              {submitted && (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="font-medium text-emerald-800">Message envoyé avec succès.</p>
                  <p className="mt-1 text-sm text-emerald-700">Nous vous répondrons dans les 24 heures ouvrées.</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-900">
                      Nom complet
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full rounded-2xl border border-slate-300 bg-stone-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-950"
                      placeholder="Jean Dupont"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-900">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full rounded-2xl border border-slate-300 bg-stone-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-950"
                      placeholder="jean@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="mb-2 block text-sm font-medium text-slate-900">
                    Sujet
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-slate-300 bg-stone-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-950"
                    placeholder="Comment pouvons-nous vous aider ?"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="mb-2 block text-sm font-medium text-slate-900">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full resize-none rounded-2xl border border-slate-300 bg-stone-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-950"
                    placeholder="Décrivez votre besoin, votre équipe ou votre demande de démonstration."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full rounded-2xl px-6 py-3 font-semibold text-white transition-colors ${
                    loading
                      ? 'cursor-not-allowed bg-slate-400'
                      : 'bg-slate-950 hover:bg-slate-800'
                  }`}
                >
                  {loading ? 'Envoi en cours...' : 'Envoyer le message'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Nous respectons votre vie privée. Vos données ne seront pas partagées.
              </p>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
