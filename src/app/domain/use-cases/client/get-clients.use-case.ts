/**
 * Get Clients Use Case
 * Handles business logic for retrieving client lists
 */

import { Injectable } from '@angular/core';
import { Observable, map, catchError, of, switchMap } from 'rxjs';
import { ClientRepository, PaginationParams, PaginationResult } from '../../repositories/client.repository';
import { ClientEntity } from '../../entities/client.entity';
import { UseCaseResult } from '../../models/client.models';

export interface GetClientsParams extends PaginationParams {
  type?: 'particulier' | 'entreprise';
  createdBy?: number;
  search?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GetClientsUseCase {
  constructor(private clientRepository: ClientRepository) {}

  execute(params?: GetClientsParams): Observable<UseCaseResult<PaginationResult<ClientEntity>>> {
    return this.validateParams(params).pipe(
      switchMap(validatedParams => {
        if (validatedParams.search && validatedParams.search.trim().length > 0) {
          return this.searchClients(validatedParams.search, validatedParams);
        }

        if (validatedParams.type) {
          return this.getClientsByType(validatedParams.type, validatedParams);
        }

        if (validatedParams.createdBy) {
          return this.getClientsByCreator(validatedParams.createdBy, validatedParams);
        }

        return this.getAllClients(validatedParams);
      }),
      map(result => ({
        success: true,
        data: result
      })),
      catchError(error => of({
        success: false,
        error: this.getErrorMessage(error)
      }))
    );
  }

  private validateParams(params?: GetClientsParams): Observable<GetClientsParams> {
    const validated: GetClientsParams = {
      page: Math.max(1, params?.page ?? 1),
      perPage: Math.min(100, Math.max(1, params?.perPage ?? 15)),
      type: params?.type,
      createdBy: params?.createdBy,
      search: params?.search?.trim()
    };

    return of(validated);
  }

  private getAllClients(params: GetClientsParams): Observable<PaginationResult<ClientEntity>> {
    return this.clientRepository.getAll({
      page: params.page,
      perPage: params.perPage
    });
  }

  private searchClients(query: string, params: GetClientsParams): Observable<PaginationResult<ClientEntity>> {
    return this.clientRepository.search(query, {
      page: params.page,
      perPage: params.perPage
    });
  }

  private getClientsByType(
    type: 'particulier' | 'entreprise',
    params: GetClientsParams
  ): Observable<PaginationResult<ClientEntity>> {
    return this.clientRepository.getByType(type, {
      page: params.page,
      perPage: params.perPage
    });
  }

  private getClientsByCreator(
    creatorId: number,
    params: GetClientsParams
  ): Observable<PaginationResult<ClientEntity>> {
    return this.clientRepository.getByCreator(creatorId, {
      page: params.page,
      perPage: params.perPage
    });
  }

  private getErrorMessage(error: any): string {
    if (error?.message) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Une erreur inattendue s\'est produite lors de la récupération des clients';
  }
}