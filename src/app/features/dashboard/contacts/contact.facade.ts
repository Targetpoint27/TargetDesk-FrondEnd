/**
 * Contact Facade
 * Manages contact state and coordinates use case execution
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, catchError, finalize, of, tap } from 'rxjs';

import { ContactEntity, ContactPagination } from '../../../domain/entities/contact.entity';
import { AppError } from '../../../core/error/error.service';
import { MessageService } from '../../../shared/services/message.service';

// Use cases
import {
  CreateContactUseCase,
  GetContactsUseCase,
  UpdateContactUseCase,
  DeleteContactUseCase,
  MakePrimaryContactUseCase,
  GetClientContactsUseCase,
  GetSupplierContactsUseCase,
  CreateClientContactUseCase,
  CreateSupplierContactUseCase
} from '../../../domain/use-cases/contact';

// Import types from use cases
import { CreateContactRequest, UseCaseResult } from '../../../domain/use-cases/contact/create-contact.use-case';
import { UpdateContactRequest } from '../../../domain/use-cases/contact/update-contact.use-case';
import { ContactFilters, PaginationParams } from '../../../domain/use-cases/contact/get-contacts.use-case';
import { ContactsListResponse, ClientContactsResponse, SupplierContactsResponse } from '../../../domain/repositories/contact.repository';

// State interfaces
export interface ContactsState {
  contacts: ContactEntity[];
  currentContact: ContactEntity | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: AppError | null;
  pagination: ContactPagination | null;
  filters: ContactFilters & {
    page: number;
    perPage: number;
  };
  // Context for client/supplier specific views
  currentEntityContext: {
    type: 'client' | 'supplier' | 'global';
    entityId?: number;
    entityName?: string;
  };
}

const initialState: ContactsState = {
  contacts: [],
  currentContact: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  pagination: null,
  filters: {
    page: 1,
    perPage: 15
  },
  currentEntityContext: {
    type: 'global'
  }
};

@Injectable({
  providedIn: 'root'
})
export class ContactFacade {
  private readonly state$ = new BehaviorSubject<ContactsState>(initialState);

  constructor(
    private createContactUseCase: CreateContactUseCase,
    private getContactsUseCase: GetContactsUseCase,
    private updateContactUseCase: UpdateContactUseCase,
    private deleteContactUseCase: DeleteContactUseCase,
    private makePrimaryContactUseCase: MakePrimaryContactUseCase,
    private getClientContactsUseCase: GetClientContactsUseCase,
    private getSupplierContactsUseCase: GetSupplierContactsUseCase,
    private createClientContactUseCase: CreateClientContactUseCase,
    private createSupplierContactUseCase: CreateSupplierContactUseCase,
    private messageService: MessageService
  ) {}

  // State selectors
  get contacts$(): Observable<ContactEntity[]> {
    return this.state$.pipe(map(state => state.contacts));
  }

  get currentContact$(): Observable<ContactEntity | null> {
    return this.state$.pipe(map(state => state.currentContact));
  }

  get isLoading$(): Observable<boolean> {
    return this.state$.pipe(map(state => state.isLoading));
  }

  get isCreating$(): Observable<boolean> {
    return this.state$.pipe(map(state => state.isCreating));
  }

  get isUpdating$(): Observable<boolean> {
    return this.state$.pipe(map(state => state.isUpdating));
  }

  get isDeleting$(): Observable<boolean> {
    return this.state$.pipe(map(state => state.isDeleting));
  }

  get error$(): Observable<AppError | null> {
    return this.state$.pipe(map(state => state.error));
  }

  get pagination$(): Observable<ContactsState['pagination']> {
    return this.state$.pipe(map(state => state.pagination));
  }

  get filters$(): Observable<ContactsState['filters']> {
    return this.state$.pipe(map(state => state.filters));
  }

  get currentEntityContext$(): Observable<ContactsState['currentEntityContext']> {
    return this.state$.pipe(map(state => state.currentEntityContext));
  }

  get hasContacts$(): Observable<boolean> {
    return this.state$.pipe(map(state => state.contacts.length > 0));
  }

  get isOperating$(): Observable<boolean> {
    return this.state$.pipe(
      map(state => state.isLoading || state.isCreating || state.isUpdating || state.isDeleting)
    );
  }

  // Actions - Global contacts
  loadContacts(filters?: ContactFilters, pagination?: PaginationParams): Observable<ContactsListResponse> {
    this.updateState({
      isLoading: true,
      error: null,
      currentEntityContext: { type: 'global' }
    });

    return this.getContactsUseCase.execute(filters, pagination).pipe(
      tap(result => {
        this.updateState({
          contacts: result.contacts,
          pagination: result.pagination,
          filters: {
            ...this.state$.value.filters,
            ...filters,
            page: pagination?.page || 1,
            perPage: pagination?.perPage || 15
          },
          isLoading: false,
          error: null
        });
      }),
      catchError(error => {
        const appError = new AppError('LOAD_CONTACTS_ERROR', 'Erreur lors du chargement des contacts', error.message);
        this.updateState({
          isLoading: false,
          error: appError
        });
        this.messageService.showError(appError.message);
        throw appError;
      })
    );
  }

  // Actions - Client contacts
  loadClientContacts(clientId: number, pagination?: PaginationParams): Observable<ClientContactsResponse> {
    this.updateState({
      isLoading: true,
      error: null,
      currentEntityContext: { type: 'client', entityId: clientId }
    });

    return this.getClientContactsUseCase.execute(clientId, pagination).pipe(
      tap(result => {
        this.updateState({
          contacts: result.contacts,
          pagination: result.pagination,
          currentEntityContext: {
            type: 'client',
            entityId: clientId,
            entityName: result.client?.name
          },
          isLoading: false,
          error: null
        });
      }),
      catchError(error => {
        const appError = new AppError('LOAD_CLIENT_CONTACTS_ERROR', 'Erreur lors du chargement des contacts client', error.message);
        this.updateState({
          isLoading: false,
          error: appError
        });
        this.messageService.showError(appError.message);
        throw appError;
      })
    );
  }

  // Actions - Supplier contacts
  loadSupplierContacts(supplierId: number, pagination?: PaginationParams): Observable<SupplierContactsResponse> {
    this.updateState({
      isLoading: true,
      error: null,
      currentEntityContext: { type: 'supplier', entityId: supplierId }
    });

    return this.getSupplierContactsUseCase.execute(supplierId, pagination).pipe(
      tap(result => {
        this.updateState({
          contacts: result.contacts,
          pagination: result.pagination,
          currentEntityContext: {
            type: 'supplier',
            entityId: supplierId,
            entityName: result.supplier?.name
          },
          isLoading: false,
          error: null
        });
      }),
      catchError(error => {
        const appError = new AppError('LOAD_SUPPLIER_CONTACTS_ERROR', 'Erreur lors du chargement des contacts fournisseur', error.message);
        this.updateState({
          isLoading: false,
          error: appError
        });
        this.messageService.showError(appError.message);
        throw appError;
      })
    );
  }

  // Creation actions
  createContact(contactData: CreateContactRequest): Observable<ContactEntity> {
    this.updateState({ isCreating: true, error: null });

    return this.createContactUseCase.execute(contactData).pipe(
      tap(result => {
        if (result.success && result.data) {
          const updatedContacts = [result.data, ...this.state$.value.contacts];
          this.updateState({
            contacts: updatedContacts,
            currentContact: result.data,
            isCreating: false,
            error: null
          });
          this.messageService.showSuccess('Contact créé avec succès');
        } else {
          const error = new AppError('CREATE_CONTACT_ERROR', result.error || 'Erreur lors de la création du contact', result.error || 'Erreur lors de la création du contact', result.validationErrors);
          this.updateState({
            isCreating: false,
            error
          });
          this.messageService.showError(error.message);
        }
      }),
      map(result => result.data!),
      catchError(error => {
        const appError = new AppError('CREATE_CONTACT_ERROR', 'Erreur inattendue lors de la création du contact', error.message);
        this.updateState({
          isCreating: false,
          error: appError
        });
        this.messageService.showError(appError.message);
        throw appError;
      })
    );
  }

  createClientContact(clientId: number, contactData: Omit<CreateContactRequest, 'clientId' | 'supplierId'>): Observable<ContactEntity> {
    this.updateState({ isCreating: true, error: null });

    return this.createClientContactUseCase.execute(clientId, contactData).pipe(
      tap(result => {
        if (result.success && result.data) {
          const updatedContacts = [result.data, ...this.state$.value.contacts];
          this.updateState({
            contacts: updatedContacts,
            currentContact: result.data,
            isCreating: false,
            error: null
          });
          this.messageService.showSuccess('Contact client créé avec succès');
        } else {
          const error = new AppError('CREATE_CLIENT_CONTACT_ERROR', result.error || 'Erreur lors de la création du contact client', result.error || 'Erreur lors de la création du contact client', result.validationErrors);
          this.updateState({
            isCreating: false,
            error
          });
          this.messageService.showError(error.message);
        }
      }),
      map(result => result.data!),
      catchError(error => {
        const appError = new AppError('CREATE_CLIENT_CONTACT_ERROR', 'Erreur inattendue lors de la création du contact client', error.message);
        this.updateState({
          isCreating: false,
          error: appError
        });
        this.messageService.showError(appError.message);
        throw appError;
      })
    );
  }

  createSupplierContact(supplierId: number, contactData: Omit<CreateContactRequest, 'clientId' | 'supplierId'>): Observable<ContactEntity> {
    this.updateState({ isCreating: true, error: null });

    return this.createSupplierContactUseCase.execute(supplierId, contactData).pipe(
      tap(result => {
        if (result.success && result.data) {
          const updatedContacts = [result.data, ...this.state$.value.contacts];
          this.updateState({
            contacts: updatedContacts,
            currentContact: result.data,
            isCreating: false,
            error: null
          });
          this.messageService.showSuccess('Contact fournisseur créé avec succès');
        } else {
          const error = new AppError('CREATE_SUPPLIER_CONTACT_ERROR', result.error || 'Erreur lors de la création du contact fournisseur', result.error || 'Erreur lors de la création du contact fournisseur', result.validationErrors);
          this.updateState({
            isCreating: false,
            error
          });
          this.messageService.showError(error.message);
        }
      }),
      map(result => result.data!),
      catchError(error => {
        const appError = new AppError('CREATE_SUPPLIER_CONTACT_ERROR', 'Erreur inattendue lors de la création du contact fournisseur', error.message);
        this.updateState({
          isCreating: false,
          error: appError
        });
        this.messageService.showError(appError.message);
        throw appError;
      })
    );
  }

  updateContact(contactId: number, updateData: Omit<UpdateContactRequest, 'contactId'>): Observable<ContactEntity> {
    this.updateState({ isUpdating: true, error: null });

    return this.updateContactUseCase.execute({ contactId, ...updateData }).pipe(
      tap(result => {
        if (result.success && result.data) {
          const updatedContacts = this.state$.value.contacts.map(contact =>
            contact.id === contactId ? result.data! : contact
          );
          this.updateState({
            contacts: updatedContacts,
            currentContact: result.data,
            isUpdating: false,
            error: null
          });
          this.messageService.showSuccess('Contact mis à jour avec succès');
        } else {
          const error = new AppError('UPDATE_CONTACT_ERROR', result.error || 'Erreur lors de la mise à jour du contact', result.error || 'Erreur lors de la mise à jour du contact', result.validationErrors);
          this.updateState({
            isUpdating: false,
            error
          });
          this.messageService.showError(error.message);
        }
      }),
      map(result => result.data!),
      catchError(error => {
        const appError = new AppError('UPDATE_CONTACT_ERROR', 'Erreur inattendue lors de la mise à jour du contact', error.message);
        this.updateState({
          isUpdating: false,
          error: appError
        });
        this.messageService.showError(appError.message);
        throw appError;
      })
    );
  }

  makePrimaryContact(contactId: number): Observable<ContactEntity> {
    this.updateState({ isUpdating: true, error: null });

    return this.makePrimaryContactUseCase.execute(contactId).pipe(
      tap(result => {
        if (result.success && result.data) {
          // Update all contacts to ensure only one is primary
          const updatedContacts = this.state$.value.contacts.map(contact => {
            if (contact.id === contactId) {
              return result.data!;
            } else if (contact.is_primary &&
                      ((contact.client_id && contact.client_id === result.data!.client_id) ||
                       (contact.supplier_id && contact.supplier_id === result.data!.supplier_id))) {
              // Créer une nouvelle ContactEntity avec is_primary mis à false
              const updatedContact = new ContactEntity(
                contact.id,
                contact.client_id,
                contact.supplier_id,
                contact.civility,
                contact.first_name,
                contact.last_name,
                contact.function,
                contact.department,
                false, // is_primary
                contact.is_active,
                contact.created_by,
                contact.created_at,
                contact.updated_at,
                contact.emails,
                contact.phones,
                contact.client,
                contact.supplier,
                contact.creator
              );
              return updatedContact;
            }
            return contact;
          });

          this.updateState({
            contacts: updatedContacts,
            currentContact: result.data,
            isUpdating: false,
            error: null
          });
          this.messageService.showSuccess('Contact principal défini avec succès');
        } else {
          const error = new AppError('MAKE_PRIMARY_CONTACT_ERROR', result.error || 'Erreur lors de la définition du contact principal', result.error || 'Erreur lors de la définition du contact principal');
          this.updateState({
            isUpdating: false,
            error
          });
          this.messageService.showError(error.message);
        }
      }),
      map(result => result.data!),
      catchError(error => {
        const appError = new AppError('MAKE_PRIMARY_CONTACT_ERROR', 'Erreur inattendue lors de la définition du contact principal', error.message);
        this.updateState({
          isUpdating: false,
          error: appError
        });
        this.messageService.showError(appError.message);
        throw appError;
      })
    );
  }

  deleteContact(contactId: number): Observable<void> {
    this.updateState({ isDeleting: true, error: null });

    return this.deleteContactUseCase.execute(contactId).pipe(
      tap(result => {
        if (result.success) {
          const updatedContacts = this.state$.value.contacts.filter(contact => contact.id !== contactId);
          this.updateState({
            contacts: updatedContacts,
            currentContact: this.state$.value.currentContact?.id === contactId ? null : this.state$.value.currentContact,
            isDeleting: false,
            error: null
          });
          this.messageService.showSuccess('Contact supprimé avec succès');
        } else {
          const error = new AppError('DELETE_CONTACT_ERROR', result.error || 'Erreur lors de la suppression du contact', result.error || 'Erreur lors de la suppression du contact');
          this.updateState({
            isDeleting: false,
            error
          });
          this.messageService.showError(error.message);
        }
      }),
      map(() => undefined),
      catchError(error => {
        const appError = new AppError('DELETE_CONTACT_ERROR', 'Erreur inattendue lors de la suppression du contact', error.message);
        this.updateState({
          isDeleting: false,
          error: appError
        });
        this.messageService.showError(appError.message);
        throw appError;
      })
    );
  }

  // Utility actions
  setCurrentContact(contact: ContactEntity | null): void {
    this.updateState({ currentContact: contact });
  }

  setSearch(search: string): void {
    this.updateState({
      filters: { ...this.state$.value.filters, search, page: 1 }
    });
  }

  setEntityTypeFilter(entityType?: 'client' | 'supplier'): void {
    this.updateState({
      filters: { ...this.state$.value.filters, entity_type: entityType, page: 1 }
    });
  }

  setPage(page: number): void {
    this.updateState({
      filters: { ...this.state$.value.filters, page }
    });
  }

  clearError(): void {
    this.updateState({ error: null });
  }

  reset(): void {
    this.state$.next(initialState);
  }

  // Private methods
  private updateState(partialState: Partial<ContactsState>): void {
    const currentState = this.state$.value;
    const newState = { ...currentState, ...partialState };
    this.state$.next(newState);
  }

  // Debug method (development only)
  getState(): ContactsState {
    return this.state$.value;
  }
}