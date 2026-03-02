'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Select } from '@/components/ui';
import { timeEntryService, projectService } from '@/services/api';
import { TimeEntry, Project } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { buildEditPath } from '@/lib/routes';

const filterOptions = [
  { value: 'all', label: 'Tous' },
  { value: 'pending', label: 'En attente' },
  { value: 'approved', label: 'Approuvés' },
];

export default function TimeEntriesPage() {
  const { user } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [entriesRes, projectsRes] = await Promise.all([
        timeEntryService.getAll(),
        projectService.getAll(),
      ]);
      
      if (entriesRes.success) {
        setTimeEntries(Array.isArray(entriesRes.data) ? entriesRes.data : []);
      }
      if (projectsRes.success) {
        setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProjectName = (projectId?: number) => {
    if (!projectId) return '-';
    const project = projects.find(p => p.id === projectId);
    return project?.name || '-';
  };

  const formatDuration = (hours?: number) => {
    if (!hours) return '-';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m.toString().padStart(2, '0')}min`;
  };

  const filteredEntries = timeEntries.filter(entry => {
    if (filter === 'pending') return !entry.is_approved;
    if (filter === 'approved') return entry.is_approved;
    return true;
  });

  const handleApprove = async (id: number) => {
    try {
      await timeEntryService.approve(id);
      loadData();
    } catch (error) {
      console.error('Error approving entry:', error);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await timeEntryService.reject(id);
      loadData();
    } catch (error) {
      console.error('Error rejecting entry:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce pointage ?')) return;
    
    try {
      await timeEntryService.delete(id);
      setTimeEntries(timeEntries.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const totalHours = filteredEntries.reduce((sum, e) => sum + (e.duration_hours || 0), 0);
  const totalCost = filteredEntries.reduce((sum, e) => sum + (e.total_cost || 0), 0);
  const pendingCount = timeEntries.filter(e => !e.is_approved).length;

  const canApprove = user?.role && ['owner', 'manager'].includes(user.role);

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pointages</h1>
            <p className="text-gray-500">{timeEntries.length} pointage(s) au total</p>
          </div>
          <Link href="/time-entries/new">
            <Button>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouveau pointage
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">Heures totales</div>
              <div className="text-2xl font-bold text-gray-900">{formatDuration(totalHours)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">Coût total</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">En attente d&apos;approbation</div>
              <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="w-full md:w-48">
              <Select
                options={filterOptions}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Time entries list */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des pointages</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Horaires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durée
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coût
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Aucun pointage trouvé
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(entry.work_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getProjectName(entry.project_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.start_time && entry.end_time 
                          ? `${entry.start_time} - ${entry.end_time}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {formatDuration(entry.duration_hours)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(entry.total_cost || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {entry.is_approved ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Approuvé
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            En attente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {canApprove && !entry.is_approved && (
                          <>
                            <button
                              onClick={() => handleApprove(entry.id)}
                              className="text-green-600 hover:text-green-900 mr-4"
                            >
                              Approuver
                            </button>
                            <button
                              onClick={() => handleReject(entry.id)}
                              className="text-red-600 hover:text-red-900 mr-4"
                            >
                              Refuser
                            </button>
                          </>
                        )}
                        <Link
                          href={buildEditPath('time-entries', entry.id)}
                          className="text-gray-600 hover:text-gray-900 mr-4"
                        >
                          Modifier
                        </Link>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
