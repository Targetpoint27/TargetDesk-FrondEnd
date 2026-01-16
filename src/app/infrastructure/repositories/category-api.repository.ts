/**
 * Category API Repository Implementation
 * Handles HTTP requests for category operations
 */

import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import {
  CategoryEntity,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  AssignCategoriesRequest,
  CategoryType
} from '../../domain/entities/category.entity';
import {
  CategoryRepository,
  CategoryFilters
} from '../../domain/repositories/category.repository';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryApiRepository implements CategoryRepository {

  constructor(private apiService: ApiService) {}

  getCategories(filters?: CategoryFilters): Observable<CategoryEntity[]> {
    let params = new HttpParams();

    if (filters?.type) {
      params = params.set('type', filters.type);
    }
    if (filters?.hierarchical) {
      params = params.set('hierarchical', 'true');
    }
    if (filters?.include_children !== undefined) {
      params = params.set('include_children', filters.include_children.toString());
    }

    const options = params.keys().length > 0 ? { params } : undefined;
    return this.apiService.get<ApiResponse<CategoryEntity[]>>('/categories', options)
      .pipe(map(response => response.data));
  }

  getCategoryById(id: number): Observable<CategoryEntity> {
    return this.apiService.get<ApiResponse<CategoryEntity>>(`/categories/${id}`)
      .pipe(map(response => response.data));
  }

  createCategory(category: CreateCategoryRequest): Observable<CategoryEntity> {
    return this.apiService.post<ApiResponse<CategoryEntity>>('/categories', category)
      .pipe(map(response => response.data));
  }

  updateCategory(id: number, category: UpdateCategoryRequest): Observable<CategoryEntity> {
    return this.apiService.put<ApiResponse<CategoryEntity>>(`/categories/${id}`, category)
      .pipe(map(response => response.data));
  }

  deleteCategory(id: number): Observable<void> {
    return this.apiService.delete<ApiResponse<null>>(`/categories/${id}`)
      .pipe(map(() => undefined));
  }

  getClientCategories(clientId: number): Observable<{
    client: { id: number; client_id: string; name: string };
    categories: CategoryEntity[];
    categories_count: number;
  }> {
    return this.apiService.get<ApiResponse<{
      client: { id: number; client_id: string; name: string };
      categories: CategoryEntity[];
      categories_count: number;
    }>>(`/clients/${clientId}/categories`)
      .pipe(map(response => response.data));
  }

  assignCategoriesToClient(clientId: number, request: AssignCategoriesRequest): Observable<{
    client: { id: number; client_id: string; name: string };
    categories: CategoryEntity[];
  }> {
    return this.apiService.post<ApiResponse<{
      client: { id: number; client_id: string; name: string };
      categories: CategoryEntity[];
    }>>(`/clients/${clientId}/categories`, request)
      .pipe(map(response => response.data));
  }

  removeCategoryFromClient(clientId: number, categoryId: number): Observable<void> {
    return this.apiService.delete<ApiResponse<null>>(`/clients/${clientId}/categories/${categoryId}`)
      .pipe(map(() => undefined));
  }
}