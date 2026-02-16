/**
 * Client API Models
 * Interface contracts for client API communication
 */

import { CategoryType } from '../../domain/entities/category.entity';
import { CustomFieldRequest } from '../../domain/repositories/client.repository';

export interface CategoryApiModel {
  id: number;
  name: string;
  color: string;
  type: CategoryType;
  pivot?: {
    client_id: number;
    category_id: number;
    assigned_by: number;
    assigned_at: string;
  };
}

export interface CategorySummaryApiModel {
  type: CategoryType;
  count: number;
  categories: {
    id: number;
    name: string;
    color: string;
  }[];
}

export interface ClientApiModel {
  id: number;
  client_id: string;
  name: string;
  type: 'particulier' | 'entreprise';
  email: string;
  phone?: string | null;
  address?: string | null;
  siret?: string | null;
  sector?: string | null;
  website?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  creator?: {
    id: number;
    name: string;
  } | null;
  // Category-related properties (new)
  categories_count?: number;
  categories_summary?: CategorySummaryApiModel[];
  categories?: CategoryApiModel[];
  // Custom fields
  custom_fields?: CustomFieldRequest[];
}

export interface CreateClientApiRequest {
  name: string;
  type: 'particulier' | 'entreprise';
  email: string;
  phone?: string;
  address?: string;
  siret?: string;
  sector?: string;
  website?: string;
  notes?: string;
  category_ids?: number[];
}

export interface UpdateClientApiRequest {
  name?: string;
  type?: 'particulier' | 'entreprise';
  email?: string;
  phone?: string;
  address?: string;
  siret?: string;
  sector?: string;
  website?: string;
  notes?: string;
  category_ids?: number[];
  custom_fields?: CustomFieldRequest[];
}

export interface ClientApiResponse {
  success: boolean;
  message: string;
  data: ClientApiModel;
}

export interface ClientListApiResponse {
  success: boolean;
  message: string;
  data: {
    clients: ClientApiModel[];
    pagination: {
      current_page: number;
      total_pages: number;
      total_items: number;
      per_page: number;
    };
  };
}

export interface ClientDeleteApiResponse {
  success: boolean;
  message: string;
  data: null;
}

// API Error Response
export interface ClientApiError {
  success: false;
  message: string;
  errors?: {
    [field: string]: string[];
  };
}

// Pagination query params
export interface ClientApiPaginationParams {
  page?: number;
  per_page?: number;
}

// Search query params
export interface ClientSearchApiParams extends ClientApiPaginationParams {
  q?: string; // search query
  type?: 'particulier' | 'entreprise';
  sector?: string;
}