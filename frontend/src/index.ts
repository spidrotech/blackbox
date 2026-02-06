/**
 * Index centralisé pour tous les imports
 * Utilisez ceci pour simplifier vos imports
 */

// ============ CONTEXTES ============
export { AuthProvider, useAuth } from '@/contexts/AuthContext';
export type { AuthContextType } from '@/contexts/AuthContext';

// ============ HOOKS ============
export { useForm, useFetch } from '@/hooks';
export type { FormState, UseFetchState } from '@/hooks';

// ============ COMPOSANTS UI ============
export {
  Button,
  Input,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Badge,
  FormField,
  FormBuilder,
  DataTable,
  PageList,
} from '@/components/ui';

export type {
  ButtonProps,
  InputProps,
  SelectProps,
  SelectOption,
  FormFieldProps,
  FormConfig,
  DataTableProps,
  PageListProps,
} from '@/components/ui';

// ============ COMPOSANTS LAYOUT ============
export { Sidebar, MainLayout } from '@/components/layout';

// ============ ERREUR BOUNDARY ============
export { ErrorBoundary } from '@/components/ErrorBoundary';

// ============ SERVICES ============
export {
  authService,
  customerService,
  projectService,
  quoteService,
  invoiceService,
  supplierService,
  purchaseService,
  timeEntryService,
  equipmentService,
  priceLibraryService,
  dashboardService,
} from '@/services/api';

// ============ TYPES ============
export * from '@/types';

// ============ UTILITIES ============
export { formatCurrency, formatDate, formatDateShort, getStatusColor, getStatusLabel, cn } from '@/lib/utils';
export { validators, combinedValidators } from '@/lib/validators';

// ============ CONFIG ============
export { PUBLIC_ROUTES, PROTECTED_ROUTES, ROUTE_CONFIG, ROLE_PERMISSIONS } from '@/config/routes';
