'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { quoteService } from '@/services/api';
import { Quote } from '@/types';
import { getStatusColor, getStatusLabel } from '@/lib/utils';

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = parseInt(params.id as string);
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    loadQuote();
  }, [quoteId]);

  const loadQuote = async () => {
    try {
      const response = await quoteService.getById(quoteId);
      if (response.success && response.data) {
        setQuote(response.data);
      }
    } catch (error) {
      console.error('Error loading quote:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce devis ?')) return;
    
    setDeleting(true);
    try {
      const response = await quoteService.delete(quoteId);
      if (response.success) {
        router.push('/quotes');
      }
    } catch (error) {
      console.error('Error deleting quote:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!confirm('Convertir ce devis en facture ?')) return;
    
    setConverting(true);
    try {
      // Would need an endpoint to convert quote to invoice
      // For now, redirect to invoice creation with quote_id prefilled
      router.push(`/invoices/new?quote_id=${quoteId}`);
    } catch (error) {
      console.error('Error converting to invoice:', error);
    } finally {
      setConverting(false);
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

  if (!quote) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Devis non trouvé</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{quote.reference}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge status={quote.status} />
            </div>
          </div>
          <div className="flex gap-2">
            {quote.status === 'accepted' && (
              <Button
                onClick={handleConvertToInvoice}
                variant="primary"
                loading={converting}
              >
                Convertir en facture
              </Button>
            )}
            <Button
              onClick={() => router.push(`/quotes/${quoteId}/edit`)}
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
              {quote.customer && (
                <div>
                  <label className="text-sm text-gray-500">Client</label>
                  <p className="font-medium">
                    <a
                      href={`/customers/${quote.customer_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {quote.customer.company_name || `${quote.customer.first_name} ${quote.customer.last_name}`}
                    </a>
                  </p>
                </div>
              )}
              
              {quote.project && (
                <div>
                  <label className="text-sm text-gray-500">Projet</label>
                  <p className="font-medium">
                    <a
                      href={`/projects/${quote.project_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {quote.project.name}
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
              {quote.quote_date && (
                <div>
                  <label className="text-sm text-gray-500">Date du devis</label>
                  <p className="font-medium">
                    {new Date(quote.quote_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lignes du devis</CardTitle>
          </CardHeader>
          <CardContent>
            {quote.line_items && quote.line_items.length > 0 ? (
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
                    {quote.line_items.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3">{item.designation || item.description}</td>
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
              <CardTitle>Détails financiers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total HT :</span>
                <span className="font-medium">
                  {(quote.line_items?.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </span>
              </div>
              {quote.discount_percent && quote.discount_percent > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Remise ({quote.discount_percent}%) :</span>
                  <span>
                    -{((quote.line_items?.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) || 0) * quote.discount_percent / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quote.validity_date && quote.quote_date && (
                <div>
                  <label className="text-sm text-gray-500">Validité</label>
                  <p className="font-medium">{Math.ceil((new Date(quote.validity_date).getTime() - new Date(quote.quote_date).getTime()) / (1000 * 60 * 60 * 24))} jours</p>
                </div>
              )}
              {quote.deposit_percent && quote.deposit_percent > 0 && (
                <div>
                  <label className="text-sm text-gray-500">Acompte demandé</label>
                  <p className="font-medium">{quote.deposit_percent}%</p>
                </div>
              )}
              {quote.notes && (
                <div>
                  <label className="text-sm text-gray-500">Notes</label>
                  <p className="text-gray-700 text-sm">{quote.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/quotes')}
          >
            Retour à la liste
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
