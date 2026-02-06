'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select } from '@/components/ui';
import { priceLibraryService } from '@/services/api';
import { PriceLibraryItem, PriceLibraryItemCreate } from '@/types';

const typeOptions = [
  { value: 'supply', label: 'Fourniture' },
  { value: 'labor', label: 'Main d\'œuvre' },
  { value: 'other', label: 'Autre' },
];

const unitOptions = [
  { value: 'u', label: 'Unité (u)' },
  { value: 'm', label: 'Mètre (m)' },
  { value: 'm²', label: 'Mètre carré (m²)' },
  { value: 'm³', label: 'Mètre cube (m³)' },
  { value: 'ml', label: 'Mètre linéaire (ml)' },
  { value: 'kg', label: 'Kilogramme (kg)' },
  { value: 'h', label: 'Heure (h)' },
  { value: 'j', label: 'Jour (j)' },
  { value: 'forfait', label: 'Forfait' },
  { value: 'lot', label: 'Lot' },
];

const vatRateOptions = [
  { value: '20', label: '20%' },
  { value: '10', label: '10%' },
  { value: '5.5', label: '5.5%' },
  { value: '2.1', label: '2.1%' },
  { value: '0', label: '0%' },
];

const categoryOptions = [
  { value: 'gros_oeuvre', label: 'Gros œuvre' },
  { value: 'maconnerie', label: 'Maçonnerie' },
  { value: 'charpente', label: 'Charpente' },
  { value: 'couverture', label: 'Couverture' },
  { value: 'menuiserie', label: 'Menuiserie' },
  { value: 'plomberie', label: 'Plomberie' },
  { value: 'electricite', label: 'Électricité' },
  { value: 'chauffage', label: 'Chauffage' },
  { value: 'isolation', label: 'Isolation' },
  { value: 'platrerie', label: 'Plâtrerie' },
  { value: 'carrelage', label: 'Carrelage' },
  { value: 'peinture', label: 'Peinture' },
  { value: 'sols', label: 'Sols' },
  { value: 'exterieur', label: 'Extérieur' },
  { value: 'divers', label: 'Divers' },
];

export default function EditPriceLibraryItemPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<PriceLibraryItemCreate>({
    name: '',
    description: '',
    long_description: '',
    item_type: 'supply',
    category: 'divers',
    subcategory: '',
    trade: '',
    unit: 'u',
    unit_price: 0,
    tax_rate: 20,
    reference: '',
    brand: '',
    cost_price: undefined,
  });

  useEffect(() => {
    loadItem();
  }, [itemId]);

  const loadItem = async () => {
    try {
      const response = await priceLibraryService.getById(itemId);
      if (response.success && response.data) {
        const item = response.data;
        setFormData({
          name: item.name || '',
          description: item.description || '',
          long_description: item.long_description || '',
          item_type: item.item_type || 'supply',
          category: item.category || 'divers',
          subcategory: item.subcategory || '',
          trade: item.trade || '',
          unit: item.unit || 'u',
          unit_price: item.unit_price || 0,
          tax_rate: item.tax_rate || 20,
          reference: item.reference || '',
          brand: item.brand || '',
          cost_price: item.cost_price,
        });
      }
    } catch (error) {
      console.error('Error loading item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (['unit_price', 'tax_rate', 'cost_price'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value ? parseFloat(value) : 0 }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const calculateTTC = () => {
    const ht = formData.unit_price || 0;
    const vat = (ht * (formData.tax_rate || 0)) / 100;
    return ht + vat;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await priceLibraryService.update(itemId, formData);
      if (response.success) {
        router.push(`/price-library/${itemId}`);
      }
    } catch (error) {
      console.error('Error updating item:', error);
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
          <h1 className="text-2xl font-bold text-gray-900">Modifier l&apos;article</h1>
          <p className="text-gray-500">Mettre à jour les informations de l&apos;article</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Référence *"
                  name="reference"
                  value={formData.reference}
                  onChange={handleChange}
                  required
                />
                <Select
                  label="Type"
                  name="item_type"
                  options={typeOptions}
                  value={formData.item_type}
                  onChange={handleChange}
                />
              </div>

              <Input
                label="Description *"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
              />

              <Select
                label="Catégorie"
                name="category"
                options={categoryOptions}
                value={formData.category}
                onChange={handleChange}
              />

              <Input
                label="Marque"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
              />

              <Input
                label="Sous-catégorie"
                name="subcategory"
                value={formData.subcategory}
                onChange={handleChange}
              />\n\n              <Input
                label="Métier / Corps de métier"
                name="trade"
                value={formData.trade}
                onChange={handleChange}
              />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Prix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Prix unitaire HT (€) *"
                  name="unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_price || ''}
                  onChange={handleChange}
                  required
                />
                <Select
                  label="Unité"
                  name="unit"
                  options={unitOptions}
                  value={formData.unit}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Taux de TVA"
                  name="tax_rate"
                  options={vatRateOptions}
                  value={formData.tax_rate?.toString() || '20'}
                  onChange={handleChange}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix TTC</label>
                  <div className="h-10 flex items-center text-lg font-bold text-gray-900">
                    {calculateTTC().toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Détails supplémentaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Description longue"
                name="long_description"
                value={formData.long_description}
                onChange={handleChange}
                placeholder="Description détaillée"
              />

              <Input
                label="Coût d'achat (€)"
                name="cost_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.cost_price || ''}
                onChange={handleChange}
                placeholder="Coût interne pour calcul marge"
              />
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/price-library/${itemId}`)}
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
