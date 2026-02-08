import { Component, Input, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import {
  ClientCall,
  CallFilters,
  CallsResponse,
  CallType,
  CallOutcome,
  CallStats
} from '../../../domain/models/crm.models';
import { ContactEntity } from '../../../domain/entities/contact.entity';
import { ManageCallsUseCase } from '../../../domain/use-cases/crm/manage-calls.use-case';
import { GetClientContactsUseCase } from '../../../domain/use-cases/contact/get-client-contacts.use-case';
import { MessageService } from '../../services/message.service';
import { CallFormModalComponent } from '../call-form-modal/call-form-modal.component';

@Component({
  selector: 'app-client-calls',
  standalone: true,
  imports: [CommonModule, FormsModule, CallFormModalComponent],
  template: `
    <div class="calls-container">
      <!-- Header avec filtres -->
      <div class="calls-header">
        <div class="title-section">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 714.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2"/>
            </svg>
            Journal d'appels ({{ totalCalls() }})
          </h3>
          <button type="button" class="btn btn-small" (click)="openCreateModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2"/>
              <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2"/>
            </svg>
            Nouvel appel
          </button>
        </div>

        <div class="filters-section">
          <!-- Filtre par type -->
          <select
            class="filter-select"
            [(ngModel)]="selectedType"
            (ngModelChange)="onFilterChange()">
            <option value="">Tous les types</option>
            <option value="incoming">Entrants</option>
            <option value="outgoing">Sortants</option>
            <option value="missed">Manqués</option>
          </select>

          <!-- Filtre par résultat -->
          <select
            class="filter-select"
            [(ngModel)]="selectedOutcome"
            (ngModelChange)="onFilterChange()">
            <option value="">Tous les résultats</option>
            <option value="positive">Positif</option>
            <option value="neutral">Neutre</option>
            <option value="negative">Négatif</option>
            <option value="no_answer">Pas de réponse</option>
          </select>

          <!-- Filtre suivi requis -->
          <select
            class="filter-select"
            [(ngModel)]="followUpFilter"
            (ngModelChange)="onFilterChange()">
            <option value="">Tous</option>
            <option value="true">Suivi requis</option>
            <option value="false">Pas de suivi</option>
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
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 714.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2"/>
                </svg>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ stats()?.total_calls || 0 }}</div>
                <div class="stat-label">Total</div>
              </div>
            </div>
            <div class="stat-item outgoing">
              <div class="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="m3 8 4-4 4 4" stroke="currentColor" stroke-width="2"/>
                  <path d="M7 4v16" stroke="currentColor" stroke-width="2"/>
                  <circle cx="18" cy="8" r="3" stroke="currentColor" stroke-width="2"/>
                </svg>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ stats()?.outgoing_calls || 0 }}</div>
                <div class="stat-label">Sortants</div>
              </div>
            </div>
            <div class="stat-item positive">
              <div class="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 11l3 3L22 4" stroke="currentColor" stroke-width="2"/>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                </svg>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ stats()?.positive_calls || 0 }}</div>
                <div class="stat-label">Positifs</div>
              </div>
            </div>
            <div class="stat-item pending">
              <div class="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2"/>
                </svg>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ stats()?.pending_follow_ups || 0 }}</div>
                <div class="stat-label">Suivis en attente</div>
              </div>
            </div>
            <div class="stat-item duration">
              <div class="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2"/>
                  <path d="M21 12c0 .6-.1 1.2-.2 1.8" stroke="currentColor" stroke-width="2"/>
                </svg>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ formatDuration(stats()?.total_duration || 0) }}</div>
                <div class="stat-label">Durée totale</div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>Chargement des appels...</p>
        </div>
      }

      <!-- Empty State -->
      @if (!isLoading() && calls().length === 0) {
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 714.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2"/>
          </svg>
          <h4>Aucun appel trouvé</h4>
          <p>{{ hasFilters() ? 'Aucun appel ne correspond aux filtres sélectionnés.' : 'Aucun appel enregistré pour ce client.' }}</p>
        </div>
      }

      <!-- Calls Table -->
      @if (!isLoading() && calls().length > 0) {
        <div class="calls-table-container">
          <table class="calls-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Contact/Numéro</th>
                <th>Date & Heure</th>
                <th>Durée</th>
                <th>Résultat</th>
                <th>Suivi</th>
              </tr>
            </thead>
            <tbody>
              @for (call of calls(); track call.id) {
                <tr class="call-row" [class]="getCallTypeClass(call.type)">
                  <!-- Type avec icône -->
                  <td class="call-type-cell">
                    <div class="type-indicator">
                      @switch (call.type) {
                        @case ('incoming') {
                          <div class="type-icon incoming">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="m3 16 4 4 4-4" stroke="currentColor" stroke-width="2"/>
                              <path d="M7 20V4" stroke="currentColor" stroke-width="2"/>
                            </svg>
                          </div>
                        }
                        @case ('outgoing') {
                          <div class="type-icon outgoing">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="m3 8 4-4 4 4" stroke="currentColor" stroke-width="2"/>
                              <path d="M7 4v16" stroke="currentColor" stroke-width="2"/>
                            </svg>
                          </div>
                        }
                        @case ('missed') {
                          <div class="type-icon missed">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="m18 6-12 12" stroke="currentColor" stroke-width="2"/>
                              <path d="m6 6 12 12" stroke="currentColor" stroke-width="2"/>
                            </svg>
                          </div>
                        }
                      }
                      <span class="type-label">{{ getTypeLabel(call.type) }}</span>
                    </div>
                  </td>

                  <!-- Contact/Numéro -->
                  <td class="contact-cell">
                    <div class="contact-info">
                      <div class="contact-name">{{ call.subject }}</div>
                      <div class="phone-number">{{ call.phone_number }}</div>
                      @if (call.contact) {
                        <div class="contact-link">{{ call.contact.name }}</div>
                      }
                      @if (call.summary) {
                        <div class="call-summary">{{ call.summary }}</div>
                      }
                    </div>
                  </td>

                  <!-- Date & Heure -->
                  <td class="datetime-cell">
                    <div class="datetime-info">
                      <div class="date">{{ formatCallDate(call.called_at) }}</div>
                      <div class="time">{{ formatCallTime(call.called_at) }}</div>
                    </div>
                  </td>

                  <!-- Durée -->
                  <td class="duration-cell">
                    <span class="duration">{{ call.duration }} min</span>
                  </td>

                  <!-- Résultat -->
                  <td class="outcome-cell">
                    <span class="outcome-badge" [class]="'outcome-' + call.outcome">
                      {{ getOutcomeLabel(call.outcome) }}
                    </span>
                  </td>

                  <!-- Suivi -->
                  <td class="followup-cell">
                    @if (call.follow_up_required) {
                      <div class="followup-info" [class.completed]="call.follow_up_completed">
                        @if (call.follow_up_completed) {
                          <span class="followup-status completed">Terminé</span>
                        } @else {
                          <span class="followup-status required">Requis</span>
                          @if (call.follow_up_date) {
                            <div class="followup-date">{{ formatFollowUpDate(call.follow_up_date) }}</div>
                          }
                        }
                      </div>
                    } @else {
                      <span class="followup-status none">Aucun</span>
                    }
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

    <!-- Call Form Modal -->
    <app-call-form-modal
      [isOpen]="isModalOpen"
      [clientId]="clientId"
      [contacts]="contacts()"
      [defaultPhone]="defaultPhone"
      [editingCall]="selectedCall()"
      (close)="closeModal()"
      (callCreated)="onCallSaved($event)"
      (callUpdated)="onCallSaved($event)">
    </app-call-form-modal>
  `,
  styleUrl: './client-calls.component.scss'
})
export class ClientCallsComponent implements OnInit, OnDestroy {
  @Input() clientId: number | null = null;

  private destroy$ = new Subject<void>();

  // Signals
  calls = signal<ClientCall[]>([]);
  contacts = signal<ContactEntity[]>([]);
  stats = signal<CallStats | null>(null);
  isLoading = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  totalCalls = signal(0);
  selectedCall = signal<ClientCall | null>(null);

  // Filters
  selectedType: CallType | '' = '';
  selectedOutcome: CallOutcome | '' = '';
  followUpFilter: string = '';

  // Modal state
  isModalOpen = false;
  defaultPhone = '';

  constructor(
    private manageCallsUseCase: ManageCallsUseCase,
    private getClientContactsUseCase: GetClientContactsUseCase,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadCalls();
    this.loadContacts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCalls(): void {
    if (!this.clientId) return;

    this.isLoading.set(true);

    const filters: CallFilters = {
      per_page: 10
    };

    if (this.selectedType) filters.type = this.selectedType;
    if (this.selectedOutcome) filters.outcome = this.selectedOutcome;
    if (this.followUpFilter) filters.follow_up_required = this.followUpFilter === 'true';

    this.manageCallsUseCase.getClientCalls(this.clientId, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: CallsResponse) => {
          this.calls.set(response.calls.data);
          this.stats.set(response.stats);
          this.currentPage.set(response.calls.current_page);
          this.totalPages.set(response.calls.last_page);
          this.totalCalls.set(response.calls.total);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.messageService.showError('Erreur lors du chargement des appels');
          this.isLoading.set(false);
          console.error('Error loading calls:', error);
        }
      });
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadCalls();
  }

  hasFilters(): boolean {
    return !!(this.selectedType || this.selectedOutcome || this.followUpFilter);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadCalls();
  }

  openCreateModal(): void {
    this.selectedCall.set(null);
    this.defaultPhone = '';
    this.isModalOpen = true;
  }

  editCall(call: ClientCall): void {
    this.selectedCall.set(call);
    this.defaultPhone = call.phone_number;
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedCall.set(null);
    this.defaultPhone = '';
  }

  onCallSaved(call: ClientCall): void {
    this.loadCalls();
    this.closeModal();
  }

  loadContacts(): void {
    if (!this.clientId) return;

    this.getClientContactsUseCase.execute(this.clientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.contacts.set(response.contacts);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des contacts:', error);
        }
      });
  }

  deleteCall(call: ClientCall): void {
    if (!confirm(`Supprimer l'appel "${call.subject}" ?`)) return;

    this.manageCallsUseCase.deleteCall(call.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.showSuccess('Appel supprimé avec succès');
          this.loadCalls();
        },
        error: (error) => {
          this.messageService.showError('Erreur lors de la suppression de l\'appel');
          console.error('Error deleting call:', error);
        }
      });
  }

  completeFollowUp(call: ClientCall): void {
    this.manageCallsUseCase.completeFollowUp(call.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.showSuccess('Suivi marqué comme terminé');
          this.loadCalls();
        },
        error: (error) => {
          this.messageService.showError('Erreur lors de la mise à jour du suivi');
          console.error('Error completing follow-up:', error);
        }
      });
  }

  // Utility methods
  getCallTypeClass(type: CallType): string {
    return `call-${type}`;
  }

  getOutcomeLabel(outcome: CallOutcome): string {
    const labels = {
      'positive': 'Positif',
      'neutral': 'Neutre',
      'negative': 'Négatif',
      'no_answer': 'Pas de réponse'
    };
    return labels[outcome] || outcome;
  }

  formatCallDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  formatFollowUpDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
    }
    return `${mins}m`;
  }

  getTypeLabel(type: CallType): string {
    const labels = {
      'incoming': 'Entrant',
      'outgoing': 'Sortant',
      'missed': 'Manqué'
    };
    return labels[type] || type;
  }

  formatCallTime(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}