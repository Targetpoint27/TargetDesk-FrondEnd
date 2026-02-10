// ========================================
// PAGE STATISTIQUES DES PROJETS
// Rapports détaillés et visualisations des projets
// ========================================

import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import {
  ProjectStatistics,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS
} from '../../models/project.models';
import { ProjectsApiService } from '../../services/projects-api.service';

@Component({
  selector: 'app-projects-statistics',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="projects-statistics-page">
      <!-- En-tête -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Statistiques des projets</h1>
          <p class="mt-1 text-sm text-gray-500">
            Analyses détaillées et indicateurs de performance
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
            (click)="exportData()"
            [disabled]="!statistics()"
            class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Exporter
          </button>
        </div>
      </div>

      <!-- Navigation breadcrumb -->
      <nav class="mb-6">
        <ol class="flex items-center space-x-2 text-sm text-gray-500">
          <li>
            <a routerLink="/dashboard/projects/dashboard" class="hover:text-gray-700">Projets</a>
          </li>
          <li class="flex items-center">
            <svg class="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
            <span class="text-gray-900 font-medium">Statistiques</span>
          </li>
        </ol>
      </nav>

      <!-- État de chargement -->
      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="flex items-center space-x-2">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="text-gray-600">Chargement des statistiques...</span>
          </div>
        </div>
      } @else if (error()) {
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex">
            <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div class="ml-3">
              <p class="text-sm text-red-800">{{ error() }}</p>
            </div>
          </div>
        </div>
      } @else if (statistics()) {
        <!-- Métriques principales -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="flex items-center">
              <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <div class="ml-5">
                <h3 class="text-sm font-medium text-gray-500">Total projets</h3>
                <div class="text-2xl font-bold text-gray-900">{{ statistics()!.total_projects }}</div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="flex items-center">
              <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              </div>
              <div class="ml-5">
                <h3 class="text-sm font-medium text-gray-500">Projets actifs</h3>
                <div class="text-2xl font-bold text-gray-900">{{ statistics()!.active_projects }}</div>
                <div class="text-sm text-green-600">
                  {{ getPercentage(statistics()!.active_projects, statistics()!.total_projects) }}% du total
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="flex items-center">
              <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div class="ml-5">
                <h3 class="text-sm font-medium text-gray-500">Projets terminés</h3>
                <div class="text-2xl font-bold text-gray-900">{{ statistics()!.completed_projects }}</div>
                <div class="text-sm text-gray-600">
                  {{ getPercentage(statistics()!.completed_projects, statistics()!.total_projects) }}% du total
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="flex items-center">
              <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <div class="ml-5">
                <h3 class="text-sm font-medium text-gray-500">Progression moyenne</h3>
                <div class="text-2xl font-bold text-gray-900">{{ Math.round(statistics()!.average_progress) }}%</div>
                <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    class="bg-orange-500 h-2 rounded-full transition-all duration-300"
                    [style.width.%]="statistics()!.average_progress"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Graphiques de répartition -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <!-- Répartition par statut -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-6">Répartition par statut</h3>
            <div class="space-y-4">
              @for (status of getStatusBreakdown(); track status.key) {
                <div class="flex items-center justify-between">
                  <div class="flex items-center flex-1">
                    <div class="w-4 h-4 rounded-full mr-3" [ngClass]="status.colorClass"></div>
                    <span class="text-sm text-gray-700 flex-1">{{ status.label }}</span>
                    <span class="text-sm font-medium text-gray-900 mr-4">{{ status.count }}</span>
                  </div>
                  <div class="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      class="h-2 rounded-full transition-all duration-300"
                      [ngClass]="status.colorClass"
                      [style.width.%]="status.percentage"
                    ></div>
                  </div>
                  <span class="text-xs text-gray-500 ml-2 w-10 text-right">{{ Math.round(status.percentage) }}%</span>
                </div>
              }
            </div>
          </div>

          <!-- Répartition par département -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-6">Répartition par département</h3>
            <div class="space-y-4">
              @for (dept of getDepartmentBreakdown(); track dept.name) {
                <div class="flex items-center justify-between">
                  <div class="flex items-center flex-1">
                    <span class="text-sm text-gray-700 flex-1">{{ dept.name }}</span>
                    <span class="text-sm font-medium text-gray-900 mr-4">{{ dept.count }}</span>
                  </div>
                  <div class="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      [style.width.%]="dept.percentage"
                    ></div>
                  </div>
                  <span class="text-xs text-gray-500 ml-2 w-10 text-right">{{ Math.round(dept.percentage) }}%</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Alertes et recommandations -->
        @if (statistics()!.at_risk_projects > 0) {
          <div class="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <div class="flex items-start">
              <svg class="h-6 w-6 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
              <div class="ml-4">
                <h3 class="text-lg font-medium text-red-800">Projets nécessitant une attention</h3>
                <p class="text-red-700 mt-1">
                  {{ statistics()!.at_risk_projects }} projet{{ statistics()!.at_risk_projects > 1 ? 's sont' : ' est' }} actuellement
                  {{ statistics()!.at_risk_projects > 1 ? 'classés' : 'classé' }} comme à risque et
                  {{ statistics()!.at_risk_projects > 1 ? 'nécessitent' : 'nécessite' }} une intervention.
                </p>
                <div class="mt-4">
                  <button
                    (click)="viewRiskProjects()"
                    class="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Voir les projets à risque
                    <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Données détaillées -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-medium text-gray-900">Données détaillées</h3>
            <button
              (click)="exportDetailedData()"
              class="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Exporter les détails →
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full">
              <tbody class="divide-y divide-gray-200">
                <tr>
                  <td class="px-0 py-4 text-sm font-medium text-gray-900">Total des projets</td>
                  <td class="px-6 py-4 text-sm text-gray-500">{{ statistics()!.total_projects }}</td>
                </tr>
                <tr>
                  <td class="px-0 py-4 text-sm font-medium text-gray-900">Projets actifs</td>
                  <td class="px-6 py-4 text-sm text-gray-500">{{ statistics()!.active_projects }}</td>
                </tr>
                <tr>
                  <td class="px-0 py-4 text-sm font-medium text-gray-900">Projets terminés</td>
                  <td class="px-6 py-4 text-sm text-gray-500">{{ statistics()!.completed_projects }}</td>
                </tr>
                <tr>
                  <td class="px-0 py-4 text-sm font-medium text-gray-900">Projets annulés</td>
                  <td class="px-6 py-4 text-sm text-gray-500">{{ statistics()!.cancelled_projects }}</td>
                </tr>
                <tr>
                  <td class="px-0 py-4 text-sm font-medium text-gray-900">Taux de réussite</td>
                  <td class="px-6 py-4 text-sm text-gray-500">
                    {{ getSuccessRate() }}%
                  </td>
                </tr>
                <tr>
                  <td class="px-0 py-4 text-sm font-medium text-gray-900">Progression moyenne</td>
                  <td class="px-6 py-4 text-sm text-gray-500">{{ Math.round(statistics()!.average_progress) }}%</td>
                </tr>
                <tr>
                  <td class="px-0 py-4 text-sm font-medium text-gray-900">Projets à risque</td>
                  <td class="px-6 py-4 text-sm text-red-600 font-medium">{{ statistics()!.at_risk_projects }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      } @else {
        <div class="text-center py-12">
          <div class="mx-auto h-12 w-12 text-gray-400 mb-4">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900">Aucune donnée disponible</h3>
          <p class="text-gray-500 mt-1">Les statistiques ne peuvent pas être chargées pour le moment.</p>
        </div>
      }
    </div>
  `
})
export class ProjectsStatisticsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Signaux pour l'état du composant
  statistics = signal<ProjectStatistics | null>(null);
  loading = signal(true);
  error = signal('');

  // Constantes pour les templates
  PROJECT_STATUS_LABELS = PROJECT_STATUS_LABELS;
  Math = Math;

  constructor(
    private projectsApiService: ProjectsApiService
  ) {}

  ngOnInit(): void {
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadStatistics(): void {
    this.loading.set(true);
    this.error.set('');

    this.projectsApiService.getProjectStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.statistics.set(response.data || null);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.message || 'Erreur lors du chargement des statistiques');
          this.loading.set(false);
        }
      });
  }

  refreshData(): void {
    this.loadStatistics();
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
      .sort((a, b) => b.count - a.count);
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

  getPercentage(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  getSuccessRate(): number {
    const stats = this.statistics();
    if (!stats) return 0;

    const completed = stats.completed_projects;
    const total = stats.total_projects - stats.cancelled_projects; // Exclure les annulés

    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  exportData(): void {
    const stats = this.statistics();
    if (!stats) return;

    const data = {
      timestamp: new Date().toISOString(),
      statistics: stats
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-statistics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportDetailedData(): void {
    // Simuler l'export de données détaillées
    alert('Fonctionnalité d\'export détaillé en cours de développement');
  }

  viewRiskProjects(): void {
    // Navigation vers la liste filtrée des projets à risque
    window.location.href = '/dashboard/projects/list?status=en_danger';
  }
}