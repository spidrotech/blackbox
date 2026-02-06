'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select } from '@/components/ui';
import { projectService, customerService } from '@/services/api';
import { ProjectCreate, Customer } from '@/types';

const statusOptions = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'planned', label: 'Planifié' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'paused', label: 'En pause' },
  { value: 'completed', label: 'Terminé' },
];

const priorityOptions = [
  { value: 'low', label: 'Basse' },
  { value: 'normal', label: 'Normale' },
  { value: 'high', label: 'Haute' },
  { value: 'urgent', label: 'Urgente' },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [formData, setFormData] = useState<ProjectCreate>({
    name: '',
    description: '',
    status: 'draft',
    priority: 'normal',
    start_date: '',
    end_date: '',
    estimated_budget: undefined,
    customer_id: undefined,
    notes: '',
    worksite: {
      street: '',
      city: '',
      postal_code: '',
      country: 'France',
    },
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await customerService.getAll();
      if (response.success && response.data) {
        setCustomers(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const getCustomerName = (customer: Customer) => {
    return customer.customer_type === 'company' 
      ? customer.company_name 
      : `${customer.first_name} ${customer.last_name}`;
  };

  const customerOptions = [
    { value: '', label: 'Sélectionner un client' },
    ...customers.map(c => ({ value: String(c.id), label: getCustomerName(c) || '' })),
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('worksite_')) {
      const field = name.replace('worksite_', '');
      setFormData(prev => ({
        ...prev,
        worksite: {
          ...prev.worksite,
          [field]: value,
        },
      }));
    } else if (name === 'customer_id') {
      setFormData(prev => ({ ...prev, [name]: value ? parseInt(value) : undefined }));
    } else if (name === 'estimated_budget') {
      setFormData(prev => ({ ...prev, [name]: value ? parseFloat(value) : undefined }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await projectService.create(formData);
      if (response.success) {
        router.push('/projects');
      }
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau projet</h1>
          <p className="text-gray-500">Créer un nouveau projet</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Nom du projet"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />

              <Select
                label="Client"
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
                  value={formData.status || 'draft'}
                  onChange={handleChange}
                />
                <Select
                  label="Priorité"
                  name="priority"
                  options={priorityOptions}
                  value={formData.priority || 'normal'}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Date de début"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleChange}
                />
                <Input
                  label="Date de fin"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Description du projet..."
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
                onChange={handleChange}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Code postal"
                  name="worksite_postal_code"
                  value={formData.worksite?.postal_code || ''}
                  onChange={handleChange}
                />
                <Input
                  label="Ville"
                  name="worksite_city"
                  value={formData.worksite?.city || ''}
                  onChange={handleChange}
                />
              </div>
              <Input
                label="Pays"
                name="worksite_country"
                value={formData.worksite?.country || ''}
                onChange={handleChange}
              />
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/projects')}
            >
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              Créer le projet
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
