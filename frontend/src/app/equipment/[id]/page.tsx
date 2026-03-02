'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { equipmentService } from '@/services/api';
import { Equipment } from '@/types';
import { buildEditPath } from '@/lib/routes';

const categoryLabels: Record<string, string> = {
  power_tools: 'Outillage électroportatif',
  hand_tools: 'Outillage à main',
  machinery: 'Machine',
  vehicle: 'Véhicule',
  scaffolding: 'Échafaudage',
  safety: 'Équipement sécurité',
  other: 'Autre',
};

export default function EquipmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const equipmentId = parseInt(params.id as string);
  
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadEquipment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipmentId]);

  const loadEquipment = async () => {
    try {
      const response = await equipmentService.getById(equipmentId);
      if (response.success && response.data) {
        setEquipment(response.data);
      }
    } catch (error) {
      console.error('Error loading equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet équipement ?')) return;
    
    setDeleting(true);
    try {
      const response = await equipmentService.delete(equipmentId);
      if (response.success) {
        router.push('/equipment');
      }
    } catch (error) {
      console.error('Error deleting equipment:', error);
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

  if (!equipment) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Équipement non trouvé</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{equipment.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge status={equipment.status} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push(buildEditPath('equipment', equipmentId))}
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
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Catégorie</label>
                <p className="font-medium">{equipment.category ? categoryLabels[equipment.category] || equipment.category : 'N/A'}</p>
              </div>

              {equipment.description && (
                <div>
                  <label className="text-sm text-gray-500">Description</label>
                  <p className="text-sm text-gray-700">{equipment.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Affectation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Projet</label>
                <p className="text-gray-500">Non affecté</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Achat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {equipment.purchase_date && (
                <div>
                  <label className="text-sm text-gray-500">Date d&apos;achat</label>
                  <p className="font-medium">
                    {new Date(equipment.purchase_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
              {equipment.purchase_price && (
                <div>
                  <label className="text-sm text-gray-500">Prix d&apos;achat</label>
                  <p className="font-medium">
                    {equipment.purchase_price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {equipment.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-700">{equipment.notes}</p>
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
                  {new Date(equipment.created_at || '').toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Dernière modification</label>
                <p className="font-medium">
                  {new Date(equipment.updated_at || '').toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/equipment')}
          >
            Retour à la liste
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
