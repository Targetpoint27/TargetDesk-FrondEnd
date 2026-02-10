// ========================================
// COMPOSANT DE GESTION DES TAGS DE TÂCHES
// Création, assignation et gestion des étiquettes
// ========================================

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

import { TasksApiService } from '../../services/tasks-api.service';
import {
  Task,
  TaskTag,
  CreateTaskTagRequest
} from '../../models/task.models';

interface TagsState {
  availableTags: TaskTag[];
  taskTags: TaskTag[];
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-task-tags',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="task-tags-manager">
      <!-- En-tête -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 flex items-center">
          <i class="bi bi-tags mr-2 text-purple-500"></i>
          Étiquettes ({{ tagsState().taskTags.length }})
        </h3>

        <button
          (click)="showTagManager.set(!showTagManager())"
          [disabled]="tagsState().loading"
          class="px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50">
          <i class="bi bi-plus-circle mr-1"></i>
          Gérer les tags
        </button>
      </div>

      <!-- Tags actuels de la tâche -->
      @if (tagsState().taskTags.length > 0) {
        <div class="flex flex-wrap gap-2 mb-4">
          @for (tag of tagsState().taskTags; track tag.id) {
            <span
              class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white cursor-pointer hover:opacity-80"
              [style.background-color]="tag.color"
              [title]="tag.description || tag.name"
              (click)="viewTagDetails(tag)">
              {{ tag.name }}
              @if (canRemoveTag()) {
                <button
                  (click)="removeTag(tag, $event)"
                  [disabled]="updating()"
                  class="ml-2 text-white hover:text-gray-200 disabled:opacity-50">
                  <i class="bi bi-x"></i>
                </button>
              }
            </span>
          }
        </div>
      } @else {
        <div class="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <i class="bi bi-tag text-gray-400 text-2xl mb-2"></i>
          <p class="text-sm text-gray-600">Aucune étiquette assignée</p>
          <button
            (click)="showTagManager.set(true)"
            class="mt-2 text-sm text-purple-600 hover:text-purple-800">
            Ajouter des étiquettes
          </button>
        </div>
      }

