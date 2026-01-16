/**
 * Client API Repository Implementation
 * Implements ClientRepository using HTTP API calls
 */

import { Injectable } from '@angular/core';
import { Observable, map, catchError, throwError, of } from 'rxjs';
import { HttpParams, HttpErrorResponse } from '@angular/common/http';

import { ClientRepository, PaginationParams, PaginationResult, CreateClientRequest, UpdateClientRequest } from '../../domain/repositories/client.repository';
import { ClientEntity } from '../../domain/entities/client.entity';
import { ApiService } from '../../core/api/api.service';
import { ClientMapper } from '../mappers/client.mapper';
import {
  ClientApiResponse,
  ClientListApiResponse,
  ClientDeleteApiResponse,
  ClientApiError,
  ClientApiPaginationParams,
  ClientSearchApiParams,
  CreateClientApiRequest,
  UpdateClientApiRequest
} from '../api/client-api.models';
import { AppError } from '../../core/error/error.service';

@Injectable({
  providedIn: 'root'
})
export class ClientApiRepository extends ClientRepository {
  private readonly endpoint = 'clients';

  constructor(private apiService: ApiService) {
    super();
  }

  create(clientData: CreateClientRequest): Observable<ClientEntity> {
    const apiRequest = ClientMapper.toCreateApiRequest(clientData);

    return this.apiService.post<ClientApiResponse>(`${this.endpoint}`, apiRequest).pipe(
      map(response => {
        return ClientMapper.fromApiResponse(response);
      }),
      catchError(error => this.handleError(error, 'Erreur lors de la création du client'))
    );
  }

  getAll(params?: PaginationParams): Observable<PaginationResult<ClientEntity>> {
    const queryParams = this.buildPaginationParams(params);

    return this.apiService.get<ClientListApiResponse>(`${this.endpoint}`, { params: queryParams }).pipe(
      map(response => {
        return ClientMapper.toPaginationResult(response);
      }),
      catchError(error => this.handleError(error, 'Erreur lors de la récupération des clients'))
    );
  }

  getById(id: number): Observable<ClientEntity | null> {
    return this.apiService.get<ClientApiResponse>(`${this.endpoint}/${id}`).pipe(
      map(response => {
        return ClientMapper.fromApiResponse(response);
      }),
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          return of(null);
        }
        return this.handleError(error, 'Erreur lors de la récupération du client');
      })
    );
  }

  getByClientId(clientId: string): Observable<ClientEntity | null> {
    // Cette méthode n'est pas supportée par l'API
    // On peut rechercher dans la liste si nécessaire
    return this.getAll().pipe(
      map(result => {
        const client = result.items.find(c => c.clientId === clientId);
        return client || null;
      })
    );
  }

  update(id: number, updateData: UpdateClientRequest): Observable<ClientEntity> {
    const apiRequest = ClientMapper.toUpdateApiRequest(updateData);

    return this.apiService.put<ClientApiResponse>(`${this.endpoint}/${id}`, apiRequest).pipe(
      map(response => {
        return ClientMapper.fromApiResponse(response);
      }),
      catchError(error => this.handleError(error, 'Erreur lors de la mise à jour du client'))
    );
  }

  delete(id: number): Observable<void> {
    return this.apiService.delete<ClientDeleteApiResponse>(`${this.endpoint}/${id}`).pipe(
      map(response => {
        console.log('DELETE response received:', response);

        // Vérifier que la suppression a réussi
        if (response && response.success) {
          console.log('Delete successful:', response.message);
          return undefined;
        }

        console.error('Delete failed - response:', response);
        throw new Error('Échec de la suppression du client');
      }),
      catchError(error => {
        console.error('DELETE request failed:', error);
        return this.handleError(error, 'Erreur lors de la suppression du client');
      })
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

  search(query: string, params?: PaginationParams): Observable<PaginationResult<ClientEntity>> {
    // L'API ne fournit pas d'endpoint de recherche spécifique
    // On utilise la liste normale et on filtre côté client pour l'instant
    return this.getAll(params).pipe(
      map(result => {
        const filteredItems = result.items.filter(client =>
          client.name.toLowerCase().includes(query.toLowerCase()) ||
          client.email.toLowerCase().includes(query.toLowerCase()) ||
          (client.sector && client.sector.toLowerCase().includes(query.toLowerCase()))
        );

        return {
          items: filteredItems,
          pagination: {
            ...result.pagination,
            totalItems: filteredItems.length,
            totalPages: Math.ceil(filteredItems.length / result.pagination.perPage)
          }
        };
      })
    );
  }

  getByCreator(creatorId: number, params?: PaginationParams): Observable<PaginationResult<ClientEntity>> {
    // L'API ne supporte pas le filtrage par créateur dans les paramètres
    // On utilise la liste normale et on filtre côté client
    return this.getAll(params).pipe(
      map(result => {
        const filteredItems = result.items.filter(client =>
          client.createdBy === creatorId
        );

        return {
          items: filteredItems,
          pagination: {
            ...result.pagination,
            totalItems: filteredItems.length,
            totalPages: Math.ceil(filteredItems.length / result.pagination.perPage)
          }
        };
      })
    );
  }

  getByType(type: 'particulier' | 'entreprise', params?: PaginationParams): Observable<PaginationResult<ClientEntity>> {
    // L'API ne supporte pas le filtrage par type dans les paramètres
    // On utilise la liste normale et on filtre côté client
    return this.getAll(params).pipe(
      map(result => {
        const filteredItems = result.items.filter(client =>
          client.type === type
        );

        return {
          items: filteredItems,
          pagination: {
            ...result.pagination,
            totalItems: filteredItems.length,
            totalPages: Math.ceil(filteredItems.length / result.pagination.perPage)
          }
        };
      })
    );
  }

  restore(id: number): Observable<ClientEntity> {
    // L'API ne fournit pas d'endpoint de restauration
    // Une fois supprimé (soft delete), un client ne peut pas être restauré via l'API
    return throwError(() => new AppError('NOT_SUPPORTED', 'La restauration de clients n\'est pas supportée', 'Opération non supportée'));
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


  private handleError(error: any, defaultMessage: string): Observable<never> {
    console.error('ClientApiRepository Error:', error);

    if (error instanceof HttpErrorResponse) {
      // Handle API validation errors (422)
      if (error.status === 422 && error.error) {
        const apiError = error.error as ClientApiError;
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
        return throwError(() => new AppError('NOT_FOUND', 'Client non trouvé', 'Client non trouvé'));
      }

      if (error.status >= 500) {
        return throwError(() => new AppError('SERVER_ERROR', 'Erreur serveur, veuillez réessayer plus tard', 'Erreur serveur, veuillez réessayer plus tard'));
      }
    }

    // Handle network errors or unexpected errors
    return throwError(() => new AppError('UNKNOWN_ERROR', defaultMessage, defaultMessage));
  }
}