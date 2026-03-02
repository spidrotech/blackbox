'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { purchaseService } from '@/services/api';
import { Purchase } from '@/types';
import { buildDetailPath, buildEditPath } from '@/lib/routes';

const categoryLabels: Record<string, string> = {
  materials: 'Matériaux',
  tools: 'Outils',
  equipment_rental: 'Location équipement',
  services: 'Services',
  consumables: 'Consommables',
  other: 'Autre',
};

export default function PurchaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const purchaseId = parseInt(params.id as string);
  
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadPurchase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseId]);

  const loadPurchase = async () => {
    try {
      const response = await purchaseService.getById(purchaseId);
      if (response.success && response.data) {
        setPurchase(response.data);
      }
    } catch (error) {
      console.error('Error loading purchase:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet achat ?')) return;
    
    setDeleting(true);
    try {
      const response = await purchaseService.delete(purchaseId);
      if (response.success) {
        router.push('/purchases');
      }
    } catch (error) {
      console.error('Error deleting purchase:', error);
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

  if (!purchase) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Achat non trouvé</p>
        </div>
      </MainLayout>
    );
  }

  const totalTTC = (purchase.amount_ht || 0) + ((purchase.amount_ht || 0) * (purchase.vat_rate || 0) / 100);

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{purchase.description}</h1>
            <div className="flex items-center gap-3 mt-2">
              {purchase.is_paid ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Payé</span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Non payé</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push(buildEditPath('purchases', purchaseId))}
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
              <CardTitle>Détails de l&apos;achat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {purchase.supplier && (
                <div>
                  <label className="text-sm text-gray-500">Fournisseur</label>
                  <p className="font-medium">
                    <a
                      href={buildDetailPath('suppliers', purchase.supplier_id ?? '')}
                      className="text-blue-600 hover:underline"
                    >
                      {purchase.supplier.name}
                    </a>
                  </p>
                </div>
              )}
              
              {purchase.project && (
                <div>
                  <label className="text-sm text-gray-500">Projet</label>
                  <p className="font-medium">
                    <a
                      href={buildDetailPath('projects', purchase.project_id ?? '')}
                      className="text-blue-600 hover:underline"
                    >
                      {purchase.project.name}
                    </a>
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm text-gray-500">Catégorie</label>
                <p className="font-medium">{categoryLabels[purchase.category] || purchase.category}</p>
              </div>

              {purchase.invoice_number && (
                <div>
                  <label className="text-sm text-gray-500">N° facture fournisseur</label>
                  <p className="font-medium">{purchase.invoice_number}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Date</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="text-sm text-gray-500">Date d&apos;achat</label>
              <p className="font-medium">
                {purchase.purchase_date ? new Date(purchase.purchase_date).toLocaleDateString('fr-FR') : 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Montants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Montant HT :</span>
              <span className="font-medium">
                {purchase.amount_ht?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">TVA ({purchase.vat_rate}%) :</span>
              <span className="font-medium">
                {((purchase.amount_ht || 0) * (purchase.vat_rate || 0) / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total TTC :</span>
              <span className="text-blue-600">
                {totalTTC.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          </CardContent>
        </Card>

        {purchase.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-700">{purchase.notes}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/purchases')}
          >
            Retour à la liste
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
