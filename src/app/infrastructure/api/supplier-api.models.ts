/**
 * Supplier API Models
 * Interface contracts for supplier API communication
 */

export interface SupplierApiModel {
  id: number;
  supplier_id: string;
  name: string;
  type: 'particulier' | 'entreprise';
  email: string;
  phone?: string | null;
  address?: string | null;
  siret?: string | null;
  sector?: string | null;
  website?: string | null;
  notes?: string | null;
  relation_type: 'fournisseur' | 'client_et_fournisseur';
  payment_terms?: string | null;
  delivery_delay?: number | null;
  currency: string;
  is_active: boolean;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  creator?: {
    id: number;
    name: string;
  } | null;
}

export interface CreateSupplierApiRequest {
  name: string;
  type: 'particulier' | 'entreprise';
  email: string;
  phone?: string;
  address?: string;
  siret?: string;
  sector?: string;
  website?: string;
  notes?: string;
  relation_type?: 'fournisseur' | 'client_et_fournisseur';
  payment_terms?: string;
  delivery_delay?: number;
  currency?: string;
}

export interface UpdateSupplierApiRequest {
  name?: string;
  type?: 'particulier' | 'entreprise';
  email?: string;
  phone?: string;
  address?: string;
  siret?: string;
  sector?: string;
  website?: string;
  notes?: string;
  relation_type?: 'fournisseur' | 'client_et_fournisseur';
  payment_terms?: string;
  delivery_delay?: number;
  currency?: string;
}

export interface SupplierApiResponse {
  success: boolean;
  message: string;
  data: SupplierApiModel;
}

export interface SupplierListApiResponse {
  success: boolean;
  message: string;
  data: {
    suppliers: SupplierApiModel[];
    pagination: {
      current_page: number;
      total_pages: number;
      total_items: number;
      per_page: number;
    };
  };
}

export interface SupplierDeleteApiResponse {
  success: boolean;
  message: string;
  data: null;
}

// API Error Response
export interface SupplierApiError {
  success: false;
  message: string;
  errors?: {
    [field: string]: string[];
  };
}

// Pagination query params
export interface SupplierApiPaginationParams {
  page?: number;
  per_page?: number;
}

// Search query params
export interface SupplierSearchApiParams extends SupplierApiPaginationParams {
  q?: string; // search query
  relation_type?: 'fournisseur' | 'client_et_fournisseur';
  type?: 'particulier' | 'entreprise';
  sector?: string;
}