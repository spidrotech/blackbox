'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { priceLibraryService } from '@/services/api';
import { PriceLibraryItem } from '@/types';
import { buildEditPath } from '@/lib/routes';

const typeLabels: Record<string, string> = {
  supply: 'Fourniture',
  labor: 'Main d\'œuvre',
  other: 'Autre',
};

const categoryLabels: Record<string, string> = {
  gros_oeuvre: 'Gros œuvre',
  maconnerie: 'Maçonnerie',
  charpente: 'Charpente',
  couverture: 'Couverture',
  menuiserie: 'Menuiserie',
  plomberie: 'Plomberie',
  electricite: 'Électricité',
  chauffage: 'Chauffage',
  isolation: 'Isolation',
  platrerie: 'Plâtrerie',
  carrelage: 'Carrelage',
  peinture: 'Peinture',
  sols: 'Sols',
  exterieur: 'Extérieur',
  divers: 'Divers',
};

export default function PriceLibraryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = parseInt(params.id as string);
  
  const [item, setItem] = useState<PriceLibraryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  const loadItem = async () => {
    try {
      const response = await priceLibraryService.getById(itemId);
      if (response.success && response.data) {
        setItem(response.data);
      }
    } catch (error) {
      console.error('Error loading price library item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;
    
    setDeleting(true);
    try {
      const response = await priceLibraryService.delete(itemId);
      if (response.success) {
        router.push('/price-library');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    } finally {
      setDeleting(false);
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

  if (!item) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Article non trouvé</p>
        </div>
      </MainLayout>
    );
  }

  const totalTTC = (item.unit_price || 0) + ((item.unit_price || 0) * (item.tax_rate || 0) / 100);

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{item.description}</h1>
            <div className="flex items-center gap-3 mt-2">
              {item.is_favorite && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  ⭐ Favori
                </span>
              )}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {typeLabels[item.item_type] || item.item_type}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push(buildEditPath('price-library', itemId))}
              variant="primary"
            >
              Modifier
            </Button>
            <Button
              onClick={handleDelete}
              variant="danger"
              loading={deleting}
            >
              Supprimer
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Référence</label>
                <p className="font-medium">{item.reference}</p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Type</label>
                <p className="font-medium">{typeLabels[item.item_type] || item.item_type}</p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Catégorie</label>
                <p className="font-medium">{item.category ? (categoryLabels[item.category] || item.category) : 'Non défini'}</p>
              </div>

              {item.brand && (
                <div>
                  <label className="text-sm text-gray-500">Marque</label>
                  <p className="font-medium">{item.brand}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Unité</label>
                <p className="font-medium">{item.unit}</p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Prix unitaire HT</label>
                <p className="font-medium text-lg">
                  {item.unit_price?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Taux TVA</label>
                <p className="font-medium">{item.tax_rate}%</p>
              </div>

              <div className="border-t pt-2">
                <label className="text-sm text-gray-500">Prix TTC</label>
                <p className="font-medium text-blue-600 text-lg">
                  {totalTTC.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {item.long_description && (
          <Card>
            <CardHeader>
              <CardTitle>Description détaillée</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-700">{item.long_description}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Informations supplémentaires</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Date d&apos;ajout</label>
                <p className="font-medium">
                  {new Date(item.created_at || '').toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Dernière modification</label>
                <p className="font-medium">
                  {new Date(item.updated_at || '').toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/price-library')}
          >
            Retour à la liste
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
