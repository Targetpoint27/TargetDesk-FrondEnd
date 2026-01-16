/**
 * Remove Category from Client Use Case
 * Business logic for removing a category from a client
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ClientCategoryApiRepository } from '../../../infrastructure/repositories/client-category-api.repository';

@Injectable({
  providedIn: 'root'
})
export class RemoveCategoryUseCase {
  constructor(private clientCategoryRepository: ClientCategoryApiRepository) {}

  execute(clientId: number, categoryId: number): Observable<boolean> {
    return this.clientCategoryRepository.removeCategoryFromClient(clientId, categoryId);
  }
}