      <!-- Gestionnaire de tags -->
      @if (showTagManager()) {
        <div class="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <!-- Recherche et filtre -->
          <div class="mb-4">
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i class="bi bi-search text-gray-400"></i>
              </div>
              <input
                type="text"
                [(ngModel)]="tagSearchQuery"
                (input)="onSearchChange()"
                placeholder="Rechercher ou créer un tag..."
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                maxlength="50"
              />
            </div>

            <!-- Filtres -->
            <div class="flex items-center gap-3 mt-2">
              <label class="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  [(ngModel)]="showOnlyUnused"
                  (change)="filterTags()"
                  class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                Tags non utilisés
              </label>
              <label class="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  [(ngModel)]="showUsageCount"
                  class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                Afficher utilisation
              </label>
            </div>
          </div>

          <!-- Création rapide de tag -->
          @if (canCreateTag()) {
            <div class="mb-4 p-3 bg-white rounded-lg border border-purple-200">
              <h4 class="font-medium text-gray-900 mb-3 flex items-center">
                <i class="bi bi-plus-circle mr-2 text-purple-600"></i>
                Créer un nouveau tag
              </h4>

              <form [formGroup]="createTagForm" (ngSubmit)="createTag()">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <input
                      type="text"
                      formControlName="name"
                      placeholder="Nom du tag"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500"
                      maxlength="30"
                    />
                  </div>
                  <div>
                    <input
                      type="color"
                      formControlName="color"
                      class="w-full h-10 border border-gray-300 rounded-md"
                      title="Couleur du tag"
                    />
                  </div>
                  <div class="flex gap-2">
                    <button
                      type="submit"
                      [disabled]="createTagForm.invalid || creatingTag()"
                      class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm flex-1">
                      @if (creatingTag()) {
                        <i class="bi bi-arrow-repeat animate-spin mr-1"></i>
                        Création...
                      } @else {
                        Créer
                      }
                    </button>
                    <button
                      type="button"
                      (click)="resetCreateForm()"
                      class="px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 text-sm">
                      <i class="bi bi-arrow-clockwise"></i>
                    </button>
                  </div>
                </div>

                <div class="mt-2">
                  <input
                    type="text"
                    formControlName="description"
                    placeholder="Description (optionnelle)"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500"
                    maxlength="100"
                  />
                </div>

                @if (createTagForm.get('name')?.hasError('required') && createTagForm.get('name')?.touched) {
                  <p class="text-red-600 text-xs mt-1">Le nom du tag est obligatoire</p>
                }
              </form>
            </div>
          }

          <!-- Liste des tags disponibles -->
          @if (tagsState().loading) {
            <div class="flex items-center justify-center py-6">
              <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
              <span class="ml-2 text-sm text-gray-600">Chargement des tags...</span>
            </div>
          } @else if (filteredTags().length > 0) {
            <div class="space-y-2">
              <h4 class="font-medium text-gray-900 mb-2">Tags disponibles</h4>
              <div class="max-h-60 overflow-y-auto space-y-2">
                @for (tag of filteredTags(); track tag.id) {
                  <div class="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm">
                    <div class="flex items-center gap-3 flex-1">
                      <span
                        class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white min-w-0"
                        [style.background-color]="tag.color">
                        {{ tag.name }}
                      </span>

                      <div class="flex-1 min-w-0">
                        @if (tag.description) {
                          <p class="text-sm text-gray-600 truncate">{{ tag.description }}</p>
                        }
                        @if (showUsageCount && getTagUsageCount(tag) !== undefined) {
                          <p class="text-xs text-gray-500">
                            Utilisé {{ getTagUsageCount(tag) }} fois
                          </p>
                        }
                      </div>
                    </div>

                    <div class="flex items-center gap-2">
                      @if (isTagAssigned(tag)) {
                        <button
                          (click)="removeTag(tag)"
                          [disabled]="updating()"
                          class="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                          title="Retirer ce tag">
                          <i class="bi bi-dash-circle"></i>
                        </button>
                      } @else {
                        <button
                          (click)="assignTag(tag)"
                          [disabled]="updating()"
                          class="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                          title="Assigner ce tag">
                          <i class="bi bi-plus-circle"></i>
                        </button>
                      }

                      @if (canDeleteTag(tag)) {
                        <button
                          (click)="deleteTag(tag)"
                          [disabled]="updating()"
                          class="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                          title="Supprimer ce tag">
                          <i class="bi bi-trash"></i>
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          } @else if (tagSearchQuery && !tagsState().loading) {
            <div class="text-center py-6 text-gray-500">
              <i class="bi bi-search text-2xl mb-2"></i>
              <p class="text-sm">
                Aucun tag trouvé pour "{{ tagSearchQuery }}"
              </p>
              @if (canCreateTag()) {
                <button
                  (click)="prefillCreateForm(tagSearchQuery)"
                  class="mt-2 text-sm text-purple-600 hover:text-purple-800">
                  Créer le tag "{{ tagSearchQuery }}"
                </button>
              }
            </div>
          } @else {
            <div class="text-center py-6 text-gray-500">
              <i class="bi bi-tags text-2xl mb-2"></i>
              <p class="text-sm">Aucun tag disponible</p>
              @if (canCreateTag()) {
                <button
                  (click)="focusCreateForm()"
                  class="mt-2 text-sm text-purple-600 hover:text-purple-800">
                  Créer votre premier tag
                </button>
              }
            </div>
          }

          <!-- Actions du gestionnaire -->
          <div class="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
            <button
              (click)="refreshTags()"
              [disabled]="tagsState().loading"
              class="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
              <i class="bi bi-arrow-clockwise mr-1"></i>
              Actualiser
            </button>
            <button
              (click)="closeTagManager()"
              class="px-4 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700">
              Fermer
            </button>
          </div>
        </div>
      }

      <!-- Erreurs -->
      @if (tagsState().error) {
        <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div class="text-sm text-red-800">{{ tagsState().error }}</div>
        </div>
      }
    </div>
  `
})
export class TaskTagsComponent implements OnInit, OnDestroy {
  @Input({ required: true }) task!: Task;
  @Output() tagsChanged = new EventEmitter<TaskTag[]>();

  private destroy$ = new Subject<void>();
  private tasksApiService = inject(TasksApiService);
  private fb = inject(FormBuilder);

  // État du composant
  tagsState = signal<TagsState>({
    availableTags: [],
    taskTags: [],
    loading: false,
    error: null
  });

  // Interface utilisateur
  showTagManager = signal(false);
  tagSearchQuery = '';
  showOnlyUnused = false;
  showUsageCount = true;
  updating = signal(false);
  creatingTag = signal(false);

  // Formulaire de création
  createTagForm: FormGroup;

  // Couleurs prédéfinies
  private predefinedColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ];

  constructor() {
    this.createTagForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(30)]],
      color: [this.getRandomColor(), Validators.required],
      description: ['', Validators.maxLength(100)]
    });
  }

  ngOnInit(): void {
    this.initializeTags();
    this.loadAvailableTags();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeTags(): void {
    this.tagsState.update(state => ({
      ...state,
      taskTags: this.task.tags || []
    }));
  }

  private loadAvailableTags(): void {
    this.tagsState.update(state => ({ ...state, loading: true, error: null }));

    this.tasksApiService.getTags({ include_usage: this.showUsageCount })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.tagsState.update(state => ({
            ...state,
            availableTags: response.data || [],
            loading: false,
            error: null
          }));
        },
        error: () => {
          this.tagsState.update(state => ({
            ...state,
            loading: false,
            error: 'Erreur lors du chargement des tags'
          }));
        }
      });
  }

  private setupSearch(): void {
    // TODO: Implémenter la recherche avec debounce
  }

  // Computed
  filteredTags = computed(() => {
    let tags = this.tagsState().availableTags;

    // Filtrer par recherche
    if (this.tagSearchQuery.trim()) {
      const query = this.tagSearchQuery.toLowerCase().trim();
      tags = tags.filter(tag =>
        tag.name.toLowerCase().includes(query) ||
        (tag.description && tag.description.toLowerCase().includes(query))
      );
    }

    // Filtrer tags non utilisés
    if (this.showOnlyUnused) {
      const assignedTagIds = this.tagsState().taskTags.map(tag => tag.id);
      tags = tags.filter(tag => !assignedTagIds.includes(tag.id));
    }

    // Trier par nom
    return tags.sort((a, b) => a.name.localeCompare(b.name));
  });

  // Actions sur les tags
  assignTag(tag: TaskTag): void {
    if (this.isTagAssigned(tag)) return;

    this.updating.set(true);

    const updatedTags = [...this.tagsState().taskTags, tag];
    this.updateTaskTags(updatedTags);
  }

  removeTag(tag: TaskTag, event?: Event): void {
    event?.stopPropagation();

    this.updating.set(true);

    const updatedTags = this.tagsState().taskTags.filter(t => t.id !== tag.id);
    this.updateTaskTags(updatedTags);
  }

  private updateTaskTags(newTags: TaskTag[]): void {
    // TODO: Implémenter l'API pour mettre à jour les tags de la tâche
    // Pour l'instant, on met à jour localement
    this.tagsState.update(state => ({
      ...state,
      taskTags: newTags
    }));

    this.task.tags = newTags;
    this.tagsChanged.emit(newTags);
    this.updating.set(false);
  }

  // Gestion des tags
  createTag(): void {
    if (this.createTagForm.invalid) return;

    this.creatingTag.set(true);

    const tagData: CreateTaskTagRequest = {
      name: this.createTagForm.value.name.trim(),
      color: this.createTagForm.value.color,
      description: this.createTagForm.value.description?.trim() || undefined
    };

    this.tasksApiService.createTag(tagData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.data) {
            // Ajouter aux tags disponibles
            this.tagsState.update(state => ({
              ...state,
              availableTags: [response.data!, ...state.availableTags]
            }));

            this.resetCreateForm();
          }
          this.creatingTag.set(false);
        },
        error: () => {
          this.tagsState.update(state => ({
            ...state,
            error: 'Erreur lors de la création du tag'
          }));
          this.creatingTag.set(false);
        }
      });
  }

  deleteTag(tag: TaskTag): void {
    if (!confirm(`Supprimer le tag "${tag.name}" ? Cette action est irréversible.`)) {
      return;
    }

    this.tasksApiService.deleteTag(tag.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Retirer de la liste
          this.tagsState.update(state => ({
            ...state,
            availableTags: state.availableTags.filter(t => t.id !== tag.id),
            taskTags: state.taskTags.filter(t => t.id !== tag.id)
          }));

          // Mettre à jour la tâche si nécessaire
          if (this.isTagAssigned(tag)) {
            this.task.tags = this.tagsState().taskTags;
            this.tagsChanged.emit(this.tagsState().taskTags);
          }
        },
        error: () => {
          this.tagsState.update(state => ({
            ...state,
            error: 'Erreur lors de la suppression du tag'
          }));
        }
      });
  }

  // Actions d'interface
  onSearchChange(): void {
    // La recherche se fait via le computed filteredTags
  }

  filterTags(): void {
    // Le filtrage se fait via le computed filteredTags
  }

  prefillCreateForm(name: string): void {
    this.createTagForm.patchValue({
      name: name.trim(),
      color: this.getRandomColor()
    });
  }

  focusCreateForm(): void {
    // TODO: Focus sur le champ de nom
  }

  resetCreateForm(): void {
    this.createTagForm.reset({
      name: '',
      color: this.getRandomColor(),
      description: ''
    });
  }

  refreshTags(): void {
    this.loadAvailableTags();
  }

  closeTagManager(): void {
    this.showTagManager.set(false);
    this.tagSearchQuery = '';
    this.resetCreateForm();
  }

  viewTagDetails(tag: TaskTag): void {
    // TODO: Ouvrir modal de détails du tag
  }

  // Méthodes utilitaires
  isTagAssigned(tag: TaskTag): boolean {
    return this.tagsState().taskTags.some(t => t.id === tag.id);
  }

  canRemoveTag(): boolean {
    // TODO: Vérifier les permissions
    return true;
  }

  canCreateTag(): boolean {
    // TODO: Vérifier les permissions
    return true;
  }

  canDeleteTag(tag: TaskTag): boolean {
    // TODO: Vérifier les permissions et l'utilisation
    return true;
  }

  private getRandomColor(): string {
    return this.predefinedColors[Math.floor(Math.random() * this.predefinedColors.length)];
  }

  getTagUsageCount(tag: TaskTag): number | undefined {
    return (tag as any).usage_count;
  }
}