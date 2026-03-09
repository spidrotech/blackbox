'use client';

type CompletionItem = {
  label: string;
  done: boolean;
  helper?: string;
};

type DocumentCompletionCardProps = {
  title: string;
  subtitle?: string;
  items: CompletionItem[];
  className?: string;
};

export function DocumentCompletionCard({
  title,
  subtitle,
  items,
  className = '',
}: DocumentCompletionCardProps) {
  const doneCount = items.filter((item) => item.done).length;
  const total = items.length || 1;
  const percent = Math.round((doneCount / total) * 100);

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
          {doneCount}/{total}
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-4 space-y-2.5">
        {items.map((item) => (
          <div key={item.label} className={`rounded-xl border px-3 py-2.5 ${item.done ? 'border-emerald-100 bg-emerald-50/70' : 'border-slate-200 bg-slate-50/80'}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${item.done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {item.done ? (
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                  </svg>
                )}
              </span>
              <div>
                <p className="text-sm font-medium text-slate-800">{item.label}</p>
                {item.helper && <p className="mt-0.5 text-xs text-slate-500">{item.helper}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}