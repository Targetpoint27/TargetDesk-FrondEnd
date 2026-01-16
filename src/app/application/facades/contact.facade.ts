import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map, shareReplay, switchMap, tap, catchError, of } from 'rxjs';

import { ContactEntity, ContactFilters, ContactPagination, CreateContactData, UpdateContactData } from '../../domain/entities/contact.entity';
import { ContactsListResponse, ClientContactsResponse, SupplierContactsResponse } from '../../domain/repositories/contact.repository';

import { GetContactsUseCase } from '../use-cases/contact/get-contacts.use-case';
import { GetClientContactsUseCase } from '../use-cases/contact/get-client-contacts.use-case';
import { GetSupplierContactsUseCase } from '../use-cases/contact/get-supplier-contacts.use-case';
import { GetContactDetailsUseCase } from '../use-cases/contact/get-contact-details.use-case';
import { CreateContactUseCase, CreateContactParams } from '../use-cases/contact/create-contact.use-case';
import { UpdateContactUseCase } from '../use-cases/contact/update-contact.use-case';
import { MakePrimaryContactUseCase } from '../use-cases/contact/make-primary-contact.use-case';
import { DeleteContactUseCase } from '../use-cases/contact/delete-contact.use-case';

export interface ContactsState {
  contacts: ContactEntity[];
  pagination: ContactPagination | null;
  filters: ContactFilters;
  isLoading: boolean;
  error: string | null;
}

export interface ClientContactsState {
  contacts: ContactEntity[];
  pagination: ContactPagination | null;
  clientInfo: { id: number; client_id: string; name: string } | null;
  isLoading: boolean;
  error: string | null;
}

export interface SupplierContactsState {
  contacts: ContactEntity[];
  pagination: ContactPagination | null;
  supplierInfo: { id: number; supplier_id: string; name: string } | null;
  isLoading: boolean;
  error: string | null;
}

