'use client';

type PresetChip = {
  label: string;
  onClick: () => void;
  active?: boolean;
};

type PresetChipsProps = {
  label: string;
  options: PresetChip[];
  className?: string;
};

export function PresetChips({ label, options, className = '' }: PresetChipsProps) {
  return (
    <div className={className}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={option.onClick}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${option.active ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}