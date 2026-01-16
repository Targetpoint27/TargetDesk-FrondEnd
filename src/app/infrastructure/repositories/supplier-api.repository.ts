/**
 * Supplier API Repository Implementation
 * Implements SupplierRepository using HTTP API calls
 */

import { Injectable } from '@angular/core';
import { Observable, map, catchError, throwError, of } from 'rxjs';
import { HttpParams, HttpErrorResponse } from '@angular/common/http';

import { SupplierRepository, PaginationParams, PaginationResult, CreateSupplierRequest, UpdateSupplierRequest } from '../../domain/repositories/supplier.repository';
import { SupplierEntity } from '../../domain/entities/supplier.entity';
import { ApiService } from '../../core/api/api.service';
import { SupplierMapper } from '../mappers/supplier.mapper';
import {
  SupplierApiResponse,
  SupplierListApiResponse,
  SupplierDeleteApiResponse,
  SupplierApiError,
  SupplierApiPaginationParams,
  SupplierSearchApiParams,
  CreateSupplierApiRequest,
  UpdateSupplierApiRequest
} from '../api/supplier-api.models';
import { AppError } from '../../core/error/error.service';

@Injectable({
  providedIn: 'root'
})
export class SupplierApiRepository extends SupplierRepository {
  private readonly endpoint = 'suppliers';

  constructor(private apiService: ApiService) {
    super();
  }

  create(supplierData: CreateSupplierRequest): Observable<SupplierEntity> {
    const apiRequest = SupplierMapper.toCreateApiRequest(supplierData);

    return this.apiService.post<SupplierApiResponse>(`${this.endpoint}`, apiRequest).pipe(
      map(response => {
        return SupplierMapper.fromApiResponse(response.data);
      }),
      catchError(error => this.handleError(error, 'Erreur lors de la création du fournisseur'))
    );
  }

  getAll(params?: PaginationParams): Observable<PaginationResult<SupplierEntity>> {
    const queryParams = this.buildPaginationParams(params);

    return this.apiService.get<SupplierListApiResponse>(`${this.endpoint}`, { params: queryParams }).pipe(
      map(response => {
        return SupplierMapper.toPaginationResult(response);
      }),
      catchError(error => this.handleError(error, 'Erreur lors de la récupération des fournisseurs'))
    );
  }

