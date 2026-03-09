'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { supplierService } from '@/services/api';
import { Supplier } from '@/types';
import { buildDetailPath, buildEditPath } from '@/lib/routes';

/* ── Helpers ─────────────────────────────────────────────────── */

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

const TYPE_STYLES: Record<string, string> = {
  materiaux:    'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  electricite:  'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
  plomberie:    'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200',
  outillage:    'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  transport:    'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  sous_traitant:'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  autre:        'bg-gray-50 text-gray-600 ring-1 ring-gray-200',
};

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500',
];

function avatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

/* ── Icons ───────────────────────────────────────────────────── */

const IconStar = ({ filled }: { filled: boolean }) => (
  <svg className={`w-4 h-4 ${filled ? 'fill-yellow-400 text-yellow-400' : 'fill-none text-gray-300'}`}
    stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const IconPlus = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const IconSearch = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

const IconPhone = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
  </svg>
);

const IconEmail = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
  </svg>
);

const IconPin = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
  </svg>
);

/* ── Page ────────────────────────────────────────────────────── */

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => { loadSuppliers(); }, []);

  const loadSuppliers = async () => {
    try {
      const res = await supplierService.getAll();
      if (res.success && res.data) setSuppliers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error loading suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = suppliers.filter(s =>
    search === '' ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.city?.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleFavorite = async (id: number) => {
    try {
      await supplierService.toggleFavorite(id);
      loadSuppliers();
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce fournisseur ?')) return;
    setDeleting(id);
    try {
      await supplierService.delete(id);
      setSuppliers(s => s.filter(x => x.id !== id));
    } catch (err) {
      console.error('Error deleting supplier:', err);
    } finally {
      setDeleting(null);
    }
  };

  const favCount = suppliers.filter(s => s.is_favorite).length;

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-blue-100" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 animate-spin" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-5 max-w-4xl mx-auto">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                {suppliers.length} au total
              </span>
              {favCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200">
                  <svg className="w-3 h-3 fill-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  {favCount} favori{favCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <Link
            href="/suppliers/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
          >
            <IconPlus /> Nouveau fournisseur
          </Link>
        </div>

        {/* ── Search ─────────────────────────────────────────── */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <IconSearch />
          </span>
          <input
            type="text"
            placeholder="Rechercher par nom, contact, email, ville…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* ── List ───────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <p className="text-gray-400 text-sm font-medium">
              {search ? 'Aucun résultat pour cette recherche' : 'Aucun fournisseur enregistré'}
            </p>
            {!search && (
              <Link href="/suppliers/new" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                Ajouter un fournisseur
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-50">
              {filtered.map(s => {
                const typeStyle = TYPE_STYLES[s.supplier_type?.toLowerCase() ?? ''] ?? TYPE_STYLES.autre;
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors group"
                  >
                    {/* Avatar */}
                    <div className={`shrink-0 w-10 h-10 rounded-xl ${avatarColor(s.id)} text-white flex items-center justify-center text-sm font-bold select-none`}>
                      {initials(s.name)}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={buildDetailPath('suppliers', s.id)}
                          className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {s.name}
                        </Link>
                        {s.supplier_type && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeStyle}`}>
                            {s.supplier_type}
                          </span>
                        )}
                      </div>
                      {/* Sub-line */}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {s.contact_name && (
                          <span className="text-xs text-gray-500">{s.contact_name}</span>
                        )}
                        {s.phone && (
                          <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600">
                            <IconPhone /> {s.phone}
                          </a>
                        )}
                        {s.email && (
                          <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 truncate max-w-[180px]">
                            <IconEmail /> {s.email}
                          </a>
                        )}
                        {s.city && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <IconPin /> {s.city}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleToggleFavorite(s.id)}
                        className="p-1.5 rounded-lg hover:bg-yellow-50 transition-colors"
                        title={s.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      >
                        <IconStar filled={!!s.is_favorite} />
                      </button>
                      <Link
                        href={buildEditPath('suppliers', s.id)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        Modifier
                      </Link>
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deleting === s.id}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {deleting === s.id ? '…' : 'Supprimer'}
                      </button>
                    </div>

                    {/* Always-visible favorite star */}
                    {s.is_favorite && (
                      <div className="shrink-0 group-hover:hidden">
                        <IconStar filled />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
