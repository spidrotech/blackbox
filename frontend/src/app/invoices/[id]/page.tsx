'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { invoiceService } from '@/services/api';
import { Invoice } from '@/types';

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = parseInt(params.id as string);
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      const response = await invoiceService.getById(invoiceId);
      if (response.success && response.data) {
        setInvoice(response.data);
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) return;
    
    setDeleting(true);
    try {
      const response = await invoiceService.delete(invoiceId);
      if (response.success) {
        router.push('/invoices');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
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

  if (!invoice) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Facture non trouvée</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{invoice.reference}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge status={invoice.status} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push(`/invoices/${invoiceId}/edit`)}
              variant="secondary"
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
              <CardTitle>Client et projet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {invoice.customer && (
                <div>
                  <label className="text-sm text-gray-500">Client</label>
                  <p className="font-medium">
                    <a
                      href={`/customers/${invoice.customer_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {invoice.customer.company_name || `${invoice.customer.first_name} ${invoice.customer.last_name}`}
                    </a>
                  </p>
                </div>
              )}
              
              {invoice.project && (
                <div>
                  <label className="text-sm text-gray-500">Projet</label>
                  <p className="font-medium">
                    <a
                      href={`/projects/${invoice.project_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {invoice.project.name}
                    </a>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {invoice.invoice_date && (
                <div>
                  <label className="text-sm text-gray-500">Date de facturation</label>
                  <p className="font-medium">
                    {new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
              {invoice.due_date && (
                <div>
                  <label className="text-sm text-gray-500">Date d'échéance</label>
                  <p className="font-medium">
                    {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lignes de facture</CardTitle>
          </CardHeader>
          <CardContent>
            {invoice.line_items && invoice.line_items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-2 px-3">Description</th>
                      <th className="text-right py-2 px-3">Qté</th>
                      <th className="text-right py-2 px-3">PU</th>
                      <th className="text-right py-2 px-3">Total</th>
                      <th className="text-right py-2 px-3">TVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.line_items.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3">{item.description}</td>
                        <td className="text-right py-2 px-3">{item.quantity}</td>
                        <td className="text-right py-2 px-3">
                          {item.unit_price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </td>
                        <td className="text-right py-2 px-3 font-medium">
                          {(item.quantity * item.unit_price).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </td>
                        <td className="text-right py-2 px-3">{item.vat_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">Aucune ligne</p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Montants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoice.discount_percent && invoice.discount_percent > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Remise ({invoice.discount_percent}%) :</span>
                  <span>{invoice.discount_amount?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paiement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoice.amount_paid !== undefined && (
                <div>
                  <label className="text-sm text-gray-500">Montant payé</label>
                  <p className="font-medium">
                    {invoice.amount_paid.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {invoice.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-700">{invoice.notes}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/invoices')}
          >
            Retour à la liste
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
