/**
 * Client Domain Models
 * Value objects and domain events for client operations
 */

// Note: CreateClientRequest and UpdateClientRequest are defined in client.repository.ts
// We re-export them here for convenience but they are the source of truth
export type { CreateClientRequest, UpdateClientRequest } from '../repositories/client.repository';

// Temporary local types for avoiding circular dependencies
interface LocalUpdateClientRequest {
  name?: string;
  type?: 'particulier' | 'entreprise';
  email?: string;
  phone?: string;
  address?: string;
  siret?: string;
  sector?: string;
  website?: string;
  notes?: string;
}

export interface ClientSearchParams {
  query?: string;
  type?: 'particulier' | 'entreprise';
  sector?: string;
  isActive?: boolean;
  createdBy?: number;
  page?: number;
  perPage?: number;
}

// Domain Events
export interface ClientDomainEvent {
  type: string;
  clientId: number;
  clientUniqueId: string;
  userId: string;
  timestamp: Date;
  data?: any;
}

export interface ClientCreatedEvent extends ClientDomainEvent {
  type: 'CLIENT_CREATED';
  data: {
    name: string;
    type: 'particulier' | 'entreprise';
    email: string;
  };
}

export interface ClientUpdatedEvent extends ClientDomainEvent {
  type: 'CLIENT_UPDATED';
  data: {
    changes: Partial<LocalUpdateClientRequest>;
    previousValues: Partial<LocalUpdateClientRequest>;
  };
}

export interface ClientDeletedEvent extends ClientDomainEvent {
  type: 'CLIENT_DELETED';
  data: {
    name: string;
    email: string;
  };
}

export interface ClientRestoredEvent extends ClientDomainEvent {
  type: 'CLIENT_RESTORED';
  data: {
    name: string;
    email: string;
  };
}

// Use Case Results
export interface UseCaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: Record<string, string[]>;
  events?: ClientDomainEvent[];
}

// Validation Result
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

// Note: ClientApiResponse is defined in infrastructure/api/client-api.models.ts

// Note: PaginatedClientApiResponse is also defined in infrastructure layer