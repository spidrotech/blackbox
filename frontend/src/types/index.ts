// Enums
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'finalized';
export type ProjectStatus = 'draft' | 'planned' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'archived';
export type ProjectPriority = 'low' | 'normal' | 'high' | 'urgent';
export type CustomerType = 'individual' | 'company';
export type UserRole = 'owner' | 'manager' | 'commercial' | 'chef_chantier' | 'ouvrier';
export type EquipmentStatus = 'available' | 'in_use' | 'maintenance' | 'repair' | 'retired';
export type PurchaseCategory = 'materials' | 'tools' | 'equipment_rental' | 'services' | 'consumables' | 'other';
export type LineItemType = 'supply' | 'labor' | 'other';
export type PaymentMethod = 'cash' | 'check' | 'bank_transfer' | 'card' | 'other';

// Base types
export interface Address {
  id?: number;
  street?: string;
  street2?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface Company {
  id: number;
  name: string;
  siret?: string;
  vat_number?: string;
  street?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  invoice_prefix?: string;
  quote_prefix?: string;
  next_invoice_number?: number;
  next_quote_number?: number;
  bank_name?: string;
  iban?: string;
  bic?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: UserRole;
  hourly_rate?: number;
  company_id?: number;
  company?: Company;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserCreate {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: UserRole;
  hourly_rate?: number;
  company_name?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface Token {
  access_token?: string;
  token?: string;
  token_type?: string;
  success?: boolean;
  user?: User;
}

export interface Customer {
  id: number;
  companyId: number;
  type: CustomerType;
  name: string;
  firstName?: string;
  lastName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  siret?: string;
  vat?: string;
  notes?: string;
  address?: Address;
  billingAddress?: Address;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerCreate {
  customer_type: CustomerType;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  siret?: string;
  vat_number?: string;
  notes?: string;
  billing_address?: Address;
}

export interface Project {
  id: number;
  company_id: number;
  customer_id: number;
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_date?: string;
  end_date?: string;
  estimated_budget?: number;
  actual_cost?: number;
  project_manager_id?: number;
  notes?: string;
  customer?: Customer;
  worksite?: {
    street?: string;
    postal_code?: string;
    city?: string;
    country?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface ProjectCreate {
  name: string;
  customer_id?: number;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  start_date?: string;
  end_date?: string;
  estimated_budget?: number;
  project_manager_id?: number;
  notes?: string;
  worksite?: {
    street?: string;
    postal_code?: string;
    city?: string;
    country?: string;
  };
}

export interface LineItem {
  id?: number;
  designation: string;
  description?: string;
  long_description?: string;
  section?: string;
  unit?: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  discount_percent?: number;
  item_type: LineItemType;
  reference?: string;
  brand?: string;
  position?: number;
  is_optional?: boolean;
  quote_id?: number;
  invoice_id?: number;
}

export interface Quote {
  id: number;
  reference: string;
  status: QuoteStatus;
  quote_date?: string;
  expiry_date?: string;
  quoteDate?: string;
  expiryDate?: string;
  acceptedDate?: string;
  signedDate?: string;
  finalizedDate?: string;
  subject?: string;
  description?: string;
  notes?: string;
  terms_and_conditions?: string;
  conditions?: string;
  payment_terms?: string;
  paymentTerms?: string;
  footer_notes?: string;
  bank_details?: string;
  legal_mentions?: string;
  deposit_percent?: number;
  depositPercent?: number;
  deposit_amount?: number;
  depositAmount?: number;
  discount_percent?: number;
  global_discount_percent?: number;
  globalDiscountPercent?: number;
  discount_amount?: number;
  cee_premium?: number;
  ceePremium?: number;
  mpr_premium?: number;
  mprPremium?: number;
  waste_management_fee?: number;
  waste_management?: string;
  work_start_date?: string;
  workStartDate?: string;
  estimated_duration?: string;
  estimatedDuration?: string;
  worksite_address?: string;
  worksiteAddress?: string;
  signature_date?: string;
  signed_by?: string;
  net_after_premiums?: number;
  netAfterPremiums?: number;
  total_ht?: number;
  totalHt?: number;
  total_tva?: number;
  totalTva?: number;
  total_ttc?: number;
  totalTtc?: number;
  total?: number;
  customer_id?: number;
  customerId?: number;
  customer?: Customer;
  project_id?: number;
  projectId?: number;
  project?: Project;
  company_id?: number;
  companyId?: number;
  line_items?: LineItem[];
  lineItems?: LineItem[];
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  // Avenants (devis modificatifs)
  parent_quote_id?: number;
  parentQuoteId?: number;
  avenant_number?: number;
  avenantNumber?: number;
  quote_type?: string;    // 'quote' | 'avenant'
  quoteType?: string;
}

export interface QuoteCreate {
  customer_id: number;
  project_id?: number;
  subject?: string;
  description?: string;
  notes?: string;
  terms_and_conditions?: string;
  conditions?: string;
  payment_terms?: string;
  validity_days?: number;
  quote_date?: string;
  expiry_date?: string;
  work_start_date?: string;
  estimated_duration?: string;
  worksite_address?: string;
  deposit_percent?: number;
  discount_percent?: number;
  cee_premium?: number;
  mpr_premium?: number;
  waste_management_fee?: number;
  footer_notes?: string;
  bank_details?: string;
  legal_mentions?: string;
  line_items?: LineItem[];
}

export interface QuoteStats {
  total: number;
  draft: number;
  sent: number;
  viewed: number;
  signed: number;
  accepted: number;
  rejected: number;
  expired: number;
  cancelled: number;
  finalized: number;
  totalAmountHt: number;
  totalAmountTtc: number;
  conversionRate: number;
  expiringIn7Days: number;
  expiringIn30Days: number;
}

export interface Invoice {
  id: number;
  reference: string;
  status: InvoiceStatus;
  // snake_case (direct model fields)
  invoice_date?: string;
  due_date?: string;
  paid_date?: string;
  subject?: string;
  description?: string;
  notes?: string;
  terms_and_conditions?: string;
  discount_percent?: number;
  discount_amount?: number;
  amount_paid?: number;
  payment_date?: string;
  payment_method?: PaymentMethod;
  payment_terms?: string;
  bank_details?: string;
  invoice_type?: string;
  original_invoice_id?: number;
  facturx_status?: string;
  siren_buyer?: string;
  // Acompte
  deposit_percent?: number;
  depositPercent?: number;
  // Situation de travaux
  situation_number?: number;
  situationNumber?: number;
  situation_percent?: number;
  situationPercent?: number;
  cumulative_percent?: number;
  cumulativePercent?: number;
  // Retenue de garantie
  retention_percent?: number;
  retentionPercent?: number;
  retention_released?: boolean;
  retentionReleased?: boolean;
  retention_release_invoice_id?: number;
  retentionReleaseInvoiceId?: number;
  retention_amount?: number;
  retentionAmount?: number;
  customer_id?: number;
  customer?: Customer;
  project_id?: number;
  project?: Project;
  quote_id?: number;
  quote?: Quote;
  company_id?: number;
  line_items?: LineItem[];
  created_at?: string;
  updated_at?: string;
  // camelCase (returned by get_invoice_response)
  invoiceDate?: string;
  dueDate?: string;
  paidDate?: string;
  amountPaid?: number;
  remainingAmount?: number;
  totalHt?: number;
  totalTva?: number;
  totalTtc?: number;
  total?: number;
  paymentTerms?: string;
  bankDetails?: string;
  purchaseOrder?: string;
  purchase_order?: string;
  conditions?: string;
  invoiceType?: string;
  originalInvoiceId?: number;
  facturxStatus?: string;
  sirenBuyer?: string;
  // Relances
  reminder_count?: number;
  reminderCount?: number;
  last_reminder_at?: string;
  lastReminderAt?: string;
  isOverdue?: boolean;
  daysOverdue?: number;
  // Acompte / Situation / Retenue (camelCase from backend)
  retentionReleaseInvoiceId?: number;
  customerId?: number;
  projectId?: number;
  quoteId?: number;
  companyId?: number;
  lineItems?: LineItem[];
  company?: Company;
}

export interface InvoiceCreate {
  customer_id: number;
  project_id?: number;
  quote_id?: number;
  subject?: string;
  description?: string;
  notes?: string;
  terms_and_conditions?: string;
  payment_terms?: string;
  bank_details?: string;
  conditions?: string;
  purchase_order?: string;
  invoice_date?: string;
  due_date?: string;
  invoice_type?: string;
  payment_terms_days?: number;
  discount_percent?: number;
  line_items?: LineItem[];
}

export interface Supplier {
  id: number;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  supplier_type?: string;
  siret?: string;
  vat_number?: string;
  payment_terms?: string;
  notes?: string;
  street?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  is_favorite?: boolean;
  company_id?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SupplierCreate {
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  supplier_type?: string;
  siret?: string;
  vat_number?: string;
  payment_terms?: string;
  notes?: string;
  address?: Address;
  is_favorite?: boolean;
}

export interface Purchase {
  id: number;
  reference?: string;
  description?: string;
  category: PurchaseCategory;
  purchase_date?: string;
  amount_ht?: number;
  vat_rate?: number;
  vat_amount?: number;
  total_ttc?: number;
  invoice_number?: string;
  is_paid?: boolean;
  payment_date?: string;
  payment_method?: PaymentMethod;
  receipt_url?: string;
  notes?: string;
  supplier_id?: number;
  supplier?: Supplier;
  project_id?: number;
  project?: Project;
  company_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseCreate {
  description: string;
  category: PurchaseCategory;
  purchase_date?: string;
  amount_ht: number;
  vat_rate?: number;
  invoice_number?: string;
  is_paid?: boolean;
  payment_method?: PaymentMethod;
  notes?: string;
  supplier_id?: number;
  project_id?: number;
}

export interface TimeEntry {
  id: number;
  work_date: string;
  start_time?: string;
  end_time?: string;
  break_duration?: number;
  duration_hours?: number;
  hourly_rate?: number;
  total_cost?: number;
  description?: string;
  is_approved?: boolean;
  approved_by_id?: number;
  approved_at?: string;
  user_id?: number;
  user?: User;
  project_id?: number;
  project?: Project;
  company_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TimeEntryCreate {
  work_date: string;
  start_time?: string;
  end_time?: string;
  break_duration?: number;
  duration_hours?: number;
  hourly_rate?: number;
  description?: string;
  user_id?: number;
  project_id?: number;
}

export interface Equipment {
  id: number;
  name: string;
  description?: string;
  serial_number?: string;
  category?: string;
  brand?: string;
  model?: string;
  status: EquipmentStatus;
  purchase_date?: string;
  purchase_price?: number;
  rental_price_daily?: number;
  is_rental?: boolean;
  rental_start_date?: string;
  rental_end_date?: string;
  rental_supplier_id?: number;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  notes?: string;
  assigned_to_id?: number;
  assigned_to?: User;
  assigned_project_id?: number;
  assigned_project?: Project;
  company_id?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EquipmentCreate {
  name: string;
  description?: string;
  serial_number?: string;
  category?: string;
  brand?: string;
  model?: string;
  status?: EquipmentStatus;
  purchase_date?: string;
  purchase_price?: number;
  rental_price_daily?: number;
  is_rental?: boolean;
  rental_start_date?: string;
  rental_end_date?: string;
  rental_supplier_id?: number;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  notes?: string;
}

export interface PriceLibraryItem {
  id: number;
  name: string;
  description?: string;
  long_description?: string;
  item_type: LineItemType;
  category?: string;
  subcategory?: string;
  trade?: string;
  unit?: string;
  unit_price: number;
  tax_rate?: number;
  reference?: string;
  brand?: string;
  cost_price?: number;
  usage_count?: number;
  is_favorite?: boolean;
  is_active?: boolean;
  company_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PriceLibraryItemCreate {
  name: string;
  description?: string;
  long_description?: string;
  item_type?: LineItemType;
  category?: string;
  subcategory?: string;
  trade?: string;
  unit?: string;
  unit_price: number;
  tax_rate?: number;
  reference?: string;
  brand?: string;
  cost_price?: number;
}

export interface PriceLibraryImportPayload {
  items: PriceLibraryItemCreate[];
  upsert?: boolean;
}

export interface PriceLibraryImportResult {
  created: number;
  updated: number;
  skipped: number;
  total: number;
}

// Dashboard types
export interface DashboardData {
  ca_mois?: number;
  ca_total?: number;
  reste_a_encaisser?: number;
  overdue_count?: number;
  projects: {
    total: number;
    active: number;
  };
  customers: {
    total: number;
  };
  quotes: {
    total: number;
    pending: number;
    pendingValue: number;
  };
  invoices: {
    total: number;
    unpaid: number;
    unpaidValue: number;
  };
  revenue: {
    total: number;
  };
  monthlyAnalytics?: Array<{
    key: string;
    label: string;
    paidRevenue: number;
    pendingInvoices: number;
    quotesCreated: number;
    quotesAccepted: number;
  }>;
  recentProjects: Array<{
    id: number;
    name: string;
    status: string;
    createdAt: string;
  }>;
  recentQuotes: Array<{
    id: number;
    reference: string;
    status: string;
    createdAt: string;
  }>;
  recentInvoices: Array<{
    id: number;
    reference: string;
    status: string;
    createdAt: string;
  }>;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  items?: T[];
  error?: string;
  message?: string;
  total?: number;
}

export interface SituationsSummary {
  quoteTotalHt: number;
  billedTotal: number;
  billedPercent: number;
  remainingPercent: number;
  remainingHt: number;
  depositInvoice: Invoice | null;
  situations: Invoice[];
  retentionInvoices: Invoice[];
}

export interface OverdueStats {
  total: number;
  overdue_count: number;
  pending_count: number;
  total_overdue_amount: number;
  total_pending_amount: number;
  total_amount: number;
}

export interface FinancialReportMonth {
  month: number;
  label: string;
  paidHt: number;
  paidTva: number;
  paidTtc: number;
  pendingHt: number;
  quotesSent: number;
  quotesAccepted: number;
  conversionRate: number;
}

export interface FinancialReport {
  year: number;
  months: FinancialReportMonth[];
  totals: {
    paidHt: number;
    paidTva: number;
    paidTtc: number;
    pendingHt: number;
    quotesSent: number;
    quotesAccepted: number;
    conversionRate: number;
  };
  statusBreakdown: Record<string, number>;
}
