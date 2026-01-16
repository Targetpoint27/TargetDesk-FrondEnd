/**
 * Delete Supplier Use Case
 * Handles business logic for deleting suppliers
 */

import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { SupplierRepository } from '../../repositories/supplier.repository';
import { SupplierEntity } from '../../entities/supplier.entity';
import {
  UseCaseResult,
  SupplierDeletedEvent
} from '../../models/supplier.models';

@Injectable({
  providedIn: 'root'
})
export class DeleteSupplierUseCase {
  constructor(private supplierRepository: SupplierRepository) {}

  execute(supplierId: number, userId: string): Observable<UseCaseResult<void>> {
    // Appeler directement la suppression sans vérification préalable
    // Le backend gérera les validations nécessaires
    return this.deleteSupplier(supplierId).pipe(
      map(() => {
        return {
          success: true,
          data: undefined,
          events: [this.createDeleteEvent(supplierId, userId)]
        };
      }),
      catchError(error => {
        return of({
          success: false,
          error: this.getErrorMessage(error)
        });
      })
    );
  }

  private deleteSupplier(supplierId: number): Observable<void> {
    return this.supplierRepository.delete(supplierId);
  }

  private createDeleteEvent(supplierId: number, userId: string): SupplierDeletedEvent {
    return {
      type: 'SUPPLIER_DELETED',
      supplierId: supplierId,
      supplierUniqueId: '', // Ne pas renseigner si on n'a pas l'entité
      userId,
      timestamp: new Date(),
      data: {
        name: '', // Le backend aura ces informations
        email: ''
      }
    };
  }

  private getErrorMessage(error: any): string {
    if (error?.message) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Une erreur inattendue s\'est produite lors de la suppression du fournisseur';
  }
}