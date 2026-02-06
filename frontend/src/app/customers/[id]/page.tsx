'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { customerService } from '@/services/api';
import { Customer } from '@/types';

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = parseInt(params.id as string);
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  const loadCustomer = async () => {
    try {
      const response = await customerService.getById(customerId);
      if (response.success && response.data) {
        setCustomer(response.data);
      }
    } catch (error) {
      console.error('Error loading customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;
    
    setDeleting(true);
    try {
      const response = await customerService.delete(customerId);
      if (response.success) {
        router.push('/customers');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
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

  if (!customer) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Client non trouvé</p>
        </div>
      </MainLayout>
    );
  }

  const isCompany = customer.type === 'company';

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isCompany ? customer.name : `${customer.firstName || ''} ${customer.lastName || ''}`}
            </h1>
            <p className="text-gray-500 mt-1">
              {isCompany ? 'Entreprise' : 'Particulier'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push(`/customers/${customerId}/edit`)}
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
              {!isCompany && (
                <>
                  <div>
                    <label className="text-sm text-gray-500">Prénom</label>
                    <p className="font-medium">{customer.firstName || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Nom</label>
                    <p className="font-medium">{customer.lastName || '-'}</p>
                  </div>
                </>
              )}
              {isCompany && (
                <div>
                  <label className="text-sm text-gray-500">Raison sociale</label>
                  <p className="font-medium">{customer.name || '-'}</p>
                </div>
              )}
              {customer.email && (
                <div>
                  <label className="text-sm text-gray-500">Email</label>
                  <p className="font-medium">
                    <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                      {customer.email}
                    </a>
                  </p>
                </div>
              )}
              {customer.phone && (
                <div>
                  <label className="text-sm text-gray-500">Téléphone</label>
                  <p className="font-medium">
                    <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">
                      {customer.phone}
                    </a>
                  </p>
                </div>
              )}
              {customer.siret && (
                <div>
                  <label className="text-sm text-gray-500">SIRET</label>
                  <p className="font-medium">{customer.siret}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Adresse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.address ? (
                <>
                  {customer.address.street && (
                    <div>
                      <label className="text-sm text-gray-500">Adresse</label>
                      <p className="font-medium">{customer.address.street}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {customer.address.postalCode && (
                      <div>
                        <label className="text-sm text-gray-500">Code postal</label>
                        <p className="font-medium">{customer.address.postalCode}</p>
                      </div>
                    )}
                    {customer.address.city && (
                      <div>
                        <label className="text-sm text-gray-500">Ville</label>
                        <p className="font-medium">{customer.address.city}</p>
                      </div>
                    )}
                  </div>
                  {customer.address.country && (
                    <div>
                      <label className="text-sm text-gray-500">Pays</label>
                      <p className="font-medium">{customer.address.country}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500">Aucune adresse renseignée</p>
              )}
            </CardContent>
          </Card>
        </div>

        {customer.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-700">{customer.notes}</p>
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
                <label className="text-sm text-gray-500">Date d'ajout</label>
                <p className="font-medium">
                  {new Date(customer.createdAt || '').toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Statut</label>
                <p className="font-medium">
                  {customer.isActive ? 'Actif' : 'Inactif'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/customers')}
          >
            Retour à la liste
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
