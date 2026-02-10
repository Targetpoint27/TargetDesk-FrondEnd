// ========================================
// COMPOSANT DE GESTION DES VUES DE TÂCHES
// Création et gestion de vues personnalisées avec filtres
// ========================================

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { TasksApiService } from '../../services/tasks-api.service';
import {
  TaskView,
  TaskFilters,
  TaskStatus,
  TaskPriority,
  TaskType,
  SaveTaskViewRequest,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_TYPE_LABELS
} from '../../models/task.models';
import { UserEntity } from '../../../../domain/entities/user.entity';

interface ViewsState {
  views: TaskView[];
  currentView: TaskView | null;
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-task-views',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="task-views-manager">
      <!-- Sélecteur de vue -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3 flex-1">
          <label class="text-sm font-medium text-gray-700">Vue:</label>
          <select
            [(ngModel)]="selectedViewId"
            (change)="onViewChange()"
            class="flex-1 max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm">
            <option value="">Vue par défaut</option>
            @for (view of viewsState().views; track view.id) {
              <option [value]="view.id">
                {{ view.name }}
                @if (view.is_default) {
                  (défaut)
                }
              </option>
            }
          </select>

          @if (viewsState().currentView) {
            <div class="flex items-center gap-1">
              <button
                (click)="updateCurrentView()"
                [disabled]="saving()"
                class="p-2 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                title="Mettre à jour la vue">
                <i class="bi bi-floppy" [class.animate-pulse]="saving()"></i>
              </button>

              <button
                (click)="setAsDefault()"
                [disabled]="saving() || viewsState().currentView?.is_default"
                class="p-2 text-green-600 hover:text-green-800 disabled:opacity-50"
                title="Définir comme vue par défaut">
                <i class="bi bi-star" [class.bi-star-fill]="viewsState().currentView?.is_default"></i>
              </button>

              <button
                (click)="deleteView(viewsState().currentView!)"
                [disabled]="saving()"
                class="p-2 text-red-600 hover:text-red-800 disabled:opacity-50"
                title="Supprimer la vue">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          }
        </div>

        <button
          (click)="showCreateView.set(!showCreateView())"
          [disabled]="viewsState().loading"
          class="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm">
          <i class="bi bi-plus-circle mr-1"></i>
          Nouvelle vue
        </button>
      </div>

      <!-- Formulaire de création/modification de vue -->
      @if (showCreateView()) {
        <div class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 class="font-medium text-gray-900 mb-4">
            {{ editingView() ? 'Modifier la vue' : 'Créer une nouvelle vue' }}
          </h3>

          <form [formGroup]="viewForm" (ngSubmit)="saveView()">
            <!-- Nom de la vue -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la vue <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  formControlName="name"
                  placeholder="Ma vue personnalisée"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                  maxlength="50"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Tri par</label>
                <select
                  formControlName="sortBy"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="created_at">Date de création</option>
                  <option value="updated_at">Dernière modification</option>
                  <option value="due_date">Date d'échéance</option>
                  <option value="priority">Priorité</option>
                  <option value="title">Titre</option>
                  <option value="status">Statut</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                <select
                  formControlName="sortDirection"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="asc">Croissant</option>
                  <option value="desc">Décroissant</option>
                </select>
              </div>
            </div>

            <!-- Filtres -->
            <div class="mb-4">
              <h4 class="font-medium text-gray-900 mb-3">Filtres</h4>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- Statut -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <div class="space-y-1 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2 bg-white">
                    @for (status of statusOptions; track status.value) {
                      <label class="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          [value]="status.value"
                          (change)="updateStatusFilter($event)"
                          [checked]="selectedStatuses().includes(status.value)"
                          class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span
                          class="w-3 h-3 rounded-full mr-1"
                          [style.background-color]="status.color">
                        </span>
                        {{ status.label }}
                      </label>
                    }
                  </div>
                </div>

                <!-- Priorité -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
                  <div class="space-y-1 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2 bg-white">
                    @for (priority of priorityOptions; track priority.value) {
                      <label class="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          [value]="priority.value"
                          (change)="updatePriorityFilter($event)"
                          [checked]="selectedPriorities().includes(priority.value)"
                          class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        {{ priority.label }}
                      </label>
                    }
                  </div>
                </div>

                <!-- Type -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    formControlName="type"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="">Tous les types</option>
                    @for (type of typeOptions; track type.value) {
                      <option [value]="type.value">{{ type.label }}</option>
                    }
                  </select>
                </div>

                <!-- Assignation -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Assignation</label>
                  <select
                    formControlName="assignedTo"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="">Toutes les assignations</option>
                    <option value="me">Assignées à moi</option>
                    <option value="none">Non assignées</option>
                    @for (user of availableUsers(); track user.id) {
                      <option [value]="user.id">{{ user.name }}</option>
                    }
                  </select>
                </div>
              </div>

              <!-- Filtres avancés -->
              <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Échéance depuis</label>
                  <input
                    type="date"
                    formControlName="dueDateFrom"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Échéance jusqu'au</label>
                  <input
                    type="date"
                    formControlName="dueDateTo"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div class="space-y-2">
                  <label class="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      formControlName="overdueOnly"
                      class="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    Seulement les tâches en retard
                  </label>
                  <label class="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      formControlName="myTasksOnly"
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Seulement mes tâches
                  </label>
                </div>
              </div>
            </div>

            <!-- Options de la vue -->
            <div class="mb-4">
              <label class="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  formControlName="isDefault"
                  [disabled]="!editingView() && hasDefaultView()"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Définir comme vue par défaut
              </label>
            </div>

            <!-- Actions -->
            <div class="flex gap-2">
              <button
                type="submit"
                [disabled]="viewForm.invalid || saving()"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm">
                @if (saving()) {
                  <i class="bi bi-arrow-repeat animate-spin mr-1"></i>
                  Enregistrement...
                } @else {
                  <i class="bi bi-check mr-1"></i>
                  {{ editingView() ? 'Modifier' : 'Créer' }} la vue
                }
              </button>

              <button
                type="button"
                (click)="cancelViewEdit()"
                [disabled]="saving()"
                class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 text-sm">
                Annuler
              </button>

              @if (editingView()) {
                <button
                  type="button"
                  (click)="resetToCurrentFilters()"
                  class="px-4 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 text-sm">
                  <i class="bi bi-arrow-clockwise mr-1"></i>
                  Réinitialiser
                </button>
              }
            </div>

            @if (viewForm.get('name')?.hasError('required') && viewForm.get('name')?.touched) {
              <p class="text-red-600 text-xs mt-2">Le nom de la vue est obligatoire</p>
            }
          </form>
        </div>
      }

