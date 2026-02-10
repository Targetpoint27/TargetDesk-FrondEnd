// ========================================
// TABLEAU DE BORD DES TÂCHES
// Gestion complète avec filtres, recherche et actions
// ========================================

import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap, forkJoin, of } from 'rxjs';

import { TasksApiService } from '../../services/tasks-api.service';
import {
  Task,
  TaskFilters,
  TaskStatus,
  TaskPriority,
  TaskType,
  TaskView,
  TaskStatusOption,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_TYPE_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
  isTaskOverdue,
  getDaysUntilDue,
  formatDuration,
  getTaskProgressColor
} from '../../models/task.models';
import { UserEntity } from '../../../../domain/entities/user.entity';

interface TasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  total: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

@Component({
  selector: 'app-tasks-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tasks-dashboard">
      <!-- En-tête avec titre et actions principales -->
      <div class="flex justify-between items-start mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Gestion des Tâches</h1>
          <p class="text-gray-600 mt-2">
            {{ tasksState().total }} tâche(s) au total
            @if (appliedFiltersCount() > 0) {
              <span class="text-blue-600">• {{ appliedFiltersCount() }} filtre(s) actif(s)</span>
            }
          </p>
        </div>

        <div class="flex gap-3">
          <button
            (click)="resetFilters()"
            class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            [disabled]="appliedFiltersCount() === 0">
            <i class="bi bi-arrow-counterclockwise mr-2"></i>
            Réinitialiser
          </button>
          <button
            (click)="exportTasks()"
            class="px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50">
            <i class="bi bi-download mr-2"></i>
            Exporter
          </button>
        </div>
      </div>

      <!-- Barre de recherche et filtres rapides -->
      <div class="bg-white rounded-lg border border-gray-200 mb-6">
        <div class="p-4 border-b border-gray-200">
          <!-- Recherche principale -->
          <div class="relative mb-4">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class="bi bi-search text-gray-400"></i>
            </div>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (input)="onSearchChange()"
              placeholder="Rechercher par titre, description, code..."
              class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            @if (searchQuery()) {
              <button
                (click)="clearSearch()"
                class="absolute inset-y-0 right-0 pr-3 flex items-center">
                <i class="bi bi-x-circle text-gray-400 hover:text-gray-600"></i>
              </button>
            }
          </div>

          <!-- Filtres rapides -->
          <div class="flex flex-wrap gap-3 items-center">
            <!-- Filtre par projet -->
            @if (currentProjectId()) {
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <i class="bi bi-folder"></i>
                <span>Projet: {{ currentProjectId() }}</span>
                <button
                  (click)="clearProjectFilter()"
                  class="text-red-500 hover:text-red-700">
                  <i class="bi bi-x"></i>
                </button>
              </div>
            }

            <!-- Mes tâches -->
            <label class="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                [(ngModel)]="showMyTasks"
                (change)="applyFilters()"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Mes tâches uniquement
            </label>

            <!-- Tâches en retard -->
            <label class="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                [(ngModel)]="showOverdue"
                (change)="applyFilters()"
                class="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              Tâches en retard
            </label>

            <!-- Bouton filtres avancés -->
            <button
              (click)="toggleAdvancedFilters()"
              class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              [class.bg-blue-50]="showAdvancedFilters()"
              [class.border-blue-300]="showAdvancedFilters()">
              <i class="bi bi-funnel mr-1"></i>
              Filtres avancés
              <i [class]="showAdvancedFilters() ? 'bi bi-chevron-up' : 'bi bi-chevron-down'" class="ml-1"></i>
            </button>
          </div>
        </div>

        <!-- Filtres avancés (repliable) -->
        @if (showAdvancedFilters()) {
          <div class="p-4 bg-gray-50 border-t border-gray-200">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <!-- Statut -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  [(ngModel)]="selectedStatus"
                  (change)="applyFilters()"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                  <option value="">Tous les statuts</option>
                  @for (status of availableStatuses(); track status.value) {
                    <option [value]="status.value">{{ status.label }}</option>
                  }
                </select>
              </div>

              <!-- Priorité -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                <select
                  [(ngModel)]="selectedPriority"
                  (change)="applyFilters()"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                  <option value="">Toutes les priorités</option>
                  @for (priority of availablePriorities(); track priority.value) {
                    <option [value]="priority.value">{{ priority.label }}</option>
                  }
                </select>
              </div>

              <!-- Type -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  [(ngModel)]="selectedType"
                  (change)="applyFilters()"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                  <option value="">Tous les types</option>
                  @for (type of availableTypes(); track type.value) {
                    <option [value]="type.value">{{ type.label }}</option>
                  }
                </select>
              </div>

              <!-- Assigné à -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Assigné à</label>
                <select
                  [(ngModel)]="selectedAssignee"
                  (change)="applyFilters()"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                  <option value="">Tous les utilisateurs</option>
                  @for (user of availableUsers(); track user.id) {
                    <option [value]="user.id">{{ user.name }}</option>
                  }
                </select>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Actions de groupe et vue -->
      <div class="flex justify-between items-center mb-4">
        <div class="flex items-center gap-3">
          <!-- Sélection groupée -->
          @if (selectedTasks().length > 0) {
            <div class="flex items-center gap-2 text-sm text-gray-600">
              <span>{{ selectedTasks().length }} sélectionnée(s)</span>
              <button
                (click)="clearSelection()"
                class="text-blue-600 hover:text-blue-800">
                Désélectionner tout
              </button>
            </div>
          }

          <!-- Actions de groupe -->
          @if (selectedTasks().length > 0) {
            <div class="flex gap-2">
              <button
                (click)="bulkUpdateStatus()"
                class="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Changer statut
              </button>
              <button
                (click)="bulkAssign()"
                class="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">
                Assigner
              </button>
              <button
                (click)="bulkDelete()"
                class="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">
                Supprimer
              </button>
            </div>
          }
        </div>

        <div class="flex items-center gap-3">
          <!-- Tri -->
          <select
            [(ngModel)]="sortBy"
            (change)="applyFilters()"
            class="px-3 py-2 text-sm border border-gray-300 rounded-md">
            <option value="created_at">Date de création</option>
            <option value="updated_at">Dernière modification</option>
            <option value="due_date">Date d'échéance</option>
            <option value="priority">Priorité</option>
            <option value="title">Titre</option>
          </select>

          <button
            (click)="toggleSortDirection()"
            class="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            <i [class]="sortDirection() === 'asc' ? 'bi bi-arrow-up' : 'bi bi-arrow-down'"></i>
          </button>

          <!-- Vue liste/grille -->
          <div class="flex border border-gray-300 rounded-md overflow-hidden">
            <button
              (click)="setViewMode('list')"
              [class.bg-gray-100]="viewMode() === 'list'"
              class="px-3 py-2 text-sm hover:bg-gray-50">
              <i class="bi bi-list"></i>
            </button>
            <button
              (click)="setViewMode('grid')"
              [class.bg-gray-100]="viewMode() === 'grid'"
              class="px-3 py-2 text-sm hover:bg-gray-50">
              <i class="bi bi-grid"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Liste/Grille des tâches -->
      @if (tasksState().loading) {
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-600">Chargement des tâches...</span>
        </div>
      } @else if (tasksState().error) {
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex items-center">
            <i class="bi bi-exclamation-triangle text-red-500 mr-3"></i>
            <span class="text-red-800">{{ tasksState().error }}</span>
          </div>
        </div>
      } @else if (tasksState().tasks.length === 0) {
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <i class="bi bi-inbox text-gray-400 text-4xl mb-4"></i>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Aucune tâche trouvée</h3>
          <p class="text-gray-600 mb-4">
            @if (appliedFiltersCount() > 0) {
              Aucune tâche ne correspond aux filtres sélectionnés.
            } @else {
              Il n'y a pas encore de tâches dans ce projet.
            }
          </p>
          @if (appliedFiltersCount() > 0) {
            <button
              (click)="resetFilters()"
              class="text-blue-600 hover:text-blue-800">
              Réinitialiser les filtres
            </button>
          }
        </div>
      } @else {
        <!-- Vue Liste -->
        @if (viewMode() === 'list') {
          <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="w-4 px-4 py-3">
                      <input
                        type="checkbox"
                        [checked]="isAllSelected()"
                        [indeterminate]="isSomeSelected()"
                        (change)="toggleSelectAll()"
                        class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Tâche
                    </th>
                    <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Statut
                    </th>
                    <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Priorité
                    </th>
                    <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Assigné à
                    </th>
                    <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Échéance
                    </th>
                    <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Progression
                    </th>
                    <th class="relative px-4 py-3">
                      <span class="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  @for (task of tasksState().tasks; track task.id) {
                    <tr
                      class="hover:bg-gray-50 cursor-pointer"
                      (click)="selectTask(task)"
                      [class.bg-blue-50]="selectedTasks().includes(task.id)">
                      <td class="px-4 py-4">
                        <input
                          type="checkbox"
                          [checked]="selectedTasks().includes(task.id)"
                          (change)="toggleTaskSelection(task.id)"
                          (click)="$event.stopPropagation()"
                          class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td class="px-4 py-4">
                        <div class="flex items-start gap-3">
                          <div class="flex-shrink-0">
                            <span
                              class="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium text-white"
                              [style.background-color]="TASK_STATUS_COLORS[task.status]">
                              {{ task.code }}
                            </span>
                          </div>
                          <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900 truncate">
                              {{ task.title }}
                            </p>
                            @if (task.description) {
                              <p class="text-sm text-gray-500 truncate">
                                {{ task.description }}
                              </p>
                            }
                            <div class="flex items-center gap-2 mt-1">
                              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {{ TASK_TYPE_LABELS[task.type] }}
                              </span>
                              @if (task.tags && task.tags.length > 0) {
                                @for (tag of task.tags.slice(0, 2); track tag.id) {
                                  <span
                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                                    [style.background-color]="tag.color">
                                    {{ tag.name }}
                                  </span>
                                }
                                @if (task.tags.length > 2) {
                                  <span class="text-xs text-gray-500">+{{ task.tags.length - 2 }}</span>
                                }
                              }
                            </div>
                          </div>
                        </div>
                      </td>
                      <td class="px-4 py-4">
                        <span
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                          [style.background-color]="TASK_STATUS_COLORS[task.status]">
                          {{ TASK_STATUS_LABELS[task.status] }}
                        </span>
                      </td>
                      <td class="px-4 py-4">
                        <span
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                          [style.background-color]="TASK_PRIORITY_COLORS[task.priority]">
                          {{ TASK_PRIORITY_LABELS[task.priority] }}
                        </span>
                      </td>
                      <td class="px-4 py-4">
                        @if (task.assignees && task.assignees.length > 0) {
                          <div class="flex items-center -space-x-2">
                            @for (assignment of task.assignees.slice(0, 3); track assignment.user.id) {
                              <div
                                class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white"
                                [title]="assignment.user.name">
                                {{ assignment.user.name?.charAt(0) }}
                              </div>
                            }
                            @if (task.assignees.length > 3) {
                              <div class="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                                +{{ task.assignees.length - 3 }}
                              </div>
                            }
                          </div>
                        } @else {
                          <span class="text-sm text-gray-500">Non assignée</span>
                        }
                      </td>
                      <td class="px-4 py-4">
                        @if (task.due_date) {
                          <div class="text-sm">
                            <span
                              [class]="isTaskOverdue(task) ? 'text-red-600 font-medium' : 'text-gray-900'">
                              {{ formatDate(task.due_date) }}
                            </span>
                            @if (isTaskOverdue(task)) {
                              <div class="text-xs text-red-600">
                                En retard de {{ Math.abs(getDaysUntilDue(task) || 0) }} jour(s)
                              </div>
                            } @else if (getDaysUntilDue(task) !== null) {
                              <div class="text-xs text-gray-500">
                                Dans {{ getDaysUntilDue(task) }} jour(s)
                              </div>
                            }
                          </div>
                        } @else {
                          <span class="text-sm text-gray-500">Aucune échéance</span>
                        }
                      </td>
                      <td class="px-4 py-4">
                        <div class="flex items-center gap-2">
                          <div class="w-full bg-gray-200 rounded-full h-2">
                            <div
                              class="h-2 rounded-full"
                              [style.width.%]="task.progress_percentage"
                              [style.background-color]="getTaskProgressColor(task.progress_percentage)">
                            </div>
                          </div>
                          <span class="text-xs text-gray-600 min-w-0">
                            {{ task.progress_percentage }}%
                          </span>
                        </div>
                        @if (task.estimated_hours || task.actual_hours) {
                          <div class="text-xs text-gray-500 mt-1">
                            @if (task.actual_hours) {
                              {{ formatDuration(task.actual_hours) }}
                            }
                            @if (task.estimated_hours && task.actual_hours) {
                              /
                            }
                            @if (task.estimated_hours) {
                              {{ formatDuration(task.estimated_hours) }}
                            }
                          </div>
                        }
                      </td>
                      <td class="px-4 py-4">
                        <div class="flex items-center gap-1">
                          <button
                            (click)="editTask(task); $event.stopPropagation()"
                            class="p-1 text-gray-500 hover:text-blue-600"
                            title="Modifier">
                            <i class="bi bi-pencil"></i>
                          </button>
                          <button
                            (click)="viewTaskDetails(task); $event.stopPropagation()"
                            class="p-1 text-gray-500 hover:text-green-600"
                            title="Voir détails">
                            <i class="bi bi-eye"></i>
                          </button>
                          <button
                            (click)="deleteTask(task); $event.stopPropagation()"
                            class="p-1 text-gray-500 hover:text-red-600"
                            title="Supprimer">
                            <i class="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- Vue Grille -->
        @if (viewMode() === 'grid') {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            @for (task of tasksState().tasks; track task.id) {
              <div
                class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                (click)="selectTask(task)"
                [class.ring-2]="selectedTasks().includes(task.id)"
                [class.ring-blue-500]="selectedTasks().includes(task.id)">

                <!-- En-tête de carte -->
                <div class="flex items-start justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <span
                      class="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium text-white"
                      [style.background-color]="TASK_STATUS_COLORS[task.status]">
                      {{ task.code }}
                    </span>
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {{ TASK_TYPE_LABELS[task.type] }}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    [checked]="selectedTasks().includes(task.id)"
                    (change)="toggleTaskSelection(task.id)"
                    (click)="$event.stopPropagation()"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                <!-- Titre et description -->
                <h3 class="font-medium text-gray-900 mb-2 line-clamp-2">
                  {{ task.title }}
                </h3>
                @if (task.description) {
                  <p class="text-sm text-gray-600 mb-3 line-clamp-2">
                    {{ task.description }}
                  </p>
                }

                <!-- Statut et priorité -->
                <div class="flex items-center gap-2 mb-3">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                    [style.background-color]="TASK_STATUS_COLORS[task.status]">
                    {{ TASK_STATUS_LABELS[task.status] }}
                  </span>
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                    [style.background-color]="TASK_PRIORITY_COLORS[task.priority]">
                    {{ TASK_PRIORITY_LABELS[task.priority] }}
                  </span>
                </div>

                <!-- Tags -->
                @if (task.tags && task.tags.length > 0) {
                  <div class="flex flex-wrap gap-1 mb-3">
                    @for (tag of task.tags.slice(0, 3); track tag.id) {
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                        [style.background-color]="tag.color">
                        {{ tag.name }}
                      </span>
                    }
                    @if (task.tags.length > 3) {
                      <span class="text-xs text-gray-500">+{{ task.tags.length - 3 }}</span>
                    }
                  </div>
                }

                <!-- Progression -->
                <div class="mb-3">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-medium text-gray-700">Progression</span>
                    <span class="text-xs text-gray-600">{{ task.progress_percentage }}%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div
                      class="h-2 rounded-full"
                      [style.width.%]="task.progress_percentage"
                      [style.background-color]="getTaskProgressColor(task.progress_percentage)">
                    </div>
                  </div>
                </div>

                <!-- Assignés -->
                @if (task.assignees && task.assignees.length > 0) {
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-medium text-gray-700">Assignée à</span>
                    <div class="flex items-center -space-x-2">
                      @for (assignment of task.assignees.slice(0, 3); track assignment.user.id) {
                        <div
                          class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white"
                          [title]="assignment.user.name">
                          {{ assignment.user.name?.charAt(0) }}
                        </div>
                      }
                      @if (task.assignees.length > 3) {
                        <div class="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                          +{{ task.assignees.length - 3 }}
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Échéance -->
                @if (task.due_date) {
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-medium text-gray-700">Échéance</span>
                    <span
                      class="text-xs"
                      [class]="isTaskOverdue(task) ? 'text-red-600 font-medium' : 'text-gray-600'">
                      {{ formatDate(task.due_date) }}
                    </span>
                  </div>
                }

                <!-- Temps -->
                @if (task.estimated_hours || task.actual_hours) {
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-medium text-gray-700">Temps</span>
                    <span class="text-xs text-gray-600">
                      @if (task.actual_hours) {
                        {{ formatDuration(task.actual_hours) }}
                      }
                      @if (task.estimated_hours && task.actual_hours) {
                        /
                      }
                      @if (task.estimated_hours) {
                        {{ formatDuration(task.estimated_hours) }}
                      }
                    </span>
                  </div>
                }

                <!-- Actions -->
                <div class="flex items-center justify-end gap-1 pt-3 border-t border-gray-100">
                  <button
                    (click)="editTask(task); $event.stopPropagation()"
                    class="p-1 text-gray-500 hover:text-blue-600"
                    title="Modifier">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    (click)="viewTaskDetails(task); $event.stopPropagation()"
                    class="p-1 text-gray-500 hover:text-green-600"
                    title="Voir détails">
                    <i class="bi bi-eye"></i>
                  </button>
                  <button
                    (click)="deleteTask(task); $event.stopPropagation()"
                    class="p-1 text-gray-500 hover:text-red-600"
                    title="Supprimer">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            }
          </div>
        }

        <!-- Pagination -->
        @if (tasksState().totalPages > 1) {
          <div class="flex items-center justify-between mt-6">
            <div class="text-sm text-gray-700">
              Affichage de {{ (tasksState().currentPage - 1) * 20 + 1 }} à
              {{ Math.min(tasksState().currentPage * 20, tasksState().total) }}
              sur {{ tasksState().total }} tâche(s)
            </div>
            <nav class="flex items-center gap-2">
              <button
                (click)="goToPage(tasksState().currentPage - 1)"
                [disabled]="!tasksState().hasPreviousPage"
                class="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                Précédent
              </button>

              @for (page of getVisiblePages(); track page) {
                @if (page === '...') {
                  <span class="px-3 py-2 text-sm text-gray-500">...</span>
                } @else {
                  <button
                    (click)="goToPage(page)"
                    [class]="page === tasksState().currentPage ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'"
                    class="px-3 py-2 text-sm border border-gray-300 rounded-md">
                    {{ page }}
                  </button>
                }
              }

              <button
                (click)="goToPage(tasksState().currentPage + 1)"
                [disabled]="!tasksState().hasNextPage"
                class="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                Suivant
              </button>
            </nav>
          </div>
        }
      }
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
export class TasksDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private tasksApiService = inject(TasksApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // État des tâches
  tasksState = signal<TasksState>({
    tasks: [],
    loading: false,
    error: null,
    total: 0,
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
  });

  // Filtres et recherche
  searchQuery = signal('');
  showMyTasks = signal(false);
  showOverdue = signal(false);
  showAdvancedFilters = signal(false);
  selectedStatus = signal('');
  selectedPriority = signal('');
  selectedType = signal('');
  selectedAssignee = signal('');
  currentProjectId = signal<number | null>(null);

  // Tri et vue
  sortBy = signal('created_at');
  sortDirection = signal<'asc' | 'desc'>('desc');
  viewMode = signal<'list' | 'grid'>('list');

  // Sélection
  selectedTasks = signal<number[]>([]);

  // Options disponibles
  availableStatuses = signal<TaskStatusOption[]>([]);
  availablePriorities = signal<{ value: TaskPriority; label: string }[]>([]);
  availableTypes = signal<{ value: TaskType; label: string }[]>([]);
  availableUsers = signal<UserEntity[]>([]);

  // Constantes pour le template
  TASK_STATUS_LABELS = TASK_STATUS_LABELS;
  TASK_PRIORITY_LABELS = TASK_PRIORITY_LABELS;
  TASK_TYPE_LABELS = TASK_TYPE_LABELS;
  TASK_STATUS_COLORS = TASK_STATUS_COLORS;
  TASK_PRIORITY_COLORS = TASK_PRIORITY_COLORS;
  isTaskOverdue = isTaskOverdue;
  getDaysUntilDue = getDaysUntilDue;
  formatDuration = formatDuration;
  getTaskProgressColor = getTaskProgressColor;

  // Computed
  appliedFiltersCount = computed(() => {
    let count = 0;
    if (this.searchQuery()) count++;
    if (this.showMyTasks()) count++;
    if (this.showOverdue()) count++;
    if (this.selectedStatus()) count++;
    if (this.selectedPriority()) count++;
    if (this.selectedType()) count++;
    if (this.selectedAssignee()) count++;
    if (this.currentProjectId()) count++;
    return count;
  });

  ngOnInit(): void {
    // Charger les paramètres de route
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['project_id']) {
        this.currentProjectId.set(parseInt(params['project_id']));
      }
    });

    this.loadInitialData();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    this.tasksState.update(state => ({ ...state, loading: true, error: null }));

    forkJoin({
      tasks: this.loadTasks(),
      statuses: this.tasksApiService.getTaskStatuses(),
      users: this.loadAvailableUsers()
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (results) => {
        if (results.statuses.data) {
          this.availableStatuses.set(results.statuses.data);
        }
        if (results.users.data) {
          this.availableUsers.set(results.users.data);
        }
        this.setupAvailableOptions();
      },
      error: (error) => {
        this.tasksState.update(state => ({
          ...state,
          loading: false,
          error: 'Erreur lors du chargement des données'
        }));
      }
    });
  }

  private loadTasks() {
    const filters: TaskFilters = this.buildCurrentFilters();

    return this.tasksApiService.getTasks(filters).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.tasksState.update(state => ({
          ...state,
          tasks: response.data,
          total: response.meta.total,
          currentPage: response.meta.current_page,
          totalPages: response.meta.last_page,
          hasNextPage: response.meta.current_page < response.meta.last_page,
          hasPreviousPage: response.meta.current_page > 1,
          loading: false,
          error: null
        }));
      },
      error: (error) => {
        this.tasksState.update(state => ({
          ...state,
          loading: false,
          error: 'Erreur lors du chargement des tâches'
        }));
      }
    });
  }

  private loadAvailableUsers() {
    // TODO: Implémenter l'endpoint pour récupérer les utilisateurs
    return of({ data: [] });
  }

  private setupAvailableOptions(): void {
    // Setup priority options
    this.availablePriorities.set(
      Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => ({
        value: value as TaskPriority,
        label
      }))
    );

    // Setup type options
    this.availableTypes.set(
      Object.entries(TASK_TYPE_LABELS).map(([value, label]) => ({
        value: value as TaskType,
        label
      }))
    );
  }

  private setupSearch(): void {
    // TODO: Implémenter la recherche avec debounce
  }

  private buildCurrentFilters(): TaskFilters {
    const filters: TaskFilters = {
      page: this.tasksState().currentPage,
      per_page: 20,
      sort_by: this.sortBy(),
      sort_direction: this.sortDirection()
    };

    if (this.searchQuery()) {
      filters.search = this.searchQuery();
    }

    if (this.currentProjectId()) {
      filters.project_id = this.currentProjectId()!;
    }

    if (this.showMyTasks()) {
      filters.my_tasks = true;
    }

    if (this.showOverdue()) {
      filters.overdue = true;
    }

    if (this.selectedStatus()) {
      filters.status = this.selectedStatus() as TaskStatus;
    }

    if (this.selectedPriority()) {
      filters.priority = this.selectedPriority() as TaskPriority;
    }

    if (this.selectedType()) {
      filters.type = this.selectedType() as TaskType;
    }

    if (this.selectedAssignee()) {
      filters.assigned_to = parseInt(this.selectedAssignee());
    }

    return filters;
  }

  // Méthodes d'interface
  onSearchChange(): void {
    // TODO: Implémenter la recherche avec debounce
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.applyFilters();
  }

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters.update(show => !show);
  }

  applyFilters(): void {
    this.tasksState.update(state => ({ ...state, currentPage: 1 }));
    this.loadTasks();
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.showMyTasks.set(false);
    this.showOverdue.set(false);
    this.selectedStatus.set('');
    this.selectedPriority.set('');
    this.selectedType.set('');
    this.selectedAssignee.set('');
    this.currentProjectId.set(null);
    this.applyFilters();
  }

  clearProjectFilter(): void {
    this.currentProjectId.set(null);
    this.applyFilters();
  }

  toggleSortDirection(): void {
    this.sortDirection.update(dir => dir === 'asc' ? 'desc' : 'asc');
    this.applyFilters();
  }

  setViewMode(mode: 'list' | 'grid'): void {
    this.viewMode.set(mode);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.tasksState().totalPages) {
      this.tasksState.update(state => ({ ...state, currentPage: page }));
      this.loadTasks();
    }
  }

  getVisiblePages(): (number | string)[] {
    const current = this.tasksState().currentPage;
    const total = this.tasksState().totalPages;
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (current > 4) {
        pages.push('...');
      }

      const start = Math.max(2, current - 2);
      const end = Math.min(total - 1, current + 2);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 3) {
        pages.push('...');
      }

      pages.push(total);
    }

    return pages;
  }

  // Sélection
  toggleTaskSelection(taskId: number): void {
    this.selectedTasks.update(selected => {
      if (selected.includes(taskId)) {
        return selected.filter(id => id !== taskId);
      } else {
        return [...selected, taskId];
      }
    });
  }

  toggleSelectAll(): void {
    const allIds = this.tasksState().tasks.map(task => task.id);
    const isAllSelected = allIds.every(id => this.selectedTasks().includes(id));

    if (isAllSelected) {
      this.selectedTasks.set([]);
    } else {
      this.selectedTasks.set(allIds);
    }
  }

  isAllSelected(): boolean {
    const allIds = this.tasksState().tasks.map(task => task.id);
    return allIds.length > 0 && allIds.every(id => this.selectedTasks().includes(id));
  }

  isSomeSelected(): boolean {
    const selectedCount = this.selectedTasks().length;
    const totalCount = this.tasksState().tasks.length;
    return selectedCount > 0 && selectedCount < totalCount;
  }

  clearSelection(): void {
    this.selectedTasks.set([]);
  }

  selectTask(task: Task): void {
    this.router.navigate(['/dashboard/tasks', task.id]);
  }

  // Actions
  editTask(task: Task): void {
    // TODO: Ouvrir modal d'édition
  }

  viewTaskDetails(task: Task): void {
    this.router.navigate(['/dashboard/tasks', task.id]);
  }

  deleteTask(task: Task): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la tâche "${task.title}" ?`)) {
      this.tasksApiService.deleteTask(task.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadTasks();
          },
          error: () => {
            alert('Erreur lors de la suppression de la tâche');
          }
        });
    }
  }

  bulkUpdateStatus(): void {
    // TODO: Implémenter mise à jour de statut groupée
  }

  bulkAssign(): void {
    // TODO: Implémenter assignation groupée
  }

  bulkDelete(): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${this.selectedTasks().length} tâche(s) ?`)) {
      // TODO: Implémenter suppression groupée
    }
  }

  exportTasks(): void {
    // TODO: Implémenter export des tâches
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  Math = Math;
}