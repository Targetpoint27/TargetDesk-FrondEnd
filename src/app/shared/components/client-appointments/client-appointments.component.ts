import { Component, Input, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import {
  ClientAppointment,
  AppointmentFilters,
  AppointmentsResponse,
  AppointmentType,
  AppointmentStatus,
  AppointmentStats,
  UpdateAppointmentStatusRequest
} from '../../../domain/models/crm.models';
import { ManageAppointmentsUseCase } from '../../../domain/use-cases/crm/manage-appointments.use-case';
import { MessageService } from '../../services/message.service';
import { AppointmentFormModalComponent } from '../appointment-form-modal/appointment-form-modal.component';

@Component({
  selector: 'app-client-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, AppointmentFormModalComponent],
  template: `
    <div class="appointments-container">
      <!-- Header avec filtres -->
      <div class="appointments-header">
        <div class="title-section">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
              <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
              <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
              <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
            </svg>
            Rendez-vous ({{ totalAppointments() }})
          </h3>
          <button type="button" class="btn btn-small" (click)="openCreateModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2"/>
              <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2"/>
            </svg>
            Nouveau rendez-vous
          </button>
        </div>

        <div class="filters-section">
          <!-- Filtre par statut -->
          <select
            class="filter-select"
            [(ngModel)]="selectedStatus"
            (ngModelChange)="onFilterChange()">
            <option value="">Tous les statuts</option>
            <option value="planned">Planifiés</option>
            <option value="confirmed">Confirmés</option>
            <option value="completed">Terminés</option>
            <option value="cancelled">Annulés</option>
            <option value="postponed">Reportés</option>
          </select>

          <!-- Filtre par période -->
          <select
            class="filter-select"
            [(ngModel)]="selectedPeriod"
            (ngModelChange)="onPeriodChange()">
            <option value="">Toute la période</option>
            <option value="upcoming">À venir</option>
            <option value="past">Passés</option>
            <option value="today">Aujourd'hui</option>
            <option value="this_week">Cette semaine</option>
            <option value="this_month">Ce mois</option>
          </select>
        </div>
      </div>

      <!-- Statistiques -->
      @if (stats()) {
        <div class="stats-section">
          <div class="stats-grid">
            <div class="stat-item total">
              <div class="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                  <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
                  <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
                  <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
                </svg>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ stats()?.total_appointments || 0 }}</div>
                <div class="stat-label">Total</div>
              </div>
            </div>
            <div class="stat-item upcoming">
              <div class="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2"/>
                </svg>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ stats()?.upcoming || 0 }}</div>
                <div class="stat-label">À venir</div>
              </div>
            </div>
            <div class="stat-item completed">
              <div class="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 11l3 3L22 4" stroke="currentColor" stroke-width="2"/>
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" stroke-width="2"/>
                </svg>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ stats()?.completed || 0 }}</div>
                <div class="stat-label">Terminés</div>
              </div>
            </div>
            <div class="stat-item cancelled">
              <div class="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                  <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                </svg>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ stats()?.cancelled || 0 }}</div>
                <div class="stat-label">Annulés</div>
              </div>
            </div>
            <div class="stat-item monthly">
              <div class="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                  <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
                  <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
                  <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
                  <circle cx="8" cy="14" r="2" fill="currentColor"/>
                  <circle cx="16" cy="14" r="2" fill="currentColor"/>
                  <circle cx="12" cy="18" r="2" fill="currentColor"/>
                </svg>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ stats()?.this_month || 0 }}</div>
                <div class="stat-label">Ce mois</div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>Chargement des rendez-vous...</p>
        </div>
      }

      <!-- Empty State -->
      @if (!isLoading() && appointments().length === 0) {
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
            <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
            <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
          </svg>
          <h4>Aucun rendez-vous trouvé</h4>
          <p>{{ hasFilters() ? 'Aucun rendez-vous ne correspond aux filtres sélectionnés.' : 'Aucun rendez-vous planifié pour ce client.' }}</p>
        </div>
      }

      <!-- Appointments Table -->
      @if (!isLoading() && appointments().length > 0) {
        <div class="appointments-table-container">
          <table class="appointments-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Titre/Description</th>
                <th>Date & Heure</th>
                <th>Durée</th>
                <th>Statut</th>
                <th>Lieu</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (appointment of appointments(); track appointment.id) {
                <tr class="appointment-row" [class]="getStatusClass(appointment.status)">
                  <!-- Type avec icône -->
                  <td class="type-cell">
                    <div class="type-indicator">
                      @switch (appointment.type) {
                        @case ('commercial') {
                          <div class="type-icon commercial">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2"/>
                              <circle cx="8.5" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                              <line x1="20" y1="8" x2="20" y2="14" stroke="currentColor" stroke-width="2"/>
                              <line x1="23" y1="11" x2="17" y2="11" stroke="currentColor" stroke-width="2"/>
                            </svg>
                          </div>
                        }
                        @case ('support') {
                          <div class="type-icon support">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="2"/>
                            </svg>
                          </div>
                        }
                        @case ('demo') {
                          <div class="type-icon demo">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <polygon points="23,7 16,12 23,17" stroke="currentColor" stroke-width="2"/>
                              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                            </svg>
                          </div>
                        }
                        @case ('negotiation') {
                          <div class="type-icon negotiation">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2"/>
                            </svg>
                          </div>
                        }
                        @case ('closing') {
                          <div class="type-icon closing">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M9 11l3 3L22 4" stroke="currentColor" stroke-width="2"/>
                              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" stroke-width="2"/>
                            </svg>
                          </div>
                        }
                        @default {
                          <div class="type-icon other">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                              <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
                              <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" stroke-width="2"/>
                            </svg>
                          </div>
                        }
                      }
                      <span class="type-label">{{ getTypeLabel(appointment.type) }}</span>
                    </div>
                  </td>

                  <!-- Titre/Description -->
                  <td class="title-cell">
                    <div class="title-info">
                      <div class="appointment-title">{{ appointment.title }}</div>
                      @if (appointment.description) {
                        <div class="appointment-description">{{ appointment.description }}</div>
                      }
                      @if (appointment.participants && appointment.participants.length > 0) {
                        <div class="participants-summary">
                          Participants: {{ appointment.participants.length }}
                        </div>
                      }
                    </div>
                  </td>

                  <!-- Date & Heure -->
                  <td class="datetime-cell">
                    <div class="datetime-info">
                      <div class="date">{{ formatAppointmentDate(appointment.scheduled_at) }}</div>
                      <div class="time">{{ formatAppointmentTime(appointment.scheduled_at) }}</div>
                    </div>
                  </td>

                  <!-- Durée -->
                  <td class="duration-cell">
                    <span class="duration">{{ appointment.duration }} min</span>
                  </td>

                  <!-- Statut -->
                  <td class="status-cell">
                    <select
                      class="status-select"
                      [ngModel]="appointment.status"
                      (ngModelChange)="updateStatus(appointment, $event)"
                      [class]="'status-' + appointment.status">
                      <option value="planned">Planifié</option>
                      <option value="confirmed">Confirmé</option>
                      <option value="completed">Terminé</option>
                      <option value="cancelled">Annulé</option>
                      <option value="postponed">Reporté</option>
                    </select>
                  </td>

                  <!-- Lieu -->
                  <td class="location-cell">
                    <span class="location">{{ appointment.location || 'Non spécifié' }}</span>
                  </td>

                  <!-- Actions -->
                  <td class="actions-cell">
                    <div class="action-buttons">
                      <button type="button" class="btn btn-sm btn-outline-secondary" (click)="editAppointment(appointment)" title="Modifier">
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button type="button" class="btn btn-sm btn-outline-danger" (click)="deleteAppointment(appointment)" title="Supprimer">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Pagination -->
      @if (totalPages() > 1) {
        <div class="pagination">
          <button
            type="button"
            class="btn btn-small"
            [disabled]="currentPage() === 1"
            (click)="goToPage(currentPage() - 1)">
            Précédent
          </button>
          <span class="page-info">Page {{ currentPage() }} sur {{ totalPages() }}</span>
          <button
            type="button"
            class="btn btn-small"
            [disabled]="currentPage() === totalPages()"
            (click)="goToPage(currentPage() + 1)">
            Suivant
          </button>
        </div>
      }
    </div>

    <!-- Appointment Form Modal -->
    <app-appointment-form-modal
      [isOpen]="isModalOpen"
      [clientId]="clientId"
      [editingAppointment]="selectedAppointment()"
      (close)="closeModal()"
      (appointmentCreated)="onAppointmentSaved($event)"
      (appointmentUpdated)="onAppointmentSaved($event)">
    </app-appointment-form-modal>
  `,
  styleUrl: './client-appointments.component.scss'
})
export class ClientAppointmentsComponent implements OnInit, OnDestroy {
  @Input() clientId: number | null = null;

  private destroy$ = new Subject<void>();

  // Signals
  appointments = signal<ClientAppointment[]>([]);
  stats = signal<AppointmentStats | null>(null);
  isLoading = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  totalAppointments = signal(0);
  selectedAppointment = signal<ClientAppointment | null>(null);

  // Filters
  selectedStatus: AppointmentStatus | '' = '';
  selectedPeriod: string = '';

  // Modal state
  isModalOpen = false;

  constructor(
    private manageAppointmentsUseCase: ManageAppointmentsUseCase,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadAppointments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAppointments(): void {
    if (!this.clientId) return;

    this.isLoading.set(true);

    const filters: AppointmentFilters = {
      per_page: 10
    };

    if (this.selectedStatus) filters.status = this.selectedStatus;

    // Apply date filters based on period selection
    if (this.selectedPeriod) {
      const dates = this.getPeriodDates(this.selectedPeriod);
      if (dates.from) filters.date_from = dates.from;
      if (dates.to) filters.date_to = dates.to;
    }

    this.manageAppointmentsUseCase.getClientAppointments(this.clientId, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: AppointmentsResponse) => {
          this.appointments.set(response.appointments.data);
          this.stats.set(response.stats);
          this.currentPage.set(response.appointments.current_page);
          this.totalPages.set(response.appointments.last_page);
          this.totalAppointments.set(response.appointments.total);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.messageService.showError('Erreur lors du chargement des rendez-vous');
          this.isLoading.set(false);
          console.error('Error loading appointments:', error);
        }
      });
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadAppointments();
  }

  onPeriodChange(): void {
    this.currentPage.set(1);
    this.loadAppointments();
  }

  hasFilters(): boolean {
    return !!(this.selectedStatus || this.selectedPeriod);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadAppointments();
  }

  updateStatus(appointment: ClientAppointment, newStatus: AppointmentStatus): void {
    const request: UpdateAppointmentStatusRequest = {
      status: newStatus
    };

    this.manageAppointmentsUseCase.updateStatus(appointment.id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.showSuccess('Statut du rendez-vous mis à jour');
          this.loadAppointments(); // Reload to get updated stats
        },
        error: (error) => {
          this.messageService.showError('Erreur lors de la mise à jour du statut');
          console.error('Error updating appointment status:', error);
          // Reload to revert the select to original status
          this.loadAppointments();
        }
      });
  }

  openCreateModal(): void {
    this.selectedAppointment.set(null);
    this.isModalOpen = true;
  }

  editAppointment(appointment: ClientAppointment): void {
    this.selectedAppointment.set(appointment);
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedAppointment.set(null);
  }

  onAppointmentSaved(appointment: ClientAppointment): void {
    this.loadAppointments();
    this.closeModal();
  }

  deleteAppointment(appointment: ClientAppointment): void {
    if (!confirm(`Supprimer le rendez-vous "${appointment.title}" ?`)) return;

    this.manageAppointmentsUseCase.deleteAppointment(appointment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.showSuccess('Rendez-vous supprimé avec succès');
          this.loadAppointments();
        },
        error: (error) => {
          this.messageService.showError('Erreur lors de la suppression du rendez-vous');
          console.error('Error deleting appointment:', error);
        }
      });
  }

  // Utility methods
  getStatusClass(status: AppointmentStatus): string {
    return `appointment-${status}`;
  }

  getTypeLabel(type: AppointmentType): string {
    const labels = {
      'commercial': 'Commercial',
      'support': 'Support',
      'demo': 'Démo',
      'negotiation': 'Négociation',
      'closing': 'Signature',
      'other': 'Autre'
    };
    return labels[type] || type;
  }

  formatAppointmentDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  formatAppointmentTime(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  private getPeriodDates(period: string): { from?: string; to?: string } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (period) {
      case 'today':
        return {
          from: today.toISOString().split('T')[0],
          to: today.toISOString().split('T')[0]
        };

      case 'upcoming':
        return {
          from: today.toISOString().split('T')[0]
        };

      case 'past':
        return {
          to: new Date(today.getTime() - 1).toISOString().split('T')[0]
        };

      case 'this_week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Sunday
        return {
          from: weekStart.toISOString().split('T')[0],
          to: weekEnd.toISOString().split('T')[0]
        };

      case 'this_month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
          from: monthStart.toISOString().split('T')[0],
          to: monthEnd.toISOString().split('T')[0]
        };

      default:
        return {};
    }
  }
}