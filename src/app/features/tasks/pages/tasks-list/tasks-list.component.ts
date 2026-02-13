// ========================================
// PAGE LISTE DES TÂCHES
// Liste complète des tâches avec filtrage et pagination
// ========================================

import { Component, OnInit, OnDestroy, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

import {
  Task,
  TaskFilters,
  PaginatedTaskResponse,
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_TYPE_OPTIONS
} from '../../../../shared/interfaces/task.interface';
import { TasksApiService } from '../../services/tasks-api.service';
import { AuthFacade } from '../../../auth/auth.facade';
import { UserEntity } from '../../../../domain/entities/user.entity';
import { TaskDetailPanelComponent } from '../../../../shared/components/task-detail-panel/task-detail-panel.component';

@Component({
  selector: 'app-tasks-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskDetailPanelComponent, DragDropModule],
  template: `
    <div class="tasks-kanban-page min-h-screen bg-gray-50">
      <div class="container mx-auto px-4 py-8">
        <div class="max-w-full mx-auto">
          <!-- Header -->
          <div class="flex justify-between items-center mb-8">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">Board des tâches</h1>
              <p class="text-gray-600 mt-2">Gérez vos tâches avec le système Kanban</p>
            </div>

            <div class="flex gap-4">
              <button
                (click)="handleCreateTask()"
                class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                <i class="fas fa-plus mr-2"></i>
                Nouvelle tâche
              </button>
            </div>
          </div>

          <!-- Filters -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
                <input
                  type="text"
                  [(ngModel)]="searchQuery"
                  (keyup.enter)="applyFilters()"
                  placeholder="Titre, description..."
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                <select
                  [(ngModel)]="selectedPriority"
                  (change)="applyFilters()"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
                  <option value="">Toutes les priorités</option>
                  <option *ngFor="let priority of taskPriorityOptions" [value]="priority.value">
                    {{ priority.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  [(ngModel)]="selectedType"
                  (change)="applyFilters()"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
                  <option value="">Tous les types</option>
                  <option *ngFor="let type of taskTypeOptions" [value]="type.value">
                    {{ type.label }}
                  </option>
                </select>
              </div>
            </div>

            <div class="flex gap-4 mt-4">
              <button
                (click)="toggleOverdueFilter()"
                [class]="showOverdue ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'"
                class="px-4 py-2 rounded-lg font-medium transition-colors">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                {{ showOverdue ? 'Toutes les tâches' : 'Tâches en retard' }}
              </button>

              <button
                (click)="toggleMyTasksFilter()"
                [class]="showMyTasks ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'"
                class="px-4 py-2 rounded-lg font-medium transition-colors">
                <i class="fas fa-user mr-2"></i>
                {{ showMyTasks ? 'Toutes les tâches' : 'Mes tâches' }}
              </button>
            </div>
          </div>

          <!-- Loading -->
          <div *ngIf="loading()" class="flex justify-center py-12">
            <div class="text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
              <p class="text-gray-600 mt-4">Chargement des tâches...</p>
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
                          *ngIf="canEditTask(task)"
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
                            <span class="mr-1" style="color: red;">Échéance:</span>
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
            <h3 class="text-xl font-medium text-gray-900 mb-2">Aucune tâche trouvée</h3>
            <p class="text-gray-600 mb-6">Commencez par créer votre première tâche ou ajustez vos filtres.</p>
            <button
              (click)="handleCreateTask()"
              class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
              <i class="fas fa-plus mr-2"></i>
              Créer une tâche
            </button>
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
    <div *ngIf="showBlockDialog()" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Bloquer la tâche</h3>
          <button
            (click)="cancelBlockDialog()"
            class="text-gray-400 hover:text-gray-600 transition-colors">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <p class="text-gray-600 mb-4">
          Veuillez indiquer la raison du blocage de cette tâche :
        </p>

        <div class="mb-4">
          <textarea
            [(ngModel)]="blockComment"
            placeholder="Décrivez la raison du blocage..."
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 resize-none"
            [class.border-red-300]="!blockComment().trim()"
            [class.focus:ring-red-500]="!blockComment().trim()">
          </textarea>
          <p *ngIf="!blockComment().trim()" class="text-red-500 text-sm mt-1">
            Le commentaire est obligatoire
          </p>
        </div>

        <div class="flex justify-end gap-3">
          <button
            (click)="cancelBlockDialog()"
            class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button
            (click)="confirmBlockTask()"
            [disabled]="!blockComment().trim()"
            [class.opacity-50]="!blockComment().trim()"
            [class.cursor-not-allowed]="!blockComment().trim()"
            class="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:hover:bg-orange-600">
            Bloquer
          </button>
        </div>
      </div>
    </div>
  `
})
export class TasksListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild('taskDetailPanel') taskDetailPanel!: TaskDetailPanelComponent;

  // Signaux pour l'état du composant
  tasks = signal<Task[]>([]);
  loading = signal(true);
  pagination = signal<PaginatedTaskResponse['meta'] | null>(null);
  currentUser = signal<UserEntity | null>(null);

  // Signaux pour la dialog de commentaire
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
  taskTypeOptions = TASK_TYPE_OPTIONS;

  // Variables de filtrage
  searchQuery = '';
  selectedStatus = '';
  selectedPriority = '';
  selectedType = '';
  showOverdue = false;
  showMyTasks = false;

  currentFilters: TaskFilters = {};
  currentPage = 1;
  perPage = 20;

  constructor(
    private tasksApiService: TasksApiService,
    private authFacade: AuthFacade,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Récupérer l'utilisateur actuel
    this.authFacade.user$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.currentUser.set(user);
    });

    // Charger les filtres depuis les query params
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      this.searchQuery = params['search'] || '';
      this.selectedStatus = params['status'] || '';
      this.selectedPriority = params['priority'] || '';
      this.selectedType = params['type'] || '';
      this.showOverdue = params['overdue'] === 'true';
      this.showMyTasks = params['my_tasks'] === 'true';

      this.applyFilters(false);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTasks(): void {
    this.loading.set(true);

    this.tasksApiService.getTasks(this.currentFilters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('Response from getTasks:', response);
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

          console.log('Processed tasks:', tasks);
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

  applyFilters(updateUrl = true): void {
    this.currentFilters = {
      page: 1,
      per_page: this.perPage,
      search: this.searchQuery || undefined,
      status: this.selectedStatus ? this.selectedStatus as any : undefined,
      priority: this.selectedPriority ? this.selectedPriority as any : undefined,
      type: this.selectedType ? this.selectedType as any : undefined,
      overdue: this.showOverdue || undefined,
      my_tasks: this.showMyTasks || undefined
    };

    // Nettoyer les valeurs undefined
    Object.keys(this.currentFilters).forEach(key => {
      if (this.currentFilters[key as keyof TaskFilters] === undefined) {
        delete this.currentFilters[key as keyof TaskFilters];
      }
    });

    if (updateUrl) {
      // Mettre à jour l'URL avec les nouveaux filtres
      this.router.navigate([], {
        queryParams: this.currentFilters,
        queryParamsHandling: 'merge'
      });
    } else {
      this.loadTasks();
    }
  }

  handlePageChange(page: number): void {
    this.currentPage = page;
    this.currentFilters = { ...this.currentFilters, page };
    this.loadTasks();
  }

  toggleOverdueFilter(): void {
    this.showOverdue = !this.showOverdue;
    this.applyFilters();
  }

  toggleMyTasksFilter(): void {
    this.showMyTasks = !this.showMyTasks;
    this.applyFilters();
  }

  handleCreateTask(): void {
    this.router.navigate(['/dashboard/tasks/create']);
  }

  handleViewTask(task: Task): void {
    this.taskDetailPanel.open(task.id);
  }

  handleEditTask(task: Task): void {
    this.router.navigate(['/dashboard/tasks/edit', task.id]);
  }

  canEditTask(task: Task): boolean {
    const user = this.currentUser();
    if (!user) return false;

    const userId = parseInt(user.id);

    // L'utilisateur peut modifier si c'est le créateur ou s'il est assigné à la tâche
    return task.created_by === userId ||
           task.assignees.some(assignee => assignee.id === userId);
  }

  getStatusColor(status: string): string {
    const statusOption = this.taskStatusOptions.find(s => s.value === status);
    return statusOption?.color || '#6b7280';
  }

  getStatusLabel(status: string): string {
    const statusOption = this.taskStatusOptions.find(s => s.value === status);
    return statusOption?.label || status;
  }

  getPriorityColor(priority: string): string {
    const priorityOption = this.taskPriorityOptions.find(p => p.value === priority);
    return priorityOption?.color || '#6b7280';
  }

  getPriorityLabel(priority: string): string {
    const priorityOption = this.taskPriorityOptions.find(p => p.value === priority);
    return priorityOption?.label || priority;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  trackByTaskId(index: number, task: Task): number {
    return task.id;
  }

  getCreatorName(creator: any): string {
    if (!creator) return 'Utilisateur';
    if (creator.name) return creator.name;
    if (creator.getFirstName) {
      return `${creator.getFirstName()} ${creator.getLastName() || ''}`.trim();
    }
    if (creator.first_name || creator.last_name) {
      return `${creator.first_name || ''} ${creator.last_name || ''}`.trim();
    }
    return creator.email || 'Utilisateur';
  }

  onTaskDetailClosed(): void {
    // Optionally reload tasks or perform other actions when panel closes
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
          this.loadTasks();
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

  getProgressPercentage(task: Task): number {
    if (task.progress_percentage === null || task.progress_percentage === undefined) {
      return 0;
    }
    return Math.min(Math.max(task.progress_percentage, 0), 100);
  }

  isTaskOverdue(task: Task): boolean {
    if (!task.due_date) return false;
    const dueDate = new Date(task.due_date);
    const now = new Date();
    return dueDate < now;
  }

  // === MÉTHODES DE DIALOGUE POUR COMMENTAIRE DE BLOCAGE ===

  showBlockCommentDialog(taskId: number, status: string): void {
    this.pendingBlockTaskId.set(taskId);
    this.pendingBlockStatus.set(status);
    this.blockComment.set('');
    this.showBlockDialog.set(true);
  }

  confirmBlockTask(): void {
    const comment = this.blockComment().trim();
    const taskId = this.pendingBlockTaskId();
    const status = this.pendingBlockStatus();

    if (!comment) {
      return; // Le commentaire est obligatoire
    }

    if (taskId && status) {
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
}