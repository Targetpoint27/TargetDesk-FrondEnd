/**
 * Category Repository Interface
 * Defines the contract for category data operations
 */

import { Observable } from 'rxjs';
import {
  CategoryEntity,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  AssignCategoriesRequest,
  CategoryType
} from '../entities/category.entity';

export interface CategoryFilters {
  type?: CategoryType;
  hierarchical?: boolean;
  include_children?: boolean;
}

export interface CategoryRepository {
  // Category CRUD operations
  getCategories(filters?: CategoryFilters): Observable<CategoryEntity[]>;
  getCategoryById(id: number): Observable<CategoryEntity>;
  createCategory(category: CreateCategoryRequest): Observable<CategoryEntity>;
  updateCategory(id: number, category: UpdateCategoryRequest): Observable<CategoryEntity>;
  deleteCategory(id: number): Observable<void>;

  // Client-Category relationships
  getClientCategories(clientId: number): Observable<{
    client: {
      id: number;
      client_id: string;
      name: string;
    };
    categories: CategoryEntity[];
    categories_count: number;
  }>;
  assignCategoriesToClient(clientId: number, request: AssignCategoriesRequest): Observable<{
    client: {
      id: number;
      client_id: string;
      name: string;
    };
    categories: CategoryEntity[];
  }>;
  removeCategoryFromClient(clientId: number, categoryId: number): Observable<void>;
}