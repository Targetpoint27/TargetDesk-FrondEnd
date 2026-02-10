// ========================================
// COMPOSANT HISTORIQUE DU TEMPS
// Page d'historique complet avec filtres avancés
// ========================================

import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { TimeEntry, TimeFilters, PaginatedResponse } from '../../models/time-tracking.models';
import { TimeTrackingApiService } from '../../services/time-tracking-api.service';
import { LoggingService } from '../../../../core/logging/logging.service';

@Component({
  selector: 'app-time-history',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <!-- En-tête -->
      <div class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Historique du Temps
              </h1>
              <p class="mt-2 text-sm text-gray-600">
                Consultez et gérez tout votre historique de temps
              </p>
            </div>

            <div class="flex space-x-3">
              <button
                (click)="exportToCSV()"
                class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                Exporter CSV
              </button>

              <a
                routerLink="/time-tracking"
                class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-colors"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                </svg>
                Retour au dashboard
              </a>
            </div>
          </div>

          <!-- Filtres -->
          <div class="mt-6">
            <form [formGroup]="filtersForm" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label for="search" class="block text-sm font-medium text-gray-700 mb-1">
                  Recherche
                </label>
                <input
                  type="text"
                  id="search"
                  formControlName="search"
                  placeholder="Tâche, description..."
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label for="start_date" class="block text-sm font-medium text-gray-700 mb-1">
                  Date de début
                </label>
                <input
                  type="date"
                  id="start_date"
                  formControlName="start_date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label for="end_date" class="block text-sm font-medium text-gray-700 mb-1">
                  Date de fin
                </label>
                <input
                  type="date"
                  id="end_date"
                  formControlName="end_date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label for="task_id" class="block text-sm font-medium text-gray-700 mb-1">
                  Tâche
                </label>
                <select
                  id="task_id"
                  formControlName="task_id"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Toutes les tâches</option>
                  <option *ngFor="let task of availableTasks()" [value]="task.id">
                    {{ task.title }}
                  </option>
                </select>
              </div>
            </form>

            <!-- Actions rapides -->
            <div class="mt-4 flex flex-wrap gap-2">
              <button
                (click)="setQuickFilter('today')"
                class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
              >
                Aujourd'hui
              </button>
              <button
                (click)="setQuickFilter('yesterday')"
                class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              >
                Hier
              </button>
              <button
                (click)="setQuickFilter('this_week')"
                class="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
              >
                Cette semaine
              </button>
              <button
                (click)="setQuickFilter('last_week')"
                class="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
              >
                Semaine dernière
              </button>
              <button
                (click)="setQuickFilter('this_month')"
                class="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 transition-colors"
              >
                Ce mois
              </button>
              <button
                (click)="clearFilters()"
                class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
              >
                Effacer
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Contenu -->
      <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

        <!-- Résumé -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center">
              <div class="p-2 bg-blue-100 rounded-lg">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Temps total</p>
                <p class="text-2xl font-bold text-gray-900">{{ formatDuration(summary().total_hours) }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center">
              <div class="p-2 bg-green-100 rounded-lg">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Entrées</p>
                <p class="text-2xl font-bold text-gray-900">{{ summary().total_entries }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center">
              <div class="p-2 bg-purple-100 rounded-lg">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Moyenne/jour</p>
                <p class="text-2xl font-bold text-gray-900">{{ formatDuration(summary().average_per_day) }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center">
              <div class="p-2 bg-orange-100 rounded-lg">
                <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Tâches</p>
                <p class="text-2xl font-bold text-gray-900">{{ summary().unique_tasks }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Messages d'état -->
        <div *ngIf="isLoading()" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>

        <div *ngIf="error()" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Erreur</h3>
              <p class="mt-1 text-sm text-red-700">{{ error() }}</p>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div *ngIf="!isLoading() && !error()" class="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tâche
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durée
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" class="relative px-6 py-3">
                    <span class="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr *ngIf="timeEntries().length === 0">
                  <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                    Aucune entrée de temps trouvée pour les critères sélectionnés
                  </td>
                </tr>

                <tr *ngFor="let entry of timeEntries()" class="hover:bg-gray-50 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ formatDate(entry.date) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div>
                        <div class="text-sm font-medium text-gray-900">{{ entry.task?.title }}</div>
                        <div class="text-sm text-gray-500">{{ entry.task?.code }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-500 max-w-xs">
                    <div class="truncate" [title]="entry.description">
                      {{ entry.description || '-' }}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {{ formatDuration(entry.duration) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          [ngClass]="getTypeClasses(entry.type)">
                      {{ getTypeLabel(entry.type) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex items-center justify-end space-x-2">
                      <button
                        (click)="editEntry(entry)"
                        class="text-blue-600 hover:text-blue-900 transition-colors"
                        title="Modifier"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      <button
                        (click)="deleteEntry(entry)"
                        class="text-red-600 hover:text-red-900 transition-colors"
                        title="Supprimer"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div *ngIf="pagination() && pagination()!.last_page > 1" class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div class="flex-1 flex justify-between sm:hidden">
              <button
                (click)="goToPage(pagination()!.current_page - 1)"
                [disabled]="pagination()!.current_page <= 1"
                class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Précédent
              </button>
              <button
                (click)="goToPage(pagination()!.current_page + 1)"
                [disabled]="pagination()!.current_page >= pagination()!.last_page"
                class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
            <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p class="text-sm text-gray-700">
                  Affichage de <span class="font-medium">{{ getDisplayRange().start }}</span> à <span class="font-medium">{{ getDisplayRange().end }}</span> sur <span class="font-medium">{{ pagination()!.total }}</span> résultats
                </p>
              </div>
              <div>
                <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    (click)="goToPage(pagination()!.current_page - 1)"
                    [disabled]="pagination()!.current_page <= 1"
                    class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span class="sr-only">Précédent</span>
                    <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                  </button>

                  <span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    {{ pagination()!.current_page }} / {{ pagination()!.last_page }}
                  </span>

                  <button
                    (click)="goToPage(pagination()!.current_page + 1)"
                    [disabled]="pagination()!.current_page >= pagination()!.last_page"
                    class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span class="sr-only">Suivant</span>
                    <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TimeHistoryComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private timeTrackingService = inject(TimeTrackingApiService);
  private loggingService = inject(LoggingService);
  private fb = inject(FormBuilder);

  // État du composant
  timeEntries = signal<TimeEntry[]>([]);
  availableTasks = signal<any[]>([]);
  pagination = signal<any>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Résumé
  summary = signal<any>({
    total_hours: 0,
    total_entries: 0,
    average_per_day: 0,
    unique_tasks: 0
  });

  // Formulaire de filtres
  filtersForm: FormGroup;

  constructor() {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    this.filtersForm = this.fb.group({
      search: [''],
      start_date: [weekStart.toISOString().split('T')[0]],
      end_date: [today],
      task_id: ['']
    });
  }

  ngOnInit(): void {
    this.setupFiltersSubscription();
    this.loadTimeEntries();
    this.loadTasks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFiltersSubscription(): void {
    this.filtersForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.loadTimeEntries();
      });
  }

  private loadTimeEntries(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const filters: TimeFilters = {
      page: 1,
      per_page: 50,
      ...this.filtersForm.value
    };

    // Filtrer les valeurs vides
    Object.keys(filters).forEach(key => {
      if (!filters[key as keyof TimeFilters]) {
        delete filters[key as keyof TimeFilters];
      }
    });

    this.timeTrackingService.getTimeEntries(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.timeEntries.set(response.data);
          this.pagination.set(response.meta);
          this.calculateSummary(response.data);
          this.isLoading.set(false);

          this.loggingService.debug('Time entries loaded successfully', {
            component: 'TimeHistoryComponent',
            action: 'loadTimeEntries',
            data: { count: response.data.length, filters }
          });
        },
        error: (error) => {
          this.error.set('Erreur lors du chargement des entrées');
          this.isLoading.set(false);

          this.loggingService.error('Failed to load time entries', {
            component: 'TimeHistoryComponent',
            action: 'loadTimeEntries',
            data: { error: error.message, filters }
          });
        }
      });
  }

  private loadTasks(): void {
    // Charger les tâches pour le filtre
    // Note: Adaptez selon votre service de tâches
  }

  private calculateSummary(entries: TimeEntry[]): void {
    const totalHours = entries.reduce((sum, entry) => sum + entry.duration, 0);
    const uniqueTasks = new Set(entries.map(entry => entry.task_id)).size;

    // Calculer la moyenne par jour basée sur la plage de dates
    const startDate = this.filtersForm.value.start_date;
    const endDate = this.filtersForm.value.end_date;
    let daysDiff = 1;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      daysDiff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }

    this.summary.set({
      total_hours: totalHours,
      total_entries: entries.length,
      average_per_day: totalHours / daysDiff,
      unique_tasks: uniqueTasks
    });
  }

  setQuickFilter(period: string): void {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let startDate = '';
    let endDate = today.toISOString().split('T')[0];

    switch (period) {
      case 'today':
        startDate = today.toISOString().split('T')[0];
        break;
      case 'yesterday':
        startDate = yesterday.toISOString().split('T')[0];
        endDate = yesterday.toISOString().split('T')[0];
        break;
      case 'this_week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        startDate = weekStart.toISOString().split('T')[0];
        break;
      case 'last_week':
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        startDate = lastWeekStart.toISOString().split('T')[0];
        endDate = lastWeekEnd.toISOString().split('T')[0];
        break;
      case 'this_month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        break;
    }

    this.filtersForm.patchValue({
      start_date: startDate,
      end_date: endDate
    });
  }

  clearFilters(): void {
    this.filtersForm.reset({
      search: '',
      start_date: '',
      end_date: '',
      task_id: ''
    });
  }

  goToPage(page: number): void {
    const filters: TimeFilters = {
      page: page,
      per_page: 50,
      ...this.filtersForm.value
    };

    this.timeTrackingService.getTimeEntries(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.timeEntries.set(response.data);
          this.pagination.set(response.meta);
        },
        error: (error) => {
          this.error.set('Erreur lors du chargement de la page');
        }
      });
  }

  exportToCSV(): void {
    // Implémenter l'export CSV
    this.loggingService.info('CSV export requested', {
      component: 'TimeHistoryComponent',
      action: 'exportToCSV',
      data: { filters: this.filtersForm.value }
    });
  }

  editEntry(entry: TimeEntry): void {
    // Implémenter l'édition d'entrée
    this.loggingService.info('Edit entry requested', {
      component: 'TimeHistoryComponent',
      action: 'editEntry',
      data: { entryId: entry.id }
    });
  }

  deleteEntry(entry: TimeEntry): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) {
      this.timeTrackingService.deleteTimeEntry(entry.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.timeEntries.update(entries => entries.filter(e => e.id !== entry.id));
            this.calculateSummary(this.timeEntries());

            this.loggingService.info('Entry deleted successfully', {
              component: 'TimeHistoryComponent',
              action: 'deleteEntry',
              data: { entryId: entry.id }
            });
          },
          error: (error) => {
            this.loggingService.error('Failed to delete entry', {
              component: 'TimeHistoryComponent',
              action: 'deleteEntry',
              data: { error: error.message, entryId: entry.id }
            });
          }
        });
    }
  }

  // Utility functions
  formatDuration(hours: number): string {
    const totalMinutes = Math.floor(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (h === 0) {
      return `${m}min`;
    } else if (m === 0) {
      return `${h}h`;
    } else {
      return `${h}h ${m}min`;
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return "Aujourd'hui";
    } else if (date.getTime() === yesterday.getTime()) {
      return "Hier";
    } else {
      return date.toLocaleDateString('fr-FR');
    }
  }

  getTypeClasses(type: string): string {
    const classes: Record<string, string> = {
      'manual': 'bg-blue-100 text-blue-800',
      'timer': 'bg-green-100 text-green-800',
      'import': 'bg-purple-100 text-purple-800'
    };
    return classes[type] || 'bg-gray-100 text-gray-800';
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'manual': 'Manuel',
      'timer': 'Timer',
      'import': 'Importé'
    };
    return labels[type] || type;
  }

  getDisplayRange(): { start: number; end: number } {
    const meta = this.pagination();
    if (!meta) return { start: 0, end: 0 };

    const start = (meta.current_page - 1) * meta.per_page + 1;
    const end = Math.min(meta.current_page * meta.per_page, meta.total);
    return { start, end };
  }
}