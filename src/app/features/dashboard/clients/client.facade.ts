/**
 * Client Facade
 * Manages client state and coordinates use case execution
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, catchError, finalize, of, tap, combineLatest, switchMap, throwError } from 'rxjs';

import { ClientEntity } from '../../../domain/entities/client.entity';
import { PaginationResult } from '../../../domain/repositories/client.repository';
import { AppError } from '../../../core/error/error.service';
import { MessageService } from '../../../shared/services/message.service';
import { SearchService } from '../../../shared/services/search.service';

// Use cases
import {
  CreateClientUseCase,
  GetClientsUseCase,
  GetClientByIdUseCase,
  UpdateClientUseCase,
  DeleteClientUseCase
} from '../../../domain/use-cases/client';
import { GetClientsParams } from '../../../domain/use-cases/client/get-clients.use-case';
import { CreateClientRequest, UpdateClientRequest } from '../../../domain/models/client.models';
import { FilterOptions, ClientSearchResult } from '../../../shared/interfaces/search.interface';

// State interfaces
export interface ClientsState {
  clients: ClientEntity[];
  currentClient: ClientEntity | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: AppError | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    perPage: number;
  } | null;
  filters: {
    search?: string;
    type?: 'particulier' | 'entreprise';
    page: number;
    perPage: number;
  };
}

const initialState: ClientsState = {
  clients: [],
  currentClient: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  pagination: null,
  filters: {
    page: 1,
    perPage: 15
  }
};

@Injectable({
  providedIn: 'root'
})
export class ClientFacade {
  private readonly state$ = new BehaviorSubject<ClientsState>(initialState);

  constructor(
    private createClientUseCase: CreateClientUseCase,
    private getClientsUseCase: GetClientsUseCase,
    private getClientByIdUseCase: GetClientByIdUseCase,
    private updateClientUseCase: UpdateClientUseCase,
    private deleteClientUseCase: DeleteClientUseCase,
    private messageService: MessageService,
    private searchService: SearchService
  ) {}

  // State selectors
  get clients$(): Observable<ClientEntity[]> {
    return this.state$.pipe(map(state => state.clients));
  }

  get currentClient$(): Observable<ClientEntity | null> {
    return this.state$.pipe(map(state => state.currentClient));
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

  get pagination$(): Observable<ClientsState['pagination']> {
    return this.state$.pipe(map(state => state.pagination));
  }

  get filters$(): Observable<ClientsState['filters']> {
    return this.state$.pipe(map(state => state.filters));
  }

  get hasClients$(): Observable<boolean> {
    return this.state$.pipe(map(state => state.clients.length > 0));
  }

  get isOperating$(): Observable<boolean> {
    return this.state$.pipe(
      map(state => state.isLoading || state.isCreating || state.isUpdating || state.isDeleting)
    );
  }

  // Actions - NOUVELLES MÉTHODES AVEC API DE RECHERCHE
  getClientById(clientId: number): Observable<ClientEntity | null> {
    return this.getClientByIdUseCase.execute(clientId);
  }

  loadClients(params?: Partial<GetClientsParams>): Observable<PaginationResult<ClientEntity>> {
    this.updateState({ isLoading: true, error: null });

    // Convertir les paramètres vers le nouveau format API de recherche
    const filters: FilterOptions = {
      search: params?.search || this.state$.value.filters.search,
      type: params?.type || this.state$.value.filters.type,
      page: params?.page || this.state$.value.filters.page,
      per_page: params?.perPage || this.state$.value.filters.perPage,
      sort_by: 'name',
      sort_order: 'asc'
    };

    // Utiliser le nouveau service de recherche au lieu des anciens use cases
    return this.searchService.loadClientsWithAdvancedFilters(filters).pipe(
      tap(result => {
        // Convertir les résultats de recherche vers les entités clients
        const clientEntities = result.clients.map(client => this.convertSearchResultToClientEntity(client));

        this.updateState({
          clients: clientEntities,
          pagination: {
            currentPage: result.pagination.current_page,
            totalPages: result.pagination.total_pages,
            totalItems: result.pagination.total_items,
            perPage: result.pagination.per_page
          },
          filters: {
            search: filters.search,
            type: filters.type,
            page: filters.page || 1,
            perPage: filters.per_page || 15
          },
          isLoading: false,
          error: null
        });
      }),
      map(result => ({
        items: result.clients.map(client => this.convertSearchResultToClientEntity(client)),
        pagination: {
          currentPage: result.pagination.current_page,
          totalPages: result.pagination.total_pages,
          totalItems: result.pagination.total_items,
          perPage: result.pagination.per_page
        }
      })),
      catchError(error => {
        const appError = error instanceof AppError ? error : new AppError('LOAD_CLIENTS_ERROR', 'Erreur lors du chargement des clients', error.message || 'Erreur inattendue');
        this.updateState({
          isLoading: false,
          error: appError
        });
        return of({
          items: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            perPage: 15
          }
        });
      })
    );
  }

  // Méthode de conversion des résultats de recherche vers ClientEntity
  private convertSearchResultToClientEntity(searchResult: ClientSearchResult): ClientEntity {
    return ClientEntity.create({
      id: searchResult.id,
      clientId: searchResult.client_id,
      name: searchResult.name,
      type: searchResult.type,
      email: searchResult.email,
      phone: searchResult.phone,
      address: searchResult.address,
      siret: searchResult.siret,
      sector: searchResult.sector,
      website: searchResult.website,
      notes: searchResult.notes,
      isActive: searchResult.is_active,
      createdBy: searchResult.created_by,
      createdAt: new Date(searchResult.created_at),
      updatedAt: new Date(searchResult.updated_at),
      creator: searchResult.creator,
      categories_count: searchResult.categories_count,
      categories_summary: searchResult.categories_summary ?
        searchResult.categories_summary.map(group => ({
          type: group.type as any, // Type conversion for CategoryGroup -> CategorySummary
          count: group.count,
          categories: group.categories
        })) : [],
      categories: [] // Les catégories complètes ne sont pas retournées par l'API de recherche
    });
  }

  createClient(clientData: CreateClientRequest, userId: string): Observable<ClientEntity> {
    this.updateState({ isCreating: true, error: null });

    return this.createClientUseCase.execute(clientData, userId).pipe(
      switchMap(result => {
        if (result.success && result.data) {
          // Add new client to the beginning of the list
          const updatedClients = [result.data, ...this.state$.value.clients];

          this.updateState({
            clients: updatedClients,
            currentClient: result.data,
            isCreating: false,
            error: null
          });

          return of(result.data);
        } else {
          // Utiliser les messages d'erreur exacts du serveur
          const errorMessage = result.error || 'Erreur lors de la création du client';
          const error = new AppError('CREATE_CLIENT_ERROR', errorMessage, errorMessage, result.validationErrors);
          this.updateState({
            isCreating: false,
            error
          });

          this.messageService.showError(errorMessage);
          return throwError(() => error);
        }
      }),
      catchError(error => {
        console.error('Error creating client:', error);

        this.updateState({
          isCreating: false,
          error: error
        });

        // L'ErrorService a déjà traité l'erreur HTTP et créé l'AppError avec le bon message
        // Afficher directement le message de l'erreur traitée
        this.messageService.showError(error.userMessage || error.message || 'Erreur lors de la création du client');

        throw error;
      })
    );
  }

  updateClient(clientId: number, updateData: UpdateClientRequest, userId: string): Observable<ClientEntity> {
    this.updateState({ isUpdating: true, error: null });

    return this.updateClientUseCase.execute(clientId, updateData, userId).pipe(
      tap(result => {
        if (result.success && result.data) {
          // Update client in the list
          const updatedClients = this.state$.value.clients.map(client =>
            client.id === clientId ? result.data! : client
          );

          this.updateState({
            clients: updatedClients,
            currentClient: result.data,
            isUpdating: false,
            error: null
          });

          // Success message handled at component level
        } else {
          // Utiliser les messages d'erreur exacts du serveur
          const errorMessage = result.error || 'Erreur lors de la mise à jour du client';
          const error = new AppError('UPDATE_CLIENT_ERROR', errorMessage, errorMessage, result.validationErrors);
          this.updateState({
            isUpdating: false,
            error
          });

          this.messageService.showError(errorMessage);
        }
      }),
      map(result => result.data!),
      catchError(error => {
        console.error('Error updating client:', error);

        this.updateState({
          isUpdating: false,
          error: error
        });

        // L'ErrorService a déjà traité l'erreur HTTP et créé l'AppError avec le bon message
        this.messageService.showError(error.userMessage || error.message || 'Erreur lors de la mise à jour du client');
        throw error;
      })
    );
  }

  deleteClient(clientId: number, userId: string): Observable<void> {
    this.updateState({ isDeleting: true, error: null });

    return this.deleteClientUseCase.execute(clientId, userId).pipe(
      tap(result => {
        if (result.success) {
          // Remove client from the list
          const updatedClients = this.state$.value.clients.filter(client => client.id !== clientId);

          this.updateState({
            clients: updatedClients,
            currentClient: this.state$.value.currentClient?.id === clientId ? null : this.state$.value.currentClient,
            isDeleting: false,
            error: null
          });

          // Success message handled at component level
        } else {
          // Utiliser les messages d'erreur exacts du serveur
          const errorMessage = result.error || 'Erreur lors de la suppression du client';
          const error = new AppError('DELETE_CLIENT_ERROR', errorMessage, errorMessage);
          this.updateState({
            isDeleting: false,
            error
          });
          this.messageService.showError(errorMessage);
        }
      }),
      map(() => undefined),
      catchError(error => {
        console.error('Error deleting client:', error);

        this.updateState({
          isDeleting: false,
          error: error
        });

        // L'ErrorService a déjà traité l'erreur HTTP et créé l'AppError avec le bon message
        this.messageService.showError(error.userMessage || error.message || 'Erreur lors de la suppression du client');
        throw error;
      })
    );
  }

  // NOUVELLES MÉTHODES DE RECHERCHE ET FILTRAGE

  /**
   * Recherche rapide pour autocomplétion
   */
  quickSearchClients(query: string): Observable<import('../../../shared/interfaces/search.interface').SearchResult[]> {
    return this.searchService.searchClients(query, { limit: 10, fuzzy: true });
  }

  /**
   * Recherche complète avec filtres avancés
   */
  performCompleteClientSearch(query: string, additionalFilters?: FilterOptions): Observable<{
    quickResults: import('../../../shared/interfaces/search.interface').SearchResult[];
    filteredResults: {
      entities: ClientSearchResult[];
      pagination: any;
      total: number;
    };
  }> {
    return this.searchService.performCompleteSearch('clients', query, additionalFilters).pipe(
      map(result => ({
        quickResults: result.quickResults,
        filteredResults: {
          entities: result.filteredResults.entities as ClientSearchResult[],
          pagination: result.filteredResults.pagination,
          total: result.filteredResults.total
        }
      }))
    );
  }

  // Filter and search actions - MISES À JOUR POUR UTILISER LA NOUVELLE API
  setSearch(search: string): void {
    this.updateState({
      filters: { ...this.state$.value.filters, search, page: 1 }
    });
    // Utiliser la nouvelle API au lieu de l'ancienne
    this.loadClients({ search, page: 1 }).subscribe();
  }

  setTypeFilter(type?: 'particulier' | 'entreprise'): void {
    this.updateState({
      filters: { ...this.state$.value.filters, type, page: 1 }
    });
    // Utiliser la nouvelle API au lieu de l'ancienne
    this.loadClients({ type, page: 1 }).subscribe();
  }

  setPage(page: number): void {
    this.updateState({
      filters: { ...this.state$.value.filters, page }
    });
    // Utiliser la nouvelle API
    this.loadClients({ page }).subscribe();
  }

  /**
   * Méthode améliorée pour définir plusieurs filtres à la fois
   */
  setFilters(filters: Partial<FilterOptions>): void {
    const newFilters = {
      ...this.state$.value.filters,
      ...filters,
      page: 1 // Reset page when filters change
    };

    this.updateState({ filters: newFilters });
    this.loadClients(newFilters).subscribe();
  }

  /**
   * Méthode pour effectuer une recherche avec highlighting
   */
  searchWithHighlighting(query: string): Observable<{
    clients: ClientEntity[];
    highlightedQuery: string;
    totalFound: number;
  }> {
    if (!query || query.length < 2) {
      return of({
        clients: this.state$.value.clients,
        highlightedQuery: '',
        totalFound: this.state$.value.clients.length
      });
    }

    const filters: FilterOptions = {
      search: query,
      page: 1,
      per_page: 50,
      sort_by: 'name',
      sort_order: 'asc'
    };

    return this.searchService.loadClientsWithAdvancedFilters(filters).pipe(
      map(result => ({
        clients: result.clients.map(client => this.convertSearchResultToClientEntity(client)),
        highlightedQuery: query,
        totalFound: result.total
      }))
    );
  }

  /**
   * Obtenir les suggestions de recherche basées sur l'historique
   */
  getSearchSuggestions(): string[] {
    return this.searchService.getSearchSuggestions('clients');
  }

  /**
   * Effacer l'historique des recherches
   */
  clearSearchHistory(): void {
    this.searchService.clearSearchHistory('clients');
  }

  setCurrentClient(client: ClientEntity | null): void {
    this.updateState({ currentClient: client });
  }

  clearError(): void {
    this.updateState({ error: null });
  }

  reset(): void {
    this.state$.next(initialState);
  }

  // Private methods
  private updateState(partialState: Partial<ClientsState>): void {
    const currentState = this.state$.value;
    const newState = { ...currentState, ...partialState };
    this.state$.next(newState);
  }

  // Debug method (development only)
  getState(): ClientsState {
    return this.state$.value;
  }
}