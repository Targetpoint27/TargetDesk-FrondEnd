/**
 * Create Supplier Use Case
 * Handles business logic for creating new suppliers
 */

import { Injectable } from '@angular/core';
import { Observable, map, catchError, of, switchMap, forkJoin } from 'rxjs';
import { SupplierRepository } from '../../repositories/supplier.repository';
import { SupplierEntity } from '../../entities/supplier.entity';
import {
  CreateSupplierRequest,
  UseCaseResult,
  ValidationResult,
  SupplierCreatedEvent
} from '../../models/supplier.models';

@Injectable({
  providedIn: 'root'
})
export class CreateSupplierUseCase {
  constructor(private supplierRepository: SupplierRepository) {}

  execute(request: CreateSupplierRequest, userId: string): Observable<UseCaseResult<SupplierEntity>> {
    return this.validateRequest(request).pipe(
      switchMap(validation => {
        if (!validation.isValid) {
          return of({
            success: false,
            validationErrors: validation.errors
          });
        }

        return this.checkUniqueness(request).pipe(
          switchMap(uniquenessValidation => {
            if (!uniquenessValidation.isValid) {
              return of({
                success: false,
                validationErrors: uniquenessValidation.errors
              });
            }

            return this.createSupplier(request).pipe(
              map(supplier => ({
                success: true,
                data: supplier,
                events: [this.createDomainEvent(supplier, userId)]
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
  }

  private validateRequest(request: CreateSupplierRequest): Observable<ValidationResult> {
    const errors: Record<string, string[]> = {};

    // Name validation
    if (!request.name || request.name.trim().length === 0) {
      errors['name'] = ['Le nom/raison sociale est obligatoire'];
    } else if (request.name.trim().length < 2) {
      errors['name'] = ['Le nom/raison sociale doit contenir au moins 2 caractères'];
    } else if (request.name.trim().length > 255) {
      errors['name'] = ['Le nom/raison sociale ne peut pas dépasser 255 caractères'];
    }

    // Type validation
    if (!request.type) {
      errors['type'] = ['Le type de fournisseur est obligatoire'];
    } else if (!['particulier', 'entreprise'].includes(request.type)) {
      errors['type'] = ['Le type de fournisseur doit être "particulier" ou "entreprise"'];
    }

    // Email validation
    if (!request.email || request.email.trim().length === 0) {
      errors['email'] = ['L\'email est obligatoire'];
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(request.email)) {
        errors['email'] = ['L\'email n\'est pas valide'];
      }
    }

    // Phone validation (optional)
    if (request.phone && request.phone.trim().length > 0) {
      const phoneRegex = /^[\d\s\-\+\(\)\.]{8,20}$/;
      if (!phoneRegex.test(request.phone)) {
        errors['phone'] = ['Le numéro de téléphone n\'est pas valide'];
      }
    }

    // SIRET validation (optional)
    if (request.siret && request.siret.trim().length > 0) {
      if (request.siret.length !== 14 || !/^\d{14}$/.test(request.siret)) {
        errors['siret'] = ['Le SIRET doit contenir exactement 14 chiffres'];
      }
    }

    // Website validation (optional)
    if (request.website && request.website.trim().length > 0) {
      try {
        new URL(request.website);
      } catch {
        errors['website'] = ['L\'URL du site web n\'est pas valide'];
      }
    }

    // Relation type validation (optional)
    if (request.relationType && !['fournisseur', 'client_et_fournisseur'].includes(request.relationType)) {
      errors['relationType'] = ['Le type de relation doit être "fournisseur" ou "client_et_fournisseur"'];
    }

    // Delivery delay validation (optional)
    if (request.deliveryDelay !== undefined && request.deliveryDelay !== null) {
      if (request.deliveryDelay < 0 || request.deliveryDelay > 365) {
        errors['deliveryDelay'] = ['Le délai de livraison doit être entre 0 et 365 jours'];
      }
    }

    // Currency validation (optional)
    if (request.currency && request.currency.length !== 3) {
      errors['currency'] = ['La devise doit être un code ISO 4217 de 3 caractères'];
    }

    return of({
      isValid: Object.keys(errors).length === 0,
      errors
    });
  }

  private checkUniqueness(request: CreateSupplierRequest): Observable<ValidationResult> {
    const checks: Observable<any>[] = [
      this.supplierRepository.isEmailUnique(request.email)
    ];

    if (request.siret && request.siret.trim().length > 0) {
      checks.push(this.supplierRepository.isSiretUnique(request.siret));
    }

    return forkJoin(checks).pipe(
      map(results => {
        const errors: Record<string, string[]> = {};

        // Check email uniqueness
        if (!results[0]) {
          errors['email'] = ['Cet email est déjà utilisé par un autre fournisseur'];
        }

        // Check SIRET uniqueness if provided
        if (request.siret && results[1] !== undefined && !results[1]) {
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

  private createSupplier(request: CreateSupplierRequest): Observable<SupplierEntity> {
    return this.supplierRepository.create(request);
  }

  private createDomainEvent(supplier: SupplierEntity, userId: string): SupplierCreatedEvent {
    return {
      type: 'SUPPLIER_CREATED',
      supplierId: supplier.id,
      supplierUniqueId: supplier.supplierId,
      userId,
      timestamp: new Date(),
      data: {
        name: supplier.name,
        type: supplier.type,
        email: supplier.email,
        relationType: supplier.relationType
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

    return 'Une erreur inattendue s\'est produite lors de la création du fournisseur';
  }
}