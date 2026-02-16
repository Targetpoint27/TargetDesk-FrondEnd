import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ClientEntity } from '../../../domain/entities/client.entity';
import { ContactEntity } from '../../../domain/entities/contact.entity';
import { GetClientContactsUseCase } from '../../../domain/use-cases/contact/get-client-contacts.use-case';
import { DeleteContactUseCase } from '../../../domain/use-cases/contact/delete-contact.use-case';
import { MakePrimaryContactUseCase } from '../../../domain/use-cases/contact/make-primary-contact.use-case';
import { MessageService } from '../../services/message.service';
import { ClientCategoriesManagerComponent } from '../client-categories-manager/client-categories-manager.component';
import { ClientTimelineComponent } from '../client-timeline/client-timeline.component';

@Component({
  selector: 'app-client-details-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ClientCategoriesManagerComponent, ClientTimelineComponent],
  template: `
    <div class="modal-overlay" *ngIf="isVisible" (click)="onOverlayClick($event)">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <!-- Header ultra-compact -->
        <div class="modal-header">
          <h2 class="modal-title">{{ client?.name || 'Client' }}</h2>
          <button type="button" class="close-btn" (click)="onClose()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="modal-body" *ngIf="client">
          <!-- Layout en 2 colonnes -->
          <div class="two-column-layout">

            <!-- Colonne gauche : Informations client (40%) -->
            <div class="left-column">

              <!-- Infos principales compactes -->
              <div class="info-section">
                <h3>Informations</h3>
                <div class="info-grid">
                  <div class="info-row">
                    <span class="label">ID</span>
                    <span class="value mono">{{ client.clientId }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Type</span>
                    <span class="value badge" [class]="'type-' + client.type">{{ formatClientType(client.type) }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Statut</span>
                    <span class="value badge" [class]="client.isActive ? 'active' : 'inactive'">
                      {{ client.isActive ? 'Actif' : 'Inactif' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Contact principal -->
              <div class="info-section">
                <h3>Contact</h3>
                <div class="info-grid">
                  <div class="info-row" *ngIf="client.email">
                    <span class="label">Email</span>
                    <a [href]="'mailto:' + client.email" class="value link">{{ client.email }}</a>
                  </div>
                  <div class="info-row" *ngIf="client.phone">
                    <span class="label">Tél</span>
                    <a [href]="'tel:' + client.phone" class="value link">{{ client.phone }}</a>
                  </div>
                  <div class="info-row" *ngIf="client.website">
                    <span class="label">Web</span>
                    <a [href]="client.website" target="_blank" class="value link">{{ client.website }}</a>
                  </div>
                </div>
              </div>

              <!-- Adresse -->
              <div class="info-section" *ngIf="client.address">
                <h3>Adresse</h3>
                <div class="address-text">{{ client.address }}</div>
              </div>

              <!-- Entreprise -->
              <div class="info-section" *ngIf="client.type === 'entreprise' && (client.siret || client.sector)">
                <h3>Entreprise</h3>
                <div class="info-grid">
                  <div class="info-row" *ngIf="client.siret">
                    <span class="label">SIRET</span>
                    <span class="value mono">{{ client.siret }}</span>
                  </div>
                  <div class="info-row" *ngIf="client.sector">
                    <span class="label">Secteur</span>
                    <span class="value">{{ client.sector }}</span>
                  </div>
                </div>
              </div>

              <!-- Notes -->
              <div class="info-section" *ngIf="client.notes">
                <h3>Notes</h3>
                <div class="notes-text">{{ client.notes }}</div>
              </div>

              <!-- Champs personnalisés -->
              <div class="info-section" *ngIf="client.customFields && client.customFields.length > 0">
                <h3>Champs personnalisés</h3>
                <div class="custom-fields-display">
                  <div *ngFor="let field of client.customFields" class="custom-field-item">
                    <div class="info-row">
                      <span class="label">{{ field.field_key }}</span>
                      <span class="value">{{ field.field_value }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Système -->
              <div class="info-section system-info">
                <div class="system-grid">
                  <div class="system-item" *ngIf="client.createdBy">
                    <span class="label">Créé par</span>
                    <span class="value">{{ client.createdBy }}</span>
                  </div>
                  <div class="system-item">
                    <span class="label">Créé le</span>
                    <span class="value">{{ formatDate(client.createdAt) }}</span>
                  </div>
                  <div class="system-item">
                    <span class="label">Modifié le</span>
                    <span class="value">{{ formatDate(client.updatedAt) }}</span>
                  </div>
                </div>
              </div>

            </div>

            <!-- Colonne droite : Contacts et catégories (60%) -->
            <div class="right-column">

              <!-- Catégories en haut -->
              <div class="categories-section">
                <div class="section-header">
                  <h3>Catégories</h3>
                </div>
                <app-client-categories-manager [client]="client" class="categories-compact">
                </app-client-categories-manager>
              </div>

              <!-- Contacts -->
              <div class="contacts-section">
                <div class="section-header">
                  <h3>Contacts ({{ contacts.length }})</h3>
                  <button type="button" class="btn-small" (click)="onAddContact()">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Ajouter
                  </button>
                </div>

                <div class="contacts-container">
                  <!-- Loading -->
                  <div *ngIf="loadingContacts" class="loading-state">
                    <div class="spinner-mini"></div>
                    <span>Chargement...</span>
                  </div>

                  <!-- Empty -->
                  <div *ngIf="!loadingContacts && contacts.length === 0" class="empty-state">
                    <span>Aucun contact</span>
                    <button type="button" class="btn-link" (click)="onAddContact()">Ajouter le premier</button>
                  </div>

                  <!-- Contacts list compact -->
                  <div *ngIf="!loadingContacts && contacts.length > 0" class="contacts-list-compact">
                    <div *ngFor="let contact of contacts" class="contact-compact" [class.is-primary]="contact.is_primary">

                      <div class="contact-main">
                        <div class="contact-avatar-mini">{{ contact.getInitials() }}</div>

                        <div class="contact-info-mini">
                          <div class="contact-name-mini">
                            <span class="name">{{ contact.full_name }}</span>
                            <span *ngIf="contact.is_primary" class="primary-badge">PRINCIPAL</span>
                          </div>

                          <div class="contact-job-mini" *ngIf="contact['function'] || contact.department">
                            {{ contact['function'] }}{{ contact['function'] && contact.department ? ' - ' : '' }}{{ contact.department }}
                          </div>

                          <!-- Contact details inline -->
                          <div class="contact-details-mini">
                            <div *ngFor="let email of contact.emails.slice(0,1)" class="contact-detail-mini">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                <polyline points="22,6 12,13 2,6"/>
                              </svg>
                              <a [href]="'mailto:' + email.email" class="contact-link-mini">{{ email.email }}</a>
                            </div>

                            <div *ngFor="let phone of contact.phones.slice(0,1)" class="contact-detail-mini">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                              </svg>
                              <a [href]="'tel:' + phone.phone" class="contact-link-mini">{{ phone.getFormattedPhone() }}</a>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div class="contact-actions-mini">
                        <button type="button" class="btn-icon-mini" (click)="onEditContact(contact)" title="Modifier">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button type="button" class="btn-icon-mini star" *ngIf="!contact.is_primary" (click)="onMakePrimary(contact)" title="Principal">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                          </svg>
                        </button>
                        <button type="button" class="btn-icon-mini danger" *ngIf="!contact.is_primary" (click)="onDeleteContact(contact)" title="Supprimer">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Timeline -->
              <div class="timeline-section" *ngIf="client">
                <app-client-timeline [clientId]="client.id"></app-client-timeline>
              </div>

            </div>
          </div>
        </div>

        <!-- Footer minimal -->
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="onClose()">Fermer</button>
        </div>
      </div>
    </div>

    <!-- Modal Supprimer Contact -->
    <div class="modal-overlay" *ngIf="showDeleteContactModal" (click)="onCloseDeleteContactModal()">
      <div class="modal-container contact-delete-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="icon-container icon-danger">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.258c-.77-.833-2.694-.833-3.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
          </div>
        </div>

        <div class="modal-body" *ngIf="contactToDelete">
          <h3 class="modal-title">Supprimer le contact</h3>
          <p class="modal-message">Êtes-vous sûr de vouloir supprimer {{ contactToDelete.full_name }} ?</p>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" (click)="onCloseDeleteContactModal()" [disabled]="isDeletingContact">Annuler</button>
          <button type="button" class="btn btn-danger" (click)="onConfirmDeleteContact()" [disabled]="isDeletingContact">
            <span *ngIf="isDeletingContact" class="spinner"></span>
            {{ isDeletingContact ? 'Suppression...' : 'Supprimer' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./client-details-modal.component.scss']
})
export class ClientDetailsModalComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isVisible = false;
  @Input() client: ClientEntity | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() addContact = new EventEmitter<{ clientId: number; type: 'client' }>();
  @Output() editContact = new EventEmitter<ContactEntity>();

  contacts: ContactEntity[] = [];
  loadingContacts = false;

  // États pour les actions
  isDeletingContact = false;
  isMakingPrimary = false;
  actionInProgress = false;

  // États pour les modales
  showDeleteContactModal = false;

  // Contact en cours de suppression
  contactToDelete: ContactEntity | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private getClientContactsUseCase: GetClientContactsUseCase,
    private deleteContactUseCase: DeleteContactUseCase,
    private makePrimaryContactUseCase: MakePrimaryContactUseCase,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService
  ) {}

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  ngOnInit(): void {
    // Initialisation du composant
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Charger les contacts quand le client change OU quand la modal devient visible
    if ((changes['client'] || changes['isVisible']) && this.client && this.isVisible) {
      this.loadContacts();
    }

    // Réinitialiser l'état quand la modal se ferme
    if (changes['isVisible'] && !this.isVisible) {
      this.resetContactsState();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClose(): void {
    this.closed.emit();
  }

  private loadContacts(): void {
    if (!this.client || !this.isVisible) return;

    this.loadingContacts = true;
    this.cdr.detectChanges();

    this.getClientContactsUseCase.execute(this.client.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.contacts = response.contacts;
          this.loadingContacts = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Erreur lors du chargement des contacts:', error);
          this.contacts = [];
          this.loadingContacts = false;
          this.cdr.detectChanges();
        }
      });
  }

  private resetContactsState(): void {
    this.contacts = [];
    this.loadingContacts = false;
    this.isDeletingContact = false;
    this.isMakingPrimary = false;
    this.actionInProgress = false;
    this.showDeleteContactModal = false;
    this.contactToDelete = null;
    this.cdr.detectChanges();
  }

  onAddContact(): void {
    if (!this.client || this.actionInProgress) return;
    this.addContact.emit({ clientId: this.client.id, type: 'client' });
  }

  onManageCategories(): void {
    // Méthode pour gérer les catégories
    console.log('Gérer les catégories');
  }

  onEditContact(contact: ContactEntity): void {
    if (this.actionInProgress) return;
    this.editContact.emit(contact);
  }

  onMakePrimary(contact: ContactEntity): void {
    if (this.actionInProgress || contact.is_primary) return;

    this.isMakingPrimary = true;
    this.actionInProgress = true;
    this.cdr.detectChanges();

    this.makePrimaryContactUseCase.execute(contact.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          console.log('Contact défini comme principal:', contact.full_name);
          this.messageService.showSuccess(`${contact.full_name} défini comme contact principal`, {
            title: 'Contact principal modifié',
            duration: 4000
          });
          this.isMakingPrimary = false;
          this.actionInProgress = false;
          this.loadContacts();
        },
        error: (error) => {
          console.error('Erreur lors de la définition du contact principal:', error);
          this.isMakingPrimary = false;
          this.actionInProgress = false;
          this.cdr.detectChanges();
          alert('Erreur lors de la définition du contact principal. Veuillez réessayer.');
        }
      });
  }

  onDeleteContact(contact: ContactEntity): void {
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

    this.deleteContactUseCase.execute(this.contactToDelete.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.showSuccess('Contact supprimé avec succès', {
            title: 'Suppression réussie',
            duration: 4000
          });
          this.isDeletingContact = false;
          this.actionInProgress = false;
          this.loadContacts();
          this.onCloseDeleteContactModal();
        },
        error: (error) => {
          console.error('Erreur lors de la suppression du contact:', error);
          this.isDeletingContact = false;
          this.actionInProgress = false;
          this.cdr.detectChanges();
        }
      });
  }

  // Public method to refresh contacts from outside
  refreshContacts(): void {
    this.loadContacts();
  }

  formatClientType(type: string): string {
    return type === 'entreprise' ? 'Entreprise' : 'Particulier';
  }

  formatDate(date: Date | null): string {
    if (!date) return '-';
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}