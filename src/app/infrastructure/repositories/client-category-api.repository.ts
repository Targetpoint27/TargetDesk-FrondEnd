/**
 * Client Category API Repository
 * Manages client-category relationship operations
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../core/api/api.service';
import { CategoryEntity } from '../../domain/entities/category.entity';

export interface ClientCategoryResponse {
  client: {
    id: number;
    client_id: string;
    name: string;
  };
  categories: CategoryEntity[];
  categories_count: number;
}

export interface AssignCategoriesRequest {
  category_ids: number[];
}

interface ClientCategoriesApiResponse {
  success: boolean;
  message: string;
  data: ClientCategoryResponse;
}

interface ClientCategoryDeleteApiResponse {
  success: boolean;
  message: string;
  data: null;
}

@Injectable({
  providedIn: 'root'
})
export class ClientCategoryApiRepository {
  constructor(private apiService: ApiService) {}

  /**
   * Get all categories assigned to a client
   */
  getClientCategories(clientId: number): Observable<ClientCategoryResponse> {
    return this.apiService.get<ClientCategoriesApiResponse>(`/clients/${clientId}/categories`).pipe(
      map(response => response.data)
    );
  }

  /**
   * Assign categories to a client
   */
  assignCategories(clientId: number, request: AssignCategoriesRequest): Observable<ClientCategoryResponse> {
    return this.apiService.post<ClientCategoriesApiResponse>(`/clients/${clientId}/categories`, request).pipe(
      map(response => response.data)
    );
  }

  /**
   * Remove a specific category from a client
   */
  removeCategoryFromClient(clientId: number, categoryId: number): Observable<boolean> {
    return this.apiService.delete<ClientCategoryDeleteApiResponse>(`/clients/${clientId}/categories/${categoryId}`).pipe(
      map(response => response.success)
    );
  }
}