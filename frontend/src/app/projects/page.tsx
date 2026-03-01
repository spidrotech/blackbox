'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Input } from '@/components/ui';
import { projectService, customerService } from '@/services/api';
import { Project, Customer } from '@/types';
import { formatDate } from '@/lib/utils';

const BADGE: Record<string, { label: string; cls: string }> = {
  draft:       { label: 'Brouillon',  cls: 'bg-gray-100 text-gray-600' },
  planned:     { label: 'Planifié',   cls: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En cours',   cls: 'bg-indigo-100 text-indigo-700' },
  paused:      { label: 'En pause',   cls: 'bg-yellow-100 text-yellow-700' },
  completed:   { label: 'Terminé',    cls: 'bg-green-100 text-green-700' },
  cancelled:   { label: 'Annulé',    cls: 'bg-red-100 text-red-600' },
  archived:    { label: 'Archivé',    cls: 'bg-gray-100 text-gray-400' },
};

const TABS = [
  { value: '', label: 'Tous' },
  { value: 'planned', label: 'Planifié' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'paused', label: 'En pause' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projectsRes, customersRes] = await Promise.all([
        projectService.getAll(),
        customerService.getAll(),
      ]);
      
      if (projectsRes.success) {
        setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
      }
      if (customersRes.success) {
        setCustomers(Array.isArray(customersRes.data) ? customersRes.data : []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (customerId?: number) => {
    if (!customerId) return '-';
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return '-';
    return customer.customer_type === 'company' 
      ? customer.company_name 
      : `${customer.first_name} ${customer.last_name}`;
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = search === '' || 
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.description?.toLowerCase().includes(search.toLowerCase());
    const matchesTab = tab === '' || project.status === tab;
    return matchesSearch && matchesTab;
  });

  const countByTab = (val: string) => val === '' ? projects.length : projects.filter(p => p.status === val).length;

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chantiers</h1>
            <p className="text-sm text-gray-500">{projects.length} chantier(s) au total</p>
          </div>
          <Link href="/projects/new" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nouveau chantier
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-4 pt-3 pb-0 border-b border-gray-100">
            <div className="flex gap-1 overflow-x-auto">
              {TABS.map(t => (
                <button key={t.value} onClick={() => setTab(t.value)}
                  className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    tab === t.value ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  {t.label}
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    tab === t.value ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}>{countByTab(t.value)}</span>
                </button>
              ))}
            </div>
            <div className="w-56 pb-2">
              <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Chantier</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Client</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Statut</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Dates</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProjects.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-sm">Aucun chantier trouvé</td></tr>
                ) : (
                  filteredProjects.map(project => {
                    const b = BADGE[project.status] ?? { label: project.status, cls: 'bg-gray-100 text-gray-600' };
                    return (
                      <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="text-sm font-medium text-gray-900">{project.name}</div>
                          {project.description && <div className="text-xs text-gray-400 truncate max-w-xs">{project.description}</div>}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{getCustomerName(project.customer_id)}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${b.cls}`}>{b.label}</span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">
                          {project.start_date && <div>Début : {formatDate(project.start_date)}</div>}
                          {project.end_date && <div className="text-xs text-gray-400">Fin : {formatDate(project.end_date)}</div>}
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm">
                          <Link href={`/projects/${project.id}`} className="text-blue-600 hover:underline mr-3">Voir</Link>
                          <Link href={`/projects/${project.id}/edit`} className="text-gray-500 hover:underline">Modifier</Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
