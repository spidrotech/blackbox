'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select } from '@/components/ui';
import { equipmentService } from '@/services/api';
import { EquipmentCreate } from '@/types';
import { buildDetailPath } from '@/lib/routes';

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

export default function EditEquipmentPage() {
  const router = useRouter();
  const params = useParams();
  const equipmentId = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
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
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipmentId]);

  const loadData = async () => {
    try {
      const equipmentRes = await equipmentService.getById(equipmentId);
      
      if (equipmentRes.success && equipmentRes.data) {
        const equipment = equipmentRes.data;
        setFormData({
          name: equipment.name || '',
          category: equipment.category || 'power_tools',
          description: equipment.description || '',
          purchase_date: equipment.purchase_date?.split('T')[0] || '',
          purchase_price: equipment.purchase_price,
          status: equipment.status || 'available',
          notes: equipment.notes || '',
        });
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'purchase_price') {
      setFormData(prev => ({ ...prev, [name]: value ? parseFloat(value) : undefined }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await equipmentService.update(equipmentId, formData);
      if (response.success) {
        router.push(buildDetailPath('equipment', equipmentId));
      }
    } catch (error) {
      console.error('Error updating equipment:', error);
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
          <h1 className="text-2xl font-bold text-gray-900">Modifier l&apos;équipement</h1>
          <p className="text-gray-500">Mettre à jour les informations</p>
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
                required
              />

              <div className="grid grid-cols-2 gap-4">
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
              <Select
                label="État"
                name="status"
                options={statusOptions}
                value={formData.status}
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
              onClick={() => router.push(buildDetailPath('equipment', equipmentId))}
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