      <!-- Aperçu des filtres actifs -->
      @if (viewsState().currentView || hasCurrentFilters()) {
        <div class="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 class="font-medium text-gray-900 mb-2 flex items-center">
            <i class="bi bi-funnel mr-2 text-blue-500"></i>
            Filtres actifs
            @if (viewsState().currentView) {
              <span class="ml-2 text-sm text-gray-600">({{ viewsState().currentView?.name }})</span>
            }
          </h4>

          <div class="flex flex-wrap gap-2">
            @if (getActiveFilters().length > 0) {
              @for (filter of getActiveFilters(); track filter.key) {
                <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {{ filter.label }}: {{ filter.value }}
                </span>
              }
            } @else {
              <span class="text-sm text-gray-600">Aucun filtre actif</span>
            }

            @if (getActiveFilters().length > 0) {
              <button
                (click)="clearAllFilters()"
                class="inline-flex items-center px-2 py-1 rounded text-xs text-red-600 hover:bg-red-50">
                <i class="bi bi-x mr-1"></i>
                Effacer tout
              </button>
            }
          </div>
        </div>
      }

      <!-- Gestion des vues existantes -->
      @if (viewsState().views.length > 0 && !showCreateView()) {
        <div class="mt-6">
          <h4 class="font-medium text-gray-900 mb-3">Mes vues ({{ viewsState().views.length }})</h4>
          <div class="space-y-2">
            @for (view of viewsState().views; track view.id) {
              <div class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <h5 class="font-medium text-gray-900">{{ view.name }}</h5>
                    @if (view.is_default) {
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        <i class="bi bi-star-fill mr-1"></i>
                        Défaut
                      </span>
                    }
                  </div>
                  <div class="text-sm text-gray-600 mt-1">
                    Tri: {{ getSortLabel(view.sort_by) }} ({{ view.sort_direction === 'asc' ? 'croissant' : 'décroissant' }})
                    • {{ getFilterSummary(view.filters) }}
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    Créée le {{ formatDate(view.created_at) }}
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    (click)="applyView(view)"
                    class="p-2 text-blue-600 hover:text-blue-800"
                    title="Appliquer cette vue">
                    <i class="bi bi-arrow-right-circle"></i>
                  </button>

                  <button
                    (click)="editView(view)"
                    class="p-2 text-gray-600 hover:text-gray-800"
                    title="Modifier cette vue">
                    <i class="bi bi-pencil"></i>
                  </button>

                  @if (!view.is_default) {
                    <button
                      (click)="setViewAsDefault(view)"
                      [disabled]="saving()"
                      class="p-2 text-green-600 hover:text-green-800 disabled:opacity-50"
                      title="Définir comme vue par défaut">
                      <i class="bi bi-star"></i>
                    </button>
                  }

                  <button
                    (click)="deleteView(view)"
                    [disabled]="saving()"
                    class="p-2 text-red-600 hover:text-red-800 disabled:opacity-50"
                    title="Supprimer cette vue">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- États de chargement et erreurs -->
      @if (viewsState().loading) {
        <div class="flex items-center justify-center py-6">
          <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span class="ml-2 text-sm text-gray-600">Chargement des vues...</span>
        </div>
      }

      @if (viewsState().error) {
        <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div class="text-sm text-red-800">{{ viewsState().error }}</div>
        </div>
      }
    </div>
  `
})
export class TaskViewsComponent implements OnInit, OnDestroy {
  @Input() currentFilters: TaskFilters | null = null;
  @Input() currentUser!: UserEntity;

  @Output() filtersChanged = new EventEmitter<TaskFilters>();
  @Output() viewSelected = new EventEmitter<TaskView>();

  private destroy$ = new Subject<void>();
  private tasksApiService = inject(TasksApiService);
  private fb = inject(FormBuilder);

  // État du composant
  viewsState = signal<ViewsState>({
    views: [],
    currentView: null,
    loading: false,
    error: null
  });

  // Interface utilisateur
  showCreateView = signal(false);
  editingView = signal<TaskView | null>(null);
  selectedViewId = '';
  saving = signal(false);

  // Filtres sélectionnés
  selectedStatuses = signal<TaskStatus[]>([]);
  selectedPriorities = signal<TaskPriority[]>([]);
  availableUsers = signal<UserEntity[]>([]);

  // Formulaire
  viewForm: FormGroup;

  // Options pour les sélecteurs
  statusOptions = Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({
    value: value as TaskStatus,
    label,
    color: '#3b82f6' // TODO: Utiliser TASK_STATUS_COLORS
  }));

  priorityOptions = Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => ({
    value: value as TaskPriority,
    label
  }));

  typeOptions = Object.entries(TASK_TYPE_LABELS).map(([value, label]) => ({
    value: value as TaskType,
    label
  }));

  constructor() {
    this.viewForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      sortBy: ['created_at'],
      sortDirection: ['desc'] as ['asc' | 'desc'],
      type: [''],
      assignedTo: [''],
      dueDateFrom: [''],
      dueDateTo: [''],
      overdueOnly: [false],
      myTasksOnly: [false],
      isDefault: [false]
    });
  }

  ngOnInit(): void {
    this.loadUserViews();
    this.loadAvailableUsers();
    this.initializeFromCurrentFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserViews(): void {
    this.viewsState.update(state => ({ ...state, loading: true, error: null }));

    this.tasksApiService.getUserTaskViews(parseInt(this.currentUser.id))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const views = response.data || [];
          const defaultView = views.find(v => v.is_default);

          this.viewsState.update(state => ({
            ...state,
            views,
            currentView: defaultView || null,
            loading: false,
            error: null
          }));

          if (defaultView && !this.currentFilters) {
            this.applyView(defaultView);
          }
        },
        error: () => {
          this.viewsState.update(state => ({
            ...state,
            loading: false,
            error: 'Erreur lors du chargement des vues'
          }));
        }
      });
  }

  private loadAvailableUsers(): void {
    // TODO: Charger les utilisateurs disponibles
    this.availableUsers.set([]);
  }

  private initializeFromCurrentFilters(): void {
    if (this.currentFilters) {
      this.updateFormFromFilters(this.currentFilters);
    }
  }

  // Gestion des filtres
  updateStatusFilter(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const status = checkbox.value as TaskStatus;

    this.selectedStatuses.update(statuses => {
      if (checkbox.checked) {
        return [...statuses, status];
      } else {
        return statuses.filter(s => s !== status);
      }
    });
  }

  updatePriorityFilter(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const priority = checkbox.value as TaskPriority;

    this.selectedPriorities.update(priorities => {
      if (checkbox.checked) {
        return [...priorities, priority];
      } else {
        return priorities.filter(p => p !== priority);
      }
    });
  }

  // Actions sur les vues
  onViewChange(): void {
    const viewId = parseInt(this.selectedViewId);
    const view = this.viewsState().views.find(v => v.id === viewId);

    if (view) {
      this.applyView(view);
    } else {
      this.clearView();
    }
  }

  applyView(view: TaskView): void {
    this.viewsState.update(state => ({ ...state, currentView: view }));
    this.selectedViewId = view.id.toString();

    const filters = this.buildFiltersFromView(view);
    this.updateFormFromFilters(filters);
    this.filtersChanged.emit(filters);
    this.viewSelected.emit(view);
  }

  clearView(): void {
    this.viewsState.update(state => ({ ...state, currentView: null }));
    this.selectedViewId = '';
    this.clearAllFilters();
  }

  saveView(): void {
    if (this.viewForm.invalid) return;

    this.saving.set(true);

    const viewData: SaveTaskViewRequest = {
      name: this.viewForm.value.name,
      filters: this.buildFiltersFromForm(),
      sort_by: this.viewForm.value.sortBy,
      sort_direction: this.viewForm.value.sortDirection,
      is_default: this.viewForm.value.isDefault
    };

    const request = this.editingView()
      ? this.tasksApiService.updateTaskView(this.editingView()!.id, viewData)
      : this.tasksApiService.saveTaskView(parseInt(this.currentUser.id), viewData);

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.data) {
          if (this.editingView()) {
            // Mise à jour
            this.viewsState.update(state => ({
              ...state,
              views: state.views.map(v => v.id === response.data!.id ? response.data! : v)
            }));
          } else {
            // Création
            this.viewsState.update(state => ({
              ...state,
              views: [response.data!, ...state.views]
            }));
          }

          this.cancelViewEdit();
          this.applyView(response.data);
        }
        this.saving.set(false);
      },
      error: () => {
        this.viewsState.update(state => ({
          ...state,
          error: 'Erreur lors de la sauvegarde de la vue'
        }));
        this.saving.set(false);
      }
    });
  }

  editView(view: TaskView): void {
    this.editingView.set(view);
    this.showCreateView.set(true);
    this.updateFormFromView(view);
  }

  deleteView(view: TaskView): void {
    if (!confirm(`Supprimer la vue "${view.name}" ?`)) {
      return;
    }

    this.saving.set(true);

    this.tasksApiService.deleteTaskView(view.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.viewsState.update(state => ({
            ...state,
            views: state.views.filter(v => v.id !== view.id),
            currentView: state.currentView?.id === view.id ? null : state.currentView
          }));

          if (this.selectedViewId === view.id.toString()) {
            this.clearView();
          }

          this.saving.set(false);
        },
        error: () => {
          this.viewsState.update(state => ({
            ...state,
            error: 'Erreur lors de la suppression de la vue'
          }));
          this.saving.set(false);
        }
      });
  }

  updateCurrentView(): void {
    const currentView = this.viewsState().currentView;
    if (!currentView) return;

    const updatedView = {
      ...currentView,
      filters: this.buildFiltersFromForm(),
      sort_by: this.viewForm.value.sortBy,
      sort_direction: this.viewForm.value.sortDirection
    };

    this.saving.set(true);

    this.tasksApiService.updateTaskView(currentView.id, updatedView)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.viewsState.update(state => ({
              ...state,
              views: state.views.map(v => v.id === response.data!.id ? response.data! : v),
              currentView: response.data
            }));
          }
          this.saving.set(false);
        },
        error: () => {
          this.saving.set(false);
        }
      });
  }

  setAsDefault(): void {
    const currentView = this.viewsState().currentView;
    if (!currentView || currentView.is_default) return;

    this.setViewAsDefault(currentView);
  }

  setViewAsDefault(view: TaskView): void {
    this.saving.set(true);

    this.tasksApiService.updateTaskView(view.id, { is_default: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.viewsState.update(state => ({
            ...state,
            views: state.views.map(v => ({
              ...v,
              is_default: v.id === view.id
            }))
          }));
          this.saving.set(false);
        },
        error: () => {
          this.saving.set(false);
        }
      });
  }

  // Actions d'interface
  cancelViewEdit(): void {
    this.showCreateView.set(false);
    this.editingView.set(null);
    this.viewForm.reset({
      sortBy: 'created_at',
      sortDirection: 'desc',
      isDefault: false
    });
    this.selectedStatuses.set([]);
    this.selectedPriorities.set([]);
  }

  resetToCurrentFilters(): void {
    if (this.currentFilters) {
      this.updateFormFromFilters(this.currentFilters);
    }
  }

  clearAllFilters(): void {
    this.viewForm.patchValue({
      type: '',
      assignedTo: '',
      dueDateFrom: '',
      dueDateTo: '',
      overdueOnly: false,
      myTasksOnly: false
    });
    this.selectedStatuses.set([]);
    this.selectedPriorities.set([]);

    const emptyFilters: TaskFilters = {};
    this.filtersChanged.emit(emptyFilters);
  }

  // Méthodes utilitaires
  private buildFiltersFromForm(): TaskFilters {
    const formValue = this.viewForm.value;
    const filters: TaskFilters = {};

    if (this.selectedStatuses().length > 0) {
      filters.status = this.selectedStatuses();
    }

    if (this.selectedPriorities().length > 0) {
      filters.priority = this.selectedPriorities();
    }

    if (formValue.type) filters.type = formValue.type;
    if (formValue.assignedTo) {
      if (formValue.assignedTo === 'me') {
        filters.my_tasks = true;
      } else if (formValue.assignedTo !== 'none') {
        filters.assigned_to = parseInt(formValue.assignedTo);
      }
    }
    if (formValue.dueDateFrom) filters.due_date_from = formValue.dueDateFrom;
    if (formValue.dueDateTo) filters.due_date_to = formValue.dueDateTo;
    if (formValue.overdueOnly) filters.overdue = true;
    if (formValue.myTasksOnly) filters.my_tasks = true;

    return filters;
  }

  private buildFiltersFromView(view: TaskView): TaskFilters {
    return {
      ...view.filters,
      sort_by: view.sort_by,
      sort_direction: view.sort_direction
    };
  }

  private updateFormFromFilters(filters: TaskFilters): void {
    this.viewForm.patchValue({
      type: filters.type || '',
      assignedTo: filters.assigned_to ? filters.assigned_to.toString() : (filters.my_tasks ? 'me' : ''),
      dueDateFrom: filters.due_date_from || '',
      dueDateTo: filters.due_date_to || '',
      overdueOnly: !!filters.overdue,
      myTasksOnly: !!filters.my_tasks,
      sortBy: filters.sort_by || 'created_at',
      sortDirection: filters.sort_direction || 'desc'
    });

    if (filters.status) {
      this.selectedStatuses.set(Array.isArray(filters.status) ? filters.status : [filters.status]);
    }

    if (filters.priority) {
      this.selectedPriorities.set(Array.isArray(filters.priority) ? filters.priority : [filters.priority]);
    }
  }

  private updateFormFromView(view: TaskView): void {
    this.viewForm.patchValue({
      name: view.name,
      sortBy: view.sort_by,
      sortDirection: view.sort_direction,
      isDefault: view.is_default
    });

    this.updateFormFromFilters(view.filters);
  }

  getActiveFilters(): { key: string; label: string; value: string }[] {
    const filters: { key: string; label: string; value: string }[] = [];
    const formValue = this.viewForm.value;

    if (this.selectedStatuses().length > 0) {
      const labels = this.selectedStatuses().map(s => TASK_STATUS_LABELS[s]).join(', ');
      filters.push({ key: 'status', label: 'Statut', value: labels });
    }

    if (this.selectedPriorities().length > 0) {
      const labels = this.selectedPriorities().map(p => TASK_PRIORITY_LABELS[p]).join(', ');
      filters.push({ key: 'priority', label: 'Priorité', value: labels });
    }

    if (formValue.type) {
      filters.push({ key: 'type', label: 'Type', value: TASK_TYPE_LABELS[formValue.type] });
    }

    if (formValue.overdueOnly) {
      filters.push({ key: 'overdue', label: 'En retard', value: 'Oui' });
    }

    if (formValue.myTasksOnly) {
      filters.push({ key: 'myTasks', label: 'Mes tâches', value: 'Oui' });
    }

    return filters;
  }

  getSortLabel(sortBy: string): string {
    const labels: Record<string, string> = {
      'created_at': 'Date de création',
      'updated_at': 'Dernière modification',
      'due_date': 'Date d\'échéance',
      'priority': 'Priorité',
      'title': 'Titre',
      'status': 'Statut'
    };
    return labels[sortBy] || sortBy;
  }

  getFilterSummary(filters: TaskFilters): string {
    const parts: string[] = [];

    if (filters.status) {
      parts.push(`Statut: ${Array.isArray(filters.status) ? filters.status.length : 1}`);
    }

    if (filters.priority) {
      parts.push(`Priorité: ${Array.isArray(filters.priority) ? filters.priority.length : 1}`);
    }

    if (filters.my_tasks) parts.push('Mes tâches');
    if (filters.overdue) parts.push('En retard');

    return parts.length > 0 ? parts.join(' • ') : 'Aucun filtre';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  hasDefaultView(): boolean {
    return this.viewsState().views.some(v => v.is_default);
  }

  hasCurrentFilters(): boolean {
    return !!this.currentFilters;
  }
}