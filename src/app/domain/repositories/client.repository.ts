/**
 * Client Repository Interface - Domain Contract
 * Abstract repository defining all client data operations
 */

import { Observable } from 'rxjs';
import { ClientEntity } from '../entities/client.entity';

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

export interface CustomFieldRequest {
  field_key: string;
  field_value: string;
}

export interface CreateClientRequest {
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
  custom_fields?: CustomFieldRequest[];
}

export interface UpdateClientRequest {
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

/**
 * Abstract Client Repository
 * Defines contract for all client data operations
 * Must be implemented in infrastructure layer
 */
export abstract class ClientRepository {
  /**
   * Create a new client
   * @param clientData - Client creation data
   * @returns Observable of created client entity
   */
  abstract create(clientData: CreateClientRequest): Observable<ClientEntity>;

  /**
   * Get paginated list of active clients
   * @param params - Pagination parameters
   * @returns Observable of paginated client results
   */
  abstract getAll(params?: PaginationParams): Observable<PaginationResult<ClientEntity>>;

  /**
   * Get client by ID
   * @param id - Client ID
   * @returns Observable of client entity or null if not found
   */
  abstract getById(id: number): Observable<ClientEntity | null>;

  /**
   * Get client by client_id (unique identifier)
   * @param clientId - Client unique identifier
   * @returns Observable of client entity or null if not found
   */
  abstract getByClientId(clientId: string): Observable<ClientEntity | null>;

  /**
   * Update client data
   * @param id - Client ID
   * @param updateData - Updated client data
   * @returns Observable of updated client entity
   */
  abstract update(id: number, updateData: UpdateClientRequest): Observable<ClientEntity>;

  /**
   * Delete client (soft delete - marks as inactive)
   * @param id - Client ID
   * @returns Observable of void on successful deletion
   */
  abstract delete(id: number): Observable<void>;

  /**
   * Check if email is already used by another client
   * @param email - Email to check
   * @param excludeId - Client ID to exclude from check (for updates)
   * @returns Observable of boolean indicating if email exists
   */
  abstract isEmailUnique(email: string, excludeId?: number): Observable<boolean>;

  /**
   * Check if SIRET is already used by another client
   * @param siret - SIRET to check
   * @param excludeId - Client ID to exclude from check (for updates)
   * @returns Observable of boolean indicating if SIRET exists
   */
  abstract isSiretUnique(siret: string, excludeId?: number): Observable<boolean>;

  /**
   * Search clients by name, email or other criteria
   * @param query - Search query string
   * @param params - Pagination parameters
   * @returns Observable of paginated search results
   */
  abstract search(query: string, params?: PaginationParams): Observable<PaginationResult<ClientEntity>>;

  /**
   * Get clients created by a specific user
   * @param creatorId - User ID who created the clients
   * @param params - Pagination parameters
   * @returns Observable of paginated client results
   */
  abstract getByCreator(creatorId: number, params?: PaginationParams): Observable<PaginationResult<ClientEntity>>;

  /**
   * Get clients by type (particulier/entreprise)
   * @param type - Client type
   * @param params - Pagination parameters
   * @returns Observable of paginated client results
   */
  abstract getByType(type: 'particulier' | 'entreprise', params?: PaginationParams): Observable<PaginationResult<ClientEntity>>;

  /**
   * Restore a deleted (inactive) client
   * @param id - Client ID
   * @returns Observable of restored client entity
   */
  abstract restore(id: number): Observable<ClientEntity>;
}