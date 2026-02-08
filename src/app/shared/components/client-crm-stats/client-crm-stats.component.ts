import { Component, Input, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, forkJoin, of } from 'rxjs';

import { ManageCallsUseCase } from '../../../domain/use-cases/crm/manage-calls.use-case';
import { ManageAppointmentsUseCase } from '../../../domain/use-cases/crm/manage-appointments.use-case';
import { ManageNotesUseCase } from '../../../domain/use-cases/crm/manage-notes.use-case';
import { CallStats, AppointmentStats, CallsResponse, AppointmentsResponse, NotesResponse } from '../../../domain/models/crm.models';

interface CrmStats {
  calls: CallStats;
  appointments: AppointmentStats;
  notes: {
    total_notes: number;
    pinned_notes: number;
    notes_with_attachments: number;
  };
}

@Component({
  selector: 'app-client-crm-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="crm-stats-container">
      <!-- Loading State -->
      @if (isLoading()) {
        <div class="stats-loading">
          <div class="loading-spinner"></div>
          <p>Chargement des statistiques...</p>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="stats-error">
          <div class="error-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
              <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2"/>
            </svg>
          </div>
          <p>{{ error() }}</p>
          <button class="btn btn-small" (click)="loadStats()">Réessayer</button>
        </div>
      }

      <!-- Stats Content -->
      @if (!isLoading() && !error() && stats()) {
        <div class="stats-content">

          <!-- Overview Cards -->
          <div class="stats-overview">
            <div class="stat-card total">
              <div class="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2"/>
                </svg>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ totalInteractions() }}</div>
                <div class="stat-label">Total interactions</div>
              </div>
            </div>

            <div class="stat-card calls">
              <div class="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2"/>
                </svg>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ stats()?.calls?.total_calls || 0 }}</div>
                <div class="stat-label">Appels</div>
              </div>
            </div>

            <div class="stat-card appointments">
              <div class="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                  <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
                  <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
                  <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
                </svg>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ stats()?.appointments?.total_appointments || 0 }}</div>
                <div class="stat-label">Rendez-vous</div>
              </div>
            </div>

            <div class="stat-card notes">
              <div class="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                </svg>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ stats()?.notes?.total_notes || 0 }}</div>
                <div class="stat-label">Notes</div>
              </div>
            </div>
          </div>

          <!-- Detailed Stats Grid -->
          <div class="stats-details">

            <!-- Calls Details -->
            <div class="stats-section calls-stats">
              <h4>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2"/>
                </svg>
                Statistiques d'appels
              </h4>
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="label">Appels sortants</span>
                  <span class="value">{{ stats()?.calls?.outgoing_calls || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="label">Appels positifs</span>
                  <span class="value">{{ stats()?.calls?.positive_calls || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="label">Follow-ups en attente</span>
                  <span class="value badge" [class.warning]="(stats()?.calls?.pending_follow_ups || 0) > 0">
                    {{ stats()?.calls?.pending_follow_ups || 0 }}
                  </span>
                </div>
                <div class="stat-item">
                  <span class="label">Durée totale</span>
                  <span class="value">{{ formatDuration(stats()?.calls?.total_duration || 0) }}</span>
                </div>
                <div class="stat-item" *ngIf="callSuccessRate() !== null">
                  <span class="label">Taux de réussite</span>
                  <span class="value percentage" [class]="getSuccessRateClass()">
                    {{ callSuccessRate() }}%
                  </span>
                </div>
              </div>
            </div>

            <!-- Appointments Details -->
            <div class="stats-section appointments-stats">
              <h4>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                  <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
                  <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
                  <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
                </svg>
                Statistiques de rendez-vous
              </h4>
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="label">À venir</span>
                  <span class="value">{{ stats()?.appointments?.upcoming || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="label">Terminés</span>
                  <span class="value">{{ stats()?.appointments?.completed || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="label">Annulés</span>
                  <span class="value">{{ stats()?.appointments?.cancelled || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="label">Ce mois-ci</span>
                  <span class="value">{{ stats()?.appointments?.this_month || 0 }}</span>
                </div>
                <div class="stat-item" *ngIf="appointmentCompletionRate() !== null">
                  <span class="label">Taux de réalisation</span>
                  <span class="value percentage" [class]="getCompletionRateClass()">
                    {{ appointmentCompletionRate() }}%
                  </span>
                </div>
              </div>
            </div>

            <!-- Notes Details -->
            <div class="stats-section notes-stats">
              <h4>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                </svg>
                Statistiques de notes
              </h4>
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="label">Notes épinglées</span>
                  <span class="value">{{ stats()?.notes?.pinned_notes || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="label">Avec pièces jointes</span>
                  <span class="value">{{ stats()?.notes?.notes_with_attachments || 0 }}</span>
                </div>
              </div>
            </div>

          </div>

          <!-- Quick Insights -->
          <div class="stats-insights">
            <h4>Aperçu rapide</h4>
            <div class="insights-list">
              <div class="insight-item" *ngIf="(stats()?.calls?.pending_follow_ups || 0) > 0">
                <div class="insight-icon warning">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
                    <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <span>{{ stats()?.calls?.pending_follow_ups }} follow-up{{ (stats()?.calls?.pending_follow_ups || 0) > 1 ? 's' : '' }} en attente</span>
              </div>

              <div class="insight-item" *ngIf="(stats()?.appointments?.upcoming || 0) > 0">
                <div class="insight-icon info">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="l 9.09 9 3.36 3.36 5.91-5.91" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <span>{{ stats()?.appointments?.upcoming }} rendez-vous à venir</span>
              </div>

              <div class="insight-item" *ngIf="callSuccessRate() !== null && callSuccessRate()! >= 70">
                <div class="insight-icon success">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 11l3 3 8-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <span>Excellent taux de réussite des appels ({{ callSuccessRate() }}%)</span>
              </div>

              <div class="insight-item" *ngIf="totalInteractions() === 0">
                <div class="insight-icon neutral">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </div>
                <span>Aucune interaction enregistrée pour ce client</span>
              </div>
            </div>
          </div>

        </div>
      }
    </div>
  `,
  styleUrl: './client-crm-stats.component.scss'
})
export class ClientCrmStatsComponent implements OnInit, OnDestroy {
  @Input() clientId!: number;

  private destroy$ = new Subject<void>();

  isLoading = signal(false);
  error = signal<string | null>(null);
  stats = signal<CrmStats | null>(null);

  totalInteractions = computed(() => {
    const currentStats = this.stats();
    if (!currentStats) return 0;

    return (currentStats.calls?.total_calls || 0) +
           (currentStats.appointments?.total_appointments || 0) +
           (currentStats.notes?.total_notes || 0);
  });

  callSuccessRate = computed(() => {
    const currentStats = this.stats();
    if (!currentStats || !currentStats.calls || currentStats.calls.total_calls === 0) return null;

    const rate = Math.round((currentStats.calls.positive_calls / currentStats.calls.total_calls) * 1000) / 10;
    return rate;
  });

  appointmentCompletionRate = computed(() => {
    const currentStats = this.stats();
    if (!currentStats || !currentStats.appointments || currentStats.appointments.total_appointments === 0) return null;

    const rate = Math.round((currentStats.appointments.completed / currentStats.appointments.total_appointments) * 1000) / 10;
    return rate;
  });

  constructor(
    private manageCallsUseCase: ManageCallsUseCase,
    private manageAppointmentsUseCase: ManageAppointmentsUseCase,
    private manageNotesUseCase: ManageNotesUseCase
  ) {}

  ngOnInit(): void {
    if (this.clientId) {
      this.loadStats();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStats(): void {
    if (!this.clientId) {
      this.error.set('ID client manquant');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    // Charger les statistiques en parallèle
    const calls$ = this.manageCallsUseCase.getClientCalls(this.clientId, { per_page: 1 });
    const appointments$ = this.manageAppointmentsUseCase.getClientAppointments(this.clientId, { per_page: 1 });
    const notes$ = this.manageNotesUseCase.getClientNotes(this.clientId, { per_page: 1000 }); // Récupérer toutes les notes pour les stats

    forkJoin({
      calls: calls$,
      appointments: appointments$,
      notes: notes$
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (results) => {
        const notesData = results.notes.data || [];

        const statsData: CrmStats = {
          calls: results.calls.stats,
          appointments: results.appointments.stats,
          notes: {
            total_notes: notesData.length,
            pinned_notes: notesData.filter(note => note.is_pinned).length,
            notes_with_attachments: notesData.filter(note => note.attachments_count > 0).length
          }
        };

        this.stats.set(statsData);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des statistiques:', error);
        this.error.set('Erreur lors du chargement des statistiques');
        this.isLoading.set(false);
      }
    });
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h${remainingMinutes}min`;
  }

  getSuccessRateClass(): string {
    const rate = this.callSuccessRate();
    if (rate === null) return '';
    if (rate >= 70) return 'success';
    if (rate >= 50) return 'warning';
    return 'danger';
  }

  getCompletionRateClass(): string {
    const rate = this.appointmentCompletionRate();
    if (rate === null) return '';
    if (rate >= 80) return 'success';
    if (rate >= 60) return 'warning';
    return 'danger';
  }
}