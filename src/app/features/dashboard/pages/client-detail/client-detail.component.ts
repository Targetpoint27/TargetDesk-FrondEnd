import { Component, OnInit, OnDestroy, signal, ChangeDetectorRef, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, switchMap, of, Observable } from 'rxjs';
import { PermissionService } from '../../../../core/auth/permission.service';
import { PERMISSIONS } from '../../../../domain/models/permission.models';

import { ClientEntity } from '../../../../domain/entities/client.entity';
import { ContactEntity } from '../../../../domain/entities/contact.entity';
import { GetClientByIdUseCase } from '../../../../domain/use-cases/client/get-client-by-id.use-case';
import { GetClientContactsUseCase } from '../../../../domain/use-cases/contact/get-client-contacts.use-case';
import { DeleteContactUseCase } from '../../../../domain/use-cases/contact/delete-contact.use-case';
import { MakePrimaryContactUseCase } from '../../../../domain/use-cases/contact/make-primary-contact.use-case';
import { MessageService } from '../../../../shared/services/message.service';

// Components
import { ClientTimelineComponent } from '../../../../shared/components/client-timeline/client-timeline.component';
import { ClientNotesComponent } from '../../../../shared/components/client-notes/client-notes.component';
import { ClientCallsComponent } from '../../../../shared/components/client-calls/client-calls.component';
import { ClientAppointmentsComponent } from '../../../../shared/components/client-appointments/client-appointments.component';
import { ClientCategoriesManagerComponent } from '../../../../shared/components/client-categories-manager/client-categories-manager.component';
import { ClientCrmStatsComponent } from '../../../../shared/components/client-crm-stats/client-crm-stats.component';
import { ContactFormModalComponent } from '../../../../shared/components/contact-form-modal/contact-form-modal.component';
import { NoteFormModalComponent } from '../../../../shared/components/note-form-modal/note-form-modal.component';
import { CallFormModalComponent } from '../../../../shared/components/call-form-modal/call-form-modal.component';
import { AppointmentFormModalComponent } from '../../../../shared/components/appointment-form-modal/appointment-form-modal.component';
import { ClientDocumentsComponent } from '../../../../shared/components/client-documents/client-documents.component';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ClientTimelineComponent,
    ClientNotesComponent,
    ClientCallsComponent,
    ClientAppointmentsComponent,
    ClientCategoriesManagerComponent,
    ClientCrmStatsComponent,
    ContactFormModalComponent,
    NoteFormModalComponent,
    CallFormModalComponent,
    AppointmentFormModalComponent,
    ClientDocumentsComponent
  ],
  template: `
    <div class="client-detail-page">
      <!-- Header avec breadcrumb et actions -->
      <div class="page-header">
        <nav class="breadcrumb">
          <a routerLink="/dashboard/clients" class="breadcrumb-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Clients
          </a>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-current">{{ client()?.name || 'Chargement...' }}</span>
        </nav>

        <div class="page-actions">
          <!-- Actions supprimées -->
        </div>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>Chargement des détails du client...</p>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="error-container">
          <div class="error-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
              <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2"/>
            </svg>
          </div>
          <h3>Erreur de chargement</h3>
          <p>{{ error() }}</p>
          <button class="btn btn-primary" (click)="retryLoading()">Réessayer</button>
        </div>
      }

      <!-- Main Content -->
      @if (client() && !isLoading() && !error()) {
        <div class="page-content">

          <!-- Tab Navigation -->
          <div class="tab-navigation">
            <button
              class="tab-button"
              [class.active]="activeTab === 'overview'"
              (click)="setActiveTab('overview')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Vue d'ensemble
            </button>
            <button
              class="tab-button"
              [class.active]="activeTab === 'contacts'"
              (click)="setActiveTab('contacts')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
              </svg>
              Contacts ({{ contacts.length }})
            </button>
@if (canViewCategories$ | async) {
              <button
                class="tab-button"
                [class.active]="activeTab === 'categories'"
                (click)="setActiveTab('categories')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                  <path d="M9 9h6v6H9z" stroke="currentColor" stroke-width="2"/>
                </svg>
                Catégories
              </button>
            }
@if (canManageDocuments$ | async) {
              <button
                class="tab-button"
                [class.active]="activeTab === 'documents'"
                (click)="setActiveTab('documents')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                  <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2"/>
                  <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2"/>
                </svg>
                Documents
              </button>
            }
@if (canCreateNote$ | async) {
              <button
                class="tab-button"
                [class.active]="activeTab === 'notes'"
                (click)="setActiveTab('notes')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                </svg>
                Notes
              </button>
            }
@if (canCreateCall$ | async) {
              <button
                class="tab-button"
                [class.active]="activeTab === 'calls'"
                (click)="setActiveTab('calls')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2"/>
                </svg>
                Appels
              </button>
            }
@if (canCreateAppointment$ | async) {
              <button
                class="tab-button"
                [class.active]="activeTab === 'appointments'"
                (click)="setActiveTab('appointments')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                  <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
                  <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
                  <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
                </svg>
                Rendez-vous
              </button>
            }
            <button
              class="tab-button"
              [class.active]="activeTab === 'timeline'"
              (click)="setActiveTab('timeline')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2"/>
              </svg>
              Historique
            </button>
          </div>
          <!-- Tab Content -->
          <div class="tab-content" [ngClass]="activeTab">

            <!-- Overview Tab -->
            @if (activeTab === 'overview') {
              <div class="overview-content">
                <!-- Quick Actions Card -->
                <div class="quick-actions-card">
                  <h3>Actions rapides</h3>
                  <div class="quick-actions-grid">
                    @if (canCreateCall$ | async) {
                      <button class="quick-action" (click)="callClient()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <span>Appeler</span>
                      </button>
                    }
                    <button class="quick-action" (click)="emailClient()">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="2"/>
                        <polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2"/>
                      </svg>
                      <span>Email</span>
                    </button>
                    @if (canCreateAppointment$ | async) {
                      <button class="quick-action" (click)="scheduleAppointment()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                          <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
                          <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
                          <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <span>RDV</span>
                      </button>
                    }
                    @if (canCreateNote$ | async) {
                      <button class="quick-action" (click)="addNote()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/>
                          <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                          <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2"/>
                          <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <span>Note</span>
                      </button>
                    }
                  </div>
                </div>

                <!-- Main Layout -->
                <div class="main-layout">
                  <!-- Statistics Section - CRM Stats Component -->
                  <div class="stats-section">
                    <h3>Statistiques</h3>
                    <app-client-crm-stats [clientId]="client()?.id || 0"></app-client-crm-stats>
                  </div>

                  <!-- Client Info Grid - 2 columns -->
                  <div class="client-info-grid">
                    <!-- Informations Card -->
                    <div class="info-card">
                      <!-- Informations -->
                      <div class="info-section">
                        <h3>Informations</h3>
                        <div class="info-grid">
                          <div class="info-row">
                            <span class="label">ID</span>
                            <span class="value mono">{{ client()?.clientId }}</span>
                          </div>
                          <div class="info-row">
                            <span class="label">Type</span>
                            <span class="value badge" [class]="'type-' + client()?.type">{{ formatClientType(client()?.type || '') }}</span>
                          </div>
                          <div class="info-row">
                            <span class="label">Statut</span>
                            <span class="value badge" [class]="client()?.isActive ? 'active' : 'inactive'">
                              {{ client()?.isActive ? 'Actif' : 'Inactif' }}
                            </span>
                          </div>
                          <div class="info-row" *ngIf="client()?.email">
                            <span class="label">Email</span>
                            <a [href]="'mailto:' + client()?.email" class="value link">{{ client()?.email }}</a>
                          </div>
                          <div class="info-row" *ngIf="client()?.phone">
                            <span class="label">Tél</span>
                            <a [href]="'tel:' + client()?.phone" class="value link">{{ client()?.phone }}</a>
                          </div>
                          <div class="info-row" *ngIf="client()?.website">
                            <span class="label">Web</span>
                            <a [href]="client()?.website" target="_blank" class="value link">{{ client()?.website }}</a>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Adresse Card -->
                    <div class="info-card" *ngIf="client()?.address">
                      <div class="info-section">
                        <h3>Adresse</h3>
                        <div class="address-text">{{ client()?.address }}</div>
                      </div>
                    </div>

                    <!-- Entreprise Card -->
                    <div class="info-card" *ngIf="client()?.type === 'entreprise' && (client()?.siret || client()?.sector)">
                      <div class="info-section">
                        <h3>Entreprise</h3>
                        <div class="info-grid">
                          <div class="info-row" *ngIf="client()?.siret">
                            <span class="label">SIRET</span>
                            <span class="value mono">{{ client()?.siret }}</span>
                          </div>
                          <div class="info-row" *ngIf="client()?.sector">
                            <span class="label">Secteur</span>
                            <span class="value">{{ client()?.sector }}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Notes Card -->
                    <div class="info-card" *ngIf="client()?.notes">
                      <div class="info-section">
                        <h3>Notes</h3>
                        <div class="notes-text">{{ client()?.notes }}</div>
                      </div>
                    </div>
                  </div>

                  <!-- Système Section - Full width -->
                  <div class="info-card">
                    <div class="info-section system-info">
                      <h3>Informations système</h3>
                      <div class="system-grid">
                        <div class="system-item" *ngIf="client()?.createdBy">
                          <span class="label">Créé par</span>
                          <span class="value">{{ client()?.getCreatorName() }}</span>
                        </div>
                        <div class="system-item">
                          <span class="label">Créé le</span>
                          <span class="value">{{ formatDate(client()?.createdAt || null) }}</span>
                        </div>
                        <div class="system-item">
                          <span class="label">Modifié le</span>
                          <span class="value">{{ formatDate(client()?.updatedAt || null) }}</span>
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

                <div class="section-card">
                  <div class="section-header">
                    <h3>Contacts ({{ contacts.length }})</h3>
                    @if (canCreateContact$ | async) {
                      <button type="button" class="btn btn-small" (click)="onAddContact()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="12" y1="5" x2="12" y2="19"/>
                          <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Ajouter contact
                      </button>
                    }
                  </div>

                  <div class="contacts-container">
                    <!-- Loading -->
                    <div *ngIf="loadingContacts" class="loading-state">
                      <div class="spinner-mini"></div>
                      <span>Chargement des contacts...</span>
                    </div>

                    <!-- Empty -->
                    <div *ngIf="!loadingContacts && contacts.length === 0" class="empty-state">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                      </svg>
                      <h4>Aucun contact</h4>
                      @if (canCreateContact$ | async) {
                        <button type="button" class="btn btn-primary" (click)="onAddContact()">Ajouter le premier contact</button>
                      }
                    </div>

                    <!-- Contacts Grid -->
                    <div *ngIf="!loadingContacts && contacts.length > 0" class="contacts-grid">
                      <div *ngFor="let contact of contacts" class="contact-card" [class.is-primary]="contact.is_primary">

                        <div class="contact-header">
                          <div class="contact-avatar">{{ contact.getInitials() }}</div>
                          <div class="contact-info">
                            <div class="contact-name">
                              <span>{{ contact.full_name }}</span>
                              <span *ngIf="contact.is_primary" class="primary-badge">PRINCIPAL</span>
                            </div>
                            <div class="contact-job" *ngIf="contact.function || contact.department">
                              {{ contact.function }}{{ contact.function && contact.department ? ' - ' : '' }}{{ contact.department }}
                            </div>
                          </div>
                          <div class="contact-actions">
                            @if (canUpdateContact$ | async) {
                              <button type="button" class="btn-icon" (click)="onEditContact(contact)" title="Modifier">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                            }
                            @if ((canUpdateContact$ | async) && !contact.is_primary) {
                              <button type="button" class="btn-icon star" (click)="onMakePrimary(contact)" title="Définir comme principal">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                                </svg>
                              </button>
                            }
                            @if ((canDeleteContact$ | async) && !contact.is_primary) {
                              <button type="button" class="btn-icon danger" (click)="onDeleteContact(contact)" title="Supprimer">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <polyline points="3,6 5,6 21,6"/>
                                  <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                                </svg>
                              </button>
                            }
                          </div>
                        </div>

                        <!-- Contact Details -->
                        <div class="contact-details">
                          <div *ngFor="let email of contact.emails.slice(0, 2)" class="contact-detail">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                              <polyline points="22,6 12,13 2,6"/>
                            </svg>
                            <a [href]="'mailto:' + email.email" class="contact-link">{{ email.email }}</a>
                          </div>

                          <div *ngFor="let phone of contact.phones.slice(0, 2)" class="contact-detail">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                            </svg>
                            <a [href]="'tel:' + phone.phone" class="contact-link">{{ phone.getFormattedPhone() }}</a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- Categories Tab -->
            @if (activeTab === 'categories' && (canViewCategories$ | async)) {
              <div class="categories-content">
                <div class="section-card">
                  <div class="section-header">
                    <h3>Catégories</h3>
                  </div>
                  <app-client-categories-manager [client]="client()"></app-client-categories-manager>
                </div>
              </div>
            }

            <!-- Documents Tab -->
            @if (activeTab === 'documents' && (canManageDocuments$ | async)) {
              <div class="documents-content">
                <div class="section-card">
                  <app-client-documents [clientId]="client()?.id || 0"></app-client-documents>
                </div>
              </div>
            }

            <!-- Notes Tab -->
            @if (activeTab === 'notes' && (canCreateNote$ | async)) {
              <div class="notes-content">
                <div class="section-card">
                  <app-client-notes
                    [clientId]="client()?.id || 0"
                    (addNoteRequested)="addNote()"
                    (addAppointmentRequested)="scheduleAppointment()">
                  </app-client-notes>
                </div>
              </div>
            }

            <!-- Calls Tab -->
            @if (activeTab === 'calls' && (canCreateCall$ | async)) {
              <div class="calls-content">
                <div class="section-card">
                  <app-client-calls [clientId]="client()?.id || 0"></app-client-calls>
                </div>
              </div>
            }

            <!-- Appointments Tab -->
            @if (activeTab === 'appointments' && (canCreateAppointment$ | async)) {
              <div class="appointments-content">
                <div class="section-card">
                  <app-client-appointments [clientId]="client()?.id || 0"></app-client-appointments>
                </div>
              </div>
            }

            <!-- Timeline Tab -->
            @if (activeTab === 'timeline') {
              <div class="timeline-content">

                <div class="section-card">
                  <app-client-timeline [clientId]="client()?.id || 0"></app-client-timeline>
                </div>
              </div>
            }

          </div>
        </div>
      }

      <!-- Delete Modal supprimé -->

      <!-- Contact Delete Confirmation Modal -->
      @if (showDeleteContactModal) {
        <div class="modal-overlay" (click)="onCloseDeleteContactModal()">
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
      }

      <!-- Contact Form Modal -->
      @if (showContactFormModal) {
        <app-contact-form-modal
          [isOpen]="showContactFormModal"
          [contact]="editingContact"
          [entityId]="client()?.id || null"
          [entityType]="'client'"
          (close)="onCloseContactFormModal()"
          (contactCreated)="onContactCreated($event)"
          (contactUpdated)="onContactUpdated($event)">
        </app-contact-form-modal>
      }

      <!-- Note Form Modal -->
      @if (showNoteFormModal) {
        <app-note-form-modal
          [isOpen]="showNoteFormModal"
          [clientId]="client()?.id || null"
          (close)="onCloseNoteFormModal()"
          (noteCreated)="onNoteCreated()">
        </app-note-form-modal>
      }

      <!-- Call Form Modal -->
      @if (showCallFormModal) {
        <app-call-form-modal
          [isOpen]="showCallFormModal"
          [clientId]="client()?.id || null"
          [contacts]="contacts"
          [defaultPhone]="client()?.phone || undefined"
          (close)="onCloseCallFormModal()"
          (callCreated)="onCallCreated()">
        </app-call-form-modal>
      }

      <!-- Appointment Form Modal -->
      @if (showAppointmentFormModal) {
        <app-appointment-form-modal
          [isOpen]="showAppointmentFormModal"
          [clientId]="client()?.id || null"
          [contacts]="contacts"
          (close)="onCloseAppointmentFormModal()"
          (appointmentCreated)="onAppointmentCreated()">
        </app-appointment-form-modal>
      }
    </div>
  `,
  styleUrl: './client-detail.component.scss'
})
export class ClientDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private permissionService = inject(PermissionService);

  // Permission observables
  canUpdateClient$!: Observable<boolean>;
  canDeleteClient$!: Observable<boolean>;
  canCreateContact$!: Observable<boolean>;
  canUpdateContact$!: Observable<boolean>;
  canDeleteContact$!: Observable<boolean>;
  canCreateNote$!: Observable<boolean>;
  canCreateCall$!: Observable<boolean>;
  canCreateAppointment$!: Observable<boolean>;
  canManageDocuments$!: Observable<boolean>;
  canViewCategories$!: Observable<boolean>;

  // ViewChild pour accéder aux composants enfants
  @ViewChild(ClientNotesComponent) notesComponent!: ClientNotesComponent;
  @ViewChild(ClientTimelineComponent) timelineComponent!: ClientTimelineComponent;

  // Signals
  client = signal<ClientEntity | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Contact Management
  contacts: ContactEntity[] = [];
  loadingContacts = false;
  isDeletingContact = false;
  isMakingPrimary = false;
  actionInProgress = false;
  showDeleteContactModal = false;
  showContactFormModal = false;
  contactToDelete: ContactEntity | null = null;
  editingContact: ContactEntity | null = null;

  // CRM Modals
  showNoteFormModal = false;
  showCallFormModal = false;
  showAppointmentFormModal = false;

  // Tabs Management
  activeTab: 'overview' | 'contacts' | 'categories' | 'documents' | 'notes' | 'calls' | 'appointments' | 'timeline' = 'overview';

  constructor(
    private getClientByIdUseCase: GetClientByIdUseCase,
    private getClientContactsUseCase: GetClientContactsUseCase,
    private deleteContactUseCase: DeleteContactUseCase,
    private makePrimaryContactUseCase: MakePrimaryContactUseCase,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Initialize permission observables
    this.canUpdateClient$ = this.permissionService.hasPermission(PERMISSIONS.CLIENTS_UPDATE);
    this.canDeleteClient$ = this.permissionService.hasPermission(PERMISSIONS.CLIENTS_DELETE);
    this.canCreateContact$ = this.permissionService.hasPermission(PERMISSIONS.CONTACTS_CREATE);
    this.canUpdateContact$ = this.permissionService.hasPermission(PERMISSIONS.CONTACTS_UPDATE);
    this.canDeleteContact$ = this.permissionService.hasPermission(PERMISSIONS.CONTACTS_DELETE);
    this.canCreateNote$ = this.permissionService.hasPermission(PERMISSIONS.DOCUMENTS_CREATE);
    this.canCreateCall$ = this.permissionService.hasPermission(PERMISSIONS.CONTACTS_CREATE);
    this.canCreateAppointment$ = this.permissionService.hasPermission(PERMISSIONS.CONTACTS_CREATE);
    this.canManageDocuments$ = this.permissionService.hasPermission(PERMISSIONS.DOCUMENTS_CREATE);
    this.canViewCategories$ = this.permissionService.hasPermission(PERMISSIONS.SYSTEM_VIEW);

    this.route.params.pipe(
      takeUntil(this.destroy$),
      switchMap((params: any) => {
        const clientId = +params['id'];
        if (!clientId) {
          this.error.set('ID client invalide');
          return of(null);
        }
        this.loadClient(clientId);
        return of(null);
      })
    ).subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadClient(clientId: number) {
    this.isLoading.set(true);
    this.error.set(null);

    return this.getClientByIdUseCase.execute(clientId)
      .pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (client) => {
          if (client) {
            this.client.set(client);
            this.loadContacts();
          } else {
            this.error.set('Client non trouvé');
          }
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.error.set('Erreur lors du chargement du client');
          this.isLoading.set(false);
          console.error('Error loading client:', error);
        }
      });
  }

  // Méthodes de modification et suppression supprimées

  // Contact Management
  private loadContacts(): void {
    const clientData = this.client();
    if (!clientData) return;

    this.loadingContacts = true;
    this.cdr.detectChanges();

    this.getClientContactsUseCase.execute(clientData.id)
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


  onAddContact(): void {
    const clientData = this.client();
    if (!clientData || this.actionInProgress) return;

    this.editingContact = null;
    this.showContactFormModal = true;
  }

  onEditContact(contact: ContactEntity): void {
    if (this.actionInProgress) return;

    this.editingContact = contact;
    this.showContactFormModal = true;
  }

  onCloseContactFormModal(): void {
    this.showContactFormModal = false;
    this.editingContact = null;
  }

  onContactCreated(contact: ContactEntity): void {
    this.messageService.showSuccess('Contact créé avec succès');
    this.onCloseContactFormModal();
    this.loadContacts();
  }

  onContactUpdated(contact: ContactEntity): void {
    this.messageService.showSuccess('Contact modifié avec succès');
    this.onCloseContactFormModal();
    this.loadContacts();
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
          this.messageService.showSuccess(`${contact.full_name} défini comme contact principal`);
          this.isMakingPrimary = false;
          this.actionInProgress = false;
          this.loadContacts();
        },
        error: (error) => {
          this.messageService.showError('Erreur lors de la définition du contact principal');
          this.isMakingPrimary = false;
          this.actionInProgress = false;
          this.cdr.detectChanges();
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
          this.messageService.showSuccess('Contact supprimé avec succès');
          this.isDeletingContact = false;
          this.actionInProgress = false;
          this.loadContacts();
          this.onCloseDeleteContactModal();
        },
        error: (error) => {
          this.messageService.showError('Erreur lors de la suppression du contact');
          this.isDeletingContact = false;
          this.actionInProgress = false;
          this.cdr.detectChanges();
        }
      });
  }

  // CRM Modal Handlers
  onCloseNoteFormModal(): void {
    this.showNoteFormModal = false;
  }

  onNoteCreated(): void {
    this.showNoteFormModal = false;
    this.messageService.showSuccess('Note créée avec succès');

    // Rafraîchir la liste des notes
    if (this.notesComponent) {
      this.notesComponent.loadNotes();
    }

    // Rafraîchir l'historique/timeline
    if (this.timelineComponent) {
      this.timelineComponent.loadTimeline();
    }
  }

  onCloseCallFormModal(): void {
    this.showCallFormModal = false;
  }

  onCallCreated(): void {
    this.showCallFormModal = false;
    this.messageService.showSuccess('Appel enregistré avec succès');

    // Rafraîchir l'historique/timeline
    if (this.timelineComponent) {
      this.timelineComponent.loadTimeline();
    }
  }

  onCloseAppointmentFormModal(): void {
    this.showAppointmentFormModal = false;
  }

  onAppointmentCreated(): void {
    this.showAppointmentFormModal = false;
    this.messageService.showSuccess('Rendez-vous planifié avec succès');

    // Rafraîchir l'historique/timeline
    if (this.timelineComponent) {
      this.timelineComponent.loadTimeline();
    }
  }

  // Quick Actions

  emailClient(): void {
    const clientData = this.client();
    if (clientData?.email) {
      window.open(`mailto:${clientData.email}`);
    } else {
      this.messageService.showInfo('Aucune adresse email disponible');
    }
  }

  scheduleAppointment(): void {
    const clientData = this.client();
    if (!clientData) {
      this.messageService.showError('Aucun client sélectionné');
      return;
    }
    this.showAppointmentFormModal = true;
  }

  addNote(): void {
    const clientData = this.client();
    if (!clientData) {
      this.messageService.showError('Aucun client sélectionné');
      return;
    }
    this.showNoteFormModal = true;
  }

  callClient(): void {
    const clientData = this.client();
    if (clientData?.phone) {
      this.showCallFormModal = true;
    } else {
      this.messageService.showInfo('Aucun numéro de téléphone disponible');
    }
  }

  retryLoading(): void {
    const currentRoute = this.route.snapshot.params['id'];
    if (currentRoute) {
      this.loadClient(+currentRoute);
    }
  }

  // Utility methods
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

  setActiveTab(tab: 'overview' | 'contacts' | 'categories' | 'documents' | 'notes' | 'calls' | 'appointments' | 'timeline'): void {
    this.activeTab = tab;
  }


  getUserInitials(name: string): string {
    return name
      .split(' ')
      .map((part: string) => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}