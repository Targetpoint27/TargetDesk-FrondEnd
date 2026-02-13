// ========================================
// COMPOSANT LISTE DE PROJETS
// Affichage et filtrage des projets avec pagination
// ========================================

import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import {
  Project,
  ProjectFilters,
  ProjectStatus,
  PROJECT_STATUS_LABELS,
  PaginatedProjectResponse
} from '../../models/project.models';
import { ProjectCardComponent } from '../project-card/project-card.component';

export type ViewMode = 'grid' | 'list' | 'table';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ProjectCardComponent],
  template: `
    <div class="project-list">
      <!-- En-tête avec filtres et contrôles -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <!-- Titre et compteur -->
          <div class="flex items-center space-x-3">
            <h2 class="text-2xl font-bold text-gray-900">{{ title }}</h2>
            @if (totalProjects()) {
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {{ totalProjects() }} projet{{ totalProjects() !== 1 ? 's' : '' }}
              </span>
            }
          </div>

          <!-- Contrôles de vue et actions -->
          <div class="flex items-center space-x-3">
            <!-- Sélecteur de vue -->
            <div class="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                (click)="changeViewMode('grid')"
                class="flex items-center justify-center w-8 h-8 rounded-md transition-colors"
                [class.bg-white]="currentViewMode() === 'grid'"
                [class.text-blue-600]="currentViewMode() === 'grid'"
                [class.shadow-sm]="currentViewMode() === 'grid'"
                [class.text-gray-600]="currentViewMode() !== 'grid'"
                title="Vue grille"
              >
                <i class="bi bi-grid-3x3-gap"></i>
              </button>
              <button
                (click)="changeViewMode('list')"
                class="flex items-center justify-center w-8 h-8 rounded-md transition-colors"
                [class.bg-white]="currentViewMode() === 'list'"
                [class.text-blue-600]="currentViewMode() === 'list'"
                [class.shadow-sm]="currentViewMode() === 'list'"
                [class.text-gray-600]="currentViewMode() !== 'list'"
                title="Vue liste"
              >
                <i class="bi bi-list-ul"></i>
              </button>
              <button
                (click)="changeViewMode('table')"
                class="flex items-center justify-center w-8 h-8 rounded-md transition-colors"
                [class.bg-white]="currentViewMode() === 'table'"
                [class.text-blue-600]="currentViewMode() === 'table'"
                [class.shadow-sm]="currentViewMode() === 'table'"
                [class.text-gray-600]="currentViewMode() !== 'table'"
                title="Vue tableau"
              >
                <i class="bi bi-table"></i>
              </button>
            </div>

            <!-- Bouton nouveau projet -->
            <button
              (click)="onCreateProject.emit()"
              class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              Nouveau projet
            </button>
          </div>
        </div>

        <!-- Filtres -->
        <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Recherche -->
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <input
              type="text"
              [(ngModel)]="currentFilters.search"
              (input)="handleFilterChange()"
              placeholder="Rechercher un projet..."
              class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
          </div>

          <!-- Filtre par statut -->
          <div>
            <select
              [(ngModel)]="currentFilters.status"
              (change)="handleFilterChange()"
              class="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les statuts</option>
              @for (status of statusOptions; track status.value) {
                <option [value]="status.value">{{ status.label }}</option>
              }
            </select>
          </div>

          <!-- Filtre par département -->
          <div>
            <select
              [(ngModel)]="currentFilters.department"
              (change)="handleFilterChange()"
              class="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les départements</option>
              @for (dept of departmentOptions; track dept) {
                <option [value]="dept">{{ dept }}</option>
              }
            </select>
          </div>

          <!-- Filtres avancés -->
          <div class="flex items-center space-x-2">
            <label class="flex items-center">
              <input
                type="checkbox"
                [(ngModel)]="currentFilters.my_projects"
                (change)="handleFilterChange()"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              >
              <span class="ml-2 text-sm text-gray-600">Mes projets</span>
            </label>
            <label class="flex items-center">
              <input
                type="checkbox"
                [(ngModel)]="currentFilters.active_only"
                (change)="handleFilterChange()"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              >
              <span class="ml-2 text-sm text-gray-600">Actifs uniquement</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Zone de contenu avec état de chargement -->
      @if (loading) {
        <div class="flex items-center justify-center py-12">
          <div class="flex items-center space-x-2">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span class="text-gray-600">Chargement des projets...</span>
          </div>
        </div>
      } @else if (projects.length === 0) {
        <!-- État vide -->
        <div class="text-center py-12">
          <div class="mx-auto h-24 w-24 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
            </svg>
          </div>
          <h3 class="mt-4 text-lg font-medium text-gray-900">Aucun projet trouvé</h3>
          <p class="mt-2 text-gray-500">
            @if (hasActiveFilters()) {
              Aucun projet ne correspond aux critères de recherche.
            } @else {
              Commencez par créer votre premier projet.
            }
          </p>
          @if (!hasActiveFilters()) {
            <div class="mt-6">
              <button
                (click)="onCreateProject.emit()"
                class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                Créer un projet
              </button>
            </div>
          }
        </div>
      } @else {
        <!-- Liste des projets -->
        <div class="space-y-6">
          <!-- Vue grille -->
          @if (currentViewMode() === 'grid') {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              @for (project of projects; track project.id) {
                <app-project-card
                  [project]="project"
                  [canEdit]="canEditProject(project)"
                  [canDelete]="canDeleteProject(project)"
                  (onEdit)="onEditProject.emit($event)"
                  (onDelete)="onDeleteProject.emit($event)"
                  (onDuplicate)="onDuplicateProject.emit($event)"
                  (onViewDetails)="onViewDetails.emit($event)"
                  (onManageTeam)="onManageTeam.emit($event)"
                />
              }
            </div>
          }

          <!-- Vue liste -->
          @if (currentViewMode() === 'list') {
            <div class="space-y-4">
              @for (project of projects; track project.id) {
                <div class="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center space-x-3">
                        <h3 class="text-lg font-semibold text-gray-900 truncate">
                          <a [routerLink]="['/dashboard/projects', project.id]" class="hover:text-blue-600">
                            {{ project.name }}
                          </a>
                        </h3>
                        <span class="font-mono text-sm text-gray-500">{{ project.code }}</span>
                        <span
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          [ngClass]="getStatusBadgeClass(project.status)"
                        >
                          {{ PROJECT_STATUS_LABELS[project.status] }}
                        </span>
                      </div>
                      <div class="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span>{{ project.department }}</span>
                        @if (project.project_manager) {
                          <span>Chef: {{ project.project_manager.name || project.project_manager.getDisplayName() || 'N/A' }}</span>
                        }
                        <span>{{ project.progress_percentage }}% complété</span>
                      </div>
                    </div>
                    <div class="flex items-center space-x-2">
                      @if (canEditProject(project)) {
                        <button
                          (click)="onEditProject.emit(project)"
                          class="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                          title="Modifier"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                      }
                      <button
                        (click)="onViewDetails.emit(project)"
                        class="p-2 text-gray-400 hover:text-green-600 rounded-full hover:bg-green-50 transition-colors"
                        title="Voir les détails"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Vue tableau -->
          @if (currentViewMode() === 'table') {
            <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projet</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chef de projet</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progression</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Échéance</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  @for (project of projects; track project.id) {
                    <tr class="hover:bg-gray-50">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <div class="ml-0">
                            <div class="text-sm font-medium text-gray-900">
                              <a [routerLink]="['/dashboard/projects', project.id]" class="hover:text-blue-600">
                                {{ project.name }}
                              </a>
                            </div>
                            <div class="text-sm text-gray-500 font-mono">{{ project.code }} • {{ project.department }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          [ngClass]="getStatusBadgeClass(project.status)"
                        >
                          {{ PROJECT_STATUS_LABELS[project.status] }}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        @if (project.project_manager) {
                          <div class="flex items-center">
                            <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                              <span class="text-xs font-medium text-white">
                                {{ getManagerInitials(project.project_manager) }}
                              </span>
                            </div>
                            <div class="text-sm text-gray-900">
                              {{ project.project_manager.name || project.project_manager.getDisplayName() || 'N/A' }}
                            </div>
                          </div>
                        }
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              class="h-2 rounded-full"
                              [ngClass]="{
                                'bg-green-500': project.progress_percentage >= 76,
                                'bg-orange-500': project.progress_percentage >= 50 && project.progress_percentage < 76,
                                'bg-red-500': project.progress_percentage < 50
                              }"
                              [style.width.%]="project.progress_percentage"
                            ></div>
                          </div>
                          <span class="text-sm text-gray-900">{{ project.progress_percentage }}%</span>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {{ formatDate(project.planned_end_date) }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex items-center justify-end space-x-2">
                          <button
                            (click)="onViewDetails.emit(project)"
                            class="text-blue-600 hover:text-blue-900"
                            title="Voir"
                          >
                            Voir
                          </button>
                          @if (canEditProject(project)) {
                            <button
                              (click)="onEditProject.emit(project)"
                              class="text-indigo-600 hover:text-indigo-900"
                              title="Modifier"
                            >
                              Modifier
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- Pagination -->
        @if (pagination && pagination.last_page > 1) {
          <div class="bg-white px-4 py-3 border border-gray-200 rounded-lg flex items-center justify-between">
            <div class="flex-1 flex justify-between sm:hidden">
              <button
                (click)="onPageChange.emit(pagination.current_page - 1)"
                [disabled]="pagination.current_page <= 1"
                class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Précédent
              </button>
              <button
                (click)="onPageChange.emit(pagination.current_page + 1)"
                [disabled]="pagination.current_page >= pagination.last_page"
                class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
            <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p class="text-sm text-gray-700">
                  Affichage de
                  <span class="font-medium">{{ (pagination.current_page - 1) * pagination.per_page + 1 }}</span>
                  à
                  <span class="font-medium">{{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }}</span>
                  sur
                  <span class="font-medium">{{ pagination.total }}</span>
                  résultat{{ pagination.total !== 1 ? 's' : '' }}
                </p>
              </div>
              <div>
                <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    (click)="onPageChange.emit(pagination.current_page - 1)"
                    [disabled]="pagination.current_page <= 1"
                    class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                    </svg>
                  </button>

                  @for (page of getPaginationPages(); track page) {
                    @if (page === '...') {
                      <span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        ...
                      </span>
                    } @else {
                      <button
                        (click)="onPageChange.emit(+page)"
                        class="relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                        [class.bg-blue-50]="page === pagination.current_page"
                        [class.border-blue-500]="page === pagination.current_page"
                        [class.text-blue-600]="page === pagination.current_page"
                        [class.bg-white]="page !== pagination.current_page"
                        [class.border-gray-300]="page !== pagination.current_page"
                        [class.text-gray-500]="page !== pagination.current_page"
                        [class.hover:bg-gray-50]="page !== pagination.current_page"
                      >
                        {{ page }}
                      </button>
                    }
                  }

                  <button
                    (click)="onPageChange.emit(pagination.current_page + 1)"
                    [disabled]="pagination.current_page >= pagination.last_page"
                    class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `
})
export class ProjectListComponent implements OnInit {
  @Input({ required: true }) projects: Project[] = [];
  @Input() loading = false;
  @Input() title = 'Projets';
  @Input() pagination: PaginatedProjectResponse['meta'] | null = null;
  @Input() initialFilters: ProjectFilters = {};
  @Input() canEdit = (project: Project) => false;
  @Input() canDelete = (project: Project) => false;