  getById(id: number): Observable<SupplierEntity | null> {
    return this.apiService.get<SupplierApiResponse>(`${this.endpoint}/${id}`).pipe(
      map(response => {
        return SupplierMapper.fromApiResponse(response.data);
      }),
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          return of(null);
        }
        return this.handleError(error, 'Erreur lors de la récupération du fournisseur');
      })
    );
  }

  getBySupplierId(supplierId: string): Observable<SupplierEntity | null> {
    // Cette méthode n'est pas supportée par l'API
    // On peut rechercher dans la liste si nécessaire
    return this.getAll().pipe(
      map(result => {
        const supplier = result.items.find(s => s.supplierId === supplierId);
        return supplier || null;
      })
    );
  }

  update(id: number, updateData: UpdateSupplierRequest): Observable<SupplierEntity> {
    const apiRequest = SupplierMapper.toUpdateApiRequest(updateData);

    return this.apiService.put<SupplierApiResponse>(`${this.endpoint}/${id}`, apiRequest).pipe(
      map(response => {
        return SupplierMapper.fromApiResponse(response.data);
      }),
      catchError(error => this.handleError(error, 'Erreur lors de la mise à jour du fournisseur'))
    );
  }

  delete(id: number): Observable<void> {
    return this.apiService.delete<SupplierDeleteApiResponse>(`${this.endpoint}/${id}`).pipe(
      map(response => {
        if (response && response.success) {
          return undefined;
        }
        throw new Error('Échec de la suppression du fournisseur');
      }),
      catchError(error => this.handleError(error, 'Erreur lors de la suppression du fournisseur'))
    );
  }

  isEmailUnique(email: string, excludeId?: number): Observable<boolean> {
    // L'API ne fournit pas d'endpoint de vérification d'unicité
    // La validation se fait au niveau du backend lors de la création/modification
    // On retourne true ici et on laisse le backend valider
    return of(true);
  }

  isSiretUnique(siret: string, excludeId?: number): Observable<boolean> {
    // L'API ne fournit pas d'endpoint de vérification d'unicité
    // La validation se fait au niveau du backend lors de la création/modification
    // On retourne true ici et on laisse le backend valider
    return of(true);
  }

  search(query: string, params?: PaginationParams): Observable<PaginationResult<SupplierEntity>> {
    // Utiliser l'endpoint de recherche avec le paramètre q
    const queryParams = this.buildSearchParams(params, query);

    return this.apiService.get<SupplierListApiResponse>(`${this.endpoint}`, { params: queryParams }).pipe(
      map(response => {
        return SupplierMapper.toPaginationResult(response);
      }),
      catchError(error => this.handleError(error, 'Erreur lors de la recherche de fournisseurs'))
    );
  }

  getByRelationType(relationType: 'fournisseur' | 'client_et_fournisseur', params?: PaginationParams): Observable<PaginationResult<SupplierEntity>> {
    const queryParams = this.buildSearchParams(params, undefined, { relation_type: relationType });

    return this.apiService.get<SupplierListApiResponse>(`${this.endpoint}`, { params: queryParams }).pipe(
      map(response => {
        return SupplierMapper.toPaginationResult(response);
      }),
      catchError(error => this.handleError(error, 'Erreur lors de la récupération des fournisseurs par type de relation'))
    );
  }

  getByType(type: 'particulier' | 'entreprise', params?: PaginationParams): Observable<PaginationResult<SupplierEntity>> {
    const queryParams = this.buildSearchParams(params, undefined, { type });

    return this.apiService.get<SupplierListApiResponse>(`${this.endpoint}`, { params: queryParams }).pipe(
      map(response => {
        return SupplierMapper.toPaginationResult(response);
      }),
      catchError(error => this.handleError(error, 'Erreur lors de la récupération des fournisseurs par type'))
    );
  }

  getBySector(sector: string, params?: PaginationParams): Observable<PaginationResult<SupplierEntity>> {
    const queryParams = this.buildSearchParams(params, undefined, { sector });

    return this.apiService.get<SupplierListApiResponse>(`${this.endpoint}`, { params: queryParams }).pipe(
      map(response => {
        return SupplierMapper.toPaginationResult(response);
      }),
      catchError(error => this.handleError(error, 'Erreur lors de la récupération des fournisseurs par secteur'))
    );
  }

  // Private helper methods
  private buildPaginationParams(params?: PaginationParams): HttpParams {
    let httpParams = new HttpParams();

    if (params?.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }

    if (params?.perPage) {
      httpParams = httpParams.set('per_page', params.perPage.toString());
    }

    return httpParams;
  }

  private buildSearchParams(
    paginationParams?: PaginationParams,
    query?: string,
    filters?: { relation_type?: string; type?: string; sector?: string }
  ): HttpParams {
    let httpParams = this.buildPaginationParams(paginationParams);

    if (query) {
      httpParams = httpParams.set('q', query);
    }

    if (filters?.relation_type) {
      httpParams = httpParams.set('relation_type', filters.relation_type);
    }

    if (filters?.type) {
      httpParams = httpParams.set('type', filters.type);
    }

    if (filters?.sector) {
      httpParams = httpParams.set('sector', filters.sector);
    }

    return httpParams;
  }

  private handleError(error: any, defaultMessage: string): Observable<never> {
    console.error('SupplierApiRepository Error:', error);

    if (error instanceof HttpErrorResponse) {
      // Handle API validation errors (422)
      if (error.status === 422 && error.error) {
        const apiError = error.error as SupplierApiError;
        if (apiError.errors) {
          const message = Object.values(apiError.errors).flat().join(', ');
          return throwError(() => new AppError('VALIDATION_ERROR', message, message, apiError.errors));
        }
        return throwError(() => new AppError('VALIDATION_ERROR', apiError.message || defaultMessage, apiError.message || defaultMessage));
      }

      // Handle other HTTP errors
      if (error.status === 401) {
        return throwError(() => new AppError('UNAUTHORIZED', 'Session expirée, veuillez vous reconnecter', 'Session expirée, veuillez vous reconnecter'));
      }

      if (error.status === 403) {
        return throwError(() => new AppError('FORBIDDEN', 'Vous n\'avez pas les droits pour effectuer cette action', 'Vous n\'avez pas les droits pour effectuer cette action'));
      }

      if (error.status === 404) {
        return throwError(() => new AppError('NOT_FOUND', 'Fournisseur non trouvé', 'Fournisseur non trouvé'));
      }

      if (error.status >= 500) {
        return throwError(() => new AppError('SERVER_ERROR', 'Erreur serveur, veuillez réessayer plus tard', 'Erreur serveur, veuillez réessayer plus tard'));
      }
    }

    // Handle network errors or unexpected errors
    return throwError(() => new AppError('UNKNOWN_ERROR', defaultMessage, defaultMessage));
  }
}