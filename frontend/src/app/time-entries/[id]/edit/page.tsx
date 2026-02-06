'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select } from '@/components/ui';
import { timeEntryService, projectService } from '@/services/api';
import { TimeEntry, TimeEntryCreate, Project } from '@/types';

export default function EditTimeEntryPage() {
  const router = useRouter();
  const params = useParams();
  const timeEntryId = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [formData, setFormData] = useState<TimeEntryCreate>({
    work_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    break_duration: 0,
    description: '',
    hourly_rate: 45,
    project_id: undefined,
  });

  useEffect(() => {
    loadData();
  }, [timeEntryId]);

  const loadData = async () => {
    try {
      const [timeEntryRes, projectsRes] = await Promise.all([
        timeEntryService.getById(timeEntryId),
        projectService.getAll(),
      ]);
      
      if (timeEntryRes.success && timeEntryRes.data) {
        const entry = timeEntryRes.data;
        setFormData({
          work_date: entry.work_date?.split('T')[0] || '',
          start_time: entry.start_time || '',
          end_time: entry.end_time || '',
          break_duration: entry.break_duration || 0,
          description: entry.description || '',
          hourly_rate: entry.hourly_rate || 45,
          project_id: entry.project_id,
        });
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

  const projectOptions = [
    { value: '', label: 'Sélectionner un projet' },
    ...projects.map(p => ({ value: String(p.id), label: p.name })),
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'project_id') {
      setFormData(prev => ({ ...prev, [name]: value ? parseInt(value) : undefined }));
    } else if (['hours', 'hourly_rate'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value ? parseFloat(value) : 0 }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const calculateDuration = () => {
    if (!formData.start_time || !formData.end_time) return 0;
    const start = new Date(`2000-01-01T${formData.start_time}`);
    const end = new Date(`2000-01-01T${formData.end_time}`);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const breakDuration = (formData.break_duration || 0) / 60;
    return Math.max(0, duration - breakDuration);
  };

  const calculateAmount = () => {
    return calculateDuration() * (formData.hourly_rate || 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await timeEntryService.update(timeEntryId, formData);
      if (response.success) {
        router.push(`/time-entries/${timeEntryId}`);
      }
    } catch (error) {
      console.error('Error updating time entry:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Chargement...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modifier la saisie de temps</h1>
          <p className="text-gray-500">Mettre à jour les informations</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="Projet *"
                name="project_id"
                options={projectOptions}
                value={formData.project_id?.toString() || ''}
                onChange={handleChange}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Date *"
                  name="work_date"
                  type="date"
                  value={formData.work_date}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Heure de début"
                  name="start_time"
                  type="time"
                  value={formData.start_time || ''}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Heure de fin"
                  name="end_time"
                  type="time"
                  value={formData.end_time || ''}
                  onChange={handleChange}
                />
                <Input
                  label="Pause (min)"
                  name="break_duration"
                  type="number"
                  step="5"
                  min="0"
                  value={formData.break_duration || ''}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.description || ''}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Facturation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {calculateDuration() > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Taux horaire (€)"
                    name="hourly_rate"
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate || ''}
                    onChange={handleChange}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Montant</label>
                    <div className="h-10 flex items-center text-lg font-bold text-gray-900">
                      {calculateAmount().toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/time-entries/${timeEntryId}`)}
            >
              Annuler
            </Button>
            <Button type="submit" loading={saving}>
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
