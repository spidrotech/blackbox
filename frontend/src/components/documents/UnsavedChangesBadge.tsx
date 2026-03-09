'use client';

type UnsavedChangesBadgeProps = {
  isDirty: boolean;
  className?: string;
};

export function UnsavedChangesBadge({
  isDirty,
  className = '',
}: UnsavedChangesBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
        isDirty
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      } ${className}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${isDirty ? 'bg-amber-500' : 'bg-emerald-500'}`}
      />
      {isDirty ? 'Modifications non enregistrées' : 'Modifications enregistrées'}
    </div>
  );
}