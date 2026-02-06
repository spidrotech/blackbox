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
  DashboardData,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';

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
    const response = await api.post<ApiResponse<Customer>>('/customers/', data);
    return response.data;
  },

  async update(id: number, data: Partial<CustomerCreate>): Promise<ApiResponse<Customer>> {
    const response = await api.put<ApiResponse<Customer>>(`/customers/${id}`, data);
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
  async getAll(): Promise<ApiResponse<Quote[]>> {
    const response = await api.get<ApiResponse<Quote[]>>('/quotes/');
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

  async update(id: number, data: Partial<QuoteCreate>): Promise<ApiResponse<Quote>> {
    const response = await api.put<ApiResponse<Quote>>(`/quotes/${id}`, data);
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
};

// Invoice Service
export const invoiceService = {
  async getAll(): Promise<ApiResponse<Invoice[]>> {
    const response = await api.get<ApiResponse<Invoice[]>>('/invoices/');
    return response.data;
  },

  async getById(id: number): Promise<ApiResponse<Invoice>> {
    const response = await api.get<ApiResponse<Invoice>>(`/invoices/${id}`);
    return response.data;
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
};

export default api;
