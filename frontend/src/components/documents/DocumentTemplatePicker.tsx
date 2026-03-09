'use client';

type TemplateItem = {
  label: string;
  description: string;
  bullets: string[];
  accent?: 'blue' | 'emerald' | 'violet' | 'amber';
  onApply: () => void;
};

type DocumentTemplatePickerProps = {
  title: string;
  subtitle?: string;
  templates: TemplateItem[];
  className?: string;
};

const accentMap: Record<NonNullable<TemplateItem['accent']>, string> = {
  blue: 'border-blue-100 bg-blue-50/70 text-blue-700',
  emerald: 'border-emerald-100 bg-emerald-50/70 text-emerald-700',
  violet: 'border-violet-100 bg-violet-50/70 text-violet-700',
  amber: 'border-amber-100 bg-amber-50/70 text-amber-700',
};

export function DocumentTemplatePicker({
  title,
  subtitle,
  templates,
  className = '',
}: DocumentTemplatePickerProps) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {templates.map((template) => {
          const tone = accentMap[template.accent || 'blue'];
          return (
            <div key={template.label} className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm">
              <div className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
                Modèle
              </div>
              <h4 className="mt-3 text-sm font-semibold text-slate-900">{template.label}</h4>
              <p className="mt-1 text-sm leading-6 text-slate-500">{template.description}</p>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-500">
                {template.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-300" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={template.onApply}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                Appliquer ce modèle
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}