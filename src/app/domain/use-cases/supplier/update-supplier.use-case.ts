/**
 * Update Supplier Use Case
 * Handles business logic for updating existing suppliers
 */

import { Injectable } from '@angular/core';
import { Observable, map, catchError, of, switchMap, forkJoin } from 'rxjs';
import { SupplierRepository } from '../../repositories/supplier.repository';
import { SupplierEntity } from '../../entities/supplier.entity';
import {
  UpdateSupplierRequest,
  UseCaseResult,
  ValidationResult,
  SupplierUpdatedEvent
} from '../../models/supplier.models';

@Injectable({
  providedIn: 'root'
})
export class UpdateSupplierUseCase {
  constructor(private supplierRepository: SupplierRepository) {}

  execute(
    supplierId: number,
    request: UpdateSupplierRequest,
    userId: string
  ): Observable<UseCaseResult<SupplierEntity>> {
    return this.getExistingSupplier(supplierId).pipe(
      switchMap(existingSupplier => {
        if (!existingSupplier) {
          return of({
            success: false,
            error: 'Fournisseur non trouvé'
          });
        }

        return this.validateRequest(request, supplierId).pipe(
          switchMap(validation => {
            if (!validation.isValid) {
              return of({
                success: false,
                validationErrors: validation.errors
              });
            }

            return this.checkUniqueness(request, supplierId).pipe(
              switchMap(uniquenessValidation => {
                if (!uniquenessValidation.isValid) {
                  return of({
                    success: false,
                    validationErrors: uniquenessValidation.errors
                  });
                }

                return this.updateSupplier(supplierId, request).pipe(
                  map(updatedSupplier => ({
                    success: true,
                    data: updatedSupplier,
                    events: [this.createDomainEvent(updatedSupplier, existingSupplier, userId)]
                  })),
                  catchError(error => of({
                    success: false,
                    error: this.getErrorMessage(error)
                  }))
                );
              })
            );
          })
        );
      })
    );
  }

  private getExistingSupplier(supplierId: number): Observable<SupplierEntity | null> {
    return this.supplierRepository.getById(supplierId);
  }

  private validateRequest(request: UpdateSupplierRequest, supplierId: number): Observable<ValidationResult> {
    const errors: Record<string, string[]> = {};

    // Name validation (if provided)
    if (request.name !== undefined) {
      if (!request.name || request.name.trim().length === 0) {
        errors['name'] = ['Le nom/raison sociale est obligatoire'];
      } else if (request.name.trim().length < 2) {
        errors['name'] = ['Le nom/raison sociale doit contenir au moins 2 caractères'];
      } else if (request.name.trim().length > 255) {
        errors['name'] = ['Le nom/raison sociale ne peut pas dépasser 255 caractères'];
      }
    }

    // Type validation (if provided)
    if (request.type !== undefined) {
      if (!['particulier', 'entreprise'].includes(request.type)) {
        errors['type'] = ['Le type de fournisseur doit être "particulier" ou "entreprise"'];
      }
    }

    // Email validation (if provided)
    if (request.email !== undefined) {
      if (!request.email || request.email.trim().length === 0) {
        errors['email'] = ['L\'email est obligatoire'];
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(request.email)) {
          errors['email'] = ['L\'email n\'est pas valide'];
        }
      }
    }

    // Phone validation (if provided)
    if (request.phone !== undefined && request.phone && request.phone.trim().length > 0) {
      const phoneRegex = /^[\d\s\-\+\(\)\.]{8,20}$/;
      if (!phoneRegex.test(request.phone)) {
        errors['phone'] = ['Le numéro de téléphone n\'est pas valide'];
      }
    }

    // SIRET validation (if provided)
    if (request.siret !== undefined && request.siret && request.siret.trim().length > 0) {
      if (request.siret.length !== 14 || !/^\d{14}$/.test(request.siret)) {
        errors['siret'] = ['Le SIRET doit contenir exactement 14 chiffres'];
      }
    }

    // Website validation (if provided)
    if (request.website !== undefined && request.website && request.website.trim().length > 0) {
      try {
        new URL(request.website);
      } catch {
        errors['website'] = ['L\'URL du site web n\'est pas valide'];
      }
    }

    // Relation type validation (if provided)
    if (request.relationType !== undefined && !['fournisseur', 'client_et_fournisseur'].includes(request.relationType)) {
      errors['relationType'] = ['Le type de relation doit être "fournisseur" ou "client_et_fournisseur"'];
    }

    // Delivery delay validation (if provided)
    if (request.deliveryDelay !== undefined && request.deliveryDelay !== null) {
      if (request.deliveryDelay < 0 || request.deliveryDelay > 365) {
        errors['deliveryDelay'] = ['Le délai de livraison doit être entre 0 et 365 jours'];
      }
    }

