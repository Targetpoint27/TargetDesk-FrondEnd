/**
 * Supplier Mapper
 * Maps between API models and domain entities
 */

import { SupplierEntity } from '../../domain/entities/supplier.entity';
import {
  SupplierApiModel,
  SupplierListApiResponse,
  CreateSupplierApiRequest,
  UpdateSupplierApiRequest
} from '../api/supplier-api.models';
import {
  CreateSupplierRequest,
  UpdateSupplierRequest
} from '../../domain/models/supplier.models';
import { PaginationResult } from '../../domain/repositories/supplier.repository';

export class SupplierMapper {
  /**
   * Convert API model to domain entity
   */
  static fromApiResponse(apiModel: SupplierApiModel): SupplierEntity {
    return new SupplierEntity(
      apiModel.id,
      apiModel.supplier_id,
      apiModel.name,
      apiModel.type,
      apiModel.email,
      apiModel.phone || null,
      apiModel.address || null,
      apiModel.siret || null,
      apiModel.sector || null,
      apiModel.website || null,
      apiModel.notes || null,
      apiModel.relation_type,
      apiModel.payment_terms || null,
      apiModel.delivery_delay || null,
      apiModel.currency || 'EUR',
      apiModel.is_active,
      apiModel.created_by || null,
      new Date(apiModel.created_at),
      new Date(apiModel.updated_at)
    );
  }

  /**
   * Convert domain create request to API request
   */
  static toCreateApiRequest(request: CreateSupplierRequest): CreateSupplierApiRequest {
    return {
      name: request.name,
      type: request.type,
      email: request.email,
      phone: request.phone,
      address: request.address,
      siret: request.siret,
      sector: request.sector,
      website: request.website,
      notes: request.notes,
      relation_type: request.relationType || 'fournisseur',
      payment_terms: request.paymentTerms,
      delivery_delay: request.deliveryDelay,
      currency: request.currency || 'EUR'
    };
  }

  /**
   * Convert domain update request to API request
   */
  static toUpdateApiRequest(request: UpdateSupplierRequest): UpdateSupplierApiRequest {
    return {
      name: request.name,
      type: request.type,
      email: request.email,
      phone: request.phone,
      address: request.address,
      siret: request.siret,
      sector: request.sector,
      website: request.website,
      notes: request.notes,
      relation_type: request.relationType,
      payment_terms: request.paymentTerms,
      delivery_delay: request.deliveryDelay,
      currency: request.currency
    };
  }

  /**
   * Convert API list response to pagination result
   */
  static toPaginationResult(response: SupplierListApiResponse): PaginationResult<SupplierEntity> {
    return {
      items: response.data.suppliers.map(supplier => this.fromApiResponse(supplier)),
      pagination: {
        currentPage: response.data.pagination.current_page,
        totalPages: response.data.pagination.total_pages,
        totalItems: response.data.pagination.total_items,
        perPage: response.data.pagination.per_page
      }
    };
  }

  /**
   * Validate API response structure
   */
  static validateApiResponse(response: any): response is SupplierApiModel {
    return response &&
           typeof response.id === 'number' &&
           typeof response.supplier_id === 'string' &&
           typeof response.name === 'string' &&
           typeof response.email === 'string' &&
           ['particulier', 'entreprise'].includes(response.type) &&
           ['fournisseur', 'client_et_fournisseur'].includes(response.relation_type) &&
           typeof response.is_active === 'boolean';
  }

  /**
   * Convert list of API models to entities
   */
  static fromApiResponseList(apiModels: SupplierApiModel[]): SupplierEntity[] {
    return apiModels.map(model => this.fromApiResponse(model));
  }
}