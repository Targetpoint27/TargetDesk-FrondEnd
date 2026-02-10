// ========================================
// PAGE TABLEAU DE BORD DES PROJETS
// Vue d'ensemble des projets avec KPIs et statistiques
// ========================================

import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import {
  Project,
  ProjectStatistics,
  ProjectFilters,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  getProgressConfig
} from '../../models/project.models';
import { ProjectsApiService } from '../../services/projects-api.service';
// import { ProjectCardComponent } from '../../components/project-card/project-card.component';

interface KPICard {
  title: string;
  value: number;
  trend?: number;
  color: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-projects-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="projects-dashboard">
      <!-- En-tête -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Tableau de bord - Projets</h1>
          <p class="mt-1 text-sm text-gray-500">
            Vue d'ensemble de vos projets et indicateurs clés
          </p>
        </div>
        <div class="flex items-center space-x-3">
          <button
            (click)="refreshData()"
            [disabled]="loading()"
            class="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <svg class="w-4 h-4 mr-2" [class.animate-spin]="loading()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Actualiser
          </button>
          <button
            (click)="createProject()"
            class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            Nouveau projet
          </button>
        </div>
      </div>

      <!-- État de chargement -->
      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="flex items-center space-x-2">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="text-gray-600">Chargement du tableau de bord...</span>
          </div>
        </div>
      } @else {
        <!-- KPIs principaux -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          @for (kpi of kpiCards(); track kpi.title) {
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-12 h-12 rounded-lg flex items-center justify-center"
                       [ngClass]="{
                         'bg-blue-100': kpi.color === 'blue',
                         'bg-green-100': kpi.color === 'green',
                         'bg-orange-100': kpi.color === 'orange',
                         'bg-red-100': kpi.color === 'red',
                         'bg-gray-100': kpi.color === 'gray'
                       }">
                    <svg class="w-6 h-6"
                         [ngClass]="{
                           'text-blue-600': kpi.color === 'blue',
                           'text-green-600': kpi.color === 'green',
                           'text-orange-600': kpi.color === 'orange',
                           'text-red-600': kpi.color === 'red',
                           'text-gray-600': kpi.color === 'gray'
                         }"
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      @if (kpi.icon === 'projects') {
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                      }
                      @if (kpi.icon === 'active') {
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                      }
                      @if (kpi.icon === 'completed') {
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      }
                      @if (kpi.icon === 'warning') {
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                      }
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">{{ kpi.title }}</dt>
                    <dd class="flex items-baseline">
                      <div class="text-2xl font-semibold text-gray-900">{{ kpi.value }}</div>
                      @if (kpi.trend !== undefined) {
                        <div class="ml-2 flex items-baseline text-sm"
                             [ngClass]="{
                               'text-green-600': kpi.trend > 0,
                               'text-red-600': kpi.trend < 0,
                               'text-gray-600': kpi.trend === 0
                             }">
                          @if (kpi.trend > 0) {
                            <svg class="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"/>
                            </svg>
                            +{{ kpi.trend }}%
                          } @else if (kpi.trend < 0) {
                            <svg class="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"/>
                            </svg>
                            {{ kpi.trend }}%
                          } @else {
                            =
                          }
                        </div>
                      }
                    </dd>
                  </dl>
                  <p class="mt-1 text-xs text-gray-500">{{ kpi.description }}</p>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Graphiques et répartitions -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <!-- Répartition par statut -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900">Projets par statut</h3>
              <button
                (click)="viewAllProjects()"
                class="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Voir tout →
              </button>
            </div>
            @if (statistics()) {
              <div class="space-y-3">
                @for (status of getStatusBreakdown(); track status.key) {
                  <div class="flex items-center justify-between">
                    <div class="flex items-center">
                      <div class="w-3 h-3 rounded-full mr-3" [ngClass]="status.colorClass"></div>
                      <span class="text-sm text-gray-700">{{ status.label }}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                      <span class="text-sm font-medium text-gray-900">{{ status.count }}</span>
                      <div class="w-16 h-2 bg-gray-200 rounded-full">
                        <div
                          class="h-2 rounded-full"
                          [ngClass]="status.colorClass"
                          [style.width.%]="status.percentage"
                        ></div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Répartition par département -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900">Projets par département</h3>
              <button
                (click)="viewStatistics()"
                class="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Détails →
              </button>
            </div>
            @if (statistics()) {
              <div class="space-y-3">
                @for (dept of getDepartmentBreakdown(); track dept.name) {
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">{{ dept.name }}</span>
                    <div class="flex items-center space-x-2">
                      <span class="text-sm font-medium text-gray-900">{{ dept.count }}</span>
                      <div class="w-16 h-2 bg-gray-200 rounded-full">
                        <div
                          class="h-2 bg-blue-500 rounded-full"
                          [style.width.%]="dept.percentage"
                        ></div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Projets récents et actions rapides -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Projets en cours -->
          <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900">Projets en cours</h3>
              <button
                (click)="viewActiveProjects()"
                class="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Voir tous →
              </button>
            </div>
            @if (recentProjects().length > 0) {
              <div class="space-y-4">
                @for (project of recentProjects().slice(0, 5); track project.id) {
                  <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center space-x-3">
                        <h4 class="text-sm font-medium text-gray-900 truncate">
                          <a [routerLink]="['/dashboard/projects/detail', project.id]" class="hover:text-blue-600">
                            {{ project.name }}
                          </a>
                        </h4>
                        <span
                          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          [ngClass]="getStatusBadgeClass(project.status)"
                        >
                          {{ PROJECT_STATUS_LABELS[project.status] }}
                        </span>
                      </div>
                      <div class="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                        <span class="font-mono">{{ project.code }}</span>
                        <span>{{ project.department }}</span>
                        @if (project.project_manager) {
                          <span>{{ project.project_manager.name || project.project_manager.getDisplayName?.() || 'N/A' }}</span>
                        }
                      </div>
                    </div>
                    <div class="flex items-center space-x-3">
                      <!-- Progression -->
                      <div class="flex items-center space-x-2">
                        <div class="w-12 bg-gray-200 rounded-full h-1.5">
                          <div
                            class="h-1.5 rounded-full"
                            [ngClass]="{
                              'bg-green-500': project.progress_percentage >= 76,
                              'bg-orange-500': project.progress_percentage >= 50 && project.progress_percentage < 76,
                              'bg-red-500': project.progress_percentage < 50
                            }"
                            [style.width.%]="project.progress_percentage"
                          ></div>
                        </div>
                        <span class="text-xs text-gray-600 w-8 text-right">{{ project.progress_percentage }}%</span>
                      </div>
                      <!-- Actions -->
                      <button
                        (click)="viewProject(project.id)"
                        class="p-1 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                        title="Voir le projet"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="text-center py-8">
                <div class="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                  </svg>
                </div>
                <h4 class="text-sm font-medium text-gray-900">Aucun projet en cours</h4>
                <p class="text-sm text-gray-500 mt-1">Créez votre premier projet pour commencer</p>
              </div>
            }
          </div>

          <!-- Actions rapides -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Actions rapides</h3>
            <div class="space-y-3">
              <button
                (click)="createProject()"
                class="w-full flex items-center justify-start p-3 text-left border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors group"
              >
                <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                  <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                  </svg>
                </div>
                <div class="text-left">
                  <div class="text-sm font-medium text-gray-900">Nouveau projet</div>
                  <div class="text-xs text-gray-500">Créer un nouveau projet</div>
                </div>
              </button>

              <button
                (click)="viewMyProjects()"
                class="w-full flex items-center justify-start p-3 text-left border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors group"
              >
                <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-green-200 transition-colors">
                  <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <div class="text-left">
                  <div class="text-sm font-medium text-gray-900">Mes projets</div>
                  <div class="text-xs text-gray-500">Projets dont je suis responsable</div>
                </div>
              </button>

              <button
                (click)="viewStatistics()"
                class="w-full flex items-center justify-start p-3 text-left border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors group"
              >
                <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-purple-200 transition-colors">
                  <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                </div>
                <div class="text-left">
                  <div class="text-sm font-medium text-gray-900">Statistiques</div>
                  <div class="text-xs text-gray-500">Rapports détaillés</div>
                </div>
              </button>
            </div>

            <!-- Alertes importantes -->
            @if (statistics() && statistics()!.at_risk_projects > 0) {
              <div class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div class="flex items-start">
                  <svg class="h-5 w-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                  </svg>
                  <div class="ml-3">
                    <h4 class="text-sm font-medium text-red-800">Projets à risque</h4>
                    <p class="text-sm text-red-700 mt-1">
                      {{ statistics()!.at_risk_projects }} projet{{ statistics()!.at_risk_projects > 1 ? 's' : '' }} nécessite{{ statistics()!.at_risk_projects > 1 ? 'nt' : '' }} votre attention
                    </p>
                    <button
                      (click)="viewRiskProjects()"
                      class="mt-2 text-sm text-red-800 font-medium hover:text-red-900 underline"
                    >
                      Voir les projets à risque
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class ProjectsDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Signaux pour l'état du composant
  loading = signal(true);
  statistics = signal<ProjectStatistics | null>(null);
  recentProjects = signal<Project[]>([]);
  departmentProjects = signal<Project[]>([]);
  error = signal<string>('');

  // Constantes pour les templates
  PROJECT_STATUS_LABELS = PROJECT_STATUS_LABELS;

  // KPIs calculés
  kpiCards = computed(() => {
    const stats = this.statistics();
    if (!stats) return [];

    return [
      {
        title: 'Total projets',
        value: stats.total_projects,
        color: 'blue',
        icon: 'projects',
        description: 'Tous les projets',
        trend: 0
      },
      {
        title: 'Projets actifs',
        value: stats.active_projects,
        color: 'green',
        icon: 'active',
        description: 'En cours de réalisation',
        trend: 0
      },
      {
        title: 'Projets terminés',
        value: stats.completed_projects,
        color: 'gray',
        icon: 'completed',
        description: 'Livrés avec succès',
        trend: 0
      },
      {
        title: 'Projets à risque',
        value: stats.at_risk_projects,
        color: 'red',
        icon: 'warning',
        description: 'Nécessitent une attention',
        trend: 0
      }
    ];
  });

  constructor(
    private projectsApiService: ProjectsApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.loading.set(true);
    this.error.set('');

    // Charger en parallèle les statistiques et les projets récents
    forkJoin({
      statistics: this.projectsApiService.getProjectStatistics(),
      recentProjects: this.projectsApiService.getProjects({ active_only: true }, 1, 10),
      departmentProjects: this.projectsApiService.getProjects({ department: 'Développement', status: 'en_cours' }, 1, 5)
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.statistics.set(data.statistics.data || null);
        this.recentProjects.set(data.recentProjects.data || []);
        this.departmentProjects.set(data.departmentProjects.data || []);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(error.message || 'Erreur lors du chargement du tableau de bord');
        this.loading.set(false);
      }
    });
  }

  refreshData(): void {
    this.loadDashboardData();
  }

  getStatusBreakdown() {
    const stats = this.statistics();
    if (!stats) return [];

    const total = stats.total_projects;
    const statusData = stats.projects_by_status;

    return Object.entries(statusData).map(([status, count]) => ({
      key: status,
      label: PROJECT_STATUS_LABELS[status as keyof typeof PROJECT_STATUS_LABELS] || status,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
      colorClass: this.getStatusColorClass(status)
    }));
  }

  getDepartmentBreakdown() {
    const stats = this.statistics();
    if (!stats) return [];

    const total = stats.total_projects;
    const deptData = stats.projects_by_department;

    return Object.entries(deptData)
      .map(([name, count]) => ({
        name,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6); // Top 6 départements
  }

  getStatusBadgeClass(status: string): Record<string, boolean> {
    return {
      'bg-green-100 text-green-800': status === 'en_cours',
      'bg-orange-100 text-orange-800': status === 'en_attente',
      'bg-red-100 text-red-800': status === 'en_danger',
      'bg-blue-100 text-blue-800': status === 'termine',
      'bg-gray-100 text-gray-800': status === 'annule'
    };
  }

  private getStatusColorClass(status: string): string {
    const colorMap: Record<string, string> = {
      'en_cours': 'bg-green-500',
      'en_attente': 'bg-orange-500',
      'en_danger': 'bg-red-500',
      'termine': 'bg-blue-500',
      'annule': 'bg-gray-500'
    };
    return colorMap[status] || 'bg-gray-500';
  }

  // Navigation methods
  createProject(): void {
    this.router.navigate(['/dashboard/projects/create']);
  }

  viewProject(projectId: number): void {
    this.router.navigate(['/dashboard/projects/detail', projectId]);
  }

  viewAllProjects(): void {
    this.router.navigate(['/dashboard/projects/list']);
  }

  viewActiveProjects(): void {
    this.router.navigate(['/dashboard/projects/list'], {
      queryParams: { status: 'en_cours' }
    });
  }

  viewMyProjects(): void {
    this.router.navigate(['/dashboard/projects/my-projects']);
  }

  viewStatistics(): void {
    this.router.navigate(['/dashboard/projects/statistics']);
  }

  viewRiskProjects(): void {
    this.router.navigate(['/dashboard/projects/list'], {
      queryParams: { status: 'en_danger' }
    });
  }
}