    // Currency validation (if provided)
    if (request.currency !== undefined && request.currency && request.currency.length !== 3) {
      errors['currency'] = ['La devise doit être un code ISO 4217 de 3 caractères'];
    }

    return of({
      isValid: Object.keys(errors).length === 0,
      errors
    });
  }

  private checkUniqueness(request: UpdateSupplierRequest, supplierId: number): Observable<ValidationResult> {
    const checks: Observable<any>[] = [];

    if (request.email !== undefined) {
      checks.push(this.supplierRepository.isEmailUnique(request.email, supplierId));
    }

    if (request.siret !== undefined && request.siret && request.siret.trim().length > 0) {
      checks.push(this.supplierRepository.isSiretUnique(request.siret, supplierId));
    }

    if (checks.length === 0) {
      return of({ isValid: true, errors: {} });
    }

    return forkJoin(checks).pipe(
      map(results => {
        const errors: Record<string, string[]> = {};

        // Check email uniqueness
        if (request.email !== undefined && results[0] !== undefined && !results[0]) {
          errors['email'] = ['Cet email est déjà utilisé par un autre fournisseur'];
        }

        // Check SIRET uniqueness if provided
        if (request.siret !== undefined && request.siret && results[1] !== undefined && !results[1]) {
          errors['siret'] = ['Ce SIRET est déjà utilisé par un autre fournisseur'];
        }

        return {
          isValid: Object.keys(errors).length === 0,
          errors
        };
      }),
      catchError(() => of({
        isValid: false,
        errors: { 'general': ['Erreur lors de la vérification d\'unicité'] }
      }))
    );
  }

  private updateSupplier(supplierId: number, request: UpdateSupplierRequest): Observable<SupplierEntity> {
    return this.supplierRepository.update(supplierId, request);
  }

  private createDomainEvent(
    updatedSupplier: SupplierEntity,
    previousSupplier: SupplierEntity,
    userId: string
  ): SupplierUpdatedEvent {
    const changes: Partial<UpdateSupplierRequest> = {};
    const previousValues: Partial<UpdateSupplierRequest> = {};

    // Compare fields to detect changes
    if (updatedSupplier.name !== previousSupplier.name) {
      changes.name = updatedSupplier.name;
      previousValues.name = previousSupplier.name;
    }

    if (updatedSupplier.email !== previousSupplier.email) {
      changes.email = updatedSupplier.email;
      previousValues.email = previousSupplier.email;
    }

    if (updatedSupplier.phone !== previousSupplier.phone) {
      changes.phone = updatedSupplier.phone || undefined;
      previousValues.phone = previousSupplier.phone || undefined;
    }

    if (updatedSupplier.type !== previousSupplier.type) {
      changes.type = updatedSupplier.type;
      previousValues.type = previousSupplier.type;
    }

    if (updatedSupplier.address !== previousSupplier.address) {
      changes.address = updatedSupplier.address || undefined;
      previousValues.address = previousSupplier.address || undefined;
    }

    if (updatedSupplier.siret !== previousSupplier.siret) {
      changes.siret = updatedSupplier.siret || undefined;
      previousValues.siret = previousSupplier.siret || undefined;
    }

    if (updatedSupplier.sector !== previousSupplier.sector) {
      changes.sector = updatedSupplier.sector || undefined;
      previousValues.sector = previousSupplier.sector || undefined;
    }

    if (updatedSupplier.website !== previousSupplier.website) {
      changes.website = updatedSupplier.website || undefined;
      previousValues.website = previousSupplier.website || undefined;
    }

    if (updatedSupplier.notes !== previousSupplier.notes) {
      changes.notes = updatedSupplier.notes || undefined;
      previousValues.notes = previousSupplier.notes || undefined;
    }

    if (updatedSupplier.relationType !== previousSupplier.relationType) {
      changes.relationType = updatedSupplier.relationType;
      previousValues.relationType = previousSupplier.relationType;
    }

    if (updatedSupplier.paymentTerms !== previousSupplier.paymentTerms) {
      changes.paymentTerms = updatedSupplier.paymentTerms || undefined;
      previousValues.paymentTerms = previousSupplier.paymentTerms || undefined;
    }

    if (updatedSupplier.deliveryDelay !== previousSupplier.deliveryDelay) {
      changes.deliveryDelay = updatedSupplier.deliveryDelay || undefined;
      previousValues.deliveryDelay = previousSupplier.deliveryDelay || undefined;
    }

    if (updatedSupplier.currency !== previousSupplier.currency) {
      changes.currency = updatedSupplier.currency;
      previousValues.currency = previousSupplier.currency;
    }

    return {
      type: 'SUPPLIER_UPDATED',
      supplierId: updatedSupplier.id,
      supplierUniqueId: updatedSupplier.supplierId,
      userId,
      timestamp: new Date(),
      data: {
        changes,
        previousValues
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

    return 'Une erreur inattendue s\'est produite lors de la mise à jour du fournisseur';
  }
}