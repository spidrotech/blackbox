'use client';

import Link from 'next/link';
import { buildDetailPath } from '@/lib/routes';

/* ── Types ─────────────────────────────────────────────── */

export interface ProjectRowData {
  id: number;
  name: string;
  status: string;
  customer_name?: string;
  budget?: number;
  worksite_address?: string;
  type?: string;
  createdAt?: string;
}

/* ── Badge config ───────────────────────────────────────── */

const BADGE: Record<string, { label: string; cls: string; dot: string }> = {
  draft:       { label: 'Brouillon',  cls: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',       dot: 'bg-slate-400' },
  planned:     { label: 'Planifié',   cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',         dot: 'bg-blue-500' },
  in_progress: { label: 'En cours',   cls: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',   dot: 'bg-violet-500' },
  paused:      { label: 'En pause',   cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',       dot: 'bg-amber-400' },
  completed:   { label: 'Terminé',    cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  cancelled:   { label: 'Annulé',     cls: 'bg-red-50 text-red-700 ring-1 ring-red-200',             dot: 'bg-red-500' },
  archived:    { label: 'Archivé',    cls: 'bg-gray-50 text-gray-400 ring-1 ring-gray-200',          dot: 'bg-gray-300' },
};

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

/* ── Component ──────────────────────────────────────────── */

export function ProjectRow({ p }: { p: ProjectRowData }) {
  const isQuote = p.type === 'quote_worksite';
  const badge = isQuote ? null : (BADGE[p.status] ?? BADGE.draft);
  const href = isQuote ? buildDetailPath('quotes', p.id) : buildDetailPath('projects', p.id);
  const addr = p.worksite_address;

  return (
    <li className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
      {/* Left */}
      <div className="min-w-0">
        <Link
          href={href}
          className="text-sm font-medium text-gray-800 hover:text-violet-600 truncate block"
        >
          {p.name}
        </Link>
        <div className="flex items-center gap-2 mt-0.5">
          {p.customer_name && (
            <span className="text-xs text-gray-400">{p.customer_name}</span>
          )}
          {addr && (
            <span className="text-xs text-violet-500 flex items-center gap-0.5 truncate max-w-[180px]">
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              {addr.length > 28 ? `${addr.slice(0, 28)}…` : addr}
            </span>
          )}
        </div>
      </div>
      {/* Right */}
      <div className="shrink-0 ml-4 flex items-center gap-2">
        {isQuote ? (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 ring-1 ring-violet-200">
            Devis
          </span>
        ) : (
          <>
            {badge && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                {badge.label}
              </span>
            )}
            {p.budget != null && p.budget > 0 && (
              <span className="text-sm font-semibold text-gray-700">{fmt(p.budget)}</span>
            )}
          </>
        )}
      </div>
    </li>
  );
}
