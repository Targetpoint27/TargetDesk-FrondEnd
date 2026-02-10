// ========================================
// COMPOSANT MES TÂCHES
// Page personnalisée pour les tâches assignées à l'utilisateur connecté
// ========================================

import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { Task, TaskFilters, TaskStatus, TaskPriority, TaskType, PaginatedResponse } from '../../models/task.models';
import { TasksApiService } from '../../services/tasks-api.service';
import { LoggingService } from '../../../../core/logging/logging.service';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <!-- En-tête avec statistiques personnalisées -->
      <div class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Mes Tâches
              </h1>
              <p class="mt-2 text-sm text-gray-600">
                Gérez vos tâches assignées et suivez votre progression
              </p>
            </div>

            <!-- Statistiques rapides -->
            <div class="mt-4 sm:mt-0 flex flex-wrap gap-4">
              <div class="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg px-4 py-2 text-white shadow-sm">
                <div class="text-xs font-medium opacity-90">À faire</div>
                <div class="text-lg font-bold">{{ taskStats().todo }}</div>
              </div>
              <div class="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg px-4 py-2 text-white shadow-sm">
                <div class="text-xs font-medium opacity-90">En cours</div>
                <div class="text-lg font-bold">{{ taskStats().in_progress }}</div>
              </div>
              <div class="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg px-4 py-2 text-white shadow-sm">
                <div class="text-xs font-medium opacity-90">En révision</div>
                <div class="text-lg font-bold">{{ taskStats().in_review }}</div>
              </div>
              <div class="bg-gradient-to-r from-green-500 to-green-600 rounded-lg px-4 py-2 text-white shadow-sm">
                <div class="text-xs font-medium opacity-90">Terminées</div>
                <div class="text-lg font-bold">{{ taskStats().completed }}</div>
              </div>
            </div>
          </div>

          <!-- Filtres rapides -->
          <div class="mt-6">
            <form [formGroup]="filtersForm" class="flex flex-wrap gap-4">
              <div class="flex-1 min-w-64">
                <input
                  type="text"
                  formControlName="search"
                  placeholder="Rechercher dans mes tâches..."
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              <select formControlName="status" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Tous les statuts</option>
                <option value="todo">À faire</option>
                <option value="in_progress">En cours</option>
                <option value="in_review">En révision</option>
                <option value="completed">Terminée</option>
                <option value="cancelled">Annulée</option>
              </select>

              <select formControlName="priority" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Toutes les priorités</option>
                <option value="low">Basse</option>
                <option value="normal">Normale</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </select>

              <select formControlName="due_status" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Toutes les échéances</option>
                <option value="overdue">En retard</option>
                <option value="due_today">Échéance aujourd'hui</option>
                <option value="due_this_week">Cette semaine</option>
              </select>
            </form>
          </div>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <!-- Vue en cours de chargement -->
        <div *ngIf="isLoading()" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>

        <!-- Message d'erreur -->
        <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Erreur de chargement</h3>
              <p class="mt-1 text-sm text-red-700">{{ error() }}</p>
              <button
                (click)="loadMyTasks()"
                class="mt-2 text-sm text-red-800 hover:text-red-900 font-medium underline"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>

        <!-- Liste des tâches -->
        <div *ngIf="!isLoading() && !error()" class="space-y-4">
          <!-- Message si aucune tâche -->
          <div *ngIf="tasks().length === 0" class="text-center py-12">
            <div class="mx-auto h-12 w-12 text-gray-400 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Aucune tâche trouvée</h3>
            <p class="text-gray-500">Aucune tâche ne correspond à vos critères de recherche.</p>
          </div>

          <!-- Cartes des tâches -->
          <div *ngIf="tasks().length > 0" class="grid gap-4">
            <div
              *ngFor="let task of tasks()"
              class="bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-200 overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
            >
              <div class="p-6">
                <div class="flex items-start justify-between">
                  <!-- Informations principales -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-3 mb-3">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            [ngClass]="getStatusClasses(task.status)">
                        {{ getStatusLabel(task.status) }}
                      </span>
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            [ngClass]="getPriorityClasses(task.priority)">
                        {{ getPriorityLabel(task.priority) }}
                      </span>
                      <span *ngIf="isOverdue(task)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        En retard
                      </span>
                    </div>

                    <h3 class="text-lg font-semibold text-gray-900 mb-2 truncate">
                      <a [routerLink]="['/tasks/detail', task.id]" class="hover:text-blue-600 transition-colors">
                        {{ task.title }}
                      </a>
                    </h3>

                    <p *ngIf="task.description" class="text-gray-600 text-sm mb-3 line-clamp-2">
                      {{ task.description }}
                    </p>

                    <div class="flex items-center text-sm text-gray-500 space-x-4">
                      <span class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                        </svg>
                        {{ task.code }}
                      </span>
                      <span *ngIf="task.project" class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                        </svg>
                        {{ task.project.name }}
                      </span>
                      <span *ngIf="task.due_date" class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        {{ formatDate(task.due_date) }}
                      </span>
                    </div>
                  </div>

                  <!-- Actions rapides -->
                  <div class="flex items-center space-x-2 ml-4">
                    <!-- Progression -->
                    <div class="text-center">
                      <div class="text-sm font-medium text-gray-900">{{ task.progress_percentage }}%</div>
                      <div class="w-16 bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          [style.width.%]="task.progress_percentage"
                        ></div>
                      </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex space-x-1">
                      <button
                        *ngIf="canStartTimer(task)"
                        (click)="startTimer(task)"
                        class="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Démarrer le timer"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1M9 16h1m4 0h1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </button>

                      <button
                        *ngIf="hasActiveTimer(task)"
                        (click)="stopTimer(task)"
                        class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors animate-pulse"
                        title="Arrêter le timer"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10h6v4H9z"/>
                        </svg>
                      </button>

                      <a
                        [routerLink]="['/tasks/detail', task.id]"
                        class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Voir les détails"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>

                <!-- Temps actif affiché pour les tâches avec timer en cours -->
                <div *ngIf="hasActiveTimer(task)" class="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-green-700 font-medium">Timer en cours</span>
                    <span class="text-lg font-mono font-bold text-green-700">
                      {{ getCurrentTimerDisplay(task) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div *ngIf="pagination() && pagination()!.last_page > 1" class="mt-8 flex items-center justify-between">
            <div class="text-sm text-gray-700">
              Affichage de {{ getDisplayRange().start }} à {{ getDisplayRange().end }} sur {{ pagination()!.total }} résultats
            </div>
            <div class="flex space-x-2">
              <button
                (click)="goToPage(pagination()!.current_page - 1)"
                [disabled]="pagination()!.current_page <= 1"
                class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Précédent
              </button>

              <span class="px-4 py-2 text-sm font-medium text-gray-700">
                Page {{ pagination()!.current_page }} sur {{ pagination()!.last_page }}
              </span>

              <button
                (click)="goToPage(pagination()!.current_page + 1)"
                [disabled]="pagination()!.current_page >= pagination()!.last_page"
                class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class MyTasksComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private tasksService = inject(TasksApiService);
  private loggingService = inject(LoggingService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // État du composant
  tasks = signal<Task[]>([]);
  pagination = signal<any>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Formulaire de filtres
  filtersForm: FormGroup;

  // Statistiques calculées
  taskStats = computed(() => {
    const allTasks = this.tasks();
    return {
      todo: allTasks.filter(t => t.status === 'todo').length,
      in_progress: allTasks.filter(t => t.status === 'in_progress').length,
      in_review: allTasks.filter(t => t.status === 'in_review').length,
      completed: allTasks.filter(t => t.status === 'completed').length
    };
  });

  constructor() {
    this.filtersForm = this.fb.group({
      search: [''],
      status: [''],
      priority: [''],
      due_status: ['']
    });
  }

  ngOnInit(): void {
    this.setupFiltersSubscription();
    this.loadMyTasks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFiltersSubscription(): void {
    this.filtersForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.loadMyTasks();
      });
  }

  loadMyTasks(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const filters: TaskFilters = {
      assigned_to_me: true,
      page: 1,
      per_page: 20,
      ...this.filtersForm.value
    };

    // Filtrer les valeurs vides
    Object.keys(filters).forEach(key => {
      if (!filters[key as keyof TaskFilters]) {
        delete filters[key as keyof TaskFilters];
      }
    });

    this.tasksService.getTasks(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.tasks.set(response.data);
          this.pagination.set(response.meta);
          this.isLoading.set(false);

          this.loggingService.debug('My tasks loaded successfully', {
            component: 'MyTasksComponent',
            action: 'loadMyTasks',
            data: { count: response.data.length, filters }
          });
        },
        error: (error) => {
          this.error.set('Erreur lors du chargement des tâches');
          this.isLoading.set(false);

          this.loggingService.error('Failed to load my tasks', {
            component: 'MyTasksComponent',
            action: 'loadMyTasks',
            data: { error: error.message, filters }
          });
        }
      });
  }

  goToPage(page: number): void {
    const filters: TaskFilters = {
      assigned_to_me: true,
      page: page,
      per_page: 20,
      ...this.filtersForm.value
    };

    this.tasksService.getTasks(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.tasks.set(response.data);
          this.pagination.set(response.meta);
        },
        error: (error) => {
          this.error.set('Erreur lors du chargement de la page');
        }
      });
  }

  // Timer functions
  canStartTimer(task: Task): boolean {
    return task.status === 'in_progress' && !this.hasActiveTimer(task);
  }

  hasActiveTimer(task: Task): boolean {
    // Vérifier si une session est active pour cette tâche
    return this.tasksService.hasActiveSession(task.id);
  }

  startTimer(task: Task): void {
    this.tasksService.startSession(task.id, {
      description: 'Session démarrée depuis Mes Tâches'
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.loggingService.info('Timer started for task', {
          component: 'MyTasksComponent',
          action: 'startTimer',
          data: { taskId: task.id, taskTitle: task.title }
        });
      },
      error: (error) => {
        this.loggingService.error('Failed to start timer', {
          component: 'MyTasksComponent',
          action: 'startTimer',
          data: { error: error.message, taskId: task.id }
        });
      }
    });
  }

  stopTimer(task: Task): void {
    this.tasksService.stopCurrentSession(task.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loggingService.info('Timer stopped for task', {
            component: 'MyTasksComponent',
            action: 'stopTimer',
            data: { taskId: task.id, taskTitle: task.title }
          });
        },
        error: (error) => {
          this.loggingService.error('Failed to stop timer', {
            component: 'MyTasksComponent',
            action: 'stopTimer',
            data: { error: error.message, taskId: task.id }
          });
        }
      });
  }

  getCurrentTimerDisplay(task: Task): string {
    return this.tasksService.getCurrentSessionDisplay(task.id);
  }

  // Utility functions
  getStatusClasses(status: string): string {
    const classes: Record<string, string> = {
      'todo': 'bg-gray-100 text-gray-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'in_review': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'todo': 'À faire',
      'in_progress': 'En cours',
      'in_review': 'En révision',
      'completed': 'Terminée',
      'cancelled': 'Annulée'
    };
    return labels[status] || status;
  }

  getPriorityClasses(priority: string): string {
    const classes: Record<string, string> = {
      'low': 'bg-green-100 text-green-800',
      'normal': 'bg-blue-100 text-blue-800',
      'high': 'bg-orange-100 text-orange-800',
      'urgent': 'bg-red-100 text-red-800'
    };
    return classes[priority] || 'bg-gray-100 text-gray-800';
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      'low': 'Basse',
      'normal': 'Normale',
      'high': 'Haute',
      'urgent': 'Urgente'
    };
    return labels[priority] || priority;
  }

  isOverdue(task: Task): boolean {
    if (!task.due_date) return false;
    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today && task.status !== 'completed';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return "Aujourd'hui";
    } else if (date.getTime() === tomorrow.getTime()) {
      return "Demain";
    } else {
      return date.toLocaleDateString('fr-FR');
    }
  }

  getDisplayRange(): { start: number; end: number } {
    const meta = this.pagination();
    if (!meta) return { start: 0, end: 0 };

    const start = (meta.current_page - 1) * meta.per_page + 1;
    const end = Math.min(meta.current_page * meta.per_page, meta.total);
    return { start, end };
  }
}