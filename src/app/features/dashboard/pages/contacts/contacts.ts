import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, combineLatest, map } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ContactEntity, ContactFilters, ContactPagination } from '../../../../domain/entities/contact.entity';
import { ContactFacade, ContactsState } from '../../../../application/facades/contact.facade';
import { ContactRepository } from '../../../../domain/repositories/contact.repository';
import { ContactApiRepository } from '../../../../infrastructure/repositories/contact-api.repository';
import { ContactFormModalComponent } from '../../../../shared/components/contact-form-modal/contact-form-modal.component';
import { ContactDetailsModalComponent } from '../../../../shared/components/contact-details-modal/contact-details-modal.component';
import { SimpleNotificationService } from '../../../../shared/services/simple-notification.service';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule, ContactFormModalComponent, ContactDetailsModalComponent],
  providers: [
    { provide: ContactRepository, useClass: ContactApiRepository }
  ],
  templateUrl: './contacts.html',
  styleUrls: ['./contacts.scss']
})
export class ContactsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // États observables
  contacts$: Observable<ContactEntity[]>;
  isLoading$: Observable<boolean>;
  error$: Observable<string | null>;
  pagination$: Observable<ContactPagination | null>;
  filters$: Observable<ContactFilters>;

  // États dérivés pour l'interface
  isEmpty$: Observable<boolean>;
  hasContacts$: Observable<boolean>;
  currentPage$: Observable<number>;
  totalPages$: Observable<number>;
  canGoPrevious$: Observable<boolean>;
  canGoNext$: Observable<boolean>;

  // Propriétés pour les formulaires
  searchTerm = '';
  selectedEntityType: 'client' | 'supplier' | '' = '';

  // États des modales
  showCreateModal = false;
  showDetailsModal = false;
  selectedContact: ContactEntity | null = null;
  selectedContactForEdit: ContactEntity | null = null;

  // États pour les actions
  isDeletingContact = false;
  isMakingPrimary = false;
  actionInProgress = false;

  // États pour les modales
  showDeleteContactModal = false;

  // Contact en cours de suppression
  contactToDelete: ContactEntity | null = null;

  constructor(
    private contactFacade: ContactFacade,
    private notificationService: SimpleNotificationService,
    private cdr: ChangeDetectorRef
  ) {
    // Initialisation des observables
    this.contacts$ = this.contactFacade.contacts$;
    this.isLoading$ = this.contactFacade.contactsLoading$;
    this.error$ = this.contactFacade.contactsError$;
    this.pagination$ = this.contactFacade.contactsPagination$;
    this.filters$ = this.contactFacade.contactsFilters$;

    // États dérivés
    this.isEmpty$ = combineLatest([this.contacts$, this.isLoading$]).pipe(
      map(([contacts, isLoading]) => !isLoading && contacts.length === 0)
    );

    this.hasContacts$ = this.contacts$.pipe(
      map(contacts => contacts.length > 0)
    );

    this.currentPage$ = this.pagination$.pipe(
      map(pagination => pagination?.current_page || 1)
    );

    this.totalPages$ = this.pagination$.pipe(
      map(pagination => pagination?.total_pages || 1)
    );

    this.canGoPrevious$ = this.currentPage$.pipe(
      map(currentPage => currentPage > 1)
    );

    this.canGoNext$ = combineLatest([this.currentPage$, this.totalPages$]).pipe(
      map(([currentPage, totalPages]) => currentPage < totalPages)
    );
  }

  ngOnInit(): void {
    // Charger les contacts au démarrage
    this.contactFacade.loadContacts();

    // Configuration de la recherche avec debounce
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Méthodes de recherche et filtrage
  onSearchChange(): void {
    this.triggerSearch(this.searchTerm);
  }

  onEntityTypeChange(): void {
    const entityType = this.selectedEntityType === '' ? undefined : this.selectedEntityType as 'client' | 'supplier';
    this.cdr.detectChanges();
    this.contactFacade.filterContactsByEntityType(entityType);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedEntityType = '';
    this.cdr.detectChanges();

    // Appeler loadContacts directement avec des filtres vides pour éviter le problème de timing
    this.contactFacade.loadContacts({ page: 1, per_page: 15 });
  }

  // Méthodes de pagination
  onPageChange(page: number): void {
    this.contactFacade.changePage(page);
  }

  onPreviousPage(): void {
    this.currentPage$.pipe(takeUntil(this.destroy$)).subscribe(currentPage => {
      if (currentPage > 1) {
        this.onPageChange(currentPage - 1);
      }
    });
  }

  onNextPage(): void {
    combineLatest([this.currentPage$, this.totalPages$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([currentPage, totalPages]) => {
        if (currentPage < totalPages) {
          this.onPageChange(currentPage + 1);
        }
      });
  }

  // Méthodes d'actions sur les contacts
  viewContact(contact: ContactEntity): void {
    this.selectedContact = contact;
    this.contactFacade.loadContactDetails(contact.id);
    this.showDetailsModal = true;
  }

  editContact(contact: ContactEntity): void {
    this.selectedContactForEdit = contact;
    this.showCreateModal = true;
  }

  createNewContact(): void {
    this.selectedContactForEdit = null;
    this.showCreateModal = true;
  }

  makePrimary(contact: ContactEntity): void {
    if (contact.is_primary || this.actionInProgress) {
      return; // Déjà principal ou action en cours
    }

    this.isMakingPrimary = true;
    this.actionInProgress = true;
    this.cdr.detectChanges();

    this.contactFacade.makePrimaryContact(contact.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.notificationService.showSuccess(`${contact.full_name} défini comme contact principal`, 'Contact principal modifié');
          this.isMakingPrimary = false;
          this.actionInProgress = false;
        },
        error: (error) => {
          this.notificationService.showError('Erreur lors de la définition du contact principal. Veuillez réessayer.', 'Erreur');
          this.isMakingPrimary = false;
          this.actionInProgress = false;
          this.cdr.detectChanges();
        }
      });
  }

  deleteContact(contact: ContactEntity): void {
    if (this.actionInProgress) return;
    this.contactToDelete = contact;
    this.showDeleteContactModal = true;
  }

  onCloseDeleteContactModal(): void {
    this.showDeleteContactModal = false;
    this.contactToDelete = null;
  }

  onConfirmDeleteContact(): void {
    if (!this.contactToDelete || this.actionInProgress) return;

    this.isDeletingContact = true;
    this.actionInProgress = true;
    this.cdr.detectChanges();

    this.contactFacade.deleteContact(this.contactToDelete.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Contact supprimé avec succès', 'Suppression réussie');
          this.isDeletingContact = false;
          this.actionInProgress = false;
          this.onCloseDeleteContactModal();
        },
        error: (error) => {
          this.notificationService.showError('Erreur lors de la suppression du contact. Veuillez réessayer.', 'Erreur de suppression');
          this.isDeletingContact = false;
          this.actionInProgress = false;
          this.cdr.detectChanges();
        }
      });
  }

  // Méthodes utilitaires pour l'affichage
  getEntityBadgeClass(entityType: string): string {
    return entityType === 'client' ? 'badge-client' : 'badge-supplier';
  }

  getEntityDisplayName(entityType: string): string {
    return entityType === 'client' ? 'Client' : 'Fournisseur';
  }

  getPrimaryBadgeClass(isPrimary: boolean): string {
    return isPrimary ? 'badge-primary' : 'badge-secondary';
  }

  getContactInitials(contact: ContactEntity): string {
    return contact.getInitials();
  }

  formatPhone(phone: string | null): string {
    if (!phone) return '';

    // Format français : 01 23 45 67 89
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    return phone;
  }

  // Méthodes de gestion des modales
  onCreateModalClose(): void {
    this.showCreateModal = false;
    this.selectedContactForEdit = null;
  }

  onDetailsModalClose(): void {
    this.showDetailsModal = false;
    this.selectedContact = null;
    this.contactFacade.clearContactDetails();
  }

  onContactCreated(contact: ContactEntity): void {
    this.onCreateModalClose();
    this.notificationService.showSuccess('Le contact a été créé avec succès', 'Contact créé');
  }

  onContactUpdated(contact: ContactEntity): void {
    this.onCreateModalClose();
    this.notificationService.showSuccess('Le contact a été mis à jour avec succès', 'Contact modifié');
  }


  onRefresh(): void {
    this.filters$.pipe(takeUntil(this.destroy$)).subscribe(filters => {
      this.contactFacade.loadContacts(filters);
    });
  }

  // Configuration du debounce pour la recherche
  private setupSearchDebounce(): void {
    // Créer un subject pour la recherche
    const searchSubject$ = new Subject<string>();

    searchSubject$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.contactFacade.searchContacts(searchTerm);
    });

    // Méthode pour déclencher la recherche
    this.triggerSearch = (term: string) => {
      searchSubject$.next(term);
    };
  }

  triggerSearch = (term: string) => {
    // Cette méthode sera redéfinie dans setupSearchDebounce
  };

  // Getters pour faciliter l'utilisation dans les templates
  get canGoPrevious(): Observable<boolean> {
    return this.canGoPrevious$;
  }

  get canGoNext(): Observable<boolean> {
    return this.canGoNext$;
  }

  get currentPage(): Observable<number> {
    return this.currentPage$;
  }

  get totalPages(): Observable<number> {
    return this.totalPages$;
  }

  get paginationInfo(): Observable<string> {
    return combineLatest([this.pagination$, this.contacts$]).pipe(
      map(([pagination, contacts]) => {
        if (!pagination || contacts.length === 0) return '';

        const start = ((pagination.current_page - 1) * pagination.per_page) + 1;
        const end = Math.min(start + contacts.length - 1, pagination.total_items);

        return `Affichage de ${start} à ${end} sur ${pagination.total_items} contacts`;
      })
    );
  }

  // Méthodes pour les helpers de pagination (compatibilité template)
  getCurrentPage(): number {
    let currentPage = 1;
    this.currentPage$.pipe(takeUntil(this.destroy$)).subscribe(page => currentPage = page);
    return currentPage;
  }

  getTotalPages(): number {
    let totalPages = 1;
    this.totalPages$.pipe(takeUntil(this.destroy$)).subscribe(pages => totalPages = pages);
    return totalPages;
  }

  getCanGoPrevious(): boolean {
    let canGo = false;
    this.canGoPrevious$.pipe(takeUntil(this.destroy$)).subscribe(can => canGo = can);
    return canGo;
  }

  getCanGoNext(): boolean {
    let canGo = false;
    this.canGoNext$.pipe(takeUntil(this.destroy$)).subscribe(can => canGo = can);
    return canGo;
  }
}