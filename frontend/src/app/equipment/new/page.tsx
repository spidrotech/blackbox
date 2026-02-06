'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select } from '@/components/ui';
import { equipmentService, projectService } from '@/services/api';
import { EquipmentCreate, Project } from '@/types';

const statusOptions = [
  { value: 'available', label: 'Disponible' },
  { value: 'in_use', label: 'En utilisation' },
  { value: 'maintenance', label: 'En maintenance' },
  { value: 'broken', label: 'Hors service' },
];

const categoryOptions = [
  { value: 'power_tools', label: 'Outillage électroportatif' },
  { value: 'hand_tools', label: 'Outillage à main' },
  { value: 'machinery', label: 'Machine' },
  { value: 'vehicle', label: 'Véhicule' },
  { value: 'scaffolding', label: 'Échafaudage' },
  { value: 'safety', label: 'Équipement sécurité' },
  { value: 'other', label: 'Autre' },
];

export default function NewEquipmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [formData, setFormData] = useState<EquipmentCreate>({
    name: '',
    category: 'power_tools',
    description: '',
    purchase_date: '',
    purchase_price: undefined,
    status: 'available',
    notes: '',
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await projectService.getAll();
      if (response.success && response.data) {
        setProjects(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const projectOptions = [
    { value: '', label: 'Aucun (disponible)' },
    ...projects.map(p => ({ value: String(p.id), label: p.name })),
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'purchase_price') {
      setFormData(prev => ({ ...prev, [name]: value ? parseFloat(value) : undefined }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await equipmentService.create(formData);
      if (response.success) {
        router.push('/equipment');
      }
    } catch (error) {
      console.error('Error creating equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvel équipement</h1>
          <p className="text-gray-500">Ajouter un équipement au parc matériel</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Nom *"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Perceuse Bosch GBH 2-26"
                required
              />

              <div className="grid grid-cols-2 gap-4">
                {/* 
                <Input
                  label="Référence"
                  name="reference"
                  value={formData.reference}
                  onChange={handleChange}
                  placeholder="Ex: EQ-001"
                />
                */}
                <Select
                  label="Catégorie"
                  name="category"
                  options={categoryOptions}
                  value={formData.category}
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
                  placeholder="Caractéristiques techniques..."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Achat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Date d'achat"
                  name="purchase_date"
                  type="date"
                  value={formData.purchase_date}
                  onChange={handleChange}
                />
                <Input
                  label="Prix d'achat (€)"
                  name="purchase_price"
                  type="number"
                  step="0.01"
                  value={formData.purchase_price || ''}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>État et affectation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="État"
                  name="status"
                  options={statusOptions}
                  value={formData.status}
                  onChange={handleChange}
                />
              </div>
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
                placeholder="Notes internes (entretien, observations...)"
              />
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/equipment')}
            >
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              Enregistrer l&apos;équipement
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
