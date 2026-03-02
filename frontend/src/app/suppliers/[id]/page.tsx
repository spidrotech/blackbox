'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { supplierService } from '@/services/api';
import { Supplier } from '@/types';
import { buildEditPath } from '@/lib/routes';

export default function SupplierDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supplierId = parseInt(params.id as string);
  
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadSupplier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId]);

  const loadSupplier = async () => {
    try {
      const response = await supplierService.getById(supplierId);
      if (response.success && response.data) {
        setSupplier(response.data);
      }
    } catch (error) {
      console.error('Error loading supplier:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) return;
    
    setDeleting(true);
    try {
      const response = await supplierService.delete(supplierId);
      if (response.success) {
        router.push('/suppliers');
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
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

  if (!supplier) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Fournisseur non trouvé</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
            {supplier.is_favorite && (
              <p className="text-yellow-600 mt-1">⭐ Fournisseur favori</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push(buildEditPath('suppliers', supplierId))}
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
              <CardTitle>Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {supplier.email && (
                <div>
                  <label className="text-sm text-gray-500">Email</label>
                  <p className="font-medium">
                    <a href={`mailto:${supplier.email}`} className="text-blue-600 hover:underline">
                      {supplier.email}
                    </a>
                  </p>
                </div>
              )}
              {supplier.phone && (
                <div>
                  <label className="text-sm text-gray-500">Téléphone</label>
                  <p className="font-medium">
                    <a href={`tel:${supplier.phone}`} className="text-blue-600 hover:underline">
                      {supplier.phone}
                    </a>
                  </p>
                </div>
              )}
              {supplier.website && (
                <div>
                  <label className="text-sm text-gray-500">Site web</label>
                  <p className="font-medium">
                    <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {supplier.website}
                    </a>
                  </p>
                </div>
              )}
              {supplier.siret && (
                <div>
                  <label className="text-sm text-gray-500">SIRET</label>
                  <p className="font-medium">{supplier.siret}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Adresse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {supplier.street && (
                <div>
                  <label className="text-sm text-gray-500">Rue</label>
                  <p className="font-medium">{supplier.street}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {supplier.postal_code && (
                  <div>
                    <label className="text-sm text-gray-500">Code postal</label>
                    <p className="font-medium">{supplier.postal_code}</p>
                  </div>
                )}
                {supplier.city && (
                  <div>
                    <label className="text-sm text-gray-500">Ville</label>
                    <p className="font-medium">{supplier.city}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {supplier.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-700">{supplier.notes}</p>
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
                  {new Date(supplier.created_at || '').toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Dernière modification</label>
                <p className="font-medium">
                  {new Date(supplier.updated_at || '').toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/suppliers')}
          >
            Retour à la liste
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
