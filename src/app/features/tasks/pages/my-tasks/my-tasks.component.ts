// ========================================
// PAGE MES TÂCHES
// Tâches assignées à l'utilisateur connecté
// ========================================

import { Component, OnInit, OnDestroy, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

import {
  Task,
  TaskFilters,
  PaginatedTaskResponse,
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS
} from '../../../../shared/interfaces/task.interface';
import { TasksApiService } from '../../services/tasks-api.service';
import { AuthFacade } from '../../../auth/auth.facade';
import { UserEntity } from '../../../../domain/entities/user.entity';
import { TaskDetailPanelComponent } from '../../../../shared/components/task-detail-panel/task-detail-panel.component';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, TaskDetailPanelComponent],
  template: `
    <div class="tasks-page min-h-screen bg-gray-50">
      <div class="container mx-auto px-4 py-8">
        <div class="max-w-7xl mx-auto">
          <!-- Header -->
          <div class="flex justify-between items-center mb-8">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">Mes tâches</h1>
              <p class="text-gray-600 mt-2">Visualisez et gérez vos tâches assignées par glisser-déposer</p>
            </div>
          </div>

          <!-- Loading -->
          <div *ngIf="loading()" class="flex justify-center py-12">
            <div class="text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
              <p class="text-gray-600 mt-4">Chargement de vos tâches...</p>
            </div>
          </div>

          <!-- Kanban Board -->
          <div *ngIf="!loading()" class="kanban-board" cdkDropListGroup>
            <div class="flex gap-6 overflow-x-auto pb-6 min-h-[calc(100vh-300px)]">
              <div
                *ngFor="let column of kanbanColumns(); trackBy: trackByColumnId"
                class="kanban-column bg-gray-100 rounded-lg p-4 min-w-[300px] max-w-[300px] flex flex-col"
                [attr.data-column]="column.id">

                <!-- Column Header -->
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-2">
                    <div
                      class="w-3 h-3 rounded-full"
                      [style.background-color]="column.color">
                    </div>
                    <h3 class="font-semibold text-gray-900">{{ column.title }}</h3>
                    <span class="bg-gray-300 text-gray-700 text-xs px-2 py-1 rounded-full font-medium">
                      {{ column.tasks.length }}
                    </span>
                  </div>
                </div>

                <!-- Drop Zone -->
                <div
                  class="flex-1 space-y-3"
                  cdkDropList
                  [id]="column.id"
                  [cdkDropListData]="column.tasks"
                  [cdkDropListConnectedTo]="getConnectedLists()"
                  (cdkDropListDropped)="onTaskDrop($event, column.id)">

                  <!-- Task Cards -->
                  <div
                    *ngFor="let task of column.tasks; trackBy: trackByTaskId"
                    cdkDrag
                    [cdkDragData]="task"
                    class="task-card bg-white rounded-lg p-4 shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-all"
                    (click)="handleViewTask(task)">

                    <!-- Card Header -->
                    <div class="flex items-center justify-between mb-3">
                      <span class="text-xs font-mono text-gray-500">{{ task.code }}</span>
                      <div class="flex gap-1">
                        <span
                          [style.background-color]="getPriorityColor(task.priority)"
                          class="w-2 h-2 rounded-full"
                          [title]="getPriorityLabel(task.priority)">
                        </span>
                        <button
                          (click)="$event.stopPropagation(); handleEditTask(task)"
                          class="text-gray-400 hover:text-gray-600 text-xs"
                          title="Modifier">
                          <i class="bi bi-pencil"></i>
                        </button>
                      </div>
                    </div>

                    <!-- Card Title -->
                    <h4 class="font-medium text-gray-900 mb-2 line-clamp-2 text-sm">{{ task.title }}</h4>

                    <!-- Card Info -->
                    <div class="space-y-2">
                      <div *ngIf="task.description" class="text-xs text-gray-600 line-clamp-2">
                        {{ task.description }}
                      </div>

                      <div class="flex items-center justify-between text-xs text-gray-500">
                        <div class="flex items-center gap-2">
                       
                          <span *ngIf="task.due_date" class="flex items-center text-xs"
                                [class.text-red-600]="isTaskOverdue(task)"
                                [class.text-gray-500]="!isTaskOverdue(task)">
                            <i class="fas fa-calendar mr-1"></i>
                            <span class="mr-1"  style="color: red;">Échéance:</span>
                            {{ formatShortDate(task.due_date) }}
                            <i *ngIf="isTaskOverdue(task)" class="fas fa-exclamation-triangle ml-1"></i>
                          </span>
                          <span class="flex items-center px-2 py-1 rounded text-xs font-medium"
                                [style.background-color]="getPriorityColor(task.priority) + '20'"
                                [style.color]="getPriorityColor(task.priority)">
                            {{ getPriorityLabel(task.priority) }}
                          </span>
                        </div>
                        <span class="text-blue-600 font-medium">{{ getProgressPercentage(task) }}%</span>
                      </div>

                      <!-- Progress Bar -->
                      <div class="w-full bg-gray-200 rounded-full h-1">
                        <div
                          class="bg-blue-600 h-1 rounded-full transition-all"
                          [style.width.%]="getProgressPercentage(task)">
                        </div>
                      </div>
                    </div>

                    <!-- Drag Preview -->
                    <div *cdkDragPreview class="task-card bg-white rounded-lg p-4 shadow-lg border border-blue-200 opacity-90">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-mono text-gray-500">{{ task.code }}</span>
                        <span
                          [style.background-color]="getPriorityColor(task.priority)"
                          class="w-2 h-2 rounded-full">
                        </span>
                      </div>
                      <h4 class="font-medium text-gray-900 text-sm">{{ task.title }}</h4>
                    </div>
                  </div>

                  <!-- Empty Column -->
                  <div *ngIf="column.tasks.length === 0" class="flex items-center justify-center py-12 text-gray-400">
                    <div class="text-center">
                      <i class="fas fa-tasks text-2xl mb-2"></i>
                      <p class="text-sm">Aucune tâche</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div *ngIf="!loading() && tasks().length === 0" class="text-center py-12">
            <i class="fas fa-tasks text-gray-400 text-6xl mb-6"></i>
            <h3 class="text-xl font-medium text-gray-900 mb-2">Aucune tâche assignée</h3>
            <p class="text-gray-600">Vous n'avez actuellement aucune tâche qui vous est assignée.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Task Detail Panel -->
    <app-task-detail-panel
      #taskDetailPanel
      (closed)="onTaskDetailClosed()">
    </app-task-detail-panel>

    <!-- Dialog de commentaire pour blocage -->
    @if (showBlockDialog()) {
      <div class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" (click)="cancelBlockDialog()"></div>

          <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 sm:mx-0 sm:h-10 sm:w-10">
                  <i class="fas fa-exclamation-triangle text-orange-600"></i>
                </div>
                <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                  <h3 class="text-base font-semibold leading-6 text-gray-900">Bloquer la tâche</h3>
                  <div class="mt-2">
                    <p class="text-sm text-gray-500 mb-4">
                      Veuillez expliquer pourquoi cette tâche est bloquée :
                    </p>
                    <textarea
                      [(ngModel)]="blockComment"
                      class="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="3"
                      placeholder="Décrivez le problème ou la raison du blocage..."
                      required>
                    </textarea>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                (click)="confirmBlockDialog()"
                [disabled]="!blockComment().trim()"
                class="inline-flex w-full justify-center rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed sm:ml-3 sm:w-auto">
                Bloquer la tâche
              </button>
              <button
                (click)="cancelBlockDialog()"
                class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto">
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class MyTasksComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild('taskDetailPanel') taskDetailPanel!: TaskDetailPanelComponent;

  // Signaux pour l'état du composant
  tasks = signal<Task[]>([]);
  loading = signal(true);
  pagination = signal<PaginatedTaskResponse['meta'] | null>(null);
  currentUser = signal<UserEntity | null>(null);

  // Dialog de commentaire pour blocage
  showBlockDialog = signal(false);
  blockComment = signal('');
  pendingBlockTaskId = signal<number | null>(null);
  pendingBlockStatus = signal<string | null>(null);

  // Colonnes Kanban
  kanbanColumns = signal<Array<{ id: string; title: string; tasks: Task[]; color: string }>>([
    { id: 'a_faire', title: 'À faire', tasks: [] as Task[], color: '#6b7280' },
    { id: 'en_cours', title: 'En cours', tasks: [] as Task[], color: '#3b82f6' },
    { id: 'bloque', title: 'Bloqué', tasks: [] as Task[], color: '#f59e0b' },
    { id: 'test', title: 'En test', tasks: [] as Task[], color: '#8b5cf6' },
    { id: 'termine', title: 'Terminé', tasks: [] as Task[], color: '#10b981' }
  ]);

  // Options pour les filtres
  taskStatusOptions = TASK_STATUS_OPTIONS;
  taskPriorityOptions = TASK_PRIORITY_OPTIONS;

  constructor(
    private tasksApiService: TasksApiService,
    private authFacade: AuthFacade,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Récupérer l'utilisateur actuel
    this.authFacade.user$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.currentUser.set(user);
      if (user) {
        this.loadMyTasks();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMyTasks(): void {
    this.loading.set(true);

    const filters: TaskFilters = {
      my_tasks: true,
      include: ['project', 'creator', 'assignees']
    };

    this.tasksApiService.getMyTasks(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('Response from getMyTasks:', response);
          // L'API retourne { success: true, data: { data: [...], meta: {...} } }
          let tasks: any[] = [];
          let pagination: any = null;

          if (response?.success && response?.data) {
            // Structure de l'API avec pagination Laravel
            tasks = Array.isArray(response.data.data) ? response.data.data : [];
            pagination = {
              current_page: response.data.current_page,
              total: response.data.total,
              per_page: response.data.per_page,
              last_page: response.data.last_page,
              from: response.data.from,
              to: response.data.to
            };
          } else if (Array.isArray(response)) {
            // Si c'est directement un tableau
            tasks = response;
          } else if (response?.data && Array.isArray(response.data)) {
            // Structure alternative
            tasks = response.data;
            pagination = response.meta || null;
          }

          // Normaliser les données pour s'assurer que assignees est toujours défini
          tasks.forEach(task => {
            if (!task.assignees && task.assigned_users) {
              task.assignees = task.assigned_users;
            }
            if (!task.assignees) {
              task.assignees = [];
            }
          });

          console.log('Processed my tasks:', tasks);
          this.tasks.set(tasks);
          this.pagination.set(pagination);
          this.organizeTasksIntoColumns(tasks);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des tâches:', error);
          this.loading.set(false);
        }
      });
  }

  // === MÉTHODES KANBAN ===

  private organizeTasksIntoColumns(tasks: Task[]): void {
    // Réinitialiser les colonnes
    const columns = this.kanbanColumns().map(column => ({
      ...column,
      tasks: [] as Task[]
    }));

    // Organiser les tâches par statut
    tasks.forEach(task => {
      const column = columns.find(col => col.id === task.status);
      if (column) {
        column.tasks.push(task);
      }
    });

    this.kanbanColumns.set(columns);
  }

  getConnectedLists(): string[] {
    return this.kanbanColumns().map(column => column.id);
  }

  onTaskDrop(event: CdkDragDrop<Task[]>, targetColumnId: string): void {
    const task = event.item.data || event.previousContainer.data[event.previousIndex];
    const oldStatus = task.status;
    const newStatus = targetColumnId as any;

    if (event.previousContainer === event.container) {
      // Réordonnancement dans la même colonne
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Déplacement entre colonnes
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      // Mettre à jour le statut de la tâche
      if (oldStatus !== newStatus) {
        // Si le nouveau statut est "bloqué", demander un commentaire
        if (newStatus === 'bloque') {
          this.showBlockCommentDialog(task.id, newStatus);
        } else {
          this.updateTaskStatus(task.id, newStatus);
        }
      }
    }
  }

  private updateTaskStatus(taskId: number, newStatus: string, comment?: string): void {
    const statusData: any = {
      status: newStatus as any
    };

    // Ajouter le commentaire si fourni
    if (comment) {
      statusData.comment = comment;
    }

    this.tasksApiService.updateTaskStatus(taskId, statusData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response?.success) {
            // Mettre à jour le statut localement
            const currentTasks = this.tasks();
            const updatedTasks = currentTasks.map(task =>
              task.id === taskId ? { ...task, status: newStatus as any } : task
            );
            this.tasks.set(updatedTasks);
            console.log(`Tâche ${taskId} mise à jour avec le statut ${newStatus}`);
          }
        },
        error: (error) => {
          console.error('Erreur lors de la mise à jour du statut:', error);

          // Afficher le message d'erreur spécifique
          let errorMessage = 'Erreur lors de la mise à jour du statut';
          if (error?.error?.message) {
            errorMessage = error.error.message;
          } else if (error?.message) {
            errorMessage = error.message;
          }

          // Afficher une notification d'erreur à l'utilisateur
          alert(errorMessage);

          // Recharger les tâches pour restaurer l'état correct
          this.loadMyTasks();
        }
      });
  }

  trackByColumnId(index: number, column: any): string {
    return column.id;
  }

  formatShortDate(date: string): string {
    const taskDate = new Date(date);
    const now = new Date();
    const diffTime = taskDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Aujourd\'hui';
    } else if (diffDays === 1) {
      return 'Demain';
    } else if (diffDays === -1) {
      return 'Hier';
    } else if (diffDays > 0) {
      return `${diffDays}j`;
    } else {
      return `${Math.abs(diffDays)}j retard`;
    }
  }

  handleViewTask(task: Task): void {
    this.taskDetailPanel.open(task.id);
  }

  handleEditTask(task: Task): void {
    this.router.navigate(['/dashboard/tasks/edit', task.id]);
  }

  getPriorityColor(priority: string): string {
    const priorityOption = TASK_PRIORITY_OPTIONS.find(p => p.value === priority);
    return priorityOption?.color || '#6b7280';
  }

  getPriorityLabel(priority: string): string {
    const priorityOption = TASK_PRIORITY_OPTIONS.find(p => p.value === priority);
    return priorityOption?.label || priority;
  }

  formatDate(date: string): string {
    const taskDate = new Date(date);
    const now = new Date();
    const diffTime = taskDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `En retard de ${Math.abs(diffDays)} jour(s)`;
    } else if (diffDays === 0) {
      return 'Aujourd\'hui';
    } else if (diffDays === 1) {
      return 'Demain';
    } else {
      return taskDate.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  }

  trackByTaskId(index: number, task: Task): number {
    return task.id;
  }

  getProgressPercentage(task: Task): number {
    // Assurer que la progression est un nombre valide entre 0 et 100
    const progress = task.progress_percentage;
    if (progress === undefined || progress === null || isNaN(progress)) {
      return 0;
    }
    return Math.max(0, Math.min(100, progress));
  }

  isTaskOverdue(task: Task): boolean {
    if (!task.due_date) return false;
    const dueDate = new Date(task.due_date);
    const now = new Date();
    return dueDate < now;
  }

  showBlockCommentDialog(taskId: number, status: string): void {
    this.pendingBlockTaskId.set(taskId);
    this.pendingBlockStatus.set(status);
    this.blockComment.set('');
    this.showBlockDialog.set(true);
  }

  confirmBlockDialog(): void {
    const taskId = this.pendingBlockTaskId();
    const status = this.pendingBlockStatus();
    const comment = this.blockComment().trim();

    if (taskId && status && comment) {
      this.updateTaskStatus(taskId, status, comment);
      this.cancelBlockDialog();
    }
  }

  cancelBlockDialog(): void {
    this.showBlockDialog.set(false);
    this.blockComment.set('');
    this.pendingBlockTaskId.set(null);
    this.pendingBlockStatus.set(null);
  }

  onTaskDetailClosed(): void {
    // Optionally reload tasks or perform other actions when panel closes
  }
}