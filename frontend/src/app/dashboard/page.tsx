'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { dashboardService } from '@/services/api';
import { DashboardData } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await dashboardService.getData();
      if (response.success && response.data) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500">Vue d&apos;ensemble de votre activité</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Projets actifs</p>
                  <p className="text-2xl font-bold text-gray-900">{data?.projects.active || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Clients</p>
                  <p className="text-2xl font-bold text-gray-900">{data?.customers.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Devis en attente</p>
                  <p className="text-2xl font-bold text-gray-900">{data?.quotes.pending || 0}</p>
                  <p className="text-sm text-gray-500">{formatCurrency(data?.quotes.pendingValue || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-red-100 rounded-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Factures impayées</p>
                  <p className="text-2xl font-bold text-gray-900">{data?.invoices.unpaid || 0}</p>
                  <p className="text-sm text-gray-500">{formatCurrency(data?.invoices.unpaidValue || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Chiffre d&apos;affaires encaissé</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(data?.revenue.total || 0)}</p>
              </div>
              <Link href="/invoices">
                <Button variant="outline">Voir les factures</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent items */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Projects */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Projets récents</CardTitle>
                <Link href="/projects" className="text-sm text-blue-600 hover:text-blue-800">
                  Voir tout
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.recentProjects?.length ? (
                  data.recentProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{project.name}</p>
                        <p className="text-sm text-gray-500">{formatDate(project.createdAt)}</p>
                      </div>
                      <Badge status={project.status} />
                    </Link>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">Aucun projet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Quotes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Devis récents</CardTitle>
                <Link href="/quotes" className="text-sm text-blue-600 hover:text-blue-800">
                  Voir tout
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.recentQuotes?.length ? (
                  data.recentQuotes.map((quote) => (
                    <Link
                      key={quote.id}
                      href={`/quotes/${quote.id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{quote.reference}</p>
                        <p className="text-sm text-gray-500">{formatDate(quote.createdAt)}</p>
                      </div>
                      <Badge status={quote.status} />
                    </Link>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">Aucun devis</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Factures récentes</CardTitle>
                <Link href="/invoices" className="text-sm text-blue-600 hover:text-blue-800">
                  Voir tout
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.recentInvoices?.length ? (
                  data.recentInvoices.map((invoice) => (
                    <Link
                      key={invoice.id}
                      href={`/invoices/${invoice.id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{invoice.reference}</p>
                        <p className="text-sm text-gray-500">{formatDate(invoice.createdAt)}</p>
                      </div>
                      <Badge status={invoice.status} />
                    </Link>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">Aucune facture</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
