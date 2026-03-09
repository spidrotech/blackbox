import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { PRIVACY } from '@/lib/content';

export default function PrivacyPage() {
  return (
    <MarketingLayout>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{PRIVACY.title}</h1>
        <p className="text-sm text-gray-400 mb-6">Dernière mise à jour : {PRIVACY.lastUpdated}</p>
        <p className="text-gray-600 text-sm leading-relaxed mb-10">{PRIVACY.intro}</p>

        <div className="space-y-8">
          {PRIVACY.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-bold text-gray-800 mb-2">{section.title}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{section.content}</p>
            </section>
          ))}
        </div>
      </div>
    </MarketingLayout>
  );
}
