/**
 * Get Client Categories Use Case
 * Business logic for retrieving client categories
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ClientCategoryApiRepository, ClientCategoryResponse } from '../../../infrastructure/repositories/client-category-api.repository';

@Injectable({
  providedIn: 'root'
})
export class GetClientCategoriesUseCase {
  constructor(private clientCategoryRepository: ClientCategoryApiRepository) {}

  execute(clientId: number): Observable<ClientCategoryResponse> {
    return this.clientCategoryRepository.getClientCategories(clientId);
  }
}