/**
 * Supplier Repository Interface - Domain Contract
 * Abstract repository defining all supplier data operations
 */

import { Observable } from 'rxjs';
import { SupplierEntity } from '../entities/supplier.entity';

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface PaginationResult<T> {
  items: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    perPage: number;
  };
}

export interface CreateSupplierRequest {
  name: string;
  type: 'particulier' | 'entreprise';
  email: string;
  phone?: string;
  address?: string;
  siret?: string;
  sector?: string;
  website?: string;
  notes?: string;
  relationType?: 'fournisseur' | 'client_et_fournisseur';
  paymentTerms?: string;
  deliveryDelay?: number;
  currency?: string;
}

export interface UpdateSupplierRequest {
  name?: string;
  type?: 'particulier' | 'entreprise';
  email?: string;
  phone?: string;
  address?: string;
  siret?: string;
  sector?: string;
  website?: string;
  notes?: string;
  relationType?: 'fournisseur' | 'client_et_fournisseur';
  paymentTerms?: string;
  deliveryDelay?: number;
  currency?: string;
}

/**
 * Abstract Supplier Repository
 * Defines contract for all supplier data operations
 * Must be implemented in infrastructure layer
 */
export abstract class SupplierRepository {
  /**
   * Create a new supplier
   * @param supplierData - Supplier creation data
   * @returns Observable of created supplier entity
   */
  abstract create(supplierData: CreateSupplierRequest): Observable<SupplierEntity>;

  /**
   * Get paginated list of active suppliers
   * @param params - Pagination parameters
   * @returns Observable of paginated supplier results
   */
  abstract getAll(params?: PaginationParams): Observable<PaginationResult<SupplierEntity>>;

  /**
   * Get supplier by ID
   * @param id - Supplier ID
   * @returns Observable of supplier entity or null if not found
   */
  abstract getById(id: number): Observable<SupplierEntity | null>;

  /**
   * Get supplier by supplier_id (unique identifier)
   * @param supplierId - Supplier unique identifier
   * @returns Observable of supplier entity or null if not found
   */
  abstract getBySupplierId(supplierId: string): Observable<SupplierEntity | null>;

  /**
   * Update supplier data
   * @param id - Supplier ID
   * @param updateData - Updated supplier data
   * @returns Observable of updated supplier entity
   */
  abstract update(id: number, updateData: UpdateSupplierRequest): Observable<SupplierEntity>;

  /**
   * Delete supplier
   * @param id - Supplier ID
   * @returns Observable of void on successful deletion
   */
  abstract delete(id: number): Observable<void>;

  /**
   * Check if email is already used by another supplier
   * @param email - Email to check
   * @param excludeId - Supplier ID to exclude from check (for updates)
   * @returns Observable of boolean indicating if email exists
   */
  abstract isEmailUnique(email: string, excludeId?: number): Observable<boolean>;

  /**
   * Check if SIRET is already used by another supplier
   * @param siret - SIRET to check
   * @param excludeId - Supplier ID to exclude from check (for updates)
   * @returns Observable of boolean indicating if SIRET exists
   */
  abstract isSiretUnique(siret: string, excludeId?: number): Observable<boolean>;

  /**
   * Search suppliers by name, email or other criteria
   * @param query - Search query string
   * @param params - Pagination parameters
   * @returns Observable of paginated search results
   */
  abstract search(query: string, params?: PaginationParams): Observable<PaginationResult<SupplierEntity>>;

  /**
   * Get suppliers by relation type
   * @param relationType - Relation type
   * @param params - Pagination parameters
   * @returns Observable of paginated supplier results
   */
  abstract getByRelationType(relationType: 'fournisseur' | 'client_et_fournisseur', params?: PaginationParams): Observable<PaginationResult<SupplierEntity>>;

  /**
   * Get suppliers by type (particulier/entreprise)
   * @param type - Supplier type
   * @param params - Pagination parameters
   * @returns Observable of paginated supplier results
   */
  abstract getByType(type: 'particulier' | 'entreprise', params?: PaginationParams): Observable<PaginationResult<SupplierEntity>>;

  /**
   * Get suppliers by sector
   * @param sector - Sector name
   * @param params - Pagination parameters
   * @returns Observable of paginated supplier results
   */
  abstract getBySector(sector: string, params?: PaginationParams): Observable<PaginationResult<SupplierEntity>>;
}