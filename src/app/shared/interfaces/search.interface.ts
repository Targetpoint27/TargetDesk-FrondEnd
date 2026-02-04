// Interfaces pour les fonctionnalités de recherche et filtrage

export interface SearchResult {
  id: number;
  client_id?: string;
  supplier_id?: string;
  name: string;
  email: string;
  phone: string;
  type: 'particulier' | 'entreprise';
  address?: string;
  highlighted_field: string;
  match_score: number;
  relation_type?: 'fournisseur' | 'client_et_fournisseur';
}

export interface SearchResponse {
  success: boolean;
  message: string;
  data: {
    results: SearchResult[];
    query: string;
    total_found: number;
  };
}

export interface FilterOptions {
  search?: string;
  type?: 'particulier' | 'entreprise';
  sector?: string;
  relation_type?: 'fournisseur' | 'client_et_fournisseur';
  created_from?: string;
  created_to?: string;
  updated_from?: string;
  updated_to?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
  limit?: number;
  fuzzy?: boolean;
}

export interface FilteredResponse<T> {
  success: boolean;
  message: string;
  data: {
    clients?: T[];
    suppliers?: T[];
    pagination: {
      current_page: number;
      total_pages: number;
      total_items: number;
      per_page: number;
    };
    filters_applied: Record<string, any>;
    total_without_filters: number;
  };
}

export interface CategorySummary {
  id: number;
  name: string;
  color: string;
}

export interface CategoryGroup {
  type: 'client' | 'supplier';
  count: number;
  categories: CategorySummary[];
}

export interface Creator {
  id: number;
  name: string;
}

export interface ClientSearchResult {
  id: number;
  client_id: string;
  name: string;
  type: 'particulier' | 'entreprise';
  email: string;
  phone: string;
  address?: string;
  siret?: string;
  sector?: string;
  website?: string;
  notes?: string;
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  categories_count: number;
  categories_summary: CategoryGroup[];
  creator: Creator;
}

export interface SupplierSearchResult {
  id: number;
  supplier_id: string;
  name: string;
  type: 'particulier' | 'entreprise';
  email: string;
  phone: string;
  address?: string;
  siret?: string;
  sector?: string;
  website?: string;
  notes?: string;
  relation_type: 'fournisseur' | 'client_et_fournisseur';
  payment_terms?: string;
  delivery_delay?: number;
  currency: string;
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  creator: Creator;
}

export type ClientFilteredResponse = FilteredResponse<ClientSearchResult>;
export type SupplierFilteredResponse = FilteredResponse<SupplierSearchResult>;

export interface SearchOptions {
  limit?: number;
  fuzzy?: boolean;
  debounce?: number;
}

export interface FilterState {
  search: string;
  type: string;
  sector: string;
  relation_type: string;
  created_from: string;
  created_to: string;
  updated_from: string;
  updated_to: string;
  sort_by: string;
  sort_order: 'asc' | 'desc';
  page: number;
  per_page: number;
}

export interface UseSearchResult {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  search: (query: string, type?: 'clients' | 'suppliers') => Promise<SearchResult[]>;
  highlightTerm: (text: string, term: string) => string;
  clearResults: () => void;
}

export interface UseAdvancedFilterResult<T> {
  filters: FilterState;
  updateFilter: (key: keyof FilterState, value: any) => void;
  resetFilters: () => void;
  data: FilteredResponse<T>['data'] | null;
  loading: boolean;
  error: string | null;
  activeFilterCount: number;
  applyFilters: () => Promise<void>;
}