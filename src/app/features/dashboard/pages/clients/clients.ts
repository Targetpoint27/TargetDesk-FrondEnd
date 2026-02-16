/**
 * Clients Page Component
 * Manages client listing, creation, and operations
 */

import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subject, takeUntil, combineLatest, map, BehaviorSubject } from 'rxjs';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ClientDetailsModalComponent } from '../../../../shared/components/client-details-modal/client-details-modal.component';
import { ContactFormModalComponent } from '../../../../shared/components/contact-form-modal/contact-form-modal.component';
import { CategoryBadgesListComponent } from '../../../../shared/components/category-badges-list/category-badges-list.component';
import { CategorySelectorComponent } from '../../../../shared/components/category-selector/category-selector.component';
import { ImportExportModalComponent } from '../../../../shared/components/import-export-modal/import-export-modal.component';
import { QuickSearchComponent } from '../../../../shared/components/quick-search/quick-search.component';

import { ClientFacade } from '../../clients/client.facade';
import { AuthFacade } from '../../../auth/auth.facade';
import { ClientEntity } from '../../../../domain/entities/client.entity';
import { CategoryEntity } from '../../../../domain/entities/category.entity';
import { ContactEntity } from '../../../../domain/entities/contact.entity';
import { CreateClientRequest, UpdateClientRequest, CustomFieldRequest } from '../../../../domain/repositories/client.repository';
import { UserEntity } from '../../../../domain/entities/user.entity';
import { AppError } from '../../../../core/error/error.service';
import { SimpleNotificationService } from '../../../../shared/services/simple-notification.service';
import { SearchResult } from '../../../../shared/interfaces/search.interface';
import { PermissionService } from '../../../../core/auth/permission.service';
import { PERMISSIONS } from '../../../../domain/models/permission.models';

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
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ConfirmationModalComponent, ClientDetailsModalComponent, ContactFormModalComponent, CategoryBadgesListComponent, CategorySelectorComponent, ImportExportModalComponent, QuickSearchComponent],
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

  // Permission Observables
  canCreateClient$!: Observable<boolean>;
  canUpdateClient$!: Observable<boolean>;
  canDeleteClient$!: Observable<boolean>;
  canExportClients$!: Observable<boolean>;

  // Forms
  clientForm: FormGroup;

  // UI State
  showCreateForm = false;
  showEditForm = false;
  showFilters = false;

  // Stable loading states
  isCreatingClient = false;
  isUpdatingClient = false;

  // Category selection state
  selectedCategoryIds: number[] = [];
  selectedTypeFilter: 'all' | 'particulier' | 'entreprise' = 'all';
  selectedCategoryFilter: 'all' | number = 'all';
  selectedCategoryTypeFilter: 'all' | string = 'all';
  availableCategories: CategoryEntity[] = [];
  searchQuery = '';
  editingClient: ClientEntity | null = null;

  // Custom fields management
  customFields: CustomFieldRequest[] = [];

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

  constructor(
    private clientFacade: ClientFacade,
    private authFacade: AuthFacade,
    private fb: FormBuilder,
    private notificationService: SimpleNotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private permissionService: PermissionService
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
        // Update stable loading states
        this.isCreatingClient = isCreating;
        this.isUpdatingClient = isUpdating;

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
    // Initialize permission observables
    this.canCreateClient$ = this.permissionService.hasPermission(PERMISSIONS.CLIENTS_CREATE);
    this.canUpdateClient$ = this.permissionService.hasPermission(PERMISSIONS.CLIENTS_UPDATE);
    this.canDeleteClient$ = this.permissionService.hasPermission(PERMISSIONS.CLIENTS_DELETE);
    this.canExportClients$ = this.permissionService.hasPermission(PERMISSIONS.CLIENTS_EXPORT);

    // Load clients on component initialization
    this.clientFacade.loadClients().subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Data operations
  loadClients(): void {
    const filters: any = {};

    // Only add type filter if it's not 'all' and has a valid value
    if (this.selectedTypeFilter && this.selectedTypeFilter !== 'all') {
      filters.type = this.selectedTypeFilter;
    }

    // Only add search filter if query is not empty
    if (this.searchQuery && this.searchQuery.trim()) {
      filters.search = this.searchQuery.trim();
    }

    console.log('Loading clients with filters:', filters); // Debug log
    this.clientFacade.loadClients(filters).subscribe();
  }

  onCreateClient(): void {
    if (this.isFormValid) {
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
        notes: this.clientForm.value.notes?.trim() || undefined,
        category_ids: this.getSelectedCategoryIds(),
        custom_fields: this.getCustomFieldsData()
      };

      this.clientFacade.createClient(clientData, currentUser.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.notificationService.showSuccess(
            'Le client a été créé avec succès',
            'Client créé'
          );
          this.resetFormAndClose();
        },
        error: (error) => {
          // L'erreur est déjà gérée par le ClientFacade qui affiche le message
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
        this.notificationService.showSuccess(
          `Le client "${this.clientToDelete!.name}" a été supprimé avec succès`,
          'Client supprimé'
        );
        this.onCancelDelete();
      },
      error: (error) => {
        this.notificationService.showError(
          error?.message || 'Une erreur est survenue lors de la suppression du client',
          'Erreur de suppression'
        );
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
    this.router.navigate(['/dashboard/clients', client.id]);
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
    this.notificationService.showSuccess(
      'Contact créé avec succès',
      'Contact ajouté'
    );
    this.onCloseContactFormModal();

    // Refresh client details modal contacts if open
    if (this.showDetailsModal && this.clientDetailsModal) {
      this.clientDetailsModal.refreshContacts();
    }
  }

  onContactUpdated(contact: ContactEntity): void {
    this.notificationService.showSuccess(
      'Contact modifié avec succès',
      'Contact mis à jour'
    );
    this.onCloseContactFormModal();

    // Refresh client details modal contacts if open
    if (this.showDetailsModal && this.clientDetailsModal) {
      this.clientDetailsModal.refreshContacts();
    }
  }

  onEditClient(client: ClientEntity): void {
    this.editingClient = client;
    this.showCreateForm = true;
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

    // Load custom fields
    this.loadClientCustomFields(client);

    // Si les catégories ne sont pas déjà chargées, les récupérer du backend
    if (!client.categories || client.categories.length === 0) {
      console.log('Categories not loaded, fetching client details...');
      this.loadClientWithCategories(client.id);
    } else {
      console.log('Categories already loaded, using existing data');
      this.loadClientCategories(client);
    }
  }

  onUpdateClient(): void {
    if (this.isFormValid && this.editingClient) {
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
        notes: this.clientForm.value.notes?.trim() || undefined,
        category_ids: this.getSelectedCategoryIds(),
        custom_fields: this.getCustomFieldsData()
      };

      this.clientFacade.updateClient(this.editingClient.id, updateData, currentUser.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.notificationService.showSuccess(
            'Le client a été modifié avec succès',
            'Client mis à jour'
          );
          this.closeForm();
        },
        error: (error) => {
          // L'erreur est déjà gérée par le ClientFacade qui affiche le message
        }
      });
    } else {
      this.markFormGroupTouched(this.clientForm);
    }
  }

  // UI Actions
  openCreateForm(): void {
    this.showCreateForm = true;
    this.selectedCategoryIds = [];
    this.resetCreateForm();
  }

  closeCreateForm(): void {
    this.closeForm();
  }

  resetFormAndClose(): void {
    this.closeForm();
  }

  closeForm(): void {
    this.showCreateForm = false;
    this.showEditForm = false;
    this.editingClient = null;
    this.selectedCategoryIds = [];
    this.resetCreateForm();
  }


  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  onTypeFilterChange(type: any): void {
    console.log('Type filter changed to:', type); // Debug log
    this.selectedTypeFilter = type as 'all' | 'particulier' | 'entreprise';

    // Use facade's setTypeFilter method instead of loadClients directly
    if (type === 'all') {
      this.clientFacade.setTypeFilter(undefined);
    } else {
      this.clientFacade.setTypeFilter(type);
    }
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.clientFacade.setSearch(query);
  }




  // Category management for editing
  private loadClientWithCategories(clientId: number): void {
    console.log('Loading client details with categories for ID:', clientId);

    this.clientFacade.getClientById(clientId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (client) => {
        if (client) {
          console.log('Client details loaded:', client);
          console.log('Client categories from backend:', client.categories);

          // Update the editingClient with the complete data
          this.editingClient = client;

          // Load categories
          this.loadClientCategories(client);

          // Load custom fields
          this.loadClientCustomFields(client);
        } else {
          console.log('Client not found');
          this.selectedCategoryIds = [];
        }
      },
      error: (error) => {
        console.error('Error loading client details:', error);
        this.selectedCategoryIds = [];
      }
    });
  }

  private loadClientCategories(client: ClientEntity): void {
    console.log('Loading client categories for client:', client);
    console.log('Client categories:', client.categories);

    // Clear existing categories from FormArray
    const categoriesArray = this.categoriesFormArray;
    while (categoriesArray.length) {
      categoriesArray.removeAt(0);
    }

    // Load client's existing categories
    if (client.categories && client.categories.length > 0) {
      const categoryIds = client.categories.map(category => category.id);
      console.log('Category IDs found:', categoryIds);

      // Create a new array reference to trigger change detection
      this.selectedCategoryIds = [...categoryIds];

      // Also update the FormArray for consistency
      categoryIds.forEach(id => {
        categoriesArray.push(this.fb.control(id));
      });

      console.log('selectedCategoryIds set to:', this.selectedCategoryIds);

      // Force change detection to ensure CategorySelector receives the update
      this.cdr.detectChanges();
    } else {
      console.log('No categories found for client');
      this.selectedCategoryIds = [];
      this.cdr.detectChanges();
    }
  }

  // NOUVELLES MÉTHODES POUR LA RECHERCHE AVANCÉE

  /**
   * Gestionnaire pour la sélection d'un résultat de recherche rapide
   */
  onQuickSearchResultSelected(result: SearchResult): void {
    // Naviguer vers le client sélectionné ou ouvrir les détails
    const client = this.findClientById(result.id);
    if (client) {
      this.onViewClient(client);
    } else {
      // Si le client n'est pas dans la liste actuelle, le charger
      this.router.navigate(['/dashboard/clients', result.id]);
    }
  }

  /**
   * Gestionnaire pour les changements de recherche rapide
   */
  onQuickSearchChanged(query: string): void {
    // Optionellement, synchroniser avec le filtre de recherche général
    if (query.length >= 2) {
      this.searchQuery = query;
      this.clientFacade.setSearch(query);
    } else if (query.length === 0) {
      this.searchQuery = '';
      this.clientFacade.setSearch('');
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
      sector: this.sectorFilter || undefined,
      sort_by: this.sortBy,
      sort_order: this.sortOrder,
      created_from: this.createdFromFilter || undefined,
      created_to: this.createdToFilter || undefined,
      page: 1
    };

    this.clientFacade.setFilters(filters);
  }

  /**
   * Vérifier si des filtres sont actifs
   */
  hasActiveFilters(): boolean {
    return !!(
      this.searchQuery ||
      this.selectedTypeFilter !== 'all' ||
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
    if (this.sectorFilter) count++;
    if (this.createdFromFilter) count++;
    if (this.createdToFilter) count++;
    if (this.sortBy !== 'name') count++;
    if (this.sortOrder !== 'asc') count++;
    return count;
  }

  /**
   * Effacer tous les filtres (mise à jour pour inclure les nouveaux filtres)
   */
  clearAllFilters(): void {
    this.selectedTypeFilter = 'all';
    this.selectedCategoryFilter = 'all';
    this.selectedCategoryTypeFilter = 'all';
    this.searchQuery = '';
    this.sectorFilter = '';
    this.sortBy = 'name';
    this.sortOrder = 'asc';
    this.createdFromFilter = '';
    this.createdToFilter = '';

    this.clientFacade.setFilters({});
  }

  /**
   * Trouver un client par ID dans la liste actuelle
   */
  private findClientById(id: number): ClientEntity | undefined {
    const state = this.internalState$.getValue();
    return state.clients.find(client => client.id === id);
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
      email: ['', [Validators.email]],
      phone: ['', [Validators.pattern(/^[\d\s\-\+\(\)\.]{8,20}$/)]],
      address: ['', [Validators.maxLength(500)]],
      siret: ['', [Validators.pattern(/^\d{14}$/)]],
      sector: ['', [Validators.maxLength(100)]],
      website: [''],
      notes: ['', [Validators.maxLength(1000)]],
      categories: this.fb.array([]) // FormArray pour les catégories sélectionnées
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
    // Réinitialiser le FormArray des catégories
    const categoriesArray = this.clientForm.get('categories') as FormArray;
    while (categoriesArray.length) {
      categoriesArray.removeAt(0);
    }
    // Reset custom fields
    this.customFields = [];
    this.clientForm.markAsUntouched();
  }

  // Getter pour le FormArray des catégories
  get categoriesFormArray(): FormArray {
    return this.clientForm.get('categories') as FormArray;
  }

  // Méthodes pour gérer la sélection des catégories
  onCategoriesChanged(selectedCategoryIds: number[]): void {
    // Update the component state
    this.selectedCategoryIds = [...selectedCategoryIds];

    // Update the FormArray for consistency
    const categoriesArray = this.categoriesFormArray;

    // Vider le FormArray
    while (categoriesArray.length) {
      categoriesArray.removeAt(0);
    }

    // Ajouter les nouvelles catégories sélectionnées
    selectedCategoryIds.forEach(id => {
      categoriesArray.push(this.fb.control(id));
    });
  }

  getSelectedCategoryIds(): number[] {
    return this.selectedCategoryIds.length > 0 ? this.selectedCategoryIds : this.categoriesFormArray.value || [];
  }

  // Custom fields management methods
  addCustomField(): void {
    this.customFields.push({
      field_key: '',
      field_value: ''
    });
  }

  removeCustomField(index: number): void {
    if (this.customFields.length > 0 && index >= 0 && index < this.customFields.length) {
      this.customFields.splice(index, 1);
    }
  }

  updateCustomFieldKey(index: number, key: string): void {
    if (this.customFields[index]) {
      this.customFields[index].field_key = key;
    }
  }

  updateCustomFieldValue(index: number, value: string): void {
    if (this.customFields[index]) {
      this.customFields[index].field_value = value;
    }
  }

  getCustomFieldsData(): CustomFieldRequest[] {
    return this.customFields.filter(field =>
      field.field_key && field.field_key.trim() &&
      field.field_value && field.field_value.trim()
    ).map(field => ({
      field_key: field.field_key.trim(),
      field_value: field.field_value.trim()
    }));
  }

  private loadClientCustomFields(client: ClientEntity): void {
    // Load custom fields from client entity
    if (client.customFields && client.customFields.length > 0) {
      this.customFields = client.customFields.map(field => ({
        field_key: field.field_key,
        field_value: field.field_value
      }));
    } else {
      this.customFields = [];
    }
    // Force change detection to update the UI
    this.cdr.detectChanges();
  }

  trackByIndex(index: number, item: any): number {
    return index;
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

  // Error handling methods
  private handleClientCreationError(error: any): void {
    if (error?.validationErrors) {
      this.handleSpecificValidationErrors(error.validationErrors, 'création');
    } else {
      this.notificationService.showError(
        error?.message || 'Une erreur est survenue lors de la création du client',
        'Erreur de création'
      );
    }
  }

  private handleClientUpdateError(error: any): void {
    if (error?.validationErrors) {
      this.handleSpecificValidationErrors(error.validationErrors, 'modification');
    } else {
      this.notificationService.showError(
        error?.message || 'Une erreur est survenue lors de la modification du client',
        'Erreur de modification'
      );
    }
  }

  private handleSpecificValidationErrors(validationErrors: { [key: string]: string[] }, operation: string): void {
    const errorMessages: string[] = [];

    Object.entries(validationErrors).forEach(([field, messages]) => {
      if (field === 'siret') {
        // Gestion spécifique des erreurs SIRET
        messages.forEach(message => {
          if (message.toLowerCase().includes('unique') || message.toLowerCase().includes('doublon') ||
              message.toLowerCase().includes('déjà') || message.toLowerCase().includes('exist')) {
            errorMessages.push('Ce numéro SIRET est déjà utilisé par un autre client');
          } else if (message.toLowerCase().includes('format') || message.toLowerCase().includes('invalid') ||
                     message.toLowerCase().includes('14') || message.toLowerCase().includes('chiffres')) {
            errorMessages.push('Le SIRET doit contenir exactement 14 chiffres');
          } else {
            errorMessages.push(`SIRET: ${message}`);
          }
        });
      } else if (field === 'email') {
        // Gestion spécifique des erreurs email
        messages.forEach(message => {
          if (message.toLowerCase().includes('unique') || message.toLowerCase().includes('doublon') ||
              message.toLowerCase().includes('déjà') || message.toLowerCase().includes('exist')) {
            errorMessages.push('Cette adresse email est déjà utilisée par un autre client');
          } else if (message.toLowerCase().includes('format') || message.toLowerCase().includes('invalid')) {
            errorMessages.push('L\'adresse email n\'est pas valide');
          } else {
            errorMessages.push(`Email: ${message}`);
          }
        });
      } else if (field === 'name') {
        // Gestion spécifique des erreurs nom
        messages.forEach(message => {
          if (message.toLowerCase().includes('unique') || message.toLowerCase().includes('doublon') ||
              message.toLowerCase().includes('déjà') || message.toLowerCase().includes('exist')) {
            errorMessages.push('Un client avec ce nom existe déjà');
          } else {
            errorMessages.push(`Nom: ${message}`);
          }
        });
      } else if (field === 'phone') {
        // Gestion spécifique des erreurs téléphone
        messages.forEach(message => {
          if (message.toLowerCase().includes('format') || message.toLowerCase().includes('invalid')) {
            errorMessages.push('Le numéro de téléphone n\'est pas valide');
          } else {
            errorMessages.push(`Téléphone: ${message}`);
          }
        });
      } else {
        // Autres champs
        const fieldName = this.getFieldDisplayName(field);
        messages.forEach(message => {
          errorMessages.push(`${fieldName}: ${message}`);
        });
      }
    });

    const title = operation === 'création' ? 'Erreurs de création' : 'Erreurs de modification';

    if (errorMessages.length > 0) {
      this.notificationService.showError(
        errorMessages.join('\n'),
        title
      );
    } else {
      this.notificationService.showError(
        `Une erreur de validation est survenue lors de la ${operation} du client`,
        title
      );
    }
  }

  private getFieldDisplayName(field: string): string {
    const fieldNames: { [key: string]: string } = {
      'name': 'Nom',
      'email': 'Email',
      'phone': 'Téléphone',
      'address': 'Adresse',
      'siret': 'SIRET',
      'sector': 'Secteur',
      'website': 'Site web',
      'notes': 'Notes',
      'type': 'Type'
    };
    return fieldNames[field] || field;
  }

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

  // Form validation including custom fields
  get isFormValid(): boolean {
    // Check basic form validation
    if (!this.clientForm.valid) {
      return false;
    }

    // Check custom fields validation - fields must have both key and value if one is filled
    for (const field of this.customFields) {
      const hasKey = field.field_key && field.field_key.trim().length > 0;
      const hasValue = field.field_value && field.field_value.trim().length > 0;

      // If one is filled but not the other, form is invalid
      if (hasKey !== hasValue) {
        return false;
      }
    }

    return true;
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

  onPageChange(page: number): void {
    const filters = {
      page: page,
      search: this.searchQuery || undefined,
      type: this.selectedTypeFilter !== 'all' ? this.selectedTypeFilter : undefined
    };
    this.clientFacade.setPage(page);
  }

  getPageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const delta = 2; // Number of pages to show on each side of current page

    if (total <= 7) {
      // Show all pages if total is small
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const range = [];
    const start = Math.max(1, current - delta);
    const end = Math.min(total, current + delta);

    // Always show first page
    if (start > 1) {
      range.push(1);
      if (start > 2) {
        range.push(-1); // Placeholder for ellipsis
      }
    }

    // Show pages around current
    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    // Always show last page
    if (end < total) {
      if (end < total - 1) {
        range.push(-1); // Placeholder for ellipsis
      }
      range.push(total);
    }

    return range;
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
    this.notificationService.showSuccess(
      'Import terminé avec succès',
      'Import terminé'
    );
    this.loadClients();
  }

  // Overlay Panel Methods - removed onFormPanelBackgroundClick as it's now handled by form-backdrop
}