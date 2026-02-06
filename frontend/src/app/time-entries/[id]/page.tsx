'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { timeEntryService } from '@/services/api';
import { TimeEntry } from '@/types';

export default function TimeEntryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const timeEntryId = parseInt(params.id as string);
  
  const [timeEntry, setTimeEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTimeEntry();
  }, [timeEntryId]);

  const loadTimeEntry = async () => {
    try {
      const response = await timeEntryService.getById(timeEntryId);
      if (response.success && response.data) {
        setTimeEntry(response.data);
      }
    } catch (error) {
      console.error('Error loading time entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette saisie ?')) return;
    
    setDeleting(true);
    try {
      const response = await timeEntryService.delete(timeEntryId);
      if (response.success) {
        router.push('/time-entries');
      }
    } catch (error) {
      console.error('Error deleting time entry:', error);
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

  if (!timeEntry) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Saisie non trouvée</p>
        </div>
      </MainLayout>
    );
  }

  const amount = 0; // Calculate from duration_hours if needed

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Saisie du {new Date(timeEntry.work_date).toLocaleDateString('fr-FR')}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              {timeEntry.is_approved ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Validée</span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">En attente</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push(`/time-entries/${timeEntryId}/edit`)}
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
              {timeEntry.project && (
                <div>
                  <label className="text-sm text-gray-500">Projet</label>
                  <p className="font-medium">
                    <a
                      href={`/projects/${timeEntry.project_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {timeEntry.project.name}
                    </a>
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm text-gray-500">Heures</label>
                <p className="font-medium">{timeEntry.duration_hours}h</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Facturation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {timeEntry.hourly_rate ? (
                <>
                  <div>
                    <label className="text-sm text-gray-500">Taux horaire</label>
                    <p className="font-medium">
                      {timeEntry.hourly_rate?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}/h
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Montant</label>
                    <p className="font-medium text-lg">
                      {amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-gray-500">Temps non facturable</p>
              )}
            </CardContent>
          </Card>
        </div>

        {timeEntry.description && (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-700">{timeEntry.description}</p>
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
                  {new Date(timeEntry.created_at || '').toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Statut</label>
                <p className="font-medium">
                  {timeEntry.is_approved ? 'Validée' : 'En attente de validation'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/time-entries')}
          >
            Retour à la liste
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