export interface ContactDetailsState {
  contact: ContactEntity | null;
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ContactFacade {
  // États pour la liste globale des contacts
  private _contactsState$ = new BehaviorSubject<ContactsState>({
    contacts: [],
    pagination: null,
    filters: { page: 1, per_page: 15 },
    isLoading: false,
    error: null
  });

  // États pour les contacts par client
  private _clientContactsStates$ = new Map<number, BehaviorSubject<ClientContactsState>>();

  // États pour les contacts par fournisseur
  private _supplierContactsStates$ = new Map<number, BehaviorSubject<SupplierContactsState>>();

  // État pour les détails d'un contact
  private _contactDetailsState$ = new BehaviorSubject<ContactDetailsState>({
    contact: null,
    isLoading: false,
    error: null
  });

  constructor(
    private getContactsUseCase: GetContactsUseCase,
    private getClientContactsUseCase: GetClientContactsUseCase,
    private getSupplierContactsUseCase: GetSupplierContactsUseCase,
    private getContactDetailsUseCase: GetContactDetailsUseCase,
    private createContactUseCase: CreateContactUseCase,
    private updateContactUseCase: UpdateContactUseCase,
    private makePrimaryContactUseCase: MakePrimaryContactUseCase,
    private deleteContactUseCase: DeleteContactUseCase
  ) {}

  // Sélecteurs pour la liste globale
  get contactsState$(): Observable<ContactsState> {
    return this._contactsState$.asObservable();
  }

  get contacts$(): Observable<ContactEntity[]> {
    return this._contactsState$.pipe(map(state => state.contacts));
  }

  get contactsLoading$(): Observable<boolean> {
    return this._contactsState$.pipe(map(state => state.isLoading));
  }

  get contactsError$(): Observable<string | null> {
    return this._contactsState$.pipe(map(state => state.error));
  }

  get contactsPagination$(): Observable<ContactPagination | null> {
    return this._contactsState$.pipe(map(state => state.pagination));
  }

  get contactsFilters$(): Observable<ContactFilters> {
    return this._contactsState$.pipe(map(state => state.filters));
  }

  // Sélecteurs pour les détails d'un contact
  get contactDetailsState$(): Observable<ContactDetailsState> {
    return this._contactDetailsState$.asObservable();
  }

  get contactDetails$(): Observable<ContactEntity | null> {
    return this._contactDetailsState$.pipe(map(state => state.contact));
  }

  get contactDetailsLoading$(): Observable<boolean> {
    return this._contactDetailsState$.pipe(map(state => state.isLoading));
  }

  get contactDetailsError$(): Observable<string | null> {
    return this._contactDetailsState$.pipe(map(state => state.error));
  }

  // Actions pour la liste globale des contacts
  loadContacts(filters?: ContactFilters): void {
    const newFilters = { ...this._contactsState$.value.filters, ...filters };

    this._contactsState$.next({
      ...this._contactsState$.value,
      filters: newFilters,
      isLoading: true,
      error: null
    });

    this.getContactsUseCase.execute(newFilters)
      .pipe(
        catchError(error => {
          this._contactsState$.next({
            ...this._contactsState$.value,
            isLoading: false,
            error: error.message || 'Erreur lors du chargement des contacts'
          });
          return of({
            contacts: [],
            pagination: {
              current_page: 1,
              total_pages: 0,
              total_items: 0,
              per_page: newFilters.per_page || 15
            },
            filters: newFilters
          } as ContactsListResponse);
        })
      )
      .subscribe(response => {
        this._contactsState$.next({
          ...this._contactsState$.value,
          contacts: response.contacts,
          pagination: response.pagination,
          isLoading: false,
          error: null
        });
      });
  }

  searchContacts(searchTerm: string): void {
    this.loadContacts({
      ...this._contactsState$.value.filters,
      search: searchTerm,
      page: 1
    });
  }

  filterContactsByEntityType(entityType: 'client' | 'supplier' | undefined): void {
    console.log('Facade filterContactsByEntityType appelé avec:', entityType);
    const filters = {
      ...this._contactsState$.value.filters,
      entity_type: entityType,
      page: 1
    };
    console.log('Filtres envoyés à loadContacts:', filters);
    this.loadContacts(filters);
  }

  changePage(page: number): void {
    this.loadContacts({
      ...this._contactsState$.value.filters,
      page
    });
  }

  resetFilters(): void {
    console.log('Facade resetFilters appelé');
    this.loadContacts({ page: 1, per_page: 15 });
  }

  // Méthodes pour les contacts par client
  getClientContactsState$(clientId: number): Observable<ClientContactsState> {
    if (!this._clientContactsStates$.has(clientId)) {
      this._clientContactsStates$.set(clientId, new BehaviorSubject<ClientContactsState>({
        contacts: [],
        pagination: null,
        clientInfo: null,
        isLoading: false,
        error: null
      }));
    }
    return this._clientContactsStates$.get(clientId)!.asObservable();
  }

  loadClientContacts(clientId: number, page: number = 1, perPage: number = 10): void {
    const state$ = this._getOrCreateClientState(clientId);

    state$.next({
      ...state$.value,
      isLoading: true,
      error: null
    });

    this.getClientContactsUseCase.execute(clientId, page, perPage)
      .pipe(
        catchError(error => {
          state$.next({
            ...state$.value,
            isLoading: false,
            error: error.message || 'Erreur lors du chargement des contacts du client'
          });
          return of({
            contacts: [],
            pagination: {
              current_page: 1,
              total_pages: 0,
              total_items: 0,
              per_page: perPage
            },
            client: null
          } as ClientContactsResponse);
        })
      )
      .subscribe(response => {
        state$.next({
          ...state$.value,
          contacts: response.contacts,
          pagination: response.pagination,
          clientInfo: response.client,
          isLoading: false,
          error: null
        });
      });
  }

  // Méthodes pour les contacts par fournisseur
  getSupplierContactsState$(supplierId: number): Observable<SupplierContactsState> {
    if (!this._supplierContactsStates$.has(supplierId)) {
      this._supplierContactsStates$.set(supplierId, new BehaviorSubject<SupplierContactsState>({
        contacts: [],
        pagination: null,
        supplierInfo: null,
        isLoading: false,
        error: null
      }));
    }
    return this._supplierContactsStates$.get(supplierId)!.asObservable();
  }

  loadSupplierContacts(supplierId: number, page: number = 1, perPage: number = 10): void {
    const state$ = this._getOrCreateSupplierState(supplierId);

    state$.next({
      ...state$.value,
      isLoading: true,
      error: null
    });

    this.getSupplierContactsUseCase.execute(supplierId, page, perPage)
      .pipe(
        catchError(error => {
          state$.next({
            ...state$.value,
            isLoading: false,
            error: error.message || 'Erreur lors du chargement des contacts du fournisseur'
          });
          return of({
            contacts: [],
            pagination: {
              current_page: 1,
              total_pages: 0,
              total_items: 0,
              per_page: perPage
            },
            supplier: null
          } as SupplierContactsResponse);
        })
      )
      .subscribe(response => {
        state$.next({
          ...state$.value,
          contacts: response.contacts,
          pagination: response.pagination,
          supplierInfo: response.supplier,
          isLoading: false,
          error: null
        });
      });
  }

  // Actions pour les détails d'un contact
  loadContactDetails(contactId: number): void {
    this._contactDetailsState$.next({
      ...this._contactDetailsState$.value,
      isLoading: true,
      error: null
    });

    this.getContactDetailsUseCase.execute(contactId)
      .pipe(
        catchError(error => {
          this._contactDetailsState$.next({
            ...this._contactDetailsState$.value,
            isLoading: false,
            error: error.message || 'Erreur lors du chargement des détails du contact'
          });
          return of(null);
        })
      )
      .subscribe(contact => {
        if (contact) {
          this._contactDetailsState$.next({
            ...this._contactDetailsState$.value,
            contact,
            isLoading: false,
            error: null
          });
        }
      });
  }

  // Actions CRUD
  createContact(params: CreateContactParams): Observable<ContactEntity> {
    return this.createContactUseCase.execute(params)
      .pipe(
        tap(newContact => {
          // Mise à jour optimiste de la liste globale si applicable
          const currentState = this._contactsState$.value;
          if (currentState.contacts.length > 0) {
            this.loadContacts(currentState.filters);
          }

          // Mise à jour de la liste spécifique à l'entité
          if (params.entityType === 'client') {
            this._refreshClientContactsIfLoaded(params.entityId);
          } else {
            this._refreshSupplierContactsIfLoaded(params.entityId);
          }
        }),
        catchError(error => {
          console.error('Erreur création contact:', error);
          throw error;
        })
      );
  }

  updateContact(contactId: number, updateData: UpdateContactData): Observable<ContactEntity> {
    return this.updateContactUseCase.execute(contactId, updateData)
      .pipe(
        tap(updatedContact => {
          // Mise à jour des détails si ce contact est affiché
          const currentDetailsState = this._contactDetailsState$.value;
          if (currentDetailsState.contact?.id === contactId) {
            this._contactDetailsState$.next({
              ...currentDetailsState,
              contact: updatedContact
            });
          }

          // Mise à jour de la liste globale si nécessaire
          this._updateContactInGlobalList(updatedContact);

          // Mise à jour des listes spécifiques
          if (updatedContact.client_id) {
            this._updateContactInClientList(updatedContact.client_id, updatedContact);
          }
          if (updatedContact.supplier_id) {
            this._updateContactInSupplierList(updatedContact.supplier_id, updatedContact);
          }
        }),
        catchError(error => {
          console.error('Erreur modification contact:', error);
          throw error;
        })
      );
  }

  makePrimaryContact(contactId: number): Observable<ContactEntity> {
    return this.makePrimaryContactUseCase.execute(contactId)
      .pipe(
        tap(updatedContact => {
          // Recharger toutes les listes affectées car le statut principal a changé
          const currentState = this._contactsState$.value;
          if (currentState.contacts.length > 0) {
            this.loadContacts(currentState.filters);
          }

          if (updatedContact.client_id) {
            this._refreshClientContactsIfLoaded(updatedContact.client_id);
          }
          if (updatedContact.supplier_id) {
            this._refreshSupplierContactsIfLoaded(updatedContact.supplier_id);
          }

          // Mise à jour des détails
          const currentDetailsState = this._contactDetailsState$.value;
          if (currentDetailsState.contact?.id === contactId) {
            this._contactDetailsState$.next({
              ...currentDetailsState,
              contact: updatedContact
            });
          }
        }),
        catchError(error => {
          console.error('Erreur définition contact principal:', error);
          throw error;
        })
      );
  }

  deleteContact(contactId: number): Observable<boolean> {
    return this.deleteContactUseCase.execute(contactId)
      .pipe(
        tap(success => {
          if (success) {
            // Recharger toutes les listes
            const currentState = this._contactsState$.value;
            if (currentState.contacts.length > 0) {
              this.loadContacts(currentState.filters);
            }

            // Nettoyer les détails si ce contact était affiché
            const currentDetailsState = this._contactDetailsState$.value;
            if (currentDetailsState.contact?.id === contactId) {
              this._contactDetailsState$.next({
                contact: null,
                isLoading: false,
                error: null
              });
            }

            // Recharger les listes spécifiques
            this._clientContactsStates$.forEach((state$, clientId) => {
              const state = state$.value;
              if (state.contacts.some(c => c.id === contactId)) {
                this.loadClientContacts(clientId);
              }
            });

            this._supplierContactsStates$.forEach((state$, supplierId) => {
              const state = state$.value;
              if (state.contacts.some(c => c.id === contactId)) {
                this.loadSupplierContacts(supplierId);
              }
            });
          }
        }),
        catchError(error => {
          console.error('Erreur suppression contact:', error);
          throw error;
        })
      );
  }

  // Méthodes utilitaires privées
  private _getOrCreateClientState(clientId: number): BehaviorSubject<ClientContactsState> {
    if (!this._clientContactsStates$.has(clientId)) {
      this._clientContactsStates$.set(clientId, new BehaviorSubject<ClientContactsState>({
        contacts: [],
        pagination: null,
        clientInfo: null,
        isLoading: false,
        error: null
      }));
    }
    return this._clientContactsStates$.get(clientId)!;
  }

  private _getOrCreateSupplierState(supplierId: number): BehaviorSubject<SupplierContactsState> {
    if (!this._supplierContactsStates$.has(supplierId)) {
      this._supplierContactsStates$.set(supplierId, new BehaviorSubject<SupplierContactsState>({
        contacts: [],
        pagination: null,
        supplierInfo: null,
        isLoading: false,
        error: null
      }));
    }
    return this._supplierContactsStates$.get(supplierId)!;
  }

  private _refreshClientContactsIfLoaded(clientId: number): void {
    if (this._clientContactsStates$.has(clientId)) {
      const state = this._clientContactsStates$.get(clientId)!.value;
      if (state.contacts.length > 0) {
        this.loadClientContacts(clientId, state.pagination?.current_page || 1);
      }
    }
  }

  private _refreshSupplierContactsIfLoaded(supplierId: number): void {
    if (this._supplierContactsStates$.has(supplierId)) {
      const state = this._supplierContactsStates$.get(supplierId)!.value;
      if (state.contacts.length > 0) {
        this.loadSupplierContacts(supplierId, state.pagination?.current_page || 1);
      }
    }
  }

  private _updateContactInGlobalList(updatedContact: ContactEntity): void {
    const currentState = this._contactsState$.value;
    const updatedContacts = currentState.contacts.map(contact =>
      contact.id === updatedContact.id ? updatedContact : contact
    );

    if (updatedContacts !== currentState.contacts) {
      this._contactsState$.next({
        ...currentState,
        contacts: updatedContacts
      });
    }
  }

  private _updateContactInClientList(clientId: number, updatedContact: ContactEntity): void {
    const state$ = this._clientContactsStates$.get(clientId);
    if (state$) {
      const currentState = state$.value;
      const updatedContacts = currentState.contacts.map(contact =>
        contact.id === updatedContact.id ? updatedContact : contact
      );

      state$.next({
        ...currentState,
        contacts: updatedContacts
      });
    }
  }

  private _updateContactInSupplierList(supplierId: number, updatedContact: ContactEntity): void {
    const state$ = this._supplierContactsStates$.get(supplierId);
    if (state$) {
      const currentState = state$.value;
      const updatedContacts = currentState.contacts.map(contact =>
        contact.id === updatedContact.id ? updatedContact : contact
      );

      state$.next({
        ...currentState,
        contacts: updatedContacts
      });
    }
  }

  // Méthodes de nettoyage
  clearContactDetails(): void {
    this._contactDetailsState$.next({
      contact: null,
      isLoading: false,
      error: null
    });
  }

  clearClientContactsCache(clientId: number): void {
    this._clientContactsStates$.delete(clientId);
  }

  clearSupplierContactsCache(supplierId: number): void {
    this._supplierContactsStates$.delete(supplierId);
  }

  clearAllCache(): void {
    this._contactsState$.next({
      contacts: [],
      pagination: null,
      filters: { page: 1, per_page: 15 },
      isLoading: false,
      error: null
    });
    this._clientContactsStates$.clear();
    this._supplierContactsStates$.clear();
    this.clearContactDetails();
  }
}