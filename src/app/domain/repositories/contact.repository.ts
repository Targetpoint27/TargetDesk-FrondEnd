import { Observable } from 'rxjs';
import { ContactEntity, ContactFilters, ContactPagination, CreateContactData, UpdateContactData } from '../entities/contact.entity';

export interface ContactsListResponse {
  contacts: ContactEntity[];
  pagination: ContactPagination;
  filters?: ContactFilters;
}

export interface ClientContactsResponse {
  contacts: ContactEntity[];
  pagination: ContactPagination;
  client: {
    id: number;
    client_id: string;
    name: string;
  } | null;
}

export interface SupplierContactsResponse {
  contacts: ContactEntity[];
  pagination: ContactPagination;
  supplier: {
    id: number;
    supplier_id: string;
    name: string;
  } | null;
}

export abstract class ContactRepository {
  // Récupérer tous les contacts (vue globale)
  abstract getContacts(filters?: ContactFilters): Observable<ContactsListResponse>;

  // Récupérer les contacts d'un client spécifique
  abstract getClientContacts(clientId: number, page?: number, perPage?: number): Observable<ClientContactsResponse>;

  // Récupérer les contacts d'un fournisseur spécifique
  abstract getSupplierContacts(supplierId: number, page?: number, perPage?: number): Observable<SupplierContactsResponse>;

  // Récupérer les détails d'un contact
  abstract getContactDetails(contactId: number): Observable<ContactEntity>;

  // Créer un nouveau contact pour un client
  abstract createClientContact(clientId: number, contactData: CreateContactData): Observable<ContactEntity>;

  // Créer un nouveau contact pour un fournisseur
  abstract createSupplierContact(supplierId: number, contactData: CreateContactData): Observable<ContactEntity>;

  // Mettre à jour un contact
  abstract updateContact(contactId: number, updateData: UpdateContactData): Observable<ContactEntity>;

  // Définir un contact comme principal
  abstract makePrimaryContact(contactId: number): Observable<ContactEntity>;

  // Supprimer un contact (soft delete)
  abstract deleteContact(contactId: number): Observable<boolean>;

  // Nouvelles méthodes modernes pour les use cases
  abstract createForClient(clientId: number, contactData: any): Observable<ContactEntity>;
  abstract createForSupplier(supplierId: number, contactData: any): Observable<ContactEntity>;
  abstract update(contactId: number, updateData: any): Observable<ContactEntity>;
  abstract makePrimary(contactId: number): Observable<ContactEntity>;
  abstract delete(contactId: number): Observable<boolean>;
}