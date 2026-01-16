/**
 * Supplier Domain Models
 * Models for supplier business logic
 */

// Request models for supplier operations
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

// Use case result interfaces
export interface UseCaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: ValidationErrors;
  events?: DomainEvent[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
}

export interface ValidationErrors {
  [field: string]: string[];
}

// Domain events
export interface DomainEvent {
  type: string;
  timestamp: Date;
  supplierId: number;
  supplierUniqueId: string;
  userId: string;
  data: any;
}

export interface SupplierCreatedEvent extends DomainEvent {
  type: 'SUPPLIER_CREATED';
  data: {
    name: string;
    email: string;
    type: 'particulier' | 'entreprise';
    relationType: 'fournisseur' | 'client_et_fournisseur';
  };
}

export interface SupplierUpdatedEvent extends DomainEvent {
  type: 'SUPPLIER_UPDATED';
  data: {
    changes: Partial<UpdateSupplierRequest>;
    previousValues: Partial<UpdateSupplierRequest>;
  };
}

export interface SupplierDeletedEvent extends DomainEvent {
  type: 'SUPPLIER_DELETED';
  data: {
    name: string;
    email: string;
  };
}

// Common currency codes
export const CURRENCY_CODES = [
  'EUR',
  'USD',
  'GBP',
  'JPY',
  'CHF',
  'CAD',
  'AUD'
] as const;

export type CurrencyCode = typeof CURRENCY_CODES[number];

// Common payment terms
export const PAYMENT_TERMS = [
  '15 jours net',
  '30 jours net',
  '45 jours net',
  '60 jours net',
  '30 jours fin de mois',
  '45 jours fin de mois',
  '60 jours fin de mois',
  'Comptant',
  'À réception'
] as const;

export type PaymentTerm = typeof PAYMENT_TERMS[number];