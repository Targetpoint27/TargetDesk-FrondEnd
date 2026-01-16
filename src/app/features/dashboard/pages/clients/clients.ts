/**
 * Clients Page Component
 * Manages client listing, creation, and operations
 */

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, Subject, takeUntil, combineLatest, map, BehaviorSubject } from 'rxjs';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ClientDetailsModalComponent } from '../../../../shared/components/client-details-modal/client-details-modal.component';
import { ContactFormModalComponent } from '../../../../shared/components/contact-form-modal/contact-form-modal.component';
import { CategoryBadgesListComponent } from '../../../../shared/components/category-badges-list/category-badges-list.component';
import { ImportExportModalComponent } from '../../../../shared/components/import-export-modal/import-export-modal.component';

import { ClientFacade } from '../../clients/client.facade';
import { CategoryFacade } from '../../categories/category.facade';
import { AuthFacade } from '../../../auth/auth.facade';
import { ClientEntity } from '../../../../domain/entities/client.entity';
import { ContactEntity } from '../../../../domain/entities/contact.entity';
import { CategoryEntity, CategoryType, CATEGORY_TYPES } from '../../../../domain/entities/category.entity';
import { CreateClientRequest, UpdateClientRequest } from '../../../../domain/repositories/client.repository';
import { UserEntity } from '../../../../domain/entities/user.entity';
import { AppError } from '../../../../core/error/error.service';
import { MessageService } from '../../../../shared/services/message.service';

interface ClientsState {
  clients: ClientEntity[];
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  hasClients: boolean;
  error: AppError | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    perPage: number;
  } | null;
}

