/**
 * Suppliers Page Component
 * Manages supplier listing, creation, and operations
 */

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, Subject, takeUntil, combineLatest, map, BehaviorSubject } from 'rxjs';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal.component';
import { SupplierDetailsModalComponent } from '../../../../shared/components/supplier-details-modal/supplier-details-modal.component';
import { ContactFormModalComponent } from '../../../../shared/components/contact-form-modal/contact-form-modal.component';

import { SupplierFacade } from '../../suppliers/supplier.facade';
import { AuthFacade } from '../../../auth/auth.facade';
import { SupplierEntity } from '../../../../domain/entities/supplier.entity';
import { ContactEntity } from '../../../../domain/entities/contact.entity';
import { CreateSupplierRequest, UpdateSupplierRequest, CURRENCY_CODES, PAYMENT_TERMS } from '../../../../domain/models/supplier.models';
import { UserEntity } from '../../../../domain/entities/user.entity';
import { AppError } from '../../../../core/error/error.service';
import { MessageService } from '../../../../shared/services/message.service';

interface SuppliersState {
  suppliers: SupplierEntity[];
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  hasSuppliers: boolean;
  error: AppError | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    perPage: number;
  } | null;
}

@Component({
  selector: 'app-suppliers',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ConfirmationModalComponent, SupplierDetailsModalComponent, ContactFormModalComponent],
  templateUrl: './suppliers.html',
  styleUrl: './suppliers.scss',
})
export class Suppliers implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private internalState$ = new BehaviorSubject<SuppliersState>({
    suppliers: [],
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    hasSuppliers: false,
    error: null,
    pagination: null
  });

  // Observables
  state$: Observable<SuppliersState>;
  currentUser$: Observable<UserEntity | null>;

  // Forms
  supplierForm: FormGroup;

  // UI State
  showCreateForm = false;
  showEditForm = false;
  showFilters = false;
  selectedTypeFilter: 'all' | 'particulier' | 'entreprise' = 'all';
  selectedRelationTypeFilter: 'all' | 'fournisseur' | 'client_et_fournisseur' = 'all';
  searchQuery = '';
  editingSupplier: SupplierEntity | null = null;

  // Confirmation modal state
  showDeleteConfirmation = false;
  supplierToDelete: SupplierEntity | null = null;

  // Details modal state
  showDetailsModal = false;
  supplierToView: SupplierEntity | null = null;

  // Contact form modal state
  showContactFormModal = false;
  editingContact: ContactEntity | null = null;
  contactEntityId: number | null = null;
  contactEntityType: 'supplier' | null = null;

  // ViewChild reference to supplier details modal
  @ViewChild(SupplierDetailsModalComponent) supplierDetailsModal!: SupplierDetailsModalComponent;

  // Constants for dropdowns
  readonly CURRENCY_CODES = CURRENCY_CODES;
  readonly PAYMENT_TERMS = PAYMENT_TERMS;

  // Utility properties for templates
  Math = Math;
  pageSize = 10; // Default page size

  constructor(
    private supplierFacade: SupplierFacade,
    private authFacade: AuthFacade,
    private fb: FormBuilder,
    private messageService: MessageService
  ) {
    this.supplierForm = this.createSupplierForm();
    this.currentUser$ = this.authFacade.user$;

    // Combine multiple observables to create view state
    this.state$ = combineLatest([
      this.supplierFacade.suppliers$,
      this.supplierFacade.isLoading$,
      this.supplierFacade.isCreating$,
      this.supplierFacade.isUpdating$,
      this.supplierFacade.isDeleting$,
      this.supplierFacade.hasSuppliers$,
      this.supplierFacade.error$,
      this.supplierFacade.pagination$
    ]).pipe(
      takeUntil(this.destroy$),
      map(([suppliers, isLoading, isCreating, isUpdating, isDeleting, hasSuppliers, error, pagination]) => {
        const newState = {
          suppliers,
          isLoading,
          isCreating,
          isUpdating,
          isDeleting,
          hasSuppliers,
          error,
          pagination
        };
        // Sync with internal state
        this.internalState$.next(newState);
        return newState;
      })
    );
  }

  ngOnInit(): void {
    // Load suppliers on component initialization
    this.loadSuppliers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Data operations
  loadSuppliers(): void {
    const filters: any = {};

    if (this.selectedTypeFilter !== 'all') {
      filters.type = this.selectedTypeFilter;
    }

    if (this.selectedRelationTypeFilter !== 'all') {
      filters.relationType = this.selectedRelationTypeFilter;
    }

    if (this.searchQuery.trim()) {
      filters.search = this.searchQuery.trim();
    }

    this.supplierFacade.loadSuppliers(filters).subscribe();
  }

  onCreateSupplier(): void {
    if (this.supplierForm.valid) {
      const currentUser = this.authFacade.getCurrentUser();
      if (!currentUser) {
        console.error('User not authenticated');
        return;
      }

      const supplierData: CreateSupplierRequest = {
        name: this.supplierForm.value.name.trim(),
        type: this.supplierForm.value.type,
        email: this.supplierForm.value.email.trim(),
        phone: this.supplierForm.value.phone?.trim() || undefined,
        address: this.supplierForm.value.address?.trim() || undefined,
        siret: this.supplierForm.value.siret?.trim() || undefined,
        sector: this.supplierForm.value.sector?.trim() || undefined,
        website: this.supplierForm.value.website?.trim() || undefined,
        notes: this.supplierForm.value.notes?.trim() || undefined,
        relationType: this.supplierForm.value.relationType || 'fournisseur',
        paymentTerms: this.supplierForm.value.paymentTerms?.trim() || undefined,
        deliveryDelay: this.supplierForm.value.deliveryDelay || undefined,
        currency: this.supplierForm.value.currency || 'EUR'
      };

      this.supplierFacade.createSupplier(supplierData, currentUser.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.closeCreateForm();
          this.loadSuppliers();
        },
        error: (error) => {
          console.error('Failed to create supplier:', error);
        }
      });
    } else {
      this.markFormGroupTouched(this.supplierForm);
    }
  }

  onDeleteSupplier(supplier: SupplierEntity): void {
    this.supplierToDelete = supplier;
    this.showDeleteConfirmation = true;
  }

  onConfirmDelete(): void {
    if (!this.supplierToDelete) return;

    const currentUser = this.authFacade.getCurrentUser();
    if (!currentUser) {
      console.error('User not authenticated');
      return;
    }

    this.supplierFacade.deleteSupplier(this.supplierToDelete.id, currentUser.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        console.log('Fournisseur supprimé avec succès');
        this.loadSuppliers();
        this.onCancelDelete();
      },
      error: (error) => {
        console.error('Erreur lors de la suppression:', error);
        this.onCancelDelete();
      }
    });
  }

  onCancelDelete(): void {
    this.showDeleteConfirmation = false;
    this.supplierToDelete = null;
  }

  getDeleteMessage(): string {
    if (!this.supplierToDelete) return '';
    return `Êtes-vous sûr de vouloir supprimer le fournisseur "${this.supplierToDelete.name}" ?\n\nCette action est irréversible et supprimera définitivement toutes les données associées.`;
  }

  onViewSupplier(supplier: SupplierEntity): void {
    this.supplierToView = supplier;
    this.showDetailsModal = true;
  }

  onCloseDetailsModal(): void {
    this.showDetailsModal = false;
    this.supplierToView = null;
  }

  // Contact management methods
  onAddContact(event: { supplierId: number; type: 'supplier' }): void {
    this.editingContact = null;
    this.contactEntityId = event.supplierId;
    this.contactEntityType = event.type;
    this.showContactFormModal = true;
  }

  onEditContact(contact: ContactEntity): void {
    this.editingContact = contact;
    this.contactEntityId = contact.supplier_id;
    this.contactEntityType = 'supplier';
    this.showContactFormModal = true;
  }

  onCloseContactFormModal(): void {
    this.showContactFormModal = false;
    this.editingContact = null;
    this.contactEntityId = null;
    this.contactEntityType = null;
  }

  onContactCreated(contact: ContactEntity): void {
    this.messageService.showSuccess('Contact créé avec succès', {
      title: 'Contact ajouté',
      duration: 4000
    });
    this.onCloseContactFormModal();

    // Refresh supplier details modal contacts if open
    if (this.showDetailsModal && this.supplierDetailsModal) {
      this.supplierDetailsModal.refreshContacts();
    }
  }

  onContactUpdated(contact: ContactEntity): void {
    this.messageService.showSuccess('Contact modifié avec succès', {
      title: 'Contact mis à jour',
      duration: 4000
    });
    this.onCloseContactFormModal();

    // Refresh supplier details modal contacts if open
    if (this.showDetailsModal && this.supplierDetailsModal) {
      this.supplierDetailsModal.refreshContacts();
    }
  }

  onEditSupplier(supplier: SupplierEntity): void {
    this.editingSupplier = supplier;
    this.showEditForm = true;

    // Pré-remplir le formulaire avec les données du fournisseur
    this.supplierForm.patchValue({
      name: supplier.name,
      type: supplier.type,
      email: supplier.email,
      phone: supplier.phone || '',
      address: supplier.address || '',
      siret: supplier.siret || '',
      sector: supplier.sector || '',
      website: supplier.website || '',
      notes: supplier.notes || '',
      relationType: supplier.relationType,
      paymentTerms: supplier.paymentTerms || '',
      deliveryDelay: supplier.deliveryDelay || '',
      currency: supplier.currency
    });
  }

  onUpdateSupplier(): void {
    if (this.supplierForm.valid && this.editingSupplier) {
      const currentUser = this.authFacade.getCurrentUser();
      if (!currentUser) {
        console.error('User not authenticated');
        return;
      }

      const updateData: UpdateSupplierRequest = {
        name: this.supplierForm.value.name.trim(),
        type: this.supplierForm.value.type,
        email: this.supplierForm.value.email.trim(),
        phone: this.supplierForm.value.phone?.trim() || undefined,
        address: this.supplierForm.value.address?.trim() || undefined,
        siret: this.supplierForm.value.siret?.trim() || undefined,
        sector: this.supplierForm.value.sector?.trim() || undefined,
        website: this.supplierForm.value.website?.trim() || undefined,
        notes: this.supplierForm.value.notes?.trim() || undefined,
        relationType: this.supplierForm.value.relationType,
        paymentTerms: this.supplierForm.value.paymentTerms?.trim() || undefined,
        deliveryDelay: this.supplierForm.value.deliveryDelay || undefined,
        currency: this.supplierForm.value.currency
      };

      this.supplierFacade.updateSupplier(this.editingSupplier.id, updateData, currentUser.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.closeEditForm();
          this.loadSuppliers();
        },
        error: (error) => {
          console.error('Failed to update supplier:', error);
        }
      });
    } else {
      this.markFormGroupTouched(this.supplierForm);
    }
  }

  // UI Actions
  openCreateForm(): void {
    this.showCreateForm = true;
    this.resetCreateForm();
  }

  closeCreateForm(): void {
    this.showCreateForm = false;
    this.resetCreateForm();
  }

  closeEditForm(): void {
    this.showEditForm = false;
    this.editingSupplier = null;
    this.resetCreateForm();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  onTypeFilterChange(): void {
    this.loadSuppliers();
  }

  onRelationTypeFilterChange(): void {
    this.loadSuppliers();
  }

  onSearchChange(): void {
    this.loadSuppliers();
  }

  clearError(): void {
    this.supplierFacade.clearError();
  }

  onPageChange(page: number): void {
    this.supplierFacade.setPage(page);
  }

  get currentPage(): number {
    return this.internalState$.value.pagination?.currentPage || 1;
  }

  get totalPages(): number {
    return this.internalState$.value.pagination?.totalPages || 1;
  }

  get totalItems(): number {
    return this.internalState$.value.pagination?.totalItems || 0;
  }

  get canGoPrevious(): boolean {
    return this.currentPage > 1;
  }

  get canGoNext(): boolean {
    return this.currentPage < this.totalPages;
  }

  onPreviousPage(): void {
    if (this.canGoPrevious) {
      this.onPageChange(this.currentPage - 1);
    }
  }

  onNextPage(): void {
    if (this.canGoNext) {
      this.onPageChange(this.currentPage + 1);
    }
  }

  // Form helpers
  private createSupplierForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
      type: ['particulier', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      address: [''],
      siret: ['', [Validators.pattern(/^\d{14}$/)]],
      sector: [''],
      website: [''],
      notes: [''],
      relationType: ['fournisseur', [Validators.required]],
      paymentTerms: [''],
      deliveryDelay: ['', [Validators.min(0), Validators.max(365)]],
      currency: ['EUR', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]]
    });
  }

  private resetCreateForm(): void {
    this.supplierForm.reset({
      type: 'particulier',
      relationType: 'fournisseur',
      currency: 'EUR'
    });
    this.markFormGroupUntouched(this.supplierForm);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      if (control) {
        control.markAsTouched({ onlySelf: true });
      }
    });
  }

  private markFormGroupUntouched(formGroup: FormGroup): void {
    formGroup.markAsUntouched();
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      if (control) {
        control.markAsUntouched();
      }
    });
  }

  // Utility methods
  getFieldError(fieldName: string): string {
    const control = this.supplierForm.get(fieldName);
    if (control && control.errors && control.touched) {
      if (control.errors['required']) {
        return `Ce champ est obligatoire`;
      }
      if (control.errors['email']) {
        return `Veuillez saisir un email valide`;
      }
      if (control.errors['minlength']) {
        return `Ce champ doit contenir au moins ${control.errors['minlength'].requiredLength} caractères`;
      }
      if (control.errors['maxlength']) {
        return `Ce champ ne peut pas dépasser ${control.errors['maxlength'].requiredLength} caractères`;
      }
      if (control.errors['pattern']) {
        if (fieldName === 'siret') {
          return `Le SIRET doit contenir exactement 14 chiffres`;
        }
        return `Le format de ce champ n'est pas valide`;
      }
      if (control.errors['min']) {
        return `La valeur doit être supérieure ou égale à ${control.errors['min'].min}`;
      }
      if (control.errors['max']) {
        return `La valeur doit être inférieure ou égale à ${control.errors['max'].max}`;
      }
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.supplierForm.get(fieldName);
    return !!(control && control.errors && control.touched);
  }

  formatDeliveryDelay(delay: number | null): string {
    if (delay === null || delay === undefined) return '-';
    if (delay === 0) return 'Immédiat';
    if (delay === 1) return '1 jour';
    return `${delay} jours`;
  }

  formatRelationType(relationType: string): string {
    return relationType === 'client_et_fournisseur' ? 'Client & Fournisseur' : 'Fournisseur';
  }

  formatPaymentTerms(terms: string | null): string {
    return terms || '-';
  }
}