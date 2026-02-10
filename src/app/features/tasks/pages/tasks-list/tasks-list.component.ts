// ========================================
// COMPOSANT LISTE DES TÂCHES
// Interface moderne avec filtres avancés et actions en masse
// ========================================

import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { TasksApiService } from '../../services/tasks-api.service';
import { Task, TaskFilters, TaskStatus, TaskPriority, TaskType, TASK_STATUS_LABELS, TASK_STATUS_COLORS, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS } from '../../models/task.models';

@Component({
  selector: 'app-tasks-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">

      <!-- Header avec actions principales -->
      <div class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <div class="flex items-center space-x-4">
              <h1 class="text-2xl font-bold text-gray-900">Gestion des Tâches</h1>
              <div class="flex items-center space-x-2 text-sm text-gray-500">
                <span>{{ totalTasks() }} tâche(s)</span>
                @if (selectedTasks().length > 0) {
                  <span>•</span>
                  <span class="text-blue-600 font-medium">{{ selectedTasks().length }} sélectionnée(s)</span>
                }
              </div>
            </div>

            <div class="flex items-center space-x-3">
              <!-- Actions en masse -->
              @if (selectedTasks().length > 0) {
                <div class="flex items-center space-x-2">
                  <button
                    (click)="bulkUpdateStatus(TaskStatus.EN_COURS)"
                    class="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    En cours
                  </button>
                  <button
                    (click)="bulkUpdateStatus(TaskStatus.TERMINE)"
                    class="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Terminer
                  </button>
                  <button
                    (click)="clearSelection()"
                    class="p-1.5 text-gray-400 hover:text-gray-600"
                    title="Désélectionner tout"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              }

              <!-- Bouton nouvelle tâche -->
              <button
                (click)="createTask()"
                class="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Nouvelle tâche
              </button>

              <!-- Menu vues -->
              <div class="relative">
                <button
                  (click)="showViewsMenu = !showViewsMenu"
                  class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                  </svg>
                  Vues
                </button>

                @if (showViewsMenu) {
                  <div class="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <div class="py-1">
                      <button
                        (click)="loadView('all'); showViewsMenu = false"
                        class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Toutes les tâches
                      </button>
                      <button
                        (click)="loadView('my-tasks'); showViewsMenu = false"
                        class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Mes tâches
                      </button>
                      <button
                        (click)="loadView('overdue'); showViewsMenu = false"
                        class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        En retard
                      </button>
                      <button
                        (click)="loadView('urgent'); showViewsMenu = false"
                        class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Urgent
                      </button>
                      <hr class="my-1">
                      <button
                        (click)="saveCurrentView(); showViewsMenu = false"
                        class="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100"
                      >
                        Sauvegarder la vue
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Barre de filtres -->
      <div class="bg-white border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <form [formGroup]="filtersForm" class="py-4">
            <div class="grid grid-cols-1 md:grid-cols-6 gap-4">

              <!-- Recherche -->
              <div class="md:col-span-2">
                <label class="block text-xs font-medium text-gray-700 mb-1">Recherche</label>
                <div class="relative">
                  <input
                    formControlName="search"
                    type="text"
                    placeholder="Titre, description..."
                    class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </div>
              </div>

              <!-- Statut -->
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Statut</label>
                <select
                  formControlName="status"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Tous les statuts</option>
                  @for (status of taskStatuses; track status.value) {
                    <option [value]="status.value">{{ status.label }}</option>
                  }
                </select>
              </div>

              <!-- Priorité -->
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Priorité</label>
                <select
                  formControlName="priority"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Toutes priorités</option>
                  @for (priority of taskPriorities; track priority.value) {
                    <option [value]="priority.value">{{ priority.label }}</option>
                  }
                </select>
              </div>

              <!-- Type -->
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select
                  formControlName="type"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Tous les types</option>
                  @for (type of taskTypes; track type.value) {
                    <option [value]="type.value">{{ type.label }}</option>
                  }
                </select>
              </div>

              <!-- Actions filtres -->
              <div class="flex items-end space-x-2">
                <button
                  type="button"
                  (click)="resetFilters()"
                  class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Réinitialiser
                </button>
                <button
                  type="button"
                  (click)="toggleAdvancedFilters()"
                  class="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                >
                  {{ showAdvancedFilters() ? 'Moins' : 'Plus' }}
                </button>
              </div>
            </div>

            <!-- Filtres avancés -->
            @if (showAdvancedFilters()) {
              <div class="mt-4 pt-4 border-t border-gray-200">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">

                  <!-- Date d'échéance -->
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Échéance de</label>
                    <input
                      formControlName="due_date_from"
                      type="date"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Échéance à</label>
                    <input
                      formControlName="due_date_to"
                      type="date"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <!-- Options spéciales -->
                  <div class="md:col-span-2">
                    <label class="block text-xs font-medium text-gray-700 mb-1">Options</label>
                    <div class="flex items-center space-x-4">
                      <label class="flex items-center">
                        <input
                          formControlName="my_tasks"
                          type="checkbox"
                          class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span class="ml-2 text-sm text-gray-700">Mes tâches uniquement</span>
                      </label>
                      <label class="flex items-center">
                        <input
                          formControlName="overdue"
                          type="checkbox"
                          class="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span class="ml-2 text-sm text-gray-700">En retard</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            }
          </form>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        @if (loading()) {
          <!-- État de chargement -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200">
            <div class="p-8 text-center">
              <div class="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-blue-500 bg-blue-100">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Chargement des tâches...
              </div>
            </div>
          </div>
        } @else if (error()) {
          <!-- État d'erreur -->
          <div class="bg-white rounded-xl shadow-sm border border-red-200">
            <div class="p-8 text-center">
              <svg class="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <h3 class="mt-2 text-sm font-medium text-red-800">Erreur de chargement</h3>
              <p class="mt-1 text-sm text-red-600">{{ error() }}</p>
              <button
                (click)="loadTasks()"
                class="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Réessayer
              </button>
            </div>
          </div>
        } @else {

          <!-- Liste des tâches -->
          @if (tasks().length === 0) {
            <!-- État vide -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200">
              <div class="p-8 text-center">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">Aucune tâche trouvée</h3>
                <p class="mt-1 text-sm text-gray-500">Commencez par créer une nouvelle tâche ou ajustez vos filtres.</p>
                <button
                  (click)="createTask()"
                  class="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Créer une tâche
                </button>
              </div>
            </div>
          } @else {
            <!-- Grille des tâches -->
            <div class="space-y-4">
              @for (task of tasks(); track task.id) {
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div class="p-6">
                    <div class="flex items-start justify-between">

                      <!-- Informations principales -->
                      <div class="flex-1 min-w-0">
                        <div class="flex items-start space-x-3">

                          <!-- Checkbox sélection -->
                          <input
                            type="checkbox"
                            [checked]="selectedTasks().includes(task.id)"
                            (change)="toggleTaskSelection(task.id, $event)"
                            class="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />

                          <div class="flex-1">
                            <!-- Titre et code -->
                            <div class="flex items-center space-x-2 mb-2">
                              <h3 class="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600" (click)="viewTask(task.id)">
                                {{ task.title }}
                              </h3>
                              <span class="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {{ task.code }}
                              </span>
                            </div>

                            <!-- Description -->
                            @if (task.description) {
                              <p class="text-sm text-gray-600 mb-3 line-clamp-2">{{ task.description }}</p>
                            }

                            <!-- Métadonnées -->
                            <div class="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                              @if (task.project) {
                                <span class="flex items-center">
                                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                                  </svg>
                                  {{ task.project.name }}
                                </span>
                              }

                              @if (task.assignees && task.assignees.length > 0) {
                                <span class="flex items-center">
                                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                  </svg>
                                  {{ task.assignees[0].user.name }}
                                  @if (task.assignees.length > 1) {
                                    <span class="ml-1">+{{ task.assignees.length - 1 }}</span>
                                  }
                                </span>
                              }

                              @if (task.due_date) {
                                <span class="flex items-center" [class.text-red-500]="isTaskOverdue(task)">
                                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                  </svg>
                                  {{ formatDate(task.due_date) }}
                                  @if (isTaskOverdue(task)) {
                                    <span class="ml-1 text-red-600 font-medium">(En retard)</span>
                                  }
                                </span>
                              }
                            </div>

                            <!-- Tags et temps -->
                            <div class="flex items-center space-x-4">
                              @if (task.tags && task.tags.length > 0) {
                                <div class="flex items-center space-x-1">
                                  @for (tag of task.tags.slice(0, 3); track tag.id) {
                                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white" [style.background-color]="tag.color">
                                      {{ tag.name }}
                                    </span>
                                  }
                                  @if (task.tags.length > 3) {
                                    <span class="text-xs text-gray-500">+{{ task.tags.length - 3 }}</span>
                                  }
                                </div>
                              }

                              @if (task.estimated_hours || task.actual_hours) {
                                <div class="flex items-center text-xs text-gray-500">
                                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                  </svg>
                                  @if (task.actual_hours) {
                                    <span>{{ formatDuration(task.actual_hours) }}</span>
                                    @if (task.estimated_hours) {
                                      <span class="text-gray-400">/ {{ formatDuration(task.estimated_hours) }}</span>
                                    }
                                  } @else if (task.estimated_hours) {
                                    <span>{{ formatDuration(task.estimated_hours) }} estimé</span>
                                  }
                                </div>
                              }
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Actions et statut -->
                      <div class="flex items-start space-x-3 ml-4">

                        <!-- Progression -->
                        @if (task.progress_percentage > 0) {
                          <div class="flex flex-col items-center">
                            <div class="w-12 h-12 relative">
                              <svg class="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                                <path
                                  class="text-gray-200"
                                  stroke="currentColor"
                                  stroke-width="3"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                  [attr.stroke]="getTaskProgressColor(task.progress_percentage)"
                                  stroke-width="3"
                                  stroke-linecap="round"
                                  fill="none"
                                  [attr.stroke-dasharray]="task.progress_percentage + ' ' + (100 - task.progress_percentage)"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                              </svg>
                              <div class="absolute inset-0 flex items-center justify-center">
                                <span class="text-xs font-semibold">{{ task.progress_percentage }}%</span>
                              </div>
                            </div>
                          </div>
                        }

                        <!-- Badges statut et priorité -->
                        <div class="flex flex-col space-y-2">
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white" [style.background-color]="getStatusColor(task.status)">
                            {{ getStatusLabel(task.status) }}
                          </span>

                          @if (task.priority) {
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white" [style.background-color]="getPriorityColor(task.priority)">
                              {{ getPriorityLabel(task.priority) }}
                            </span>
                          }
                        </div>

                        <!-- Menu actions -->
                        <div class="relative">
                          <button
                            (click)="toggleTaskMenu(task.id)"
                            class="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                            </svg>
                          </button>

                          @if (openMenuTaskId() === task.id) {
                            <div class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                              <div class="py-1">
                                <button
                                  (click)="viewTask(task.id); closeTaskMenu()"
                                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Voir les détails
                                </button>
                                <button
                                  (click)="editTask(task.id); closeTaskMenu()"
                                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Modifier
                                </button>
                                <button
                                  (click)="startTimer(task.id); closeTaskMenu()"
                                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Démarrer le temps
                                </button>
                                <hr class="my-1">
                                <button
                                  (click)="deleteTask(task.id); closeTaskMenu()"
                                  class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  Supprimer
                                </button>
                              </div>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Pagination -->
            @if (totalPages() > 1) {
              <div class="mt-8 flex items-center justify-between">
                <div class="flex items-center text-sm text-gray-700">
                  <span>
                    Affichage de {{ ((currentPage() - 1) * pageSize()) + 1 }} à {{ Math.min(currentPage() * pageSize(), totalTasks()) }} sur {{ totalTasks() }} tâches
                  </span>
                </div>

                <nav class="flex items-center space-x-1">
                  <button
                    (click)="goToPage(currentPage() - 1)"
                    [disabled]="currentPage() === 1"
                    class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Précédent
                  </button>

                  @for (page of getVisiblePages(); track page) {
                    <button
                      (click)="goToPage(page)"
                      [class.bg-blue-600]="page === currentPage()"
                      [class.text-white]="page === currentPage()"
                      [class.bg-white]="page !== currentPage()"
                      [class.text-gray-500]="page !== currentPage()"
                      class="px-3 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      {{ page }}
                    </button>
                  }

                  <button
                    (click)="goToPage(currentPage() + 1)"
                    [disabled]="currentPage() === totalPages()"
                    class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant
                  </button>
                </nav>
              </div>
            }
          }
        }
      </div>
    </div>
  `
})
export class TasksListComponent implements OnInit, OnDestroy {
  private tasksApiService = inject(TasksApiService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  // État du composant
  tasks = signal<Task[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  selectedTasks = signal<number[]>([]);
  openMenuTaskId = signal<number | null>(null);
  showViewsMenu = false;
  showAdvancedFilters = signal(false);

  // Pagination
  currentPage = signal(1);
  totalPages = signal(0);
  totalTasks = signal(0);
  pageSize = signal(20);

  // Formulaire de filtres
  filtersForm: FormGroup;

  // Données de référence
  taskStatuses = Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({ value, label }));
  taskPriorities = Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => ({ value, label }));
  taskTypes = [
    { value: 'dev', label: 'Développement' },
    { value: 'design', label: 'Design' },
    { value: 'test', label: 'Test' },
    { value: 'analyse', label: 'Analyse' },
    { value: 'autre', label: 'Autre' }
  ];

  // Constantes exportées pour le template
  TaskStatus = TaskStatus;
  Math = Math;

  constructor() {
    this.filtersForm = this.fb.group({
      search: [''],
      status: [''],
      priority: [''],
      type: [''],
      due_date_from: [''],
      due_date_to: [''],
      my_tasks: [false],
      overdue: [false]
    });

    this.setupFormSubscription();
  }

  ngOnInit(): void {
    this.loadTasks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFormSubscription(): void {
    this.filtersForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadTasks();
      });
  }

  loadTasks(): void {
    this.loading.set(true);
    this.error.set(null);

    const filters = this.buildFilters();

    this.tasksApiService.getTasks(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.tasks.set(response.data);
          this.totalTasks.set(response.meta.total);
          this.totalPages.set(response.meta.last_page);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.message || 'Erreur lors du chargement des tâches');
          this.loading.set(false);
        }
      });
  }

  private buildFilters(): TaskFilters {
    const formValue = this.filtersForm.value;
    const filters: TaskFilters = {
      page: this.currentPage(),
      per_page: this.pageSize(),
      include: 'project,assignees,tags'
    };

    if (formValue.search) filters.search = formValue.search;
    if (formValue.status) filters.status = formValue.status;
    if (formValue.priority) filters.priority = formValue.priority;
    if (formValue.type) filters.type = formValue.type;
    if (formValue.due_date_from) filters.due_date_from = formValue.due_date_from;
    if (formValue.due_date_to) filters.due_date_to = formValue.due_date_to;
    if (formValue.my_tasks) filters.my_tasks = true;
    if (formValue.overdue) filters.overdue = true;

    return filters;
  }

  // Actions de navigation
  createTask(): void {
    this.router.navigate(['/dashboard/tasks/create']);
  }

  viewTask(taskId: number): void {
    this.router.navigate(['/dashboard/tasks/detail', taskId]);
  }

  editTask(taskId: number): void {
    this.router.navigate(['/dashboard/tasks/detail', taskId], { queryParams: { mode: 'edit' } });
  }

  // Sélection et actions en masse
  toggleTaskSelection(taskId: number, event: any): void {
    const selected = this.selectedTasks();
    if (event.target.checked) {
      this.selectedTasks.set([...selected, taskId]);
    } else {
      this.selectedTasks.set(selected.filter(id => id !== taskId));
    }
  }

  clearSelection(): void {
    this.selectedTasks.set([]);
  }

  bulkUpdateStatus(status: TaskStatus): void {
    const selectedIds = this.selectedTasks();
    if (selectedIds.length === 0) return;

    // TODO: Implémenter l'action en masse
    console.log('Bulk update status', { selectedIds, status });

    // Pour l'instant, on simule juste
    this.clearSelection();
    this.loadTasks();
  }

  // Actions sur les tâches
  startTimer(taskId: number): void {
    // TODO: Implémenter le démarrage du timer
    console.log('Start timer for task', taskId);
  }

  deleteTask(taskId: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      this.tasksApiService.deleteTask(taskId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadTasks();
          },
          error: (error) => {
            console.error('Failed to delete task', error);
          }
        });
    }
  }

  // Menu contextuel
  toggleTaskMenu(taskId: number): void {
    this.openMenuTaskId.set(this.openMenuTaskId() === taskId ? null : taskId);
  }

  closeTaskMenu(): void {
    this.openMenuTaskId.set(null);
  }

  // Filtres et vues
  toggleAdvancedFilters(): void {
    this.showAdvancedFilters.set(!this.showAdvancedFilters());
  }

  resetFilters(): void {
    this.filtersForm.reset();
  }

  loadView(viewType: string): void {
    this.filtersForm.reset();

    switch (viewType) {
      case 'my-tasks':
        this.filtersForm.patchValue({ my_tasks: true });
        break;
      case 'overdue':
        this.filtersForm.patchValue({ overdue: true });
        break;
      case 'urgent':
        this.filtersForm.patchValue({ priority: 'haute' });
        break;
    }
  }

  saveCurrentView(): void {
    // TODO: Implémenter la sauvegarde de vue
    console.log('Save current view');
  }

  // Pagination
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadTasks();
    }
  }

  getVisiblePages(): number[] {
    const current = this.currentPage();
    const total = this.totalPages();
    const delta = 2;

    const range = [];
    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }

    if (current - delta > 2) {
      range.unshift('...' as any);
    }
    if (current + delta < total - 1) {
      range.push('...' as any);
    }

    range.unshift(1);
    if (total > 1) {
      range.push(total);
    }

    return range;
  }

  // Méthodes utilitaires
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    });
  }

  formatDuration(hours: number): string {
    if (hours < 1) {
      return `${Math.round(hours * 60)}min`;
    }
    return `${hours.toFixed(1)}h`;
  }

  isTaskOverdue(task: Task): boolean {
    if (!task.due_date) return false;
    const today = new Date();
    const dueDate = new Date(task.due_date);
    return today > dueDate && task.status !== TaskStatus.TERMINE;
  }

  getStatusLabel(status: TaskStatus): string {
    return TASK_STATUS_LABELS[status] || status;
  }

  getStatusColor(status: TaskStatus): string {
    return TASK_STATUS_COLORS[status] || '#6b7280';
  }

  getPriorityLabel(priority: TaskPriority): string {
    return TASK_PRIORITY_LABELS[priority] || priority;
  }

  getPriorityColor(priority: TaskPriority): string {
    return TASK_PRIORITY_COLORS[priority] || '#6b7280';
  }

  getTaskProgressColor(percentage: number): string {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#3b82f6';
    if (percentage >= 40) return '#f59e0b';
    return '#ef4444';
  }
}