/**
 * Fichier de réexports pratiques pour les imports courants
 * 
 * Usage:
 * import { useForm, FormBuilder, Button } from '@/index';
 * 
 * Au lieu de:
 * import { useForm } from '@/hooks';
 * import { FormBuilder, Button } from '@/components/ui';
 */

// ============ HOOKS ============
export { useForm, useFetch } from '@/hooks';

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

// ============ LAYOUT ============
export { MainLayout } from '@/components/layout';

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
} from '@/services/api';

// ============ VALIDATORS & UTILS ============
export { validators } from '@/lib/validators';
export { formatCurrency, formatDate, getStatusLabel, cn } from '@/lib/utils';

// ============ TYPES ============
export type {
  Customer,
  Project,
  Quote,
  Invoice,
  Supplier,
  Purchase,
  TimeEntry,
  Equipment,
  PriceLibraryItem,
  User,
} from '@/types';

// ============ CONTEXTES ============
export { useAuth } from '@/contexts/AuthContext';
