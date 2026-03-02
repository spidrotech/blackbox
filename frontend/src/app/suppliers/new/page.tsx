'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@/components/ui';
import { supplierService } from '@/services/api';
import { SupplierCreate } from '@/types';

export default function NewSupplierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<SupplierCreate>({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      postal_code: '',
      country: '',
    },
    siret: '',
    website: '',
    notes: '',
    is_favorite: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (['street', 'city', 'postal_code', 'country'].includes(name)) {
      setFormData(prev => ({ ...prev, address: { ...prev.address, [name]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await supplierService.create(formData);
      if (response.success) {
        router.push('/suppliers');
      }
    } catch (error) {
      console.error('Error creating supplier:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau fournisseur</h1>
          <p className="text-gray-500">Ajouter un nouveau fournisseur</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Nom / Raison sociale *"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Point P"
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
                <Input
                  label="Téléphone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Site web"
                  name="website"
                  type="url"
                  value={formData.website || ''}
                  onChange={handleChange}
                  placeholder="https://..."
                />
                <Input
                  label="SIRET"
                  name="siret"
                  value={formData.siret || ''}
                  onChange={handleChange}
                  placeholder="XXX XXX XXX XXXXX"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Adresse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Rue"
                name="street"
                value={formData.address?.street || ''}
                onChange={handleChange}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Code postal"
                  name="postal_code"
                  value={formData.address?.postal_code || ''}
                  onChange={handleChange}
                />
                <Input
                  label="Ville"
                  name="city"
                  value={formData.address?.city || ''}
                  onChange={handleChange}
                />
              </div>

              <Input
                label="Pays"
                name="country"
                value={formData.address?.country || ''}
                onChange={handleChange}
              />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="is_favorite"
                  checked={formData.is_favorite}
                  onChange={handleChange}
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Marquer comme favori</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Notes internes sur ce fournisseur..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/suppliers')}
            >
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              Enregistrer le fournisseur
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
