/**
 * Get Suppliers Use Case
 * Handles business logic for retrieving supplier lists
 */

import { Injectable } from '@angular/core';
import { Observable, map, catchError, of, switchMap } from 'rxjs';
import { SupplierRepository, PaginationParams, PaginationResult } from '../../repositories/supplier.repository';
import { SupplierEntity } from '../../entities/supplier.entity';
import { UseCaseResult } from '../../models/supplier.models';

export interface GetSuppliersParams extends PaginationParams {
  type?: 'particulier' | 'entreprise';
  relationType?: 'fournisseur' | 'client_et_fournisseur';
  sector?: string;
  search?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GetSuppliersUseCase {
  constructor(private supplierRepository: SupplierRepository) {}

  execute(params?: GetSuppliersParams): Observable<UseCaseResult<PaginationResult<SupplierEntity>>> {
    return this.validateParams(params).pipe(
      switchMap(validatedParams => {
        if (validatedParams.search && validatedParams.search.trim().length > 0) {
          return this.searchSuppliers(validatedParams.search, validatedParams);
        }

        if (validatedParams.relationType) {
          return this.getSuppliersByRelationType(validatedParams.relationType, validatedParams);
        }

        if (validatedParams.type) {
          return this.getSuppliersByType(validatedParams.type, validatedParams);
        }

        if (validatedParams.sector) {
          return this.getSuppliersBySector(validatedParams.sector, validatedParams);
        }

        return this.getAllSuppliers(validatedParams);
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

  private validateParams(params?: GetSuppliersParams): Observable<GetSuppliersParams> {
    const validated: GetSuppliersParams = {
      page: Math.max(1, params?.page ?? 1),
      perPage: Math.min(100, Math.max(1, params?.perPage ?? 15)),
      type: params?.type,
      relationType: params?.relationType,
      sector: params?.sector?.trim(),
      search: params?.search?.trim()
    };

    return of(validated);
  }

  private getAllSuppliers(params: GetSuppliersParams): Observable<PaginationResult<SupplierEntity>> {
    return this.supplierRepository.getAll({
      page: params.page,
      perPage: params.perPage
    });
  }

  private searchSuppliers(query: string, params: GetSuppliersParams): Observable<PaginationResult<SupplierEntity>> {
    return this.supplierRepository.search(query, {
      page: params.page,
      perPage: params.perPage
    });
  }

  private getSuppliersByRelationType(
    relationType: 'fournisseur' | 'client_et_fournisseur',
    params: GetSuppliersParams
  ): Observable<PaginationResult<SupplierEntity>> {
    return this.supplierRepository.getByRelationType(relationType, {
      page: params.page,
      perPage: params.perPage
    });
  }

  private getSuppliersByType(
    type: 'particulier' | 'entreprise',
    params: GetSuppliersParams
  ): Observable<PaginationResult<SupplierEntity>> {
    return this.supplierRepository.getByType(type, {
      page: params.page,
      perPage: params.perPage
    });
  }

  private getSuppliersBySector(
    sector: string,
    params: GetSuppliersParams
  ): Observable<PaginationResult<SupplierEntity>> {
    return this.supplierRepository.getBySector(sector, {
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

    return 'Une erreur inattendue s\'est produite lors de la récupération des fournisseurs';
  }
}