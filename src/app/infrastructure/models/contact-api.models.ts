import { ContactCivility, ContactEmailType, ContactPhoneType } from '../../domain/entities/contact.entity';

// Modèles de réponse API
export interface ApiContactEmail {
  id: number;
  contact_id: number;
  email: string;
  type: ContactEmailType;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiContactPhone {
  id: number;
  contact_id: number;
  phone: string;
  type: ContactPhoneType;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiUserReference {
  id: number;
  name: string;
}

export interface ApiClientReference {
  id: number;
  client_id: string;
  name: string;
}

export interface ApiSupplierReference {
  id: number;
  supplier_id: string;
  name: string;
}

export interface ApiContact {
  id: number;
  client_id: number | null;
  supplier_id: number | null;
  civility: ContactCivility | null;
  first_name: string;
  last_name: string;
  function: string | null;
  department: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;

  // Propriétés calculées par l'API
  full_name: string;
  primary_email: string | null;
  primary_phone: string | null;
  entity_type: 'client' | 'supplier';
  entity_name: string;
  entity_id: string;

  // Relations
  emails: ApiContactEmail[];
  phones: ApiContactPhone[];
  client: ApiClientReference | null;
  supplier: ApiSupplierReference | null;
  creator: ApiUserReference;
}

export interface ApiPagination {
  current_page: number;
  total_pages: number;
  total_items: number;
  per_page: number;
}

export interface ApiContactFilters {
  search?: string;
  entity_type?: 'client' | 'supplier';
}

// Réponses spécifiques des endpoints
export interface ApiContactsResponse {
  success: boolean;
  message: string;
  data: {
    contacts: ApiContact[];
    pagination: ApiPagination;
    filters?: ApiContactFilters;
  };
}

export interface ApiClientContactsResponse {
  success: boolean;
  message: string;
  data: {
    contacts: ApiContact[];
    pagination: ApiPagination;
    client: ApiClientReference;
  };
}

export interface ApiSupplierContactsResponse {
  success: boolean;
  message: string;
  data: {
    contacts: ApiContact[];
    pagination: ApiPagination;
    supplier: ApiSupplierReference;
  };
}

export interface ApiContactDetailsResponse {
  success: boolean;
  message: string;
  data: ApiContact;
}

// Modèles de requête pour création/modification
export interface ApiCreateContactEmail {
  email: string;
  type: ContactEmailType;
  is_primary: boolean;
}

export interface ApiCreateContactPhone {
  phone: string;
  type: ContactPhoneType;
  is_primary: boolean;
}

export interface ApiCreateContactRequest {
  civility?: ContactCivility;
  first_name: string;
  last_name: string;
  function?: string;
  department?: string;
  is_primary?: boolean;
  emails: ApiCreateContactEmail[];
  phones?: ApiCreateContactPhone[];
}

export interface ApiUpdateContactRequest extends Partial<ApiCreateContactRequest> {}

// Réponses de création/modification
export interface ApiContactCreatedResponse {
  success: boolean;
  message: string;
  data: ApiContact;
}

export interface ApiContactUpdatedResponse {
  success: boolean;
  message: string;
  data: ApiContact;
}

export interface ApiMakePrimaryResponse {
  success: boolean;
  message: string;
  data: ApiContact;
}

export interface ApiDeleteContactResponse {
  success: boolean;
  message: string;
  data: null;
}

// Modèles d'erreur API
export interface ApiContactError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

// Paramètres de requête pour les endpoints
export interface GetContactsParams {
  page?: number;
  per_page?: number;
  search?: string;
  entity_type?: 'client' | 'supplier';
}

export interface GetClientContactsParams {
  page?: number;
  per_page?: number;
}

export interface GetSupplierContactsParams {
  page?: number;
  per_page?: number;
}

// Types utilitaires pour les mappers
export type CreateContactForClient = {
  clientId: number;
  contactData: ApiCreateContactRequest;
};

export type CreateContactForSupplier = {
  supplierId: number;
  contactData: ApiCreateContactRequest;
};

export type UpdateContact = {
  contactId: number;
  updateData: ApiUpdateContactRequest;
};

// Réponses typées pour les erreurs communes
export interface EmailAlreadyUsedError extends ApiContactError {
  errors: {
    'emails.0.email': ['Cet email est déjà utilisé par un autre contact de ce client.' | 'Cet email est déjà utilisé par un autre contact de ce fournisseur.'];
  };
}

export interface PrimaryContactProtectedError extends ApiContactError {
  message: 'Impossible de supprimer le contact principal. Définissez d\'abord un autre contact comme principal.';
}

export interface ValidationError extends ApiContactError {
  errors: Record<string, string[]>;
}