'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { projectService } from '@/services/api';
import { Project } from '@/types';
import { buildDetailPath, buildEditPath } from '@/lib/routes';

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = parseInt(params.id as string);
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const loadProject = async () => {
    try {
      const response = await projectService.getById(projectId);
      if (response.success && response.data) {
        setProject(response.data);
      }
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) return;
    
    setDeleting(true);
    try {
      const response = await projectService.delete(projectId);
      if (response.success) {
        router.push('/projects');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
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

  if (!project) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Projet non trouvé</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge status={project.status} />
              {project.priority && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  {project.priority === 'high' ? 'Haute' : project.priority === 'normal' ? 'Moyenne' : project.priority === 'low' ? 'Basse' : 'Urgente'} priorité
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push(buildEditPath('projects', projectId))}
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

        <Card>
          <CardHeader>
            <CardTitle>Détails du projet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.customer && (
              <div>
                <label className="text-sm text-gray-500">Client</label>
                <p className="font-medium">
                  <a
                    href={buildDetailPath('customers', project.customer_id)}
                    className="text-blue-600 hover:underline"
                  >
                    {project.customer.name || `${project.customer.firstName || ''} ${project.customer.lastName || ''}`.trim()}
                  </a>
                </p>
              </div>
            )}
            
            {project.description && (
              <div>
                <label className="text-sm text-gray-500">Description</label>
                <p className="whitespace-pre-wrap text-gray-700">{project.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adresse du chantier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.worksite?.street && (
              <div>
                <label className="text-sm text-gray-500">Adresse</label>
                <p className="font-medium">{project.worksite.street}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {project.worksite?.postal_code && (
                <div>
                  <label className="text-sm text-gray-500">Code postal</label>
                  <p className="font-medium">{project.worksite.postal_code}</p>
                </div>
              )}
              {project.worksite?.city && (
                <div>
                  <label className="text-sm text-gray-500">Ville</label>
                  <p className="font-medium">{project.worksite.city}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.start_date && (
                <div>
                  <label className="text-sm text-gray-500">Date de début</label>
                  <p className="font-medium">
                    {new Date(project.start_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
              {project.end_date && (
                <div>
                  <label className="text-sm text-gray-500">Date de fin prévue</label>
                  <p className="font-medium">
                    {new Date(project.end_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.estimated_budget && (
                <div>
                  <label className="text-sm text-gray-500">Budget estimé</label>
                  <p className="font-medium text-lg">
                    {project.estimated_budget.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {project.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-700">{project.notes}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/projects')}
          >
            Retour à la liste
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
