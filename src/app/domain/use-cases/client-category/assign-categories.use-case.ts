/**
 * Assign Categories to Client Use Case
 * Business logic for assigning categories to a client
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ClientCategoryApiRepository, ClientCategoryResponse, AssignCategoriesRequest } from '../../../infrastructure/repositories/client-category-api.repository';

@Injectable({
  providedIn: 'root'
})
export class AssignCategoriesUseCase {
  constructor(private clientCategoryRepository: ClientCategoryApiRepository) {}

  execute(clientId: number, categoryIds: number[]): Observable<ClientCategoryResponse> {
    const request: AssignCategoriesRequest = {
      category_ids: categoryIds
    };

    return this.clientCategoryRepository.assignCategories(clientId, request);
  }
}