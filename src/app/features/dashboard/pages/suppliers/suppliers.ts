/**
 * Suppliers Page Component
 * Manages supplier listing, creation, and operations
 */

import { Component, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, Subject, takeUntil, combineLatest, map, BehaviorSubject } from 'rxjs';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal.component';
import { SupplierDetailsModalComponent } from '../../../../shared/components/supplier-details-modal/supplier-details-modal.component';
import { ContactFormModalComponent } from '../../../../shared/components/contact-form-modal/contact-form-modal.component';
import { PermissionService } from '../../../../core/auth/permission.service';
import { PERMISSIONS } from '../../../../domain/models/permission.models';

import { SupplierFacade } from '../../suppliers/supplier.facade';
import { AuthFacade } from '../../../auth/auth.facade';
import { SupplierEntity } from '../../../../domain/entities/supplier.entity';
import { ContactEntity } from '../../../../domain/entities/contact.entity';
import { CreateSupplierRequest, UpdateSupplierRequest, CURRENCY_CODES, PAYMENT_TERMS } from '../../../../domain/models/supplier.models';
import { UserEntity } from '../../../../domain/entities/user.entity';
import { AppError } from '../../../../core/error/error.service';
import { SimpleNotificationService } from '../../../../shared/services/simple-notification.service';
import { SearchResult } from '../../../../shared/interfaces/search.interface';
import { QuickSearchComponent } from '../../../../shared/components/quick-search/quick-search.component';

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
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ConfirmationModalComponent, SupplierDetailsModalComponent, ContactFormModalComponent, QuickSearchComponent],
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

  // Nouveaux filtres pour la recherche avancée
  sectorFilter = '';
  sortBy = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';
  createdFromFilter = '';
  createdToFilter = '';

  // État de la recherche rapide
  quickSearchResults: SearchResult[] = [];
  showQuickSearchResults = false;

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

  // Permission observables
  canCreateSupplier$!: Observable<boolean>;
  canUpdateSupplier$!: Observable<boolean>;
  canDeleteSupplier$!: Observable<boolean>;
  canViewSupplier$!: Observable<boolean>;

  private permissionService = inject(PermissionService);

  constructor(
    private supplierFacade: SupplierFacade,
    private authFacade: AuthFacade,
    private fb: FormBuilder,
    private notificationService: SimpleNotificationService
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
    // Initialize permission observables
    this.canCreateSupplier$ = this.permissionService.hasPermission(PERMISSIONS.SUPPLIERS_CREATE);
    this.canUpdateSupplier$ = this.permissionService.canManageSuppliers();
    this.canDeleteSupplier$ = this.permissionService.canManageSuppliers();
    this.canViewSupplier$ = this.permissionService.canReadSuppliers();

    // Load suppliers on component initialization
    this.supplierFacade.loadSuppliers().subscribe();
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
          this.notificationService.showSuccess(
            'Le fournisseur a été créé avec succès',
            'Fournisseur créé'
          );
          this.closeCreateForm();
        },
        error: (error) => {
          if (error?.validationErrors) {
            // Show specific validation errors
            const validationMessages = Object.values(error.validationErrors).flat();
            this.notificationService.showError(
              validationMessages.join(', '),
              'Erreurs de validation'
            );
          } else {
            this.notificationService.showError(
              error?.message || 'Une erreur est survenue lors de la création du fournisseur',
              'Erreur de création'
            );
          }
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
        this.notificationService.showSuccess(
          `Le fournisseur "${this.supplierToDelete!.name}" a été supprimé avec succès`,
          'Fournisseur supprimé'
        );
        this.onCancelDelete();
      },
      error: (error) => {
        this.notificationService.showError(
          error?.message || 'Une erreur est survenue lors de la suppression du fournisseur',
          'Erreur de suppression'
        );
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
    this.notificationService.showSuccess(
      'Contact créé avec succès',
      'Contact ajouté'
    );
    this.onCloseContactFormModal();

    // Refresh supplier details modal contacts if open
    if (this.showDetailsModal && this.supplierDetailsModal) {
      this.supplierDetailsModal.refreshContacts();
    }
  }

  onContactUpdated(contact: ContactEntity): void {
    this.notificationService.showSuccess(
      'Contact modifié avec succès',
      'Contact mis à jour'
    );
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
          this.notificationService.showSuccess(
            'Le fournisseur a été modifié avec succès',
            'Fournisseur mis à jour'
          );
          this.closeEditForm();
        },
        error: (error) => {
          if (error?.validationErrors) {
            // Show specific validation errors
            const validationMessages = Object.values(error.validationErrors).flat();
            this.notificationService.showError(
              validationMessages.join(', '),
              'Erreurs de validation'
            );
          } else {
            this.notificationService.showError(
              error?.message || 'Une erreur est survenue lors de la modification du fournisseur',
              'Erreur de modification'
            );
          }
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
    console.log('Supplier type filter changed to:', this.selectedTypeFilter); // Debug log
    // Use facade's setTypeFilter method instead of loadSuppliers directly
    if (this.selectedTypeFilter === 'all') {
      this.supplierFacade.setTypeFilter(undefined);
    } else {
      this.supplierFacade.setTypeFilter(this.selectedTypeFilter);
    }
  }

  onRelationTypeFilterChange(): void {
    console.log('Supplier relation type filter changed to:', this.selectedRelationTypeFilter); // Debug log
    // Use facade's setRelationTypeFilter method instead of loadSuppliers directly
    if (this.selectedRelationTypeFilter === 'all') {
      this.supplierFacade.setRelationTypeFilter(undefined);
    } else {
      this.supplierFacade.setRelationTypeFilter(this.selectedRelationTypeFilter);
    }
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.supplierFacade.setSearch(query);
  }

  clearAllFilters(): void {
    this.selectedTypeFilter = 'all';
    this.selectedRelationTypeFilter = 'all';
    this.searchQuery = '';
    this.sectorFilter = '';
    this.sortBy = 'name';
    this.sortOrder = 'asc';
    this.createdFromFilter = '';
    this.createdToFilter = '';

    this.supplierFacade.setFilters({});
  }

  // NOUVELLES MÉTHODES POUR LA RECHERCHE AVANCÉE

  /**
   * Gestionnaire pour la sélection d'un résultat de recherche rapide
   */
  onQuickSearchResultSelected(result: SearchResult): void {
    // Naviguer vers le fournisseur sélectionné ou ouvrir les détails
    const supplier = this.findSupplierById(result.id);
    if (supplier) {
      this.onViewSupplier(supplier);
    }
  }

  /**
   * Gestionnaire pour les changements de recherche rapide
   */
  onQuickSearchChanged(query: string): void {
    // Optionellement, synchroniser avec le filtre de recherche général
    if (query.length >= 2) {
      this.searchQuery = query;
      this.supplierFacade.setSearch(query);
    } else if (query.length === 0) {
      this.searchQuery = '';
      this.supplierFacade.setSearch('');
    }
  }

  /**
   * Nouvelle méthode de filtrage par secteur
   */
  onSectorFilterChange(sector: string): void {
    this.sectorFilter = sector;
    this.applyAdvancedFilters();
  }

  /**
   * Gestionnaire pour le changement de tri
   */
  onSortChange(sortBy: string): void {
    this.sortBy = sortBy;
    this.applyAdvancedFilters();
  }

  /**
   * Gestionnaire pour le changement d'ordre de tri
   */
  onSortOrderChange(sortOrder: 'asc' | 'desc'): void {
    this.sortOrder = sortOrder;
    this.applyAdvancedFilters();
  }

  /**
   * Gestionnaire pour les filtres de date
   */
  onDateFilterChange(): void {
    this.applyAdvancedFilters();
  }

  /**
   * Appliquer tous les filtres avancés
   */
  private applyAdvancedFilters(): void {
    const filters = {
      search: this.searchQuery,
      type: this.selectedTypeFilter !== 'all' ? this.selectedTypeFilter : undefined,
      relation_type: this.selectedRelationTypeFilter !== 'all' ? this.selectedRelationTypeFilter : undefined,
      sector: this.sectorFilter || undefined,
      sort_by: this.sortBy,
      sort_order: this.sortOrder,
      created_from: this.createdFromFilter || undefined,
      created_to: this.createdToFilter || undefined,
      page: 1
    };

    this.supplierFacade.setFilters(filters);
  }

  /**
   * Vérifier si des filtres sont actifs
   */
  hasActiveFilters(): boolean {
    return !!(
      this.searchQuery ||
      this.selectedTypeFilter !== 'all' ||
      this.selectedRelationTypeFilter !== 'all' ||
      this.sectorFilter ||
      this.createdFromFilter ||
      this.createdToFilter ||
      this.sortBy !== 'name' ||
      this.sortOrder !== 'asc'
    );
  }

  /**
   * Compter le nombre de filtres actifs
   */
  getActiveFiltersCount(): number {
    let count = 0;
    if (this.searchQuery) count++;
    if (this.selectedTypeFilter !== 'all') count++;
    if (this.selectedRelationTypeFilter !== 'all') count++;
    if (this.sectorFilter) count++;
    if (this.createdFromFilter) count++;
    if (this.createdToFilter) count++;
    if (this.sortBy !== 'name') count++;
    if (this.sortOrder !== 'asc') count++;
    return count;
  }

  /**
   * Trouver un fournisseur par ID dans la liste actuelle
   */
  private findSupplierById(id: number): SupplierEntity | undefined {
    const state = this.internalState$.getValue();
    return state.suppliers.find(supplier => supplier.id === id);
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