@Component({
  selector: 'app-clients',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ConfirmationModalComponent, ClientDetailsModalComponent, ContactFormModalComponent, CategoryBadgesListComponent, ImportExportModalComponent],
  templateUrl: './clients.html',
  styleUrl: './clients.scss',
})
export class Clients implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private internalState$ = new BehaviorSubject<ClientsState>({
    clients: [],
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    hasClients: false,
    error: null,
    pagination: null
  });

  // Observables
  state$: Observable<ClientsState>;
  currentUser$: Observable<UserEntity | null>;

  // Forms
  clientForm: FormGroup;

  // UI State
  showCreateForm = false;
  showEditForm = false;
  showFilters = false;
  selectedTypeFilter: 'all' | 'particulier' | 'entreprise' = 'all';
  searchQuery = '';
  editingClient: ClientEntity | null = null;

  // Category filtering
  selectedCategoryFilter: number | 'all' = 'all';
  selectedCategoryTypeFilter: CategoryType | 'all' = 'all';
  availableCategories: CategoryEntity[] = [];
  categoryTypes = CATEGORY_TYPES;

  // Confirmation modal state
  showDeleteConfirmation = false;
  clientToDelete: ClientEntity | null = null;

  // Details modal state
  showDetailsModal = false;
  clientToView: ClientEntity | null = null;

  // Contact form modal state
  showContactFormModal = false;
  editingContact: ContactEntity | null = null;
  contactEntityId: number | null = null;
  contactEntityType: 'client' | null = null;

  // Import/Export modal state
  showImportExportModal = false;

  // ViewChild reference to client details modal
  @ViewChild(ClientDetailsModalComponent) clientDetailsModal!: ClientDetailsModalComponent;

  // Utility properties for templates
  Math = Math;
  pageSize = 10; // Default page size

  constructor(
    private clientFacade: ClientFacade,
    private categoryFacade: CategoryFacade,
    private authFacade: AuthFacade,
    private fb: FormBuilder,
    private messageService: MessageService
  ) {
    this.clientForm = this.createClientForm();
    this.currentUser$ = this.authFacade.user$;

    // Combine multiple observables to create view state
    this.state$ = combineLatest([
      this.clientFacade.clients$,
      this.clientFacade.isLoading$,
      this.clientFacade.isCreating$,
      this.clientFacade.isUpdating$,
      this.clientFacade.isDeleting$,
      this.clientFacade.hasClients$,
      this.clientFacade.error$,
      this.clientFacade.pagination$
    ]).pipe(
      takeUntil(this.destroy$),
      map(([clients, isLoading, isCreating, isUpdating, isDeleting, hasClients, error, pagination]) => {
        const newState = {
          clients,
          isLoading,
          isCreating,
          isUpdating,
          isDeleting,
          hasClients,
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
    // Load categories for filtering
    this.categoryFacade.loadCategories().subscribe();

    // Subscribe to categories for filter dropdown
    this.categoryFacade.categories$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(categories => {
      this.availableCategories = categories;
    });

    // Load clients on component initialization
    this.loadClients();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Data operations
  loadClients(): void {
    const filters: any = {};

    if (this.selectedTypeFilter !== 'all') {
      filters.type = this.selectedTypeFilter;
    }

    if (this.searchQuery.trim()) {
      filters.search = this.searchQuery.trim();
    }

    if (this.selectedCategoryFilter !== 'all') {
      filters.category_id = this.selectedCategoryFilter;
    }

    if (this.selectedCategoryTypeFilter !== 'all') {
      filters.category_type = this.selectedCategoryTypeFilter;
    }

    this.clientFacade.loadClients(filters).subscribe();
  }

  onCreateClient(): void {
    if (this.clientForm.valid) {
      const currentUser = this.authFacade.getCurrentUser();
      if (!currentUser) {
        console.error('User not authenticated');
        return;
      }

      const clientData: CreateClientRequest = {
        name: this.clientForm.value.name.trim(),
        type: this.clientForm.value.type,
        email: this.clientForm.value.email.trim(),
        phone: this.clientForm.value.phone?.trim() || undefined,
        address: this.clientForm.value.address?.trim() || undefined,
        siret: this.clientForm.value.siret?.trim() || undefined,
        sector: this.clientForm.value.sector?.trim() || undefined,
        website: this.clientForm.value.website?.trim() || undefined,
        notes: this.clientForm.value.notes?.trim() || undefined
      };

      this.clientFacade.createClient(clientData, currentUser.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.closeCreateForm();
          this.loadClients();
        },
        error: (error) => {
          console.error('Failed to create client:', error);
        }
      });
    } else {
      this.markFormGroupTouched(this.clientForm);
    }
  }

  onDeleteClient(client: ClientEntity): void {
    this.clientToDelete = client;
    this.showDeleteConfirmation = true;
  }

  onConfirmDelete(): void {
    if (!this.clientToDelete) return;

    const currentUser = this.authFacade.getCurrentUser();
    if (!currentUser) {
      console.error('User not authenticated');
      return;
    }

    this.clientFacade.deleteClient(this.clientToDelete.id, currentUser.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        console.log('Client supprimé avec succès');
        this.loadClients();
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
    this.clientToDelete = null;
  }

  getDeleteMessage(): string {
    if (!this.clientToDelete) return '';
    return `Êtes-vous sûr de vouloir supprimer le client "${this.clientToDelete.name}" ?\n\nCette action est irréversible et supprimera définitivement toutes les données associées.`;
  }

  onViewClient(client: ClientEntity): void {
    this.clientToView = client;
    this.showDetailsModal = true;
  }

  onCloseDetailsModal(): void {
    this.showDetailsModal = false;
    this.clientToView = null;
  }

  // Contact management methods
  onAddContact(event: { clientId: number; type: 'client' }): void {
    this.editingContact = null;
    this.contactEntityId = event.clientId;
    this.contactEntityType = event.type;
    this.showContactFormModal = true;
  }

  onEditContact(contact: ContactEntity): void {
    this.editingContact = contact;
    this.contactEntityId = contact.client_id;
    this.contactEntityType = 'client';
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

    // Refresh client details modal contacts if open
    if (this.showDetailsModal && this.clientDetailsModal) {
      this.clientDetailsModal.refreshContacts();
    }
  }

  onContactUpdated(contact: ContactEntity): void {
    this.messageService.showSuccess('Contact modifié avec succès', {
      title: 'Contact mis à jour',
      duration: 4000
    });
    this.onCloseContactFormModal();

    // Refresh client details modal contacts if open
    if (this.showDetailsModal && this.clientDetailsModal) {
      this.clientDetailsModal.refreshContacts();
    }
  }

  onEditClient(client: ClientEntity): void {
    this.editingClient = client;
    this.showEditForm = true;

    // Pré-remplir le formulaire avec les données du client
    this.clientForm.patchValue({
      name: client.name,
      type: client.type,
      email: client.email,
      phone: client.phone || '',
      address: client.address || '',
      siret: client.siret || '',
      sector: client.sector || '',
      website: client.website || '',
      notes: client.notes || ''
    });
  }

  onUpdateClient(): void {
    if (this.clientForm.valid && this.editingClient) {
      const currentUser = this.authFacade.getCurrentUser();
      if (!currentUser) {
        console.error('User not authenticated');
        return;
      }

      const updateData: UpdateClientRequest = {
        name: this.clientForm.value.name.trim(),
        type: this.clientForm.value.type,
        email: this.clientForm.value.email.trim(),
        phone: this.clientForm.value.phone?.trim() || undefined,
        address: this.clientForm.value.address?.trim() || undefined,
        siret: this.clientForm.value.siret?.trim() || undefined,
        sector: this.clientForm.value.sector?.trim() || undefined,
        website: this.clientForm.value.website?.trim() || undefined,
        notes: this.clientForm.value.notes?.trim() || undefined
      };

      this.clientFacade.updateClient(this.editingClient.id, updateData, currentUser.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.closeEditForm();
          this.loadClients();
        },
        error: (error) => {
          console.error('Failed to update client:', error);
        }
      });
    } else {
      this.markFormGroupTouched(this.clientForm);
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
    this.editingClient = null;
    this.resetCreateForm();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  onTypeFilterChange(type: 'all' | 'particulier' | 'entreprise'): void {
    this.selectedTypeFilter = type;
    this.loadClients();
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.loadClients();
  }

  onCategoryFilterChange(categoryId: number | 'all'): void {
    this.selectedCategoryFilter = categoryId;
    this.loadClients();
  }

  onCategoryTypeFilterChange(categoryType: CategoryType | 'all'): void {
    this.selectedCategoryTypeFilter = categoryType;
    this.loadClients();
  }

  clearCategoryFilters(): void {
    this.selectedCategoryFilter = 'all';
    this.selectedCategoryTypeFilter = 'all';
    this.loadClients();
  }

  onPageChange(page: number): void {
    this.clientFacade.setPage(page);
  }

  clearError(): void {
    this.clientFacade.clearError();
  }

  reset(): void {
    this.internalState$.next({
      clients: [],
      isLoading: false,
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      hasClients: false,
      error: null,
      pagination: null
    });
  }

  // Form helpers
  private createClientForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
      type: ['entreprise', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[\d\s\-\+\(\)\.]{8,20}$/)]],
      address: ['', [Validators.maxLength(500)]],
      siret: ['', [Validators.pattern(/^\d{14}$/)]],
      sector: ['', [Validators.maxLength(100)]],
      website: [''],
      notes: ['', [Validators.maxLength(1000)]]
    });
  }

  private resetCreateForm(): void {
    this.clientForm.reset({
      name: '',
      type: 'entreprise',
      email: '',
      phone: '',
      address: '',
      siret: '',
      sector: '',
      website: '',
      notes: ''
    });
    this.clientForm.markAsUntouched();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control && typeof control === 'object' && 'controls' in control) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  // Getters for template
  get nameControl() { return this.clientForm.get('name'); }
  get emailControl() { return this.clientForm.get('email'); }
  get phoneControl() { return this.clientForm.get('phone'); }
  get siretControl() { return this.clientForm.get('siret'); }
  get websiteControl() { return this.clientForm.get('website'); }

  // Helper methods for template
  getValidationError(controlName: string): string | null {
    const control = this.clientForm.get(controlName);
    if (control && control.touched && control.errors) {
      if (control.errors['required']) {
        return 'Ce champ est obligatoire';
      }
      if (control.errors['email']) {
        return 'Email invalide';
      }
      if (control.errors['minlength']) {
        return `Minimum ${control.errors['minlength'].requiredLength} caractères`;
      }
      if (control.errors['maxlength']) {
        return `Maximum ${control.errors['maxlength'].requiredLength} caractères`;
      }
      if (control.errors['pattern']) {
        if (controlName === 'phone') {
          return 'Numéro de téléphone invalide';
        }
        if (controlName === 'siret') {
          return 'Le SIRET doit contenir exactement 14 chiffres';
        }
        return 'Format invalide';
      }
    }
    return null;
  }

  formatClientType(type: string): string {
    return type === 'entreprise' ? 'Entreprise' : 'Particulier';
  }

  formatDate(date: Date | null): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  // Helper methods for pagination
  canGoToPreviousPage(state: ClientsState): boolean {
    return state.pagination ? state.pagination.currentPage > 1 : false;
  }

  canGoToNextPage(state: ClientsState): boolean {
    return state.pagination ? state.pagination.currentPage < state.pagination.totalPages : false;
  }

  getPreviousPage(state: ClientsState): number {
    return state.pagination ? state.pagination.currentPage - 1 : 1;
  }

  getNextPage(state: ClientsState): number {
    return state.pagination ? state.pagination.currentPage + 1 : 1;
  }

  // Getters for template pagination
  get currentPage(): number {
    const state = this.internalState$.getValue();
    return state.pagination?.currentPage || 1;
  }

  get totalPages(): number {
    const state = this.internalState$.getValue();
    return state.pagination?.totalPages || 0;
  }

  get totalItems(): number {
    const state = this.internalState$.getValue();
    return state.pagination?.totalItems || 0;
  }

  get hasPagination(): boolean {
    const state = this.internalState$.getValue();
    return !!(state.pagination && state.pagination.totalPages > 1);
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

  // Import/Export Modal Methods
  openImportExportModal(): void {
    this.showImportExportModal = true;
  }

  onCloseImportExportModal(): void {
    this.showImportExportModal = false;
  }

  onImportCompleted(): void {
    this.showImportExportModal = false;
    this.messageService.showSuccess('Import terminé avec succès');
    this.loadClients();
  }
}