// ========================================
// COMPOSANT SUIVI DU TEMPS PRINCIPAL
// Dashboard complet pour le suivi du temps avec analytics
// ========================================

import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, interval, startWith } from 'rxjs';

import { TimeEntry, TimeSession, TimeAnalytics, CreateTimeEntryRequest } from '../../models/time-tracking.models';
import { Task } from '../../../tasks/models/task.models';
import { TimeTrackingApiService } from '../../services/time-tracking-api.service';
import { TasksApiService } from '../../../tasks/services/tasks-api.service';
import { LoggingService } from '../../../../core/logging/logging.service';

@Component({
  selector: 'app-time-tracking',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <!-- En-tête avec statistiques -->
      <div class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Suivi du Temps
              </h1>
              <p class="mt-2 text-sm text-gray-600">
                Gérez votre temps et suivez votre productivité
              </p>
            </div>

            <!-- Statistiques du jour -->
            <div class="mt-6 lg:mt-0">
              <div class="flex flex-wrap gap-4">
                <div class="bg-gradient-to-r from-green-500 to-green-600 rounded-lg px-4 py-3 text-white shadow-sm">
                  <div class="text-xs font-medium opacity-90">Aujourd'hui</div>
                  <div class="text-lg font-bold">{{ formatDuration(todayStats().total_time) }}</div>
                </div>
                <div class="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg px-4 py-3 text-white shadow-sm">
                  <div class="text-xs font-medium opacity-90">Cette semaine</div>
                  <div class="text-lg font-bold">{{ formatDuration(weekStats().total_time) }}</div>
                </div>
                <div class="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg px-4 py-3 text-white shadow-sm">
                  <div class="text-xs font-medium opacity-90">Sessions actives</div>
                  <div class="text-lg font-bold">{{ activeSessions().length }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <!-- Colonne principale - Sessions actives et nouveau timer -->
          <div class="lg:col-span-2 space-y-6">

            <!-- Sessions actives -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200">
              <div class="px-6 py-5 border-b border-gray-200">
                <h3 class="text-lg font-medium text-gray-900">Sessions Actives</h3>
                <p class="mt-1 text-sm text-gray-500">Vos timers en cours d'exécution</p>
              </div>

              <div class="px-6 py-5">
                <!-- Message si aucune session active -->
                <div *ngIf="activeSessions().length === 0" class="text-center py-8">
                  <div class="mx-auto h-12 w-12 text-gray-400 mb-4">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <h3 class="text-lg font-medium text-gray-900 mb-2">Aucune session active</h3>
                  <p class="text-gray-500">Démarrez un timer pour commencer le suivi du temps</p>
                </div>

                <!-- Liste des sessions actives -->
                <div *ngIf="activeSessions().length > 0" class="space-y-4">
                  <div
                    *ngFor="let session of activeSessions()"
                    class="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div class="flex-1">
                      <h4 class="font-medium text-green-900">{{ session.task?.title || 'Tâche inconnue' }}</h4>
                      <p class="text-sm text-green-700">{{ session.task?.code }}</p>
                      <p *ngIf="session.description" class="text-sm text-green-600 mt-1">{{ session.description }}</p>
                    </div>

                    <div class="text-right mr-6">
                      <div class="text-xl font-mono font-bold text-green-900">
                        {{ getCurrentSessionTime(session) }}
                      </div>
                      <div class="text-sm text-green-700">
                        Démarré à {{ formatTime(session.start_time) }}
                      </div>
                    </div>

                    <div class="flex space-x-2">
                      <button
                        (click)="pauseSession(session)"
                        *ngIf="!session.is_paused"
                        class="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Mettre en pause"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </button>

                      <button
                        (click)="resumeSession(session)"
                        *ngIf="session.is_paused"
                        class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Reprendre"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1M9 16h1m4 0h1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </button>

                      <button
                        (click)="stopSession(session)"
                        class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Arrêter"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10h6v4H9z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Démarrer un nouveau timer -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200">
              <div class="px-6 py-5 border-b border-gray-200">
                <h3 class="text-lg font-medium text-gray-900">Démarrer un nouveau timer</h3>
                <p class="mt-1 text-sm text-gray-500">Sélectionnez une tâche pour commencer le suivi</p>
              </div>

              <div class="px-6 py-5">
                <form [formGroup]="newTimerForm" (ngSubmit)="startNewTimer()" class="space-y-4">
                  <div>
                    <label for="task_id" class="block text-sm font-medium text-gray-700 mb-2">
                      Tâche *
                    </label>
                    <select
                      id="task_id"
                      formControlName="task_id"
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionnez une tâche</option>
                      <option *ngFor="let task of availableTasks()" [value]="task.id">
                        {{ task.title }} ({{ task.code }})
                      </option>
                    </select>
                  </div>

                  <div>
                    <label for="session_description" class="block text-sm font-medium text-gray-700 mb-2">
                      Description (optionnel)
                    </label>
                    <input
                      type="text"
                      id="session_description"
                      formControlName="description"
                      placeholder="Ex: Implémentation de la fonctionnalité..."
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <button
                    type="submit"
                    [disabled]="newTimerForm.invalid || isStartingTimer()"
                    class="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <svg *ngIf="!isStartingTimer()" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1M9 16h1m4 0h1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <div *ngIf="isStartingTimer()" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {{ isStartingTimer() ? 'Démarrage...' : 'Démarrer le timer' }}
                  </button>
                </form>
              </div>
            </div>

            <!-- Entrées de temps récentes -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200">
              <div class="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-medium text-gray-900">Entrées récentes</h3>
                  <p class="mt-1 text-sm text-gray-500">Vos dernières sessions de travail</p>
                </div>
                <a
                  routerLink="/time-tracking/history"
                  class="text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  Voir tout l'historique
                </a>
              </div>

              <div class="divide-y divide-gray-200">
                <div *ngIf="recentEntries().length === 0" class="px-6 py-8 text-center text-gray-500">
                  Aucune entrée de temps récente
                </div>

                <div
                  *ngFor="let entry of recentEntries()"
                  class="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <h4 class="font-medium text-gray-900">{{ entry.task?.title }}</h4>
                      <p class="text-sm text-gray-600">{{ entry.task?.code }}</p>
                      <p *ngIf="entry.description" class="text-sm text-gray-500 mt-1">{{ entry.description }}</p>
                    </div>

                    <div class="text-right">
                      <div class="font-medium text-gray-900">{{ formatDuration(entry.duration) }}</div>
                      <div class="text-sm text-gray-500">{{ formatDate(entry.date) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Sidebar - Analytics et actions rapides -->
          <div class="space-y-6">

            <!-- Ajouter une entrée manuelle -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200">
              <div class="px-6 py-5 border-b border-gray-200">
                <h3 class="text-lg font-medium text-gray-900">Entrée manuelle</h3>
                <p class="mt-1 text-sm text-gray-500">Ajouter du temps manuellement</p>
              </div>

              <div class="px-6 py-5">
                <form [formGroup]="manualEntryForm" (ngSubmit)="addManualEntry()" class="space-y-4">
                  <div>
                    <label for="manual_task_id" class="block text-sm font-medium text-gray-700 mb-2">
                      Tâche *
                    </label>
                    <select
                      id="manual_task_id"
                      formControlName="task_id"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">Sélectionnez une tâche</option>
                      <option *ngFor="let task of availableTasks()" [value]="task.id">
                        {{ task.title }}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label for="manual_duration" class="block text-sm font-medium text-gray-700 mb-2">
                      Durée (heures) *
                    </label>
                    <input
                      type="number"
                      id="manual_duration"
                      formControlName="duration"
                      min="0.1"
                      step="0.1"
                      placeholder="Ex: 2.5"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label for="manual_date" class="block text-sm font-medium text-gray-700 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      id="manual_date"
                      formControlName="date"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label for="manual_description" class="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      id="manual_description"
                      formControlName="description"
                      rows="3"
                      placeholder="Décrivez le travail effectué..."
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    [disabled]="manualEntryForm.invalid || isAddingEntry()"
                    class="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <svg *ngIf="!isAddingEntry()" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    <div *ngIf="isAddingEntry()" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {{ isAddingEntry() ? 'Ajout...' : 'Ajouter' }}
                  </button>
                </form>
              </div>
            </div>

            <!-- Analytics rapides -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200">
              <div class="px-6 py-5 border-b border-gray-200">
                <h3 class="text-lg font-medium text-gray-900">Analytics</h3>
                <p class="mt-1 text-sm text-gray-500">Aperçu de votre productivité</p>
              </div>

              <div class="px-6 py-5 space-y-4">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Moyenne par jour</span>
                  <span class="font-medium">{{ formatDuration(weekStats().average_per_day) }}</span>
                </div>

                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Sessions cette semaine</span>
                  <span class="font-medium">{{ weekStats().sessions_count }}</span>
                </div>

                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Tâches actives</span>
                  <span class="font-medium">{{ weekStats().active_tasks }}</span>
                </div>

                <div class="pt-4 border-t border-gray-200">
                  <a
                    routerLink="/time-tracking/analytics"
                    class="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Analytics détaillées
                    <svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TimeTrackingComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private timeTrackingService = inject(TimeTrackingApiService);
  private tasksService = inject(TasksApiService);
  private loggingService = inject(LoggingService);
  private fb = inject(FormBuilder);

  // État du composant
  activeSessions = signal<TimeSession[]>([]);
  recentEntries = signal<TimeEntry[]>([]);
  availableTasks = signal<Task[]>([]);
  isStartingTimer = signal(false);
  isAddingEntry = signal(false);

  // Analytics
  todayStats = signal<any>({ total_time: 0 });
  weekStats = signal<any>({ total_time: 0, average_per_day: 0, sessions_count: 0, active_tasks: 0 });

  // Formulaires
  newTimerForm: FormGroup;
  manualEntryForm: FormGroup;

  // Timer pour mettre à jour l'affichage des sessions actives
  private sessionTimer$ = interval(1000);

  constructor() {
    this.newTimerForm = this.fb.group({
      task_id: ['', [Validators.required]],
      description: ['']
    });

    this.manualEntryForm = this.fb.group({
      task_id: ['', [Validators.required]],
      duration: ['', [Validators.required, Validators.min(0.1)]],
      date: [new Date().toISOString().split('T')[0], [Validators.required]],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.startSessionTimer();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    // Charger les sessions actives
    this.timeTrackingService.getActiveSessions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.activeSessions.set(response.data);
        },
        error: (error) => {
          this.loggingService.error('Failed to load active sessions', {
            component: 'TimeTrackingComponent',
            action: 'loadInitialData',
            data: { error: error.message }
          });
        }
      });

    // Charger les entrées récentes
    this.timeTrackingService.getTimeEntries({ per_page: 5 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.recentEntries.set(response.data);
        },
        error: (error) => {
          this.loggingService.error('Failed to load recent entries', error);
        }
      });

    // Charger les tâches disponibles (assignées à l'utilisateur)
    this.tasksService.getTasks({ assigned_to_me: true, status: 'todo,in_progress' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.availableTasks.set(response.data);
        },
        error: (error) => {
          this.loggingService.error('Failed to load available tasks', error);
        }
      });

    // Charger les analytics
    this.loadAnalytics();
  }

  private loadAnalytics(): void {
    // Analytics du jour
    this.timeTrackingService.getAnalytics({
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0]
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.todayStats.set(response.data);
      },
      error: (error) => {
        this.loggingService.error('Failed to load today analytics', error);
      }
    });

    // Analytics de la semaine
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    this.timeTrackingService.getAnalytics({
      start_date: weekStart.toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0]
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.weekStats.set(response.data);
      },
      error: (error) => {
        this.loggingService.error('Failed to load week analytics', error);
      }
    });
  }

  private startSessionTimer(): void {
    this.sessionTimer$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Déclenche la mise à jour des affichages de temps
        // Les calculs de temps sont faits dans getCurrentSessionTime()
      });
  }

  startNewTimer(): void {
    if (this.newTimerForm.valid) {
      this.isStartingTimer.set(true);

      const formData = this.newTimerForm.value;

      this.timeTrackingService.startSession(formData.task_id, {
        description: formData.description || ''
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.activeSessions.update(sessions => [...sessions, response.data]);
          this.newTimerForm.reset();
          this.isStartingTimer.set(false);

          this.loggingService.info('New timer started', {
            component: 'TimeTrackingComponent',
            action: 'startNewTimer',
            data: { sessionId: response.data.id, taskId: formData.task_id }
          });
        },
        error: (error) => {
          this.isStartingTimer.set(false);
          this.loggingService.error('Failed to start timer', {
            component: 'TimeTrackingComponent',
            action: 'startNewTimer',
            data: { error: error.message, formData }
          });
        }
      });
    }
  }

  addManualEntry(): void {
    if (this.manualEntryForm.valid) {
      this.isAddingEntry.set(true);

      const formData = this.manualEntryForm.value;

      const entryRequest: CreateTimeEntryRequest = {
        task_id: formData.task_id,
        duration: parseFloat(formData.duration),
        date: formData.date,
        description: formData.description || ''
      };

      this.timeTrackingService.createTimeEntry(entryRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.recentEntries.update(entries => [response.data, ...entries.slice(0, 4)]);
            this.manualEntryForm.reset({
              date: new Date().toISOString().split('T')[0]
            });
            this.isAddingEntry.set(false);

            // Recharger les analytics
            this.loadAnalytics();

            this.loggingService.info('Manual entry added', {
              component: 'TimeTrackingComponent',
              action: 'addManualEntry',
              data: { entryId: response.data.id, taskId: formData.task_id }
            });
          },
          error: (error) => {
            this.isAddingEntry.set(false);
            this.loggingService.error('Failed to add manual entry', {
              component: 'TimeTrackingComponent',
              action: 'addManualEntry',
              data: { error: error.message, entryData: entryRequest }
            });
          }
        });
    }
  }

  pauseSession(session: TimeSession): void {
    this.timeTrackingService.pauseSession(session.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.activeSessions.update(sessions =>
            sessions.map(s => s.id === session.id ? { ...s, is_paused: true } : s)
          );
        },
        error: (error) => {
          this.loggingService.error('Failed to pause session', error);
        }
      });
  }

  resumeSession(session: TimeSession): void {
    this.timeTrackingService.resumeSession(session.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.activeSessions.update(sessions =>
            sessions.map(s => s.id === session.id ? { ...s, is_paused: false } : s)
          );
        },
        error: (error) => {
          this.loggingService.error('Failed to resume session', error);
        }
      });
  }

  stopSession(session: TimeSession): void {
    this.timeTrackingService.stopSession(session.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.activeSessions.update(sessions =>
            sessions.filter(s => s.id !== session.id)
          );
          this.recentEntries.update(entries => [response.data, ...entries.slice(0, 4)]);

          // Recharger les analytics
          this.loadAnalytics();
        },
        error: (error) => {
          this.loggingService.error('Failed to stop session', error);
        }
      });
  }

  // Utility functions
  getCurrentSessionTime(session: TimeSession): string {
    if (!session.start_time) return '00:00:00';

    const start = new Date(session.start_time).getTime();
    const now = new Date().getTime();
    const elapsed = Math.floor((now - start) / 1000);

    return this.formatDurationFromSeconds(elapsed);
  }

  private formatDurationFromSeconds(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatDuration(hours: number): string {
    const totalMinutes = Math.floor(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (h === 0) {
      return `${m}min`;
    } else if (m === 0) {
      return `${h}h`;
    } else {
      return `${h}h ${m}min`;
    }
  }

  formatTime(timeString: string): string {
    return new Date(timeString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return "Aujourd'hui";
    } else if (date.getTime() === yesterday.getTime()) {
      return "Hier";
    } else {
      return date.toLocaleDateString('fr-FR');
    }
  }
}

// Import nécessaire pour les validateurs
import { Validators } from '@angular/forms';