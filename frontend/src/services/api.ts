import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  ApiResponse,
  Token,
  LoginCredentials,
  UserCreate,
  User,
  Customer,
  CustomerCreate,
  Project,
  ProjectCreate,
  Quote,
  QuoteCreate,
  QuoteStats,
  Invoice,
  InvoiceCreate,
  Supplier,
  SupplierCreate,
  Purchase,
  PurchaseCreate,
  TimeEntry,
  TimeEntryCreate,
  Equipment,
  EquipmentCreate,
  PriceLibraryItem,
  PriceLibraryItemCreate,
  PriceLibraryImportPayload,
  PriceLibraryImportResult,
  DashboardData,
  SituationsSummary,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';

/** Base URL of the API server (without /api/v1), used to resolve relative static file URLs. */
export const API_BASE_URL = API_URL.replace(/\/api\/v\d+.*$/, '');

type InvoiceGetResponse = ApiResponse<Invoice> & { invoice?: Invoice };

export interface CompanySettingsPayload {
  id?: number;
  name?: string;
  siret?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  vat_number?: string;
  invoice_prefix?: string;
  quote_prefix?: string;
  next_invoice_number?: number;
  next_quote_number?: number;
  default_payment_terms?: string;
  default_conditions?: string;
  legal_mentions?: string;
  header_text?: string;
  footer_text?: string;
  visuals_json?: string;
  labels_json?: string;
  quote_defaults_json?: string;
  invoice_defaults_json?: string;
  cgv_url?: string;
  iban?: string;
  bic?: string;
  rcs_city?: string;
  rm_number?: string;
  capital?: number | null;
  ape_code?: string;
  vat_subject?: boolean;
  vat_collection_type?: string;
  guarantee_type?: string;
  insurance_name?: string;
  insurance_coverage?: string;
  insurance_address?: string;
  insurance_zipcode?: string;
  insurance_city?: string;
}

export interface TeamMemberPayload {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company_id?: number;
  is_active: boolean;
  role: User['role'];
  roles?: string[];
  temporary_password?: string;
}

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  async login(credentials: LoginCredentials): Promise<Token> {
    const response = await api.post<Token>('/auth/login', {
      email: credentials.email,
      password: credentials.password,
    });
    
    if (response.data.token) {
      localStorage.setItem('access_token', response.data.token);
    } else if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
    }
    
    return response.data;
  },

  async register(data: UserCreate): Promise<ApiResponse<User>> {
    const response = await api.post<ApiResponse<User>>('/auth/register', data);
    return response.data;
  },

  async getMe(): Promise<ApiResponse<User>> {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data;
  },

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    const response = await api.put<ApiResponse<User>>('/auth/profile', data);
    return response.data;
  },

  logout(): void {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  },

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('access_token');
  },

  async forgotPassword(email: string): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token: string, password: string): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/auth/reset-password', { token, password });
    return response.data;
  },
};

