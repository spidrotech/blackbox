/**
 * Configuration des routes de l'application
 */

export const PUBLIC_ROUTES = ['/login', '/register'];
export const PROTECTED_ROUTES = [
  '/dashboard',
  '/customers',
  '/projects',
  '/quotes',
  '/invoices',
  '/suppliers',
  '/purchases',
  '/time-entries',
  '/equipment',
  '/price-library',
];

export const ROUTE_CONFIG = {
  // Pages publiques (pas d'auth requise)
  public: {
    login: '/login',
    register: '/register',
  },

  // Pages protégées (auth requise)
  protected: {
    dashboard: '/dashboard',
    customers: '/customers',
    projects: '/projects',
    quotes: '/quotes',
    invoices: '/invoices',
    suppliers: '/suppliers',
    purchases: '/purchases',
    timeEntries: '/time-entries',
    equipment: '/equipment',
    priceLibrary: '/price-library',
  },

  // Redirections
  redirects: {
    afterLogin: '/dashboard',
    afterLogout: '/login',
    notFound: '/404',
    unauthorized: '/401',
  },
};

export const ROLE_PERMISSIONS = {
  owner: ['*'], // Accès complet
  manager: ['read', 'write', 'delete'],
  commercial: ['read', 'write:quotes', 'write:invoices'],
  chef_chantier: ['read:projects', 'write:time-entries'],
  ouvrier: ['read:own_projects', 'write:own_time-entries'],
};
