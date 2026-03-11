'use client';

import { useEffect, useRef, useState } from 'react';
import { companyLookupService } from '@/services/api';
import { CompanyLookupResult } from '@/types';

type CompanyLookupFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (company: CompanyLookupResult) => void;
  placeholder?: string;
  inputClassName?: string;
  helperText?: string;
};

export function CompanyLookupField({
  value,
  onValueChange,
  onSelect,
  placeholder,
  inputClassName,
  helperText,
}: CompanyLookupFieldProps): JSX.Element {
  const [results, setResults] = useState<CompanyLookupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await companyLookupService.search(query);
        setResults(response.data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [value]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const showDropdown = open && value.trim().length >= 3;

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimeoutRef.current = setTimeout(() => setOpen(false), 120);
        }}
        placeholder={placeholder}
        className={inputClassName}
      />

      {showDropdown && (
        <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10">
          {loading && <p className="px-3 py-2 text-sm text-slate-500">Recherche en cours...</p>}

          {!loading && results.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-500">Aucune entreprise trouvée. Continuez en saisie libre si besoin.</p>
          )}

          {!loading && results.map((company) => (
            <button
              key={`${company.siret || company.siren || company.name}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onValueChange(company.name);
                onSelect(company);
                setOpen(false);
                setResults([]);
              }}
              className="block w-full rounded-xl px-3 py-3 text-left transition-colors hover:bg-stone-50"
            >
              <p className="text-sm font-semibold text-slate-950">{company.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {[company.siret, company.city, company.ape_code].filter(Boolean).join(' • ')}
              </p>
              {company.address && <p className="mt-1 text-xs text-slate-400">{company.address}</p>}
            </button>
          ))}
        </div>
      )}

      {helperText && <p className="mt-2 text-xs text-slate-400">{helperText}</p>}
    </div>
  );
}