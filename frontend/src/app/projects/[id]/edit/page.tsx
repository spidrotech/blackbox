'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select } from '@/components/ui';
import { projectService, customerService } from '@/services/api';
import { Project, ProjectCreate, Customer } from '@/types';

const statusOptions = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'planned', label: 'Planifié' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'paused', label: 'En pause' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
  { value: 'archived', label: 'Archivé' },
];

const priorityOptions = [
  { value: 'low', label: 'Basse' },
  { value: 'normal', label: 'Normale' },
  { value: 'high', label: 'Haute' },
  { value: 'urgent', label: 'Urgente' },
];

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [formData, setFormData] = useState<ProjectCreate>({
    name: '',
    description: '',
    customer_id: 0,
    status: 'draft',
    priority: 'normal',
    start_date: '',
    end_date: '',
    estimated_budget: undefined,
    notes: '',
    worksite: {
      street: '',
      city: '',
      postal_code: '',
      country: '',
    },
  });

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      const [projectRes, customersRes] = await Promise.all([
        projectService.getById(projectId),
        customerService.getAll(),
      ]);
      
      if (projectRes.success && projectRes.data) {
        const project = projectRes.data;
        setFormData({
          name: project.name || '',
          description: project.description || '',
          customer_id: project.customer_id || 0,
          status: project.status || 'not_started',
          priority: project.priority || 'medium',
          worksite: {
            street: project.worksite?.street || '',
            city: project.worksite?.city || '',
            postal_code: project.worksite?.postal_code || '',
            country: project.worksite?.country || '',
          },
          start_date: project.start_date?.split('T')[0] || '',
          end_date: project.end_date?.split('T')[0] || '',
          estimated_budget: project.estimated_budget,
          notes: project.notes || '',
        });
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

  const customerOptions = [
    { value: '', label: 'Sélectionner un client' },
    ...customers.map(c => ({ value: String(c.id), label: c.company_name || `${c.first_name} ${c.last_name}` })),
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (['customer_id', 'estimated_budget'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value ? (name === 'customer_id' ? parseInt(value) : parseFloat(value)) : undefined }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await projectService.update(projectId, formData);
      if (response.success) {
        router.push(`/projects/${projectId}`);
      }
    } catch (error) {
      console.error('Error updating project:', error);
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
          <h1 className="text-2xl font-bold text-gray-900">Modifier le projet</h1>
          <p className="text-gray-500">Mettre à jour les informations du projet</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Nom du projet *"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />

              <Select
                label="Client *"
                name="customer_id"
                options={customerOptions}
                value={formData.customer_id?.toString() || ''}
                onChange={handleChange}
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Statut"
                  name="status"
                  options={statusOptions}
                  value={formData.status}
                  onChange={handleChange}
                />
                <Select
                  label="Priorité"
                  name="priority"
                  options={priorityOptions}
                  value={formData.priority}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Adresse du chantier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Adresse"
                name="worksite_street"
                value={formData.worksite?.street || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  worksite: { ...prev.worksite, street: e.target.value }
                }))}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Code postal"
                  name="worksite_postal_code"
                  value={formData.worksite?.postal_code || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    worksite: { ...prev.worksite, postal_code: e.target.value }
                  }))}
                />
                <Input
                  label="Ville"
                  name="worksite_city"
                  value={formData.worksite?.city || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    worksite: { ...prev.worksite, city: e.target.value }
                  }))}
                />
              </div>

              <Input
                label="Pays"
                name="worksite_country"
                value={formData.worksite?.country || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  worksite: { ...prev.worksite, country: e.target.value }
                }))}
              />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Dates et budget</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Date de début"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleChange}
                />
                <Input
                  label="Date de fin prévue"
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleChange}
                />
              </div>

              <Input
                label="Budget estimé (€)"
                name="estimated_budget"
                type="number"
                step="0.01"
                value={formData.estimated_budget || ''}
                onChange={handleChange}
              />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                name="notes"
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Notes internes..."
              />
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/projects/${projectId}`)}
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
