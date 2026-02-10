// ========================================
// FORMULAIRE DE CRÉATION/ÉDITION DE TÂCHES
// Formulaire complet avec tous les champs disponibles
// ========================================

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { TasksApiService } from '../../services/tasks-api.service';
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskType,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskTag,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_TYPE_LABELS
} from '../../models/task.models';
import { UserEntity } from '../../../../domain/entities/user.entity';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="task-form-modal fixed inset-0 z-50 overflow-y-auto">
      <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <!-- Overlay -->
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" (click)="cancel()"></div>

        <!-- Modal -->
        <div class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ isEditMode ? 'Modifier la tâche' : 'Créer une nouvelle tâche' }}
            </h3>
            <button
              (click)="cancel()"
              class="text-gray-400 hover:text-gray-600">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <!-- Formulaire -->
          <form [formGroup]="taskForm" (ngSubmit)="onSubmit()">
            <div class="space-y-6">

              <!-- Informations principales -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Titre de la tâche <span class="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    formControlName="title"
                    placeholder="Nom de la tâche..."
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxlength="255"
                  />
                  @if (taskForm.get('title')?.hasError('required') && taskForm.get('title')?.touched) {
                    <p class="text-red-600 text-sm mt-1">Le titre est obligatoire</p>
                  }
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Type de tâche <span class="text-red-500">*</span>
                  </label>
                  <select
                    formControlName="type"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">Sélectionner un type</option>
                    @for (type of typeOptions; track type.value) {
                      <option [value]="type.value">{{ type.label }}</option>
                    }
                  </select>
                  @if (taskForm.get('type')?.hasError('required') && taskForm.get('type')?.touched) {
                    <p class="text-red-600 text-sm mt-1">Le type est obligatoire</p>
                  }
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                  <select
                    formControlName="priority"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    @for (priority of priorityOptions; track priority.value) {
                      <option [value]="priority.value">{{ priority.label }}</option>
                    }
                  </select>
                </div>
              </div>

              <!-- Description -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  formControlName="description"
                  rows="4"
                  placeholder="Décrivez la tâche en détail..."
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  maxlength="1000">
                </textarea>
                <div class="text-sm text-gray-500 mt-1">
                  {{ taskForm.get('description')?.value?.length || 0 }}/1000 caractères
                </div>
              </div>

              <!-- Dates et temps -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Date d'échéance</label>
                  <input
                    type="date"
                    formControlName="dueDate"
                    [min]="today"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Temps estimé (heures)</label>
                  <input
                    type="number"
                    formControlName="estimatedHours"
                    step="0.5"
                    min="0"
                    max="1000"
                    placeholder="Ex: 8.5"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Progression (%)</label>
                  <input
                    type="number"
                    formControlName="progressPercentage"
                    min="0"
                    max="100"
                    placeholder="0"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <!-- Assignation -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Assigner à</label>
                <div class="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
                  @for (user of availableUsers(); track user.id) {
                    <label class="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                      <input
                        type="checkbox"
                        [value]="user.id"
                        (change)="toggleUserAssignment(user.id, $event)"
                        [checked]="selectedUsers().includes(Number(user.id))"
                        class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {{ user.name?.charAt(0) }}
                      </div>
                      <div class="flex-1">
                        <p class="text-sm font-medium text-gray-900">{{ user.name }}</p>
                        <p class="text-xs text-gray-500">{{ user.email }}</p>
                      </div>
                    </label>
                  }
                  @if (availableUsers().length === 0) {
                    <div class="text-sm text-gray-500 text-center py-4">
                      @if (loadingUsers()) {
                        <div class="flex items-center justify-center">
                          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span class="ml-2">Chargement des utilisateurs...</span>
                        </div>
                      } @else {
                        Aucun utilisateur disponible
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- Étiquettes -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Étiquettes</label>

                <!-- Tags sélectionnés -->
                @if (selectedTags().length > 0) {
                  <div class="flex flex-wrap gap-2 mb-3">
                    @for (tag of selectedTags(); track tag.id) {
                      <span
                        class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white cursor-pointer"
                        [style.background-color]="tag.color"
                        (click)="removeTag(tag.id)">
                        {{ tag.name }}
                        <i class="bi bi-x ml-2"></i>
                      </span>
                    }
                  </div>
                }

                <!-- Recherche et sélection de tags -->
                <div class="space-y-2">
                  <input
                    type="text"
                    [(ngModel)]="tagSearchQuery"
                    [ngModelOptions]="{standalone: true}"
                    (input)="onTagSearch()"
                    placeholder="Rechercher ou créer un tag..."
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxlength="50"
                  />

                  @if (filteredTags().length > 0) {
                    <div class="max-h-32 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50">
                      @for (tag of filteredTags(); track tag.id) {
                        <button
                          type="button"
                          (click)="addTag(tag)"
                          [disabled]="isTagSelected(tag)"
                          class="w-full text-left p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                          <span
                            class="w-4 h-4 rounded-full"
                            [style.background-color]="tag.color">
                          </span>
                          {{ tag.name }}
                          @if (tag.description) {
                            <span class="text-xs text-gray-500">- {{ tag.description }}</span>
                          }
                        </button>
                      }
                    </div>
                  }

                  @if (canCreateNewTag()) {
                    <button
                      type="button"
                      (click)="createAndAddTag()"
                      class="w-full text-left p-2 border border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 text-sm">
                      <i class="bi bi-plus-circle mr-2"></i>
                      Créer le tag "{{ tagSearchQuery }}"
                    </button>
                  }
                </div>
              </div>

              <!-- Tâche parente (si applicable) -->
              @if (!isEditMode && parentTaskId) {
                <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div class="flex items-center">
                    <i class="bi bi-arrow-return-right text-blue-600 mr-2"></i>
                    <span class="text-sm text-blue-800">
                      Cette tâche sera créée comme sous-tâche
                    </span>
                  </div>
                </div>
              }

              <!-- Options avancées -->
              <div class="border-t border-gray-200 pt-6">
                <h4 class="text-sm font-medium text-gray-900 mb-4">Options avancées</h4>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Statut initial</label>
                    <select
                      formControlName="status"
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      @for (status of statusOptions; track status.value) {
                        <option [value]="status.value">{{ status.label }}</option>
                      }
                    </select>
                  </div>

                  <div class="space-y-3">
                    <label class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        formControlName="notifyAssignees"
                        class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span class="text-sm text-gray-700">Notifier les personnes assignées</span>
                    </label>

                    <label class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        formControlName="startTimer"
                        class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span class="text-sm text-gray-700">Démarrer le chrono automatiquement</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                (click)="cancel()"
                [disabled]="submitting()"
                class="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                Annuler
              </button>

              @if (isEditMode && task) {
                <button
                  type="button"
                  (click)="duplicate()"
                  [disabled]="submitting()"
                  class="px-6 py-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50">
                  <i class="bi bi-files mr-2"></i>
                  Dupliquer
                </button>
              }

              <button
                type="submit"
                [disabled]="taskForm.invalid || submitting()"
                class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                @if (submitting()) {
                  <div class="flex items-center">
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {{ isEditMode ? 'Modification...' : 'Création...' }}
                  </div>
                } @else {
                  {{ isEditMode ? 'Modifier la tâche' : 'Créer la tâche' }}
                }
              </button>
            </div>
          </form>

          <!-- Erreurs -->
          @if (error()) {
            <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div class="text-sm text-red-800">{{ error() }}</div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class TaskFormComponent implements OnInit, OnDestroy {
  @Input() projectId!: number;
  @Input() parentTaskId?: number;
  @Input() task?: Task; // Pour l'édition

  @Output() taskCreated = new EventEmitter<Task>();
  @Output() taskUpdated = new EventEmitter<Task>();
  @Output() cancelled = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private tasksApiService = inject(TasksApiService);

  // État du formulaire
  taskForm: FormGroup;
  submitting = signal(false);
  error = signal('');

  // État des données
  availableUsers = signal<UserEntity[]>([]);
  availableTags = signal<TaskTag[]>([]);
  selectedUsers = signal<number[]>([]);
  selectedTags = signal<TaskTag[]>([]);
  loadingUsers = signal(false);

  // Interface utilisateur
  tagSearchQuery = '';
  filteredTags = signal<TaskTag[]>([]);

  // Configuration
  today = new Date().toISOString().split('T')[0];

  // Options pour les sélecteurs
  statusOptions = Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({
    value: value as TaskStatus,
    label
  }));

  priorityOptions = Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => ({
    value: value as TaskPriority,
    label
  }));

  typeOptions = Object.entries(TASK_TYPE_LABELS).map(([value, label]) => ({
    value: value as TaskType,
    label
  }));

  // Computed
  isEditMode = !!this.task;

  constructor() {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', Validators.maxLength(1000)],
      type: ['', Validators.required],
      priority: [TaskPriority.MEDIUM],
      status: [TaskStatus.A_FAIRE],
      dueDate: [''],
      estimatedHours: ['', [Validators.min(0), Validators.max(1000)]],
      progressPercentage: [0, [Validators.min(0), Validators.max(100)]],
      notifyAssignees: [true],
      startTimer: [false]
    });
  }

  ngOnInit(): void {
    this.loadAvailableUsers();
    this.loadAvailableTags();

    if (this.task) {
      this.populateFormWithTask();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAvailableUsers(): void {
    this.loadingUsers.set(true);

    this.tasksApiService.getAssignableUsers(this.projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.availableUsers.set(response.data || []);
          this.loadingUsers.set(false);
        },
        error: () => {
          this.loadingUsers.set(false);
        }
      });
  }

  private loadAvailableTags(): void {
    this.tasksApiService.getTags({ sort_by: 'name' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.availableTags.set(response.data || []);
          this.filteredTags.set(response.data || []);
        },
        error: () => {
          // Silent error for tags
        }
      });
  }

  private populateFormWithTask(): void {
    if (!this.task) return;

    this.taskForm.patchValue({
      title: this.task.title,
      description: this.task.description,
      type: this.task.type,
      priority: this.task.priority,
      status: this.task.status,
      dueDate: this.task.due_date?.split('T')[0],
      estimatedHours: this.task.estimated_hours,
      progressPercentage: this.task.progress_percentage
    });

    // Définir les utilisateurs sélectionnés
    if (this.task.assignees) {
      const assigneeIds = this.task.assignees.map(a => a.user_id);
      this.selectedUsers.set(assigneeIds);
    }

    // Définir les tags sélectionnés
    if (this.task.tags) {
      this.selectedTags.set([...this.task.tags]);
    }
  }

  // Gestion des utilisateurs
  toggleUserAssignment(userId: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const userIdNum = parseInt(userId);

    if (checkbox.checked) {
      this.selectedUsers.update(users => [...users, userIdNum]);
    } else {
      this.selectedUsers.update(users => users.filter(id => id !== userIdNum));
    }
  }

  // Gestion des tags
  onTagSearch(): void {
    const query = this.tagSearchQuery.toLowerCase().trim();

    if (!query) {
      this.filteredTags.set(this.availableTags());
      return;
    }

    const filtered = this.availableTags().filter(tag =>
      tag.name.toLowerCase().includes(query) ||
      (tag.description && tag.description.toLowerCase().includes(query))
    );

    this.filteredTags.set(filtered);
  }

  addTag(tag: TaskTag): void {
    if (this.selectedTags().some(t => t.id === tag.id)) return;

    this.selectedTags.update(tags => [...tags, tag]);
    this.tagSearchQuery = '';
    this.filteredTags.set(this.availableTags());
  }

  removeTag(tagId: number): void {
    this.selectedTags.update(tags => tags.filter(t => t.id !== tagId));
  }

  createAndAddTag(): void {
    const name = this.tagSearchQuery.trim();
    if (!name) return;

    // Couleurs prédéfinies pour les nouveaux tags
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newTagData = {
      name,
      color: randomColor,
      description: ''
    };

    this.tasksApiService.createTag(newTagData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.availableTags.update(tags => [response.data!, ...tags]);
            this.addTag(response.data);
          }
        },
        error: () => {
          this.error.set('Erreur lors de la création du tag');
        }
      });
  }

  // Actions du formulaire
  onSubmit(): void {
    if (this.taskForm.invalid || this.submitting()) return;

    this.submitting.set(true);
    this.error.set('');

    if (this.isEditMode) {
      this.updateTask();
    } else {
      this.createTask();
    }
  }

  private createTask(): void {
    const formValue = this.taskForm.value;

    const taskData: CreateTaskRequest = {
      title: formValue.title,
      description: formValue.description,
      type: formValue.type,
      priority: formValue.priority,
      status: formValue.status,
      due_date: formValue.dueDate || undefined,
      estimated_hours: formValue.estimatedHours || undefined,
      assigned_user_ids: this.selectedUsers(),
      tag_ids: this.selectedTags().map(t => t.id),
      parent_task_id: this.parentTaskId,
      notify_assignees: formValue.notifyAssignees
    };

    this.tasksApiService.createTask(this.projectId, taskData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.taskCreated.emit(response.data);

            // Démarrer le timer si demandé
            if (formValue.startTimer) {
              this.tasksApiService.startTimeSession(response.data.id)
                .pipe(takeUntil(this.destroy$))
                .subscribe();
            }
          }
          this.submitting.set(false);
        },
        error: (error) => {
          this.error.set(error.message || 'Erreur lors de la création de la tâche');
          this.submitting.set(false);
        }
      });
  }

  private updateTask(): void {
    if (!this.task) return;

    const formValue = this.taskForm.value;

    const taskData: UpdateTaskRequest = {
      title: formValue.title,
      description: formValue.description,
      type: formValue.type,
      priority: formValue.priority,
      status: formValue.status,
      due_date: formValue.dueDate || null,
      estimated_hours: formValue.estimatedHours || null
    };

    this.tasksApiService.updateTask(this.task.id, taskData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.data) {
            // Mettre à jour les assignations si elles ont changé
            const currentAssigneeIds = this.task?.assignees?.map(a => a.user_id) || [];
            const newAssigneeIds = this.selectedUsers();

            if (JSON.stringify(currentAssigneeIds.sort()) !== JSON.stringify(newAssigneeIds.sort())) {
              this.tasksApiService.assignTask(this.task!.id, {
                user_ids: newAssigneeIds,
                notify: formValue.notifyAssignees
              }).subscribe();
            }

            this.taskUpdated.emit(response.data);
          }
          this.submitting.set(false);
        },
        error: (error) => {
          this.error.set(error.message || 'Erreur lors de la modification de la tâche');
          this.submitting.set(false);
        }
      });
  }

  duplicate(): void {
    if (!this.task) return;

    const formValue = this.taskForm.value;

    const taskData: CreateTaskRequest = {
      title: `${formValue.title} (copie)`,
      description: formValue.description,
      type: formValue.type,
      priority: formValue.priority,
      status: TaskStatus.A_FAIRE, // Reset status for duplicates
      due_date: formValue.dueDate || undefined,
      estimated_hours: formValue.estimatedHours || undefined,
      assigned_user_ids: this.selectedUsers(),
      tag_ids: this.selectedTags().map(t => t.id),
      notify_assignees: formValue.notifyAssignees
    };

    this.submitting.set(true);
    this.error.set('');

    this.tasksApiService.createTask(this.projectId, taskData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.taskCreated.emit(response.data);
          }
          this.submitting.set(false);
        },
        error: (error) => {
          this.error.set(error.message || 'Erreur lors de la duplication de la tâche');
          this.submitting.set(false);
        }
      });
  }

  cancel(): void {
    this.cancelled.emit();
  }

  // Helper methods for template
  isTagSelected(tag: TaskTag): boolean {
    return this.selectedTags().some(t => t.id === tag.id);
  }

  canCreateNewTag(): boolean {
    return this.tagSearchQuery &&
           !this.filteredTags().some(t => t.name.toLowerCase() === this.tagSearchQuery.toLowerCase());
  }
}