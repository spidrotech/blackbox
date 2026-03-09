'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { equipmentService } from '@/services/api';
import { Equipment } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { buildDetailPath, buildEditPath } from '@/lib/routes';

/* ── Badge config ────────────────────────────────────────────── */

const STATUS_BADGE: Record<string, { label: string; cls: string; dot: string }> = {
  available:   { label: 'Disponible',   cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  in_use:      { label: 'En utilisation', cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',       dot: 'bg-blue-500' },
  maintenance: { label: 'Maintenance',  cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',       dot: 'bg-amber-400' },
  repair:      { label: 'Réparation',   cls: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',   dot: 'bg-orange-400' },
  retired:     { label: 'Retiré',       cls: 'bg-gray-50 text-gray-400 ring-1 ring-gray-200',          dot: 'bg-gray-300' },
};

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'available',   label: 'Disponible' },
  { value: 'in_use',      label: 'En utilisation' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repair',      label: 'Réparation' },
  { value: 'retired',     label: 'Retiré' },
];

/* ── Icons ───────────────────────────────────────────────────── */

const IconPlus = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const IconSearch = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

const IconWrench = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
  </svg>
);

const IconCalendar = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
  </svg>
);

/* ── Page ────────────────────────────────────────────────────── */

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => { loadEquipment(); }, []);

  const loadEquipment = async () => {
    try {
      const res = await equipmentService.getAll();
      if (res.success && res.data) setEquipment(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error loading equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = equipment.filter(item => {
    const matchSearch =
      search === '' ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.toLowerCase().includes(search.toLowerCase()) ||
      item.brand?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === '' || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleRelease = async (id: number) => {
    try {
      await equipmentService.release(id);
      loadEquipment();
    } catch (err) {
      console.error('Error releasing equipment:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cet équipement ?')) return;
    setDeleting(id);
    try {
      await equipmentService.delete(id);
      setEquipment(e => e.filter(x => x.id !== id));
    } catch (err) {
      console.error('Error deleting equipment:', err);
    } finally {
      setDeleting(null);
    }
  };

  const availableCount   = equipment.filter(e => e.status === 'available').length;
  const inUseCount       = equipment.filter(e => e.status === 'in_use').length;
  const maintenanceCount = equipment.filter(e => ['maintenance', 'repair'].includes(e.status)).length;

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
      <div className="space-y-5 max-w-5xl mx-auto">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Équipements</h1>
            <p className="text-sm text-gray-500 mt-1">{equipment.length} équipement{equipment.length !== 1 ? 's' : ''} enregistré{equipment.length !== 1 ? 's' : ''}</p>
          </div>
          <Link
            href="/equipment/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
          >
            <IconPlus /> Nouvel équipement
          </Link>
        </div>

        {/* ── Stat KPIs ──────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {/* Disponibles */}
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-900">{availableCount}</p>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Disponibles</p>
            </div>
          </div>
          {/* En utilisation */}
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-900">{inUseCount}</p>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">En utilisation</p>
            </div>
          </div>
          {/* Maintenance */}
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <IconWrench />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-900">{maintenanceCount}</p>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Maintenance</p>
            </div>
          </div>
        </div>

        {/* ── Filters ────────────────────────────────────────── */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <IconSearch />
            </span>
            <input
              type="text"
              placeholder="Rechercher par nom, numéro, catégorie, marque…"
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
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white shadow-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            {statusOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* ── List ───────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <p className="text-gray-400 text-sm font-medium">
              {search || statusFilter ? 'Aucun résultat pour ces filtres' : 'Aucun équipement enregistré'}
            </p>
            {!search && !statusFilter && (
              <Link href="/equipment/new" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                Ajouter un équipement
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-50">
              {filtered.map(item => {
                const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.retired;
                const needsMaintenance =
                  item.next_maintenance_date &&
                  new Date(item.next_maintenance_date) <= new Date(Date.now() + 7 * 86400_000);
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors group"
                  >
                    {/* Status indicator */}
                    <div className={`shrink-0 w-2 h-10 rounded-full ${badge.dot}`} />

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={buildDetailPath('equipment', item.id)}
                          className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {item.name}
                        </Link>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                        {item.is_rental && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-200">
                            Location
                          </span>
                        )}
                      </div>
                      {/* Sub-line */}
                      <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-400">
                        {item.serial_number && <span>N° {item.serial_number}</span>}
                        {item.brand && (
                          <span className="font-medium text-gray-500">{item.brand}{item.model ? ` – ${item.model}` : ''}</span>
                        )}
                        {item.category && <span>{item.category}</span>}
                        {item.purchase_price && (
                          <span className="text-gray-500 font-medium">{formatCurrency(item.purchase_price)}</span>
                        )}
                        {item.next_maintenance_date && (
                          <span className={`inline-flex items-center gap-1 ${needsMaintenance ? 'text-amber-600 font-semibold' : ''}`}>
                            <IconCalendar />
                            Maint. {formatDate(item.next_maintenance_date)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.status === 'in_use' && (
                        <button
                          onClick={() => handleRelease(item.id)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg text-orange-600 hover:bg-orange-50 transition-colors"
                        >
                          Libérer
                        </button>
                      )}
                      <Link
                        href={buildEditPath('equipment', item.id)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        Modifier
                      </Link>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting === item.id}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {deleting === item.id ? '…' : 'Supprimer'}
                      </button>
                    </div>
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