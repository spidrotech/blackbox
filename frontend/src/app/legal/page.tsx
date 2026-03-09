import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { LEGAL } from '@/lib/content';
import Link from 'next/link';

export default function LegalPage() {
  return (
    <MarketingLayout>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{LEGAL.title}</h1>
        <p className="text-sm text-gray-400 mb-10">Dernière mise à jour : {LEGAL.lastUpdated}</p>

        <div className="space-y-10">
          {LEGAL.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-bold text-gray-800 mb-3">{section.title}</h2>
              <div className="space-y-2">
                {section.items.map((item, i) => (
                  <div key={i} className="text-sm text-gray-600 leading-relaxed">
                    {item.label ? (
                      <><span className="font-medium text-gray-700">{item.label} :</span> {item.value}</>
                    ) : (
                      item.value
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100">
          <p className="text-sm text-gray-400">
            Pour toute question, consultez nos{' '}
            <Link href="/cgu" className="text-blue-600 hover:underline">CGU</Link> et notre{' '}
            <Link href="/privacy" className="text-blue-600 hover:underline">Politique de Confidentialité</Link>.
          </p>
        </div>
      </div>
    </MarketingLayout>
  );
}
