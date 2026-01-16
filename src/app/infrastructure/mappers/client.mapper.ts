/**
 * Client Mapper
 * Maps between API models and domain entities
 */

import { ClientEntity, ClientEntityData } from '../../domain/entities/client.entity';
import { CategoryEntity, CategorySummary } from '../../domain/entities/category.entity';
import {
  ClientApiModel,
  CreateClientApiRequest,
  UpdateClientApiRequest,
  ClientListApiResponse,
  ClientApiResponse
} from '../api/client-api.models';
import {
  CreateClientRequest,
  UpdateClientRequest,
  PaginationResult
} from '../../domain/repositories/client.repository';

export class ClientMapper {
  /**
   * Maps API model to domain entity
   */
  static toDomain(apiModel: ClientApiModel): ClientEntity {
    const data: ClientEntityData = {
      id: apiModel.id,
      clientId: apiModel.client_id,
      name: apiModel.name,
      type: apiModel.type,
      email: apiModel.email,
      phone: apiModel.phone,
      address: apiModel.address,
      siret: apiModel.siret,
      sector: apiModel.sector,
      website: apiModel.website,
      notes: apiModel.notes,
      isActive: apiModel.is_active,
      createdBy: apiModel.created_by,
      createdAt: apiModel.created_at ? new Date(apiModel.created_at) : null,
      updatedAt: apiModel.updated_at ? new Date(apiModel.updated_at) : null,
      creator: apiModel.creator ? {
        id: apiModel.creator.id,
        name: apiModel.creator.name
      } : null,
      // Map category-related properties
      categories_count: apiModel.categories_count || 0,
      categories_summary: apiModel.categories_summary || [],
      categories: (apiModel.categories || []).map(cat => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
        type: cat.type,
        description: null,
        parent_id: null,
        is_active: true,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pivot: cat.pivot
      }) as any)
    };

    return ClientEntity.create(data);
  }

  /**
   * Maps multiple API models to domain entities
   */
  static toDomainList(apiModels: ClientApiModel[]): ClientEntity[] {
    return apiModels.map(apiModel => this.toDomain(apiModel));
  }

  /**
   * Maps domain create request to API request
   */
  static toCreateApiRequest(domainRequest: CreateClientRequest): CreateClientApiRequest {
    return {
      name: domainRequest.name,
      type: domainRequest.type,
      email: domainRequest.email,
      phone: domainRequest.phone,
      address: domainRequest.address,
      siret: domainRequest.siret,
      sector: domainRequest.sector,
      website: domainRequest.website,
      notes: domainRequest.notes
    };
  }

  /**
   * Maps domain update request to API request
   */
  static toUpdateApiRequest(domainRequest: UpdateClientRequest): UpdateClientApiRequest {
    const apiRequest: UpdateClientApiRequest = {};

    if (domainRequest.name !== undefined) apiRequest.name = domainRequest.name;
    if (domainRequest.type !== undefined) apiRequest.type = domainRequest.type;
    if (domainRequest.email !== undefined) apiRequest.email = domainRequest.email;
    if (domainRequest.phone !== undefined) apiRequest.phone = domainRequest.phone;
    if (domainRequest.address !== undefined) apiRequest.address = domainRequest.address;
    if (domainRequest.siret !== undefined) apiRequest.siret = domainRequest.siret;
    if (domainRequest.sector !== undefined) apiRequest.sector = domainRequest.sector;
    if (domainRequest.website !== undefined) apiRequest.website = domainRequest.website;
    if (domainRequest.notes !== undefined) apiRequest.notes = domainRequest.notes;

    return apiRequest;
  }

  /**
   * Maps API list response to domain pagination result
   */
  static toPaginationResult(apiResponse: ClientListApiResponse): PaginationResult<ClientEntity> {
    return {
      items: this.toDomainList(apiResponse.data.clients),
      pagination: {
        currentPage: apiResponse.data.pagination.current_page,
        totalPages: apiResponse.data.pagination.total_pages,
        totalItems: apiResponse.data.pagination.total_items,
        perPage: apiResponse.data.pagination.per_page
      }
    };
  }

  /**
   * Maps API single response to domain entity
   */
  static fromApiResponse(apiResponse: ClientApiResponse): ClientEntity {
    return this.toDomain(apiResponse.data);
  }

  /**
   * Validates API model structure
   */
  static validateApiModel(apiModel: any): apiModel is ClientApiModel {
    return (
      typeof apiModel === 'object' &&
      typeof apiModel.id === 'number' &&
      typeof apiModel.client_id === 'string' &&
      typeof apiModel.name === 'string' &&
      typeof apiModel.type === 'string' &&
      (apiModel.type === 'particulier' || apiModel.type === 'entreprise') &&
      typeof apiModel.email === 'string' &&
      typeof apiModel.is_active === 'boolean' &&
      typeof apiModel.created_at === 'string' &&
      typeof apiModel.updated_at === 'string'
    );
  }

  /**
   * Validates API response structure
   */
  static validateApiResponse(response: any): response is ClientApiResponse {
    return (
      typeof response === 'object' &&
      typeof response.success === 'boolean' &&
      typeof response.message === 'string' &&
      response.data &&
      this.validateApiModel(response.data)
    );
  }

  /**
   * Validates API list response structure
   */
  static validateApiListResponse(response: any): response is ClientListApiResponse {
    return (
      typeof response === 'object' &&
      typeof response.success === 'boolean' &&
      typeof response.message === 'string' &&
      response.data &&
      Array.isArray(response.data.clients) &&
      response.data.pagination &&
      typeof response.data.pagination.current_page === 'number' &&
      typeof response.data.pagination.total_pages === 'number' &&
      typeof response.data.pagination.total_items === 'number' &&
      typeof response.data.pagination.per_page === 'number'
    );
  }
}