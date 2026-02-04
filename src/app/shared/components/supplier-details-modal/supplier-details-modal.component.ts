import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { PermissionService } from '../../../core/auth/permission.service';
import { PERMISSIONS } from '../../../domain/models/permission.models';

import { SupplierEntity } from '../../../domain/entities/supplier.entity';
import { ContactEntity } from '../../../domain/entities/contact.entity';
import { GetSupplierContactsUseCase } from '../../../domain/use-cases/contact/get-supplier-contacts.use-case';
import { DeleteContactUseCase } from '../../../domain/use-cases/contact/delete-contact.use-case';
import { MakePrimaryContactUseCase } from '../../../domain/use-cases/contact/make-primary-contact.use-case';
import { MessageService } from '../../services/message.service';
import { SupplierDocumentsComponent } from '../supplier-documents/supplier-documents.component';

@Component({
  selector: 'app-supplier-details-modal',
  standalone: true,
  imports: [CommonModule, SupplierDocumentsComponent],
  providers: [
    GetSupplierContactsUseCase,
    DeleteContactUseCase,
    MakePrimaryContactUseCase
  ],
  template: `
    <div class="modal-overlay" *ngIf="isVisible" (click)="onOverlayClick($event)">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2 class="modal-title">Détails du fournisseur</h2>
          <button type="button" class="close-btn" (click)="onClose()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="modal-body" *ngIf="supplier">
          <!-- Tab Navigation -->
          <div class="tab-navigation">
            <button
              class="tab-button"
              [class.active]="activeTab === 'overview'"
              (click)="setActiveTab('overview')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" stroke-width="2"/>
              </svg>
              Vue d'ensemble
            </button>
            <button
              class="tab-button"
              [class.active]="activeTab === 'contacts'"
              (click)="setActiveTab('contacts')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/>
                <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
              </svg>
              Contacts
            </button>
@if (canViewDocuments$ | async) {
            <button
              class="tab-button"
              [class.active]="activeTab === 'documents'"
              (click)="setActiveTab('documents')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
                <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2"/>
                <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2"/>
              </svg>
              Documents
            </button>
            }
          </div>

          <!-- Tab Content -->
          <div class="tab-content">
            <!-- Vue d'ensemble Tab -->
            @if (activeTab === 'overview') {
            <div class="overview-content">
              <div class="overview-layout">
                <!-- Colonne gauche -->
                <div class="overview-left">
                  <!-- Header avec nom et statut -->
                  <div class="supplier-header-card">
                    <div class="supplier-main">
                      <h2 class="supplier-name">{{ supplier.name }}</h2>
                      <div class="supplier-badges">
                        <span class="badge type-badge" [class]="'type-' + supplier.type">
                          {{ formatSupplierType(supplier.type) }}
                        </span>
                        <span class="badge relation-badge" [class]="'relation-' + supplier.relationType">
                          {{ formatRelationType(supplier.relationType) }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Actions rapides -->
                  <div class="quick-actions-card">
                    <h3>Actions rapides</h3>
                    <div class="quick-actions-grid">
                      <button class="quick-action" *ngIf="supplier.phone" (click)="callSupplier()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <span>Appeler</span>
                      </button>
                      <button class="quick-action" *ngIf="supplier.email" (click)="emailSupplier()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="2"/>
                          <polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <span>Email</span>
                      </button>
                      <button class="quick-action" *ngIf="supplier.website" (click)="visitWebsite()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                          <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <span>Site web</span>
                      </button>
@if (canViewDocuments$ | async) {
                      <button class="quick-action" (click)="setActiveTab('documents')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/>
                          <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <span>Documents</span>
                      </button>
                      }
                    </div>
                  </div>

                  <!-- Adresse -->
                  <div class="info-card" *ngIf="supplier.address">
                    <div class="info-card-header">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" stroke-width="2"/>
                        <circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/>
                      </svg>
                      <h3>Adresse</h3>
                    </div>
                    <div class="address-content">{{ supplier.address }}</div>
                  </div>
                </div>

                <!-- Colonne droite -->
                <div class="overview-right">
                  <!-- Informations contact -->
                  <div class="info-card">
                    <div class="info-card-header">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                      </svg>
                      <h3>Contact</h3>
                    </div>
                    <div class="contact-details">
                      <div class="contact-item" *ngIf="supplier.email">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="2"/>
                          <polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <a [href]="'mailto:' + supplier.email" class="contact-link">{{ supplier.email }}</a>
                      </div>
                      <div class="contact-item" *ngIf="supplier.phone">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <a [href]="'tel:' + supplier.phone" class="contact-link">{{ supplier.phone }}</a>
                      </div>
                      <div class="contact-item" *ngIf="supplier.website">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                          <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <a [href]="supplier.website" target="_blank" class="contact-link">{{ supplier.website }}</a>
                      </div>
                    </div>
                  </div>

                  <!-- Informations commerciales -->
                  <div class="info-card">
                    <div class="info-card-header">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <line x1="12" y1="6" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
                        <line x1="16" y1="12" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
                      </svg>
                      <h3>Informations commerciales</h3>
                    </div>
                    <div class="commercial-grid">
                      <div class="commercial-item" *ngIf="supplier.paymentTerms">
                        <span class="commercial-label">Conditions de paiement</span>
                        <span class="commercial-value">{{ supplier.paymentTerms }}</span>
                      </div>
                      <div class="commercial-item" *ngIf="supplier.deliveryDelay !== null">
                        <span class="commercial-label">Délai de livraison</span>
                        <span class="commercial-value">{{ formatDeliveryDelay(supplier.deliveryDelay) }}</span>
                      </div>
                      <div class="commercial-item">
                        <span class="commercial-label">Devise</span>
                        <span class="commercial-value currency-badge">{{ supplier.currency }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Informations entreprise -->
                  <div class="info-card" *ngIf="supplier.type === 'entreprise' && (supplier.siret || supplier.sector)">
                    <div class="info-card-header">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" stroke="currentColor" stroke-width="2"/>
                      </svg>
                      <h3>Entreprise</h3>
                    </div>
                    <div class="enterprise-grid">
                      <div class="enterprise-item" *ngIf="supplier.siret">
                        <span class="enterprise-label">SIRET</span>
                        <span class="enterprise-value siret">{{ supplier.siret }}</span>
                      </div>
                      <div class="enterprise-item" *ngIf="supplier.sector">
                        <span class="enterprise-label">Secteur d'activité</span>
                        <span class="enterprise-value">{{ supplier.sector }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Notes -->
                  <div class="info-card" *ngIf="supplier.notes">
                    <div class="info-card-header">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/>
                        <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                      </svg>
                      <h3>Notes</h3>
                    </div>
                    <div class="notes-content">{{ supplier.notes }}</div>
                  </div>

                  <!-- Informations système -->
                  <div class="info-card system-card">
                    <div class="info-card-header">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2"/>
                      </svg>
                      <h3>Informations système</h3>
                    </div>
                    <div class="system-details">
                      <div class="system-item">
                        <span class="system-label">Créé le</span>
                        <span class="system-value">{{ formatDate(supplier.createdAt) }}</span>
                      </div>
                      <div class="system-item">
                        <span class="system-label">Modifié le</span>
                        <span class="system-value">{{ formatDate(supplier.updatedAt) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            }

            <!-- Contacts Tab -->
            @if (activeTab === 'contacts') {
            <div class="contacts-content">
              <div class="contacts-section">
                <div class="section-header">
                  <h3>Contacts ({{ contacts.length }})</h3>
                  @if (canCreateContact$ | async) {
                    <button type="button" class="btn-small" (click)="onAddContact()">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Ajouter
                    </button>
                  }
                </div>

                <div class="contacts-container">
                  <div *ngIf="loadingContacts" class="loading-state">
                    <div class="spinner-mini"></div>
                    <span>Chargement...</span>
                  </div>

                  <div *ngIf="!loadingContacts && contacts.length === 0" class="empty-state">
                    <span>Aucun contact</span>
                    @if (canCreateContact$ | async) {
                      <button type="button" class="btn-link" (click)="onAddContact()">Ajouter le premier</button>
                    }
                  </div>

                  <div *ngIf="!loadingContacts && contacts.length > 0" class="contacts-list-compact">
                    <div *ngFor="let contact of contacts" class="contact-compact" [class.is-primary]="contact.is_primary">
                      <div class="contact-main">
                        <div class="contact-avatar-mini">
                          <span>{{ contact.getInitials() }}</span>
                        </div>
                        <div class="contact-info-mini">
                          <div class="contact-name-mini">
                            <span class="name">{{ contact.full_name }}</span>
                            <span *ngIf="contact.is_primary" class="primary-badge">PRINCIPAL</span>
                          </div>
                          <div class="contact-job-mini" *ngIf="contact['function']">
                            {{ contact['function'] }}
                          </div>
                          <div class="contact-details-mini">
                            <div *ngIf="contact.emails.length > 0" class="contact-detail-mini">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                <polyline points="22,6 12,13 2,6"/>
                              </svg>
                              <a class="contact-link-mini" [href]="'mailto:' + contact.emails[0].email">{{ contact.emails[0].email }}</a>
                            </div>
                            <div *ngIf="contact.phones.length > 0" class="contact-detail-mini">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                              </svg>
                              <a class="contact-link-mini" [href]="'tel:' + contact.phones[0].phone">{{ contact.phones[0].getFormattedPhone() }}</a>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="contact-actions-mini">
                        @if (canUpdateContact$ | async) {
                          <button type="button" class="btn-icon-mini" (click)="onEditContact(contact)" title="Modifier">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        }
                        @if ((canUpdateContact$ | async) && !contact.is_primary) {
                          <button type="button" class="btn-icon-mini star"
                                  (click)="onMakePrimary(contact)"
                                  title="Principal">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                            </svg>
                          </button>
                        }
                        @if ((canDeleteContact$ | async) && !contact.is_primary) {
                          <button type="button" class="btn-icon-mini danger"
                                  (click)="onDeleteContact(contact)"
                                  title="Supprimer">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polyline points="3,6 5,6 21,6"/>
                              <path d="M19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2V6"/>
                            </svg>
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            }

            <!-- Documents Tab -->
            @if (activeTab === 'documents' && (canViewDocuments$ | async)) {
            <div class="documents-content">
              <app-supplier-documents [supplierId]="supplier.id"></app-supplier-documents>
            </div>
            }
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="onClose()">
            Fermer
          </button>
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
          <button type="button"
                  class="btn btn-secondary"
                  (click)="onCloseDeleteContactModal()"
                  [disabled]="isDeletingContact">
            Annuler
          </button>
          <button type="button"
                  class="btn btn-danger"
                  (click)="onConfirmDeleteContact()"
                  [disabled]="isDeletingContact">
            <span *ngIf="isDeletingContact" class="spinner"></span>
            {{ isDeletingContact ? 'Suppression...' : 'Supprimer' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./supplier-details-modal.component.scss']
})
export class SupplierDetailsModalComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isVisible = false;
  @Input() supplier: SupplierEntity | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() addContact = new EventEmitter<{ supplierId: number; type: 'supplier' }>();
  @Output() editContact = new EventEmitter<ContactEntity>();

  // Tab management
  activeTab: 'overview' | 'contacts' | 'documents' = 'overview';

  // Contact management
  contacts: ContactEntity[] = [];
  loadingContacts = false;
  isDeletingContact = false;
  isMakingPrimary = false;
  actionInProgress = false;
  showDeleteContactModal = false;
  contactToDelete: ContactEntity | null = null;

  // Permission observables
  canCreateContact$!: Observable<boolean>;
  canUpdateContact$!: Observable<boolean>;
  canDeleteContact$!: Observable<boolean>;
  canViewDocuments$!: Observable<boolean>;

  private destroy$ = new Subject<void>();
  private permissionService = inject(PermissionService);

  constructor(
    private getSupplierContactsUseCase: GetSupplierContactsUseCase,
    private deleteContactUseCase: DeleteContactUseCase,
    private makePrimaryContactUseCase: MakePrimaryContactUseCase,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onClose(): void {
    this.closed.emit();
  }

  setActiveTab(tab: 'overview' | 'contacts' | 'documents'): void {
    this.activeTab = tab;
  }

  formatSupplierType(type: string): string {
    return type === 'entreprise' ? 'Entreprise' : 'Particulier';
  }

  formatRelationType(relationType: string): string {
    return relationType === 'client_et_fournisseur' ? 'Client & Fournisseur' : 'Fournisseur';
  }

  formatDeliveryDelay(delay: number | null): string {
    if (delay === null || delay === undefined) return '-';
    if (delay === 0) return 'Immédiat';
    if (delay === 1) return '1 jour';
    return `${delay} jours`;
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

  ngOnInit(): void {
    // Initialize permission observables
    this.canCreateContact$ = this.permissionService.hasPermission(PERMISSIONS.CONTACTS_CREATE);
    this.canUpdateContact$ = this.permissionService.hasPermission(PERMISSIONS.CONTACTS_UPDATE);
    this.canDeleteContact$ = this.permissionService.hasPermission(PERMISSIONS.CONTACTS_DELETE);
    this.canViewDocuments$ = this.permissionService.hasPermission(PERMISSIONS.DOCUMENTS_READ);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Charger les contacts quand le supplier change OU quand la modal devient visible
    if ((changes['supplier'] || changes['isVisible']) && this.supplier && this.isVisible) {
      this.loadContacts();
    }

    // Réinitialiser l'état quand la modal se ferme
    if (changes['isVisible'] && !this.isVisible) {
      this.resetContactsState();
    }
  }

  private loadContacts(): void {
    if (!this.supplier || !this.isVisible) return;

    this.loadingContacts = true;
    this.cdr.detectChanges();

    this.getSupplierContactsUseCase.execute(this.supplier.id)
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
    if (!this.supplier || this.actionInProgress) return;
    this.addContact.emit({ supplierId: this.supplier.id, type: 'supplier' });
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
          alert('Erreur lors de la suppression du contact. Veuillez réessayer.');
        }
      });
  }

  // Public method to refresh contacts from outside
  refreshContacts(): void {
    this.loadContacts();
  }

  // Quick actions methods
  callSupplier(): void {
    if (this.supplier?.phone) {
      window.location.href = `tel:${this.supplier.phone}`;
    }
  }

  emailSupplier(): void {
    if (this.supplier?.email) {
      window.location.href = `mailto:${this.supplier.email}`;
    }
  }

  visitWebsite(): void {
    if (this.supplier?.website) {
      window.open(this.supplier.website, '_blank');
    }
  }
}