  @Output() onFilterChange = new EventEmitter<ProjectFilters>();
  @Output() onPageChange = new EventEmitter<number>();
  @Output() onViewModeChange = new EventEmitter<ViewMode>();
  @Output() onCreateProject = new EventEmitter<void>();
  @Output() onEditProject = new EventEmitter<Project>();
  @Output() onDeleteProject = new EventEmitter<Project>();
  @Output() onDuplicateProject = new EventEmitter<Project>();
  @Output() onViewDetails = new EventEmitter<Project>();
  @Output() onManageTeam = new EventEmitter<Project>();

  // Signaux pour l'état local
  currentViewMode = signal<ViewMode>('grid');
  currentFilters: ProjectFilters = {};

  // Constantes publiques pour les templates
  PROJECT_STATUS_LABELS = PROJECT_STATUS_LABELS;
  Math = Math;

  // Options de filtres
  statusOptions = [
    { value: 'en_cours', label: 'En cours' },
    { value: 'en_attente', label: 'En attente' },
    { value: 'en_danger', label: 'En danger' },
    { value: 'termine', label: 'Terminé' },
    { value: 'annule', label: 'Annulé' }
  ];

  departmentOptions = ['IT', 'Marketing', 'Commercial', 'RH', 'Finance', 'Production'];

