// ========================================
// COMPOSANT DE SUIVI DU TEMPS
// Time tracking avec démarrage/arrêt de sessions et saisies manuelles
// ========================================

import { Component, Input, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, interval, timer } from 'rxjs';

import { TasksApiService } from '../../services/tasks-api.service';
import {
  Task,
  TimeSession,
  TaskTimeEntry,
  CreateTimeEntryRequest,
  TaskSummary,
  formatDuration
} from '../../models/task.models';

interface TimerState {
  isRunning: boolean;
  currentSession: TimeSession | null;
  elapsedTime: number; // en secondes
  startTime: Date | null;
}

@Component({
  selector: 'app-time-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="time-tracker bg-white rounded-lg border border-gray-200 p-4">
      <!-- En-tête -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 flex items-center">
          <i class="bi bi-clock-history mr-2 text-blue-500"></i>
          Suivi du temps
        </h3>
        @if (taskSummary()?.estimated_hours) {
          <div class="text-sm text-gray-600">
            Estimé: {{ formatDuration(taskSummary()?.estimated_hours || 0) }}
          </div>
        }
      </div>

      <!-- Timer actuel -->
      <div class="mb-6">
        <div class="bg-gray-50 rounded-lg p-4 text-center">
          <div class="text-3xl font-mono font-bold text-gray-900 mb-2">
            {{ formatElapsedTime(timerState().elapsedTime) }}
          </div>

          @if (timerState().isRunning) {
            <div class="text-sm text-green-600 mb-3">
              <i class="bi bi-play-circle-fill mr-1"></i>
              Session en cours
              @if (timerState().currentSession?.description) {
                · {{ timerState().currentSession?.description }}
              }
            </div>
            <button
              (click)="stopTimer()"
              [disabled]="stopping()"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              <i class="bi bi-stop-circle mr-2"></i>
              Arrêter
            </button>
          } @else {
            <div class="text-sm text-gray-500 mb-3">
              Aucune session active
            </div>
            <div class="flex gap-2 justify-center">
              <button
                (click)="startTimer()"
                [disabled]="starting() || loadingSession()"
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                <i class="bi bi-play-circle mr-2"></i>
                Démarrer
              </button>
              <button
                (click)="showManualEntry = !showManualEntry"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <i class="bi bi-plus-circle mr-2"></i>
                Saisie manuelle
              </button>
            </div>
          }
        </div>

        <!-- Description pour la session en cours -->
        @if (timerState().isRunning && editingDescription()) {
          <div class="mt-3 p-3 bg-blue-50 rounded-lg">
            <input
              type="text"
              [(ngModel)]="sessionDescription"
              (keyup.enter)="saveDescription()"
              (keyup.escape)="editingDescription.set(false)"
              placeholder="Description de la session..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              maxlength="255"
            />
            <div class="flex gap-2 mt-2">
              <button
                (click)="saveDescription()"
                class="text-sm px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Sauvegarder
              </button>
              <button
                (click)="editingDescription.set(false)"
                class="text-sm px-3 py-1 text-gray-600 hover:text-gray-800">
                Annuler
              </button>
            </div>
          </div>
        } @else if (timerState().isRunning) {
          <div class="mt-2 text-center">
            <button
              (click)="editDescription()"
              class="text-sm text-blue-600 hover:text-blue-800">
              <i class="bi bi-pencil mr-1"></i>
              {{ timerState().currentSession?.description ? 'Modifier description' : 'Ajouter description' }}
            </button>
          </div>
        }
      </div>

      <!-- Saisie manuelle -->
      @if (showManualEntry) {
        <div class="mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 class="font-medium text-gray-900 mb-3">Saisie manuelle</h4>
          <form [formGroup]="manualEntryForm" (ngSubmit)="submitManualEntry()">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  formControlName="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  [max]="today"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Heures</label>
                <input
                  type="number"
                  formControlName="hours"
                  placeholder="ex: 2.5"
                  step="0.25"
                  min="0.25"
                  max="24"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Période</label>
                <div class="flex gap-1">
                  <input
                    type="time"
                    formControlName="startTime"
                    class="flex-1 px-2 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <span class="flex items-center px-2 text-gray-500">-</span>
                  <input
                    type="time"
                    formControlName="endTime"
                    class="flex-1 px-2 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
            </div>

            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                formControlName="description"
                placeholder="Description du travail effectué..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                maxlength="255"
              />
            </div>

            <div class="flex gap-2">
              <button
                type="submit"
                [disabled]="manualEntryForm.invalid || submittingEntry()"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm">
                <i class="bi bi-check-circle mr-1"></i>
                Enregistrer
              </button>
              <button
                type="button"
                (click)="cancelManualEntry()"
                class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 text-sm">
                Annuler
              </button>
            </div>

            @if (manualEntryForm.get('hours')?.hasError('required') && manualEntryForm.get('hours')?.touched) {
              <p class="text-red-600 text-sm mt-1">Les heures sont obligatoires</p>
            }
          </form>
        </div>
      }

      <!-- Résumé du temps -->
      @if (taskSummary()) {
        <div class="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 class="font-medium text-gray-900 mb-3">Résumé</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div class="text-gray-600">Temps total</div>
              <div class="font-semibold text-gray-900">
                {{ formatDuration(taskSummary()?.actual_hours || 0) }}
              </div>
            </div>

            @if (taskSummary()?.estimated_hours) {
              <div>
                <div class="text-gray-600">Variance</div>
                <div [class]="getVarianceColor(taskSummary()?.variance || 0)" class="font-semibold">
                  {{ formatVariance(taskSummary()?.variance || 0) }}
                </div>
              </div>
            }

            <div>
              <div class="text-gray-600">Progression</div>
              <div class="flex items-center gap-2">
                <div class="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    class="h-2 rounded-full"
                    [style.width.%]="taskSummary()?.progress_percentage || 0"
                    [style.background-color]="taskSummary()?.progress_color || '#6b7280'">
                  </div>
                </div>
                <span class="font-semibold text-gray-900">
                  {{ taskSummary()?.progress_percentage || 0 }}%
                </span>
              </div>
            </div>
          </div>

          @if (taskSummary()?.time_by_user && taskSummary()!.time_by_user.length > 1) {
            <div class="mt-3">
              <div class="text-gray-600 text-sm mb-2">Répartition par utilisateur</div>
              <div class="space-y-1">
                @for (userTime of taskSummary()?.time_by_user?.slice(0, 3); track userTime.user.id) {
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-700">{{ userTime.user.name }}</span>
                    <span class="font-medium">{{ formatDuration(userTime.total_hours) }}</span>
                  </div>
                }
                @if (taskSummary()!.time_by_user!.length > 3) {
                  <div class="text-xs text-gray-500">
                    +{{ taskSummary()!.time_by_user!.length - 3 }} autre(s)
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Liste des saisies récentes -->
      @if (recentEntries().length > 0) {
        <div>
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-medium text-gray-900">Saisies récentes</h4>
            <button
              (click)="refreshEntries()"
              [disabled]="loadingEntries()"
              class="text-sm text-blue-600 hover:text-blue-800">
              <i class="bi bi-arrow-clockwise mr-1"></i>
              Actualiser
            </button>
          </div>

          <div class="space-y-2">
            @for (entry of recentEntries(); track entry.id) {
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-gray-900">
                      {{ formatDuration(entry.hours) }}
                    </span>
                    <span class="text-gray-500">
                      {{ formatDate(entry.date) }}
                    </span>
                    @if (entry.start_time && entry.end_time) {
                      <span class="text-gray-400 text-xs">
                        {{ entry.start_time }} - {{ entry.end_time }}
                      </span>
                    }
                  </div>
                  @if (entry.description) {
                    <div class="text-gray-600 mt-1">{{ entry.description }}</div>
                  }
                  <div class="text-xs text-gray-500 mt-1">
                    {{ entry.user?.name }}
                  </div>
                </div>
                <div class="flex gap-1">
                  <button
                    (click)="editTimeEntry(entry)"
                    class="p-1 text-gray-400 hover:text-blue-600"
                    title="Modifier">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    (click)="deleteTimeEntry(entry)"
                    class="p-1 text-gray-400 hover:text-red-600"
                    title="Supprimer">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            }
          </div>

          @if (recentEntries().length >= 5) {
            <div class="text-center mt-3">
              <button
                (click)="viewAllEntries()"
                class="text-sm text-blue-600 hover:text-blue-800">
                Voir toutes les saisies
              </button>
            </div>
          }
        </div>
      } @else if (!loadingEntries()) {
        <div class="text-center py-6 text-gray-500">
          <i class="bi bi-clock text-2xl mb-2"></i>
          <p class="text-sm">Aucune saisie de temps pour cette tâche</p>
        </div>
      }

      <!-- État de chargement -->
      @if (loadingEntries() || loadingSession()) {
        <div class="text-center py-6">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p class="text-sm text-gray-600 mt-2">Chargement...</p>
        </div>
      }

      <!-- Erreurs -->
      @if (error()) {
        <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div class="text-sm text-red-800">{{ error() }}</div>
        </div>
      }
    </div>
  `
})
export class TimeTrackerComponent implements OnInit, OnDestroy {
  @Input({ required: true }) task!: Task;

  private destroy$ = new Subject<void>();
  private tasksApiService = inject(TasksApiService);
  private fb = inject(FormBuilder);

  // État du timer
  timerState = signal<TimerState>({
    isRunning: false,
    currentSession: null,
    elapsedTime: 0,
    startTime: null
  });

  // État des composants
  taskSummary = signal<TaskSummary | null>(null);
  recentEntries = signal<TaskTimeEntry[]>([]);
  error = signal('');

  // État des actions
  starting = signal(false);
  stopping = signal(false);
  submittingEntry = signal(false);
  loadingEntries = signal(false);
  loadingSession = signal(false);

  // Interface utilisateur
  showManualEntry = false;
  editingDescription = signal(false);
  sessionDescription = '';

  // Formulaires
  manualEntryForm: FormGroup;

  // Constantes
  formatDuration = formatDuration;
  today = new Date().toISOString().split('T')[0];

  constructor() {
    this.manualEntryForm = this.fb.group({
      date: [this.today, Validators.required],
      hours: ['', [Validators.required, Validators.min(0.25), Validators.max(24)]],
      startTime: [''],
      endTime: [''],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupTimerUpdates();
    this.watchCurrentTimeSession();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    this.loadTaskSummary();
    this.loadRecentEntries();
    this.checkCurrentSession();
  }

  private loadTaskSummary(): void {
    this.tasksApiService.getTaskTimeSummary(this.task.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.taskSummary.set(response.data || null);
        },
        error: () => {
          // Silent error pour le résumé
        }
      });
  }

  private loadRecentEntries(): void {
    this.loadingEntries.set(true);
    this.tasksApiService.getTaskTimeEntries(this.task.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.recentEntries.set((response.data || []).slice(0, 5));
          this.loadingEntries.set(false);
        },
        error: (error) => {
          this.error.set('Erreur lors du chargement des saisies');
          this.loadingEntries.set(false);
        }
      });
  }

  private checkCurrentSession(): void {
    this.loadingSession.set(true);
    this.tasksApiService.getCurrentTimeSession()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const session = response.data;
          if (session && session.task_id === this.task.id) {
            this.startTimerWithSession(session);
          }
          this.loadingSession.set(false);
        },
        error: () => {
          this.loadingSession.set(false);
        }
      });
  }

  private watchCurrentTimeSession(): void {
    this.tasksApiService.currentTimeSession$
      .pipe(takeUntil(this.destroy$))
      .subscribe(session => {
        if (session && session.task_id === this.task.id && !this.timerState().isRunning) {
          this.startTimerWithSession(session);
        } else if (!session && this.timerState().isRunning) {
          this.stopTimerDisplay();
        }
      });
  }

  private setupTimerUpdates(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const state = this.timerState();
        if (state.isRunning && state.startTime) {
          const elapsed = Math.floor((new Date().getTime() - state.startTime.getTime()) / 1000);
          this.timerState.update(s => ({ ...s, elapsedTime: elapsed }));
        }
      });
  }

  // Actions du timer
  startTimer(): void {
    this.starting.set(true);
    this.error.set('');

    this.tasksApiService.startTimeSession(this.task.id, {
      description: this.sessionDescription || undefined
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.data) {
          this.startTimerWithSession(response.data);
        }
        this.starting.set(false);
      },
      error: (error) => {
        this.error.set('Erreur lors du démarrage du timer');
        this.starting.set(false);
      }
    });
  }

  stopTimer(): void {
    const session = this.timerState().currentSession;
    if (!session) return;

    this.stopping.set(true);
    this.error.set('');

    this.tasksApiService.stopTimeSession(session.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.stopTimerDisplay();
          this.loadTaskSummary();
          this.loadRecentEntries();
          this.stopping.set(false);
        },
        error: () => {
          this.error.set('Erreur lors de l\'arrêt du timer');
          this.stopping.set(false);
        }
      });
  }

  private startTimerWithSession(session: TimeSession): void {
    const startTime = new Date(session.start_time);
    const elapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

    this.timerState.set({
      isRunning: true,
      currentSession: session,
      elapsedTime: elapsed,
      startTime: startTime
    });

    this.sessionDescription = session.description || '';
  }

  private stopTimerDisplay(): void {
    this.timerState.set({
      isRunning: false,
      currentSession: null,
      elapsedTime: 0,
      startTime: null
    });
    this.editingDescription.set(false);
    this.sessionDescription = '';
  }

  // Gestion de la description
  editDescription(): void {
    this.editingDescription.set(true);
  }

  saveDescription(): void {
    // La description sera sauvegardée lors de l'arrêt de la session
    this.editingDescription.set(false);
  }

  // Saisie manuelle
  submitManualEntry(): void {
    if (this.manualEntryForm.invalid) return;

    this.submittingEntry.set(true);
    this.error.set('');

    const formValue = this.manualEntryForm.value;
    const entryData: CreateTimeEntryRequest = {
      date: formValue.date,
      hours: formValue.hours,
      description: formValue.description
    };

    if (formValue.startTime && formValue.endTime) {
      entryData.start_time = formValue.startTime;
      entryData.end_time = formValue.endTime;
    }

    this.tasksApiService.addTimeEntry(this.task.id, entryData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cancelManualEntry();
          this.loadTaskSummary();
          this.loadRecentEntries();
          this.submittingEntry.set(false);
        },
        error: () => {
          this.error.set('Erreur lors de l\'enregistrement');
          this.submittingEntry.set(false);
        }
      });
  }

  cancelManualEntry(): void {
    this.showManualEntry = false;
    this.manualEntryForm.reset({
      date: this.today
    });
  }

  // Actions sur les saisies
  editTimeEntry(entry: TaskTimeEntry): void {
    // TODO: Ouvrir modal d'édition
  }

  deleteTimeEntry(entry: TaskTimeEntry): void {
    if (confirm('Supprimer cette saisie de temps ?')) {
      this.tasksApiService.deleteTimeEntry(entry.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadTaskSummary();
            this.loadRecentEntries();
          },
          error: () => {
            this.error.set('Erreur lors de la suppression');
          }
        });
    }
  }

  refreshEntries(): void {
    this.loadRecentEntries();
    this.loadTaskSummary();
  }

  viewAllEntries(): void {
    // TODO: Navigation vers page complète des saisies
  }

  // Méthodes utilitaires
  formatElapsedTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  formatVariance(variance: number): string {
    const sign = variance >= 0 ? '+' : '';
    return `${sign}${formatDuration(Math.abs(variance))}`;
  }

  getVarianceColor(variance: number): string {
    if (variance > 0) return 'text-red-600';
    if (variance < 0) return 'text-green-600';
    return 'text-gray-600';
  }
}