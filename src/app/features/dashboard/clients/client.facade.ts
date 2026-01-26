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

// Use cases
import {
  CreateClientUseCase,
  GetClientsUseCase,
  UpdateClientUseCase,
  DeleteClientUseCase
} from '../../../domain/use-cases/client';
import { GetClientsParams } from '../../../domain/use-cases/client/get-clients.use-case';
import { CreateClientRequest, UpdateClientRequest } from '../../../domain/models/client.models';

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
    private updateClientUseCase: UpdateClientUseCase,
    private deleteClientUseCase: DeleteClientUseCase,
    private messageService: MessageService
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

  // Actions
  loadClients(params?: Partial<GetClientsParams>): Observable<PaginationResult<ClientEntity>> {
    this.updateState({ isLoading: true, error: null });

    const loadParams: GetClientsParams = {
      ...this.state$.value.filters,
      ...params
    };

    return this.getClientsUseCase.execute(loadParams).pipe(
      tap(result => {
        if (result.success && result.data) {
          this.updateState({
            clients: result.data.items,
            pagination: result.data.pagination,
            filters: { ...this.state$.value.filters, ...params },
            isLoading: false,
            error: null
          });
        } else {
          const error = new AppError('LOAD_CLIENTS_ERROR', result.error || 'Erreur lors du chargement des clients', result.error || 'Erreur lors du chargement des clients');
          this.updateState({
            isLoading: false,
            error
          });
        }
      }),
      map(result => result.data!),
      catchError(error => {
        const appError = error instanceof AppError ? error : new AppError('LOAD_CLIENTS_ERROR', 'Erreur inattendue lors du chargement des clients', 'Erreur inattendue lors du chargement des clients');
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
          const error = new AppError('CREATE_CLIENT_ERROR', result.error || 'Erreur lors de la création du client', result.error || 'Erreur lors de la création du client', result.validationErrors);
          this.updateState({
            isCreating: false,
            error
          });

          return throwError(() => error);
        }
      }),
      catchError(error => {
        const appError = error instanceof AppError ? error : new AppError('CREATE_CLIENT_ERROR', 'Erreur inattendue lors de la création du client', 'Erreur inattendue lors de la création du client');
        this.updateState({
          isCreating: false,
          error: appError
        });
        throw appError;
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
          const error = new AppError('UPDATE_CLIENT_ERROR', result.error || 'Erreur lors de la mise à jour du client', result.error || 'Erreur lors de la mise à jour du client', result.validationErrors);
          this.updateState({
            isUpdating: false,
            error
          });

          // Error handling is done at component level
          // Don't show messages here to avoid duplicates
        }
      }),
      map(result => result.data!),
      catchError(error => {
        const appError = error instanceof AppError ? error : new AppError('UPDATE_CLIENT_ERROR', 'Erreur inattendue lors de la mise à jour du client', 'Erreur inattendue lors de la mise à jour du client');
        this.updateState({
          isUpdating: false,
          error: appError
        });
        // Error message handled at component level
        throw appError;
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
          const error = new AppError('DELETE_CLIENT_ERROR', result.error || 'Erreur lors de la suppression du client', result.error || 'Erreur lors de la suppression du client');
          this.updateState({
            isDeleting: false,
            error
          });
          // Error message handled at component level
        }
      }),
      map(() => undefined),
      catchError(error => {
        const appError = error instanceof AppError ? error : new AppError('DELETE_CLIENT_ERROR', 'Erreur inattendue lors de la suppression du client', 'Erreur inattendue lors de la suppression du client');
        this.updateState({
          isDeleting: false,
          error: appError
        });
        // Error message handled at component level
        throw appError;
      })
    );
  }

  // Filter and search actions
  setSearch(search: string): void {
    this.updateState({
      filters: { ...this.state$.value.filters, search, page: 1 }
    });
    this.loadClients({ search, page: 1 }).subscribe();
  }

  setTypeFilter(type?: 'particulier' | 'entreprise'): void {
    this.updateState({
      filters: { ...this.state$.value.filters, type, page: 1 }
    });
    this.loadClients({ type, page: 1 }).subscribe();
  }

  setPage(page: number): void {
    this.updateState({
      filters: { ...this.state$.value.filters, page }
    });
    this.loadClients({ page }).subscribe();
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