import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', options || {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj);
}

export function formatDateShort(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Quote statuses
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    viewed: 'bg-purple-100 text-purple-800',
    signed: 'bg-green-100 text-green-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    expired: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-gray-100 text-gray-800',
    finalized: 'bg-green-100 text-green-800',
    
    // Invoice statuses
    paid: 'bg-green-100 text-green-800',
    partial: 'bg-yellow-100 text-yellow-800',
    overdue: 'bg-red-100 text-red-800',
    
    // Project statuses
    planned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    paused: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    archived: 'bg-gray-100 text-gray-800',
    
    // Equipment statuses
    available: 'bg-green-100 text-green-800',
    in_use: 'bg-blue-100 text-blue-800',
    maintenance: 'bg-yellow-100 text-yellow-800',
    repair: 'bg-orange-100 text-orange-800',
    retired: 'bg-gray-100 text-gray-800',
  };
  
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    // Quote statuses
    draft: 'Brouillon',
    sent: 'Envoyé',
    viewed: 'Vu',
    signed: 'Signé',
    accepted: 'Accepté',
    rejected: 'Refusé',
    expired: 'Expiré',
    cancelled: 'Annulé',
    finalized: 'Finalisé',
    
    // Invoice statuses
    paid: 'Payé',
    partial: 'Paiement partiel',
    overdue: 'En retard',
    
    // Project statuses
    planned: 'Planifié',
    in_progress: 'En cours',
    paused: 'En pause',
    completed: 'Terminé',
    archived: 'Archivé',
    
    // Equipment statuses
    available: 'Disponible',
    in_use: 'En utilisation',
    maintenance: 'Maintenance',
    repair: 'Réparation',
    retired: 'Retiré',
    
    // Priority
    low: 'Basse',
    normal: 'Normale',
    high: 'Haute',
    urgent: 'Urgente',
    
    // Customer types
    individual: 'Particulier',
    company: 'Entreprise',
  };
  
  return labels[status] || status;
}