  // Computed properties
  totalProjects = computed(() => this.pagination?.total || this.projects.length);

  hasActiveFilters = computed(() => {
    return !!(this.currentFilters.search ||
              this.currentFilters.status ||
              this.currentFilters.department ||
              this.currentFilters.my_projects ||
              this.currentFilters.active_only);
  });

  ngOnInit(): void {
    this.currentFilters = { ...this.initialFilters };
  }

  changeViewMode(mode: ViewMode): void {
    this.currentViewMode.set(mode);
    this.onViewModeChange.emit(mode);
  }

  handleFilterChange(): void {
    this.onFilterChange.emit({ ...this.currentFilters });
  }

  canEditProject(project: Project): boolean {
    return this.canEdit(project);
  }

  canDeleteProject(project: Project): boolean {
    return this.canDelete(project);
  }

  getStatusBadgeClass(status: ProjectStatus): Record<string, boolean> {
    return {
      'bg-green-100 text-green-800': status === 'en_cours',
      'bg-orange-100 text-orange-800': status === 'en_attente',
      'bg-red-100 text-red-800': status === 'en_danger',
      'bg-blue-100 text-blue-800': status === 'termine',
      'bg-gray-100 text-gray-800': status === 'annule'
    };
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  getManagerInitials(manager: any): string {
    if (manager?.getInitials) {
      return manager.getInitials();
    }
    if (manager?.name) {
      const names = manager.name.split(' ');
      if (names.length === 1) {
        return names[0].substring(0, 2).toUpperCase();
      }
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    const first = manager?.first_name?.charAt(0).toUpperCase() || '';
    const last = manager?.last_name?.charAt(0).toUpperCase() || '';
    return first + last || 'UN';
  }

  getPaginationPages(): (number | string)[] {
    if (!this.pagination) return [];

    const current = this.pagination.current_page;
    const total = this.pagination.last_page;
    const pages: (number | string)[] = [];

    if (total <= 7) {
      // Si moins de 7 pages, afficher toutes
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Logique de pagination avec ellipses
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      } else if (current >= total - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      }
    }

    return pages;
  }
}