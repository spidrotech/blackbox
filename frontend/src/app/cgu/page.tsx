import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { CGU } from '@/lib/content';

export default function CguPage() {
  return (
    <MarketingLayout>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{CGU.title}</h1>
        <p className="text-sm text-gray-400 mb-10">Dernière mise à jour : {CGU.lastUpdated}</p>

        <div className="space-y-8">
          {CGU.sections.map((section) => (
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