// Customer Service
export const customerService = {
  async getAll(): Promise<ApiResponse<Customer[]>> {
    const response = await api.get<ApiResponse<Customer[]>>('/customers/');
    return response.data;
  },

  async getById(id: number): Promise<ApiResponse<Customer>> {
    const response = await api.get<ApiResponse<Customer>>(`/customers/${id}`);
    return response.data;
  },

  async create(data: CustomerCreate): Promise<ApiResponse<Customer>> {
    // Map frontend fields to backend schema
    const payload: Record<string, unknown> = {
      type: data.customer_type,
      name: data.customer_type === 'company' ? data.company_name : undefined,
      first_name: data.customer_type === 'individual' ? data.first_name : undefined,
      last_name: data.customer_type === 'individual' ? data.last_name : undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      mobile: data.mobile || undefined,
      siret: data.siret || undefined,
      vat: data.vat_number || undefined,
      notes: data.notes || undefined,
    };
    if (data.billing_address) {
      const ba = data.billing_address as Record<string, string>;
      payload.address = {
        street: ba.street || '',
        city: ba.city || '',
        postalCode: ba.postal_code || ba.postalCode || '',
        country: ba.country || 'France',
      };
    }
    const response = await api.post<ApiResponse<Customer>>('/customers/', payload);
    return response.data;
  },

  async update(id: number, data: Record<string, unknown>): Promise<ApiResponse<Customer>> {
    const kind = data.customer_type as string;
    const firstName = (data.first_name as string) || '';
    const lastName = (data.last_name as string) || '';
    const contactName = `${firstName} ${lastName}`.trim() || undefined;
    const payload: Record<string, unknown> = {
      type: kind,
      name: kind === 'company' ? (data.company_name as string) || undefined : contactName,
      contact_name: kind === 'company' ? contactName : undefined,
      email: (data.email as string) || undefined,
      phone: (data.phone as string) || undefined,
      mobile: (data.mobile as string) || undefined,
      siret: (data.siret as string) || undefined,
      vat: (data.vat_number as string) || undefined,
      notes: (data.notes as string) || undefined,
      is_active: data.is_active,
      address: {
        street: (data.billing_street as string) || '',
        city: (data.billing_city as string) || '',
        postalCode: (data.billing_postal_code as string) || '',
        country: (data.billing_country as string) || 'France',
      },
    };
    const response = await api.put<ApiResponse<Customer>>(`/customers/${id}`, payload);
    return response.data;
  },

  async delete(id: number): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/customers/${id}`);
    return response.data;
  },
};

// Project Service
export const projectService = {
  async getAll(): Promise<ApiResponse<Project[]>> {
    const response = await api.get<ApiResponse<Project[]>>('/projects/');
    return response.data;
  },

  async getById(id: number): Promise<ApiResponse<Project>> {
    const response = await api.get<ApiResponse<Project>>(`/projects/${id}`);
    return response.data;
  },

  async create(data: ProjectCreate): Promise<ApiResponse<Project>> {
    const response = await api.post<ApiResponse<Project>>('/projects/', data);
    return response.data;
  },

  async update(id: number, data: Partial<ProjectCreate>): Promise<ApiResponse<Project>> {
    const response = await api.put<ApiResponse<Project>>(`/projects/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/projects/${id}`);
    return response.data;
  },
};

// Quote Service
export const quoteService = {
  async getAll(params?: { status?: string; customer_id?: number; search?: string }): Promise<ApiResponse<Quote[]>> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.customer_id) query.set('customer_id', String(params.customer_id));
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    const response = await api.get<ApiResponse<Quote[]>>(`/quotes/${qs ? '?' + qs : ''}`);
    return response.data;
  },

  async getById(id: number): Promise<ApiResponse<Quote>> {
    const response = await api.get<ApiResponse<Quote>>(`/quotes/${id}`);
    return response.data;
  },

  async create(data: QuoteCreate): Promise<ApiResponse<Quote>> {
    const response = await api.post<ApiResponse<Quote>>('/quotes/', data);
    return response.data;
  },

  async generatePreviewPdf(data: QuoteCreate): Promise<ApiResponse<string>> {
    const response = await api.post<ApiResponse<string>>('/quotes/preview-pdf', data);
    return response.data;
  },

  async update(id: number, data: Partial<QuoteCreate>): Promise<ApiResponse<Quote>> {
    const response = await api.put<ApiResponse<Quote>>(`/quotes/${id}`, data);
    return response.data;
  },

  async updateStatus(id: number, status: string): Promise<ApiResponse<Quote>> {
    const response = await api.patch<ApiResponse<Quote>>(`/quotes/${id}/status?status=${status}`);
    return response.data;
  },

  async delete(id: number): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/quotes/${id}`);
    return response.data;
  },

  async convertToInvoice(id: number): Promise<ApiResponse<Invoice>> {
    const response = await api.post<ApiResponse<Invoice>>(`/quotes/${id}/convert-to-invoice`);
    return response.data;
  },

  async duplicate(id: number): Promise<ApiResponse<Quote>> {
    const response = await api.post<ApiResponse<Quote>>(`/quotes/${id}/duplicate`);
    return response.data;
  },

  async send(id: number): Promise<ApiResponse<{ quote: Quote; pdfBase64: string | null; customerEmail: string | null; filename: string }>> {
    const response = await api.post(`/quotes/${id}/send`);
    return response.data;
  },

  async getStats(): Promise<ApiResponse<QuoteStats>> {
    const response = await api.get<ApiResponse<QuoteStats>>('/quotes/stats');
    return response.data;
  },

  async downloadPdf(id: number, reference?: string): Promise<void> {
    const response = await api.get(`/quotes/${id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reference || 'devis-' + id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async getPdfBlobUrl(id: number): Promise<string> {
    const response = await api.get(`/quotes/${id}/pdf`, { responseType: 'blob' });
    return window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  },

  getPdfUrl(id: number): string {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
    return `${API_URL}/quotes/${id}/pdf?token=${token}`;
  },

  // ── Avenants ────────────────────────────────────────────────────────────

  async createAvenant(
    quoteId: number,
    data?: { description?: string; notes?: string; expiry_date?: string; line_items?: object[] }
  ): Promise<ApiResponse<Quote>> {
    const response = await api.post<ApiResponse<Quote>>(`/quotes/${quoteId}/avenant`, data ?? {});
    return response.data;
  },

  async listAvenants(quoteId: number): Promise<{ success: boolean; avenants: Quote[] }> {
    const response = await api.get(`/quotes/${quoteId}/avenants`);
    return response.data;
  },
};

// Invoice Service
export const invoiceService = {
  async getAll(): Promise<ApiResponse<Invoice[]>> {
    const response = await api.get<ApiResponse<Invoice[]>>('/invoices/');
    return response.data;
  },

  async getById(id: number): Promise<ApiResponse<Invoice>> {
    const response = await api.get<InvoiceGetResponse>(`/invoices/${id}`);
    const body = response.data;
    // backend returns { success, data } or { success, invoice } — normalise
    if (body.data === undefined && body.invoice !== undefined) {
      return { ...body, data: body.invoice };
    }
    return body;
  },

  async create(data: InvoiceCreate): Promise<ApiResponse<Invoice>> {
    const response = await api.post<ApiResponse<Invoice>>('/invoices/', data);
    return response.data;
  },

  async update(id: number, data: Partial<InvoiceCreate>): Promise<ApiResponse<Invoice>> {
    const response = await api.put<ApiResponse<Invoice>>(`/invoices/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/invoices/${id}`);
    return response.data;
  },

  async addPayment(id: number, amount: number, method: string): Promise<ApiResponse<Invoice>> {
    const response = await api.post<ApiResponse<Invoice>>(`/invoices/${id}/payment`, {
      amount,
      payment_method: method,
    });
    return response.data;
  },

  async send(id: number): Promise<ApiResponse<Invoice>> {
    const response = await api.post<ApiResponse<Invoice>>(`/invoices/${id}/send`);
    return response.data;
  },

  async updateStatus(id: number, status: string): Promise<ApiResponse<Invoice>> {
    const response = await api.patch<ApiResponse<Invoice>>(`/invoices/${id}/status`, { status });
    return response.data;
  },

  async downloadPdf(id: number, reference: string): Promise<void> {
    const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reference}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async duplicate(id: number): Promise<ApiResponse<Invoice>> {
    const response = await api.post<ApiResponse<Invoice>>(`/invoices/${id}/duplicate`);
    return response.data;
  },

  async createCreditNote(id: number): Promise<ApiResponse<Invoice>> {
    const response = await api.post<ApiResponse<Invoice>>(`/invoices/${id}/credit-note`);
    return response.data;
  },

  async downloadFacturxPdf(id: number, reference: string): Promise<void> {
    const response = await api.get(`/invoices/${id}/facturx-pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reference}-facturx.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async downloadFacturxXml(id: number, reference: string): Promise<void> {
    const response = await api.get(`/invoices/${id}/facturx-xml`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `facturx-${reference}.xml`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ── BTP Features ────────────────────────────────────────────────────────

  async createDepositInvoice(
    quoteId: number,
    data: { deposit_percent: number; due_date?: string; notes?: string; retention_percent?: number }
  ): Promise<ApiResponse<Invoice>> {
    const response = await api.post<ApiResponse<Invoice>>(`/invoices/from-quote/${quoteId}/deposit`, data);
    return response.data;
  },

  async createSituationInvoice(
    quoteId: number,
    data: { situation_percent: number; due_date?: string; notes?: string; retention_percent?: number; line_items?: object[] }
  ): Promise<ApiResponse<Invoice>> {
    const response = await api.post<ApiResponse<Invoice>>(`/invoices/from-quote/${quoteId}/situation`, data);
    return response.data;
  },

  async getSituationsSummary(quoteId: number): Promise<{ success: boolean; summary: SituationsSummary }> {
    const response = await api.get(`/invoices/from-quote/${quoteId}/situations-summary`);
    return response.data;
  },

  async releaseRetention(invoiceId: number, data?: { due_date?: string; notes?: string }): Promise<ApiResponse<Invoice>> {
    const response = await api.post<ApiResponse<Invoice>>(`/invoices/${invoiceId}/release-retention`, data ?? {});
    return response.data;
  },

  async sendReminder(invoiceId: number): Promise<{ success: boolean; reminder_count: number; last_reminder_at: string }> {
    const response = await api.post(`/invoices/${invoiceId}/send-reminder`, {});
    return response.data;
  },

  async getOverdueInvoices(): Promise<{ success: boolean; invoices: Invoice[]; stats: import('@/types').OverdueStats }> {
    const response = await api.get('/invoices/overdue');
    return response.data;
  },
};

// Supplier Service
export const supplierService = {
  async getAll(): Promise<ApiResponse<Supplier[]>> {
    const response = await api.get<ApiResponse<Supplier[]>>('/suppliers/');
    return response.data;
  },

  async getById(id: number): Promise<ApiResponse<Supplier>> {
    const response = await api.get<ApiResponse<Supplier>>(`/suppliers/${id}`);
    return response.data;
  },

  async create(data: SupplierCreate): Promise<ApiResponse<Supplier>> {
    const response = await api.post<ApiResponse<Supplier>>('/suppliers/', data);
    return response.data;
  },

  async update(id: number, data: Partial<SupplierCreate>): Promise<ApiResponse<Supplier>> {
    const response = await api.put<ApiResponse<Supplier>>(`/suppliers/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/suppliers/${id}`);
    return response.data;
  },

  async search(query: string): Promise<ApiResponse<Supplier[]>> {
    const response = await api.get<ApiResponse<Supplier[]>>(`/suppliers/search?query=${query}`);
    return response.data;
  },

  async getFavorites(): Promise<ApiResponse<Supplier[]>> {
    const response = await api.get<ApiResponse<Supplier[]>>('/suppliers/favorites');
    return response.data;
  },

  async toggleFavorite(id: number): Promise<ApiResponse<Supplier>> {
    const response = await api.post<ApiResponse<Supplier>>(`/suppliers/${id}/toggle-favorite`);
    return response.data;
  },
};

// Purchase Service
export const purchaseService = {
  async getAll(): Promise<ApiResponse<Purchase[]>> {
    const response = await api.get<ApiResponse<Purchase[]>>('/purchases/');
    return response.data;
  },

  async getById(id: number): Promise<ApiResponse<Purchase>> {
    const response = await api.get<ApiResponse<Purchase>>(`/purchases/${id}`);
    return response.data;
  },

  async create(data: PurchaseCreate): Promise<ApiResponse<Purchase>> {
    const response = await api.post<ApiResponse<Purchase>>('/purchases/', data);
    return response.data;
  },

  async update(id: number, data: Partial<PurchaseCreate>): Promise<ApiResponse<Purchase>> {
    const response = await api.put<ApiResponse<Purchase>>(`/purchases/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/purchases/${id}`);
    return response.data;
  },

  async getUnpaid(): Promise<ApiResponse<Purchase[]>> {
    const response = await api.get<ApiResponse<Purchase[]>>('/purchases/unpaid');
    return response.data;
  },

  async markAsPaid(id: number, method: string): Promise<ApiResponse<Purchase>> {
    const response = await api.post<ApiResponse<Purchase>>(`/purchases/${id}/mark-paid`, {
      payment_method: method,
    });
    return response.data;
  },

  async getStats(): Promise<ApiResponse<unknown>> {
    const response = await api.get<ApiResponse<unknown>>('/purchases/stats');
    return response.data;
  },
};

// Time Entry Service
export const timeEntryService = {
  async getAll(): Promise<ApiResponse<TimeEntry[]>> {
    const response = await api.get<ApiResponse<TimeEntry[]>>('/time-entries/');
    return response.data;
  },

  async getById(id: number): Promise<ApiResponse<TimeEntry>> {
    const response = await api.get<ApiResponse<TimeEntry>>(`/time-entries/${id}`);
    return response.data;
  },

  async create(data: TimeEntryCreate): Promise<ApiResponse<TimeEntry>> {
    const response = await api.post<ApiResponse<TimeEntry>>('/time-entries/', data);
    return response.data;
  },

  async update(id: number, data: Partial<TimeEntryCreate>): Promise<ApiResponse<TimeEntry>> {
    const response = await api.put<ApiResponse<TimeEntry>>(`/time-entries/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/time-entries/${id}`);
    return response.data;
  },

  async getPending(): Promise<ApiResponse<TimeEntry[]>> {
    const response = await api.get<ApiResponse<TimeEntry[]>>('/time-entries/pending');
    return response.data;
  },

  async approve(id: number): Promise<ApiResponse<TimeEntry>> {
    const response = await api.post<ApiResponse<TimeEntry>>(`/time-entries/${id}/approve`);
    return response.data;
  },

  async reject(id: number): Promise<ApiResponse<TimeEntry>> {
    const response = await api.post<ApiResponse<TimeEntry>>(`/time-entries/${id}/reject`);
    return response.data;
  },

  async getMonthlyStats(year: number, month: number): Promise<ApiResponse<unknown>> {
    const response = await api.get<ApiResponse<unknown>>(`/time-entries/stats/monthly?year=${year}&month=${month}`);
    return response.data;
  },
};

// Equipment Service
export const equipmentService = {
  async getAll(): Promise<ApiResponse<Equipment[]>> {
    const response = await api.get<ApiResponse<Equipment[]>>('/equipment/');
    return response.data;
  },

  async getById(id: number): Promise<ApiResponse<Equipment>> {
    const response = await api.get<ApiResponse<Equipment>>(`/equipment/${id}`);
    return response.data;
  },

  async create(data: EquipmentCreate): Promise<ApiResponse<Equipment>> {
    const response = await api.post<ApiResponse<Equipment>>('/equipment/', data);
    return response.data;
  },

  async update(id: number, data: Partial<EquipmentCreate>): Promise<ApiResponse<Equipment>> {
    const response = await api.put<ApiResponse<Equipment>>(`/equipment/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/equipment/${id}`);
    return response.data;
  },

  async getAvailable(): Promise<ApiResponse<Equipment[]>> {
    const response = await api.get<ApiResponse<Equipment[]>>('/equipment/available');
    return response.data;
  },

  async getNeedsMaintenance(): Promise<ApiResponse<Equipment[]>> {
    const response = await api.get<ApiResponse<Equipment[]>>('/equipment/needs-maintenance');
    return response.data;
  },

  async assign(id: number, userId?: number, projectId?: number): Promise<ApiResponse<Equipment>> {
    const response = await api.post<ApiResponse<Equipment>>(`/equipment/${id}/assign`, {
      user_id: userId,
      project_id: projectId,
    });
    return response.data;
  },

  async release(id: number): Promise<ApiResponse<Equipment>> {
    const response = await api.post<ApiResponse<Equipment>>(`/equipment/${id}/release`);
    return response.data;
  },
};

// Price Library Service
export const priceLibraryService = {
  async getAll(): Promise<ApiResponse<PriceLibraryItem[]>> {
    const response = await api.get<ApiResponse<PriceLibraryItem[]>>('/price-library/');
    return response.data;
  },

  async getById(id: number): Promise<ApiResponse<PriceLibraryItem>> {
    const response = await api.get<ApiResponse<PriceLibraryItem>>(`/price-library/${id}`);
    return response.data;
  },

  async create(data: PriceLibraryItemCreate): Promise<ApiResponse<PriceLibraryItem>> {
    const response = await api.post<ApiResponse<PriceLibraryItem>>('/price-library/', data);
    return response.data;
  },

  async update(id: number, data: Partial<PriceLibraryItemCreate>): Promise<ApiResponse<PriceLibraryItem>> {
    const response = await api.put<ApiResponse<PriceLibraryItem>>(`/price-library/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/price-library/${id}`);
    return response.data;
  },

  async search(query: string): Promise<ApiResponse<PriceLibraryItem[]>> {
    const response = await api.get<ApiResponse<PriceLibraryItem[]>>(`/price-library/search?query=${query}`);
    return response.data;
  },

  async getFavorites(): Promise<ApiResponse<PriceLibraryItem[]>> {
    const response = await api.get<ApiResponse<PriceLibraryItem[]>>('/price-library/favorites');
    return response.data;
  },

  async getMostUsed(limit?: number): Promise<ApiResponse<PriceLibraryItem[]>> {
    const response = await api.get<ApiResponse<PriceLibraryItem[]>>(`/price-library/most-used${limit ? `?limit=${limit}` : ''}`);
    return response.data;
  },

  async getCategories(): Promise<ApiResponse<string[]>> {
    const response = await api.get<ApiResponse<string[]>>('/price-library/categories');
    return response.data;
  },

  async getTrades(): Promise<ApiResponse<string[]>> {
    const response = await api.get<ApiResponse<string[]>>('/price-library/trades');
    return response.data;
  },

  async duplicate(id: number): Promise<ApiResponse<PriceLibraryItem>> {
    const response = await api.post<ApiResponse<PriceLibraryItem>>(`/price-library/${id}/duplicate`);
    return response.data;
  },

  async toggleFavorite(id: number): Promise<ApiResponse<PriceLibraryItem>> {
    const response = await api.post<ApiResponse<PriceLibraryItem>>(`/price-library/${id}/toggle-favorite`);
    return response.data;
  },

  async recordUsage(id: number): Promise<ApiResponse<PriceLibraryItem>> {
    const response = await api.post<ApiResponse<PriceLibraryItem>>(`/price-library/${id}/use`);
    return response.data;
  },

  async importItems(payload: PriceLibraryImportPayload): Promise<ApiResponse<PriceLibraryImportResult>> {
    const response = await api.post<ApiResponse<PriceLibraryImportResult>>('/price-library/import', payload);
    return response.data;
  },
};

// Dashboard Service
export const dashboardService = {
  async getData(): Promise<ApiResponse<DashboardData>> {
    const response = await api.get<ApiResponse<DashboardData>>('/dashboard/');
    return response.data;
  },

  async getProjectProfitability(projectId: number): Promise<ApiResponse<unknown>> {
    const response = await api.get<ApiResponse<unknown>>(`/dashboard/profitability/project/${projectId}`);
    return response.data;
  },

  async getCompanyProfitability(year?: number): Promise<ApiResponse<unknown>> {
    const response = await api.get<ApiResponse<unknown>>(`/dashboard/profitability/company${year ? `?year=${year}` : ''}`);
    return response.data;
  },

  async getFinancialReport(year?: number): Promise<{ success: boolean } & import('@/types').FinancialReport> {
    const response = await api.get(`/dashboard/reports/financial${year ? `?year=${year}` : ''}`);
    return response.data;
  },
};

export default api;

// Settings service
export const settingsService = {
  async getCompany(): Promise<ApiResponse<CompanySettingsPayload>> {
    const response = await api.get<ApiResponse<CompanySettingsPayload>>('/settings/company');
    return response.data;
  },

  async updateCompany(data: CompanySettingsPayload): Promise<ApiResponse<{ id: number }>> {
    const response = await api.put<ApiResponse<{ id: number }>>('/settings/company', data);
    return response.data;
  },

  async uploadLogo(file: File): Promise<ApiResponse<{ logo_url: string }>> {
    const form = new FormData();
    form.append('file', file);
    const response = await api.post<ApiResponse<{ logo_url: string }>>('/settings/company/logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async uploadCgv(file: File): Promise<ApiResponse<{ cgv_url: string }>> {
    const form = new FormData();
    form.append('file', file);
    const response = await api.post<ApiResponse<{ cgv_url: string }>>('/settings/company/cgv', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async getTeam(): Promise<ApiResponse<TeamMemberPayload[]>> {
    const response = await api.get<ApiResponse<TeamMemberPayload[]>>('/settings/team');
    return response.data;
  },

  async createTeamMember(data: {
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    role?: string;
    password?: string;
  }): Promise<ApiResponse<TeamMemberPayload>> {
    const response = await api.post<ApiResponse<TeamMemberPayload>>('/settings/team', data);
    return response.data;
  },

  async updateTeamMember(userId: number, data: {
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    role?: string;
    is_active?: boolean;
  }): Promise<ApiResponse<TeamMemberPayload>> {
    const response = await api.patch<ApiResponse<TeamMemberPayload>>(`/settings/team/${userId}`, data);
    return response.data;
  },

  async removeTeamMember(userId: number): Promise<ApiResponse<{ id: number; is_active: boolean }>> {
    const response = await api.delete<ApiResponse<{ id: number; is_active: boolean }>>(`/settings/team/${userId}`);
    return response.data;
  },

  async updateLoginEmail(data: { email: string; current_password: string }): Promise<ApiResponse<{ email: string }>> {
    const response = await api.put<ApiResponse<{ email: string }>>('/settings/account/email', data);
    return response.data;
  },

  async updatePassword(data: { current_password: string; new_password: string }): Promise<ApiResponse<{ updated: boolean }>> {
    const response = await api.put<ApiResponse<{ updated: boolean }>>('/settings/account/password', data);
    return response.data;
  },
};
