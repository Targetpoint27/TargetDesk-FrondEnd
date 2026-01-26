/**
 * Supplier Facade
 * Manages supplier state and coordinates use case execution
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, catchError, finalize, of, tap, combineLatest, switchMap, throwError } from 'rxjs';

import { SupplierEntity } from '../../../domain/entities/supplier.entity';
import { PaginationResult } from '../../../domain/repositories/supplier.repository';
import { AppError } from '../../../core/error/error.service';
import { MessageService } from '../../../shared/services/message.service';

// Use cases
import {
  CreateSupplierUseCase,
  GetSuppliersUseCase,
  UpdateSupplierUseCase,
  DeleteSupplierUseCase
} from '../../../domain/use-cases/supplier';
import { GetSuppliersParams } from '../../../domain/use-cases/supplier/get-suppliers.use-case';
import { CreateSupplierRequest, UpdateSupplierRequest } from '../../../domain/models/supplier.models';

// State interfaces
export interface SuppliersState {
  suppliers: SupplierEntity[];
  currentSupplier: SupplierEntity | null;
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
    relationType?: 'fournisseur' | 'client_et_fournisseur';
    sector?: string;
    page: number;
    perPage: number;
  };
}

const initialState: SuppliersState = {
  suppliers: [],
  currentSupplier: null,
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
export class SupplierFacade {
  private readonly state$ = new BehaviorSubject<SuppliersState>(initialState);

  constructor(
    private createSupplierUseCase: CreateSupplierUseCase,
    private getSuppliersUseCase: GetSuppliersUseCase,
    private updateSupplierUseCase: UpdateSupplierUseCase,
    private deleteSupplierUseCase: DeleteSupplierUseCase,
    private messageService: MessageService
  ) {}

  // State selectors
  get suppliers$(): Observable<SupplierEntity[]> {
    return this.state$.pipe(map(state => state.suppliers));
  }

  get currentSupplier$(): Observable<SupplierEntity | null> {
    return this.state$.pipe(map(state => state.currentSupplier));
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

  get pagination$(): Observable<SuppliersState['pagination']> {
    return this.state$.pipe(map(state => state.pagination));
  }

  get filters$(): Observable<SuppliersState['filters']> {
    return this.state$.pipe(map(state => state.filters));
  }

  get hasSuppliers$(): Observable<boolean> {
    return this.state$.pipe(map(state => state.suppliers.length > 0));
  }

  get isOperating$(): Observable<boolean> {
    return this.state$.pipe(
      map(state => state.isLoading || state.isCreating || state.isUpdating || state.isDeleting)
    );
  }

  // Actions
  loadSuppliers(params?: Partial<GetSuppliersParams>): Observable<PaginationResult<SupplierEntity>> {
    this.updateState({ isLoading: true, error: null });

    const loadParams: GetSuppliersParams = {
      ...this.state$.value.filters,
      ...params
    };

    return this.getSuppliersUseCase.execute(loadParams).pipe(
      tap(result => {
        if (result.success && result.data) {
          this.updateState({
            suppliers: result.data.items,
            pagination: result.data.pagination,
            filters: { ...this.state$.value.filters, ...params },
            isLoading: false,
            error: null
          });
        } else {
          const error = new AppError('LOAD_SUPPLIERS_ERROR', result.error || 'Erreur lors du chargement des fournisseurs', result.error || 'Erreur lors du chargement des fournisseurs');
          this.updateState({
            isLoading: false,
            error
          });
        }
      }),
      map(result => result.data!),
      catchError(error => {
        const appError = error instanceof AppError ? error : new AppError('LOAD_SUPPLIERS_ERROR', 'Erreur inattendue lors du chargement des fournisseurs', 'Erreur inattendue lors du chargement des fournisseurs');
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

  createSupplier(supplierData: CreateSupplierRequest, userId: string): Observable<SupplierEntity> {
    this.updateState({ isCreating: true, error: null });

    return this.createSupplierUseCase.execute(supplierData, userId).pipe(
      switchMap(result => {
        if (result.success && result.data) {
          // Add new supplier to the beginning of the list
          const updatedSuppliers = [result.data, ...this.state$.value.suppliers];

          this.updateState({
            suppliers: updatedSuppliers,
            currentSupplier: result.data,
            isCreating: false,
            error: null
          });

          return of(result.data);
        } else {
          const error = new AppError('CREATE_SUPPLIER_ERROR', result.error || 'Erreur lors de la création du fournisseur', result.error || 'Erreur lors de la création du fournisseur', result.validationErrors);
          this.updateState({
            isCreating: false,
            error
          });

          return throwError(() => error);
        }
      }),
      catchError(error => {
        const appError = error instanceof AppError ? error : new AppError('CREATE_SUPPLIER_ERROR', 'Erreur inattendue lors de la création du fournisseur', 'Erreur inattendue lors de la création du fournisseur');
        this.updateState({
          isCreating: false,
          error: appError
        });
        throw appError;
      })
    );
  }

  updateSupplier(supplierId: number, updateData: UpdateSupplierRequest, userId: string): Observable<SupplierEntity> {
    this.updateState({ isUpdating: true, error: null });

    return this.updateSupplierUseCase.execute(supplierId, updateData, userId).pipe(
      tap(result => {
        if (result.success && result.data) {
          // Update supplier in the list
          const updatedSuppliers = this.state$.value.suppliers.map(supplier =>
            supplier.id === supplierId ? result.data! : supplier
          );

          this.updateState({
            suppliers: updatedSuppliers,
            currentSupplier: result.data,
            isUpdating: false,
            error: null
          });

          // Success message handled at component level
        } else {
          const error = new AppError('UPDATE_SUPPLIER_ERROR', result.error || 'Erreur lors de la mise à jour du fournisseur', result.error || 'Erreur lors de la mise à jour du fournisseur', result.validationErrors);
          this.updateState({
            isUpdating: false,
            error
          });

          if (result.validationErrors) {
            // Error message handled at component level
          } else {
            // Error message handled at component level
          }
        }
      }),
      map(result => result.data!),
      catchError(error => {
        const appError = error instanceof AppError ? error : new AppError('UPDATE_SUPPLIER_ERROR', 'Erreur inattendue lors de la mise à jour du fournisseur', 'Erreur inattendue lors de la mise à jour du fournisseur');
        this.updateState({
          isUpdating: false,
          error: appError
        });
        // Error message handled at component level
        throw appError;
      })
    );
  }

  deleteSupplier(supplierId: number, userId: string): Observable<void> {
    this.updateState({ isDeleting: true, error: null });

    return this.deleteSupplierUseCase.execute(supplierId, userId).pipe(
      tap(result => {
        if (result.success) {
          // Remove supplier from the list
          const updatedSuppliers = this.state$.value.suppliers.filter(supplier => supplier.id !== supplierId);

          this.updateState({
            suppliers: updatedSuppliers,
            currentSupplier: this.state$.value.currentSupplier?.id === supplierId ? null : this.state$.value.currentSupplier,
            isDeleting: false,
            error: null
          });

          // Success message handled at component level
        } else {
          const error = new AppError('DELETE_SUPPLIER_ERROR', result.error || 'Erreur lors de la suppression du fournisseur', result.error || 'Erreur lors de la suppression du fournisseur');
          this.updateState({
            isDeleting: false,
            error
          });
          this.messageService.showError(error.message);
        }
      }),
      map(() => undefined),
      catchError(error => {
        const appError = error instanceof AppError ? error : new AppError('DELETE_SUPPLIER_ERROR', 'Erreur inattendue lors de la suppression du fournisseur', 'Erreur inattendue lors de la suppression du fournisseur');
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
    this.loadSuppliers({ search, page: 1 }).subscribe();
  }

  setTypeFilter(type?: 'particulier' | 'entreprise'): void {
    this.updateState({
      filters: { ...this.state$.value.filters, type, page: 1 }
    });
    this.loadSuppliers({ type, page: 1 }).subscribe();
  }

  setRelationTypeFilter(relationType?: 'fournisseur' | 'client_et_fournisseur'): void {
    this.updateState({
      filters: { ...this.state$.value.filters, relationType, page: 1 }
    });
    this.loadSuppliers({ relationType, page: 1 }).subscribe();
  }

  setSectorFilter(sector?: string): void {
    this.updateState({
      filters: { ...this.state$.value.filters, sector, page: 1 }
    });
    this.loadSuppliers({ sector, page: 1 }).subscribe();
  }

  setPage(page: number): void {
    this.updateState({
      filters: { ...this.state$.value.filters, page }
    });
    this.loadSuppliers({ page }).subscribe();
  }

  setCurrentSupplier(supplier: SupplierEntity | null): void {
    this.updateState({ currentSupplier: supplier });
  }

  clearError(): void {
    this.updateState({ error: null });
  }

  reset(): void {
    this.state$.next(initialState);
  }

  // Private methods
  private updateState(partialState: Partial<SuppliersState>): void {
    const currentState = this.state$.value;
    const newState = { ...currentState, ...partialState };
    this.state$.next(newState);
  }

  // Debug method (development only)
  getState(): SuppliersState {
    return this.state$.value;
  }
}