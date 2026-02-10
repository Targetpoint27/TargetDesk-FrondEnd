// ========================================
// COMPOSANT NOTIFICATIONS PRINCIPAL
// Interface complète de gestion des notifications
// ========================================

import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, interval } from 'rxjs';

import {
  Notification,
  NotificationFilters,
  NotificationPreferences,
  NotificationType,
  NotificationPriority,
  NotificationChannel
} from '../../models/notification.models';
import { NotificationsApiService } from '../../services/notifications-api.service';
import { LoggingService } from '../../../../core/logging/logging.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <!-- En-tête -->
      <div class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Notifications
              </h1>
              <p class="mt-2 text-sm text-gray-600">
                Gérez et suivez toutes vos notifications
              </p>
            </div>

            <!-- Statistiques rapides -->
            <div class="mt-6 lg:mt-0 flex flex-wrap gap-4">
              <div class="bg-gradient-to-r from-red-500 to-red-600 rounded-lg px-4 py-3 text-white shadow-sm">
                <div class="text-xs font-medium opacity-90">Non lues</div>
                <div class="text-lg font-bold">{{ notificationStats().unread }}</div>
              </div>
              <div class="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg px-4 py-3 text-white shadow-sm">
                <div class="text-xs font-medium opacity-90">Importantes</div>
                <div class="text-lg font-bold">{{ notificationStats().important }}</div>
              </div>
              <div class="bg-gradient-to-r from-green-500 to-green-600 rounded-lg px-4 py-3 text-white shadow-sm">
                <div class="text-xs font-medium opacity-90">Aujourd'hui</div>
                <div class="text-lg font-bold">{{ notificationStats().today }}</div>
              </div>
            </div>
          </div>

          <!-- Filtres et actions -->
          <div class="mt-6 flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <!-- Filtres -->
            <form [formGroup]="filtersForm" class="flex flex-wrap gap-3">
              <select formControlName="status" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="">Tous les statuts</option>
                <option value="unread">Non lues</option>
                <option value="read">Lues</option>
              </select>

              <select formControlName="type" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="">Tous les types</option>
                <option value="task_assigned">Tâche assignée</option>
                <option value="task_due">Échéance tâche</option>
                <option value="task_comment">Commentaire</option>
                <option value="project_update">Mise à jour projet</option>
                <option value="system">Système</option>
              </select>

              <select formControlName="priority" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="">Toutes les priorités</option>
                <option value="low">Basse</option>
                <option value="normal">Normale</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </select>
            </form>

            <!-- Actions globales -->
            <div class="flex space-x-3">
              <button
                (click)="markAllAsRead()"
                [disabled]="getUnreadCount() === 0"
                class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Tout marquer comme lu
              </button>

              <button
                (click)="openPreferences()"
                class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                Préférences
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

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
              <button
                (click)="loadNotificationsPublic()"
                class="mt-2 text-sm text-red-800 hover:text-red-900 font-medium underline"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>

        <!-- Liste des notifications -->
        <div *ngIf="!isLoading() && !error()" class="space-y-3">
          <!-- Message si aucune notification -->
          <div *ngIf="filteredNotifications().length === 0" class="text-center py-12">
            <div class="mx-auto h-12 w-12 text-gray-400 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M15 17h5l-5 5v-5zM4.828 7l6.586 6.586a2 2 0 002.828 0L20.828 7"/>
              </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Aucune notification</h3>
            <p class="text-gray-500">Aucune notification ne correspond à vos critères.</p>
          </div>

          <!-- Cartes des notifications -->
          <div *ngIf="filteredNotifications().length > 0" class="space-y-3">
            <div
              *ngFor="let notification of filteredNotifications()"
              class="bg-white rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md cursor-pointer"
              [ngClass]="{
                'border-gray-200': notification.read_at,
                'border-l-4 border-l-blue-500 border-gray-200': !notification.read_at
              }"
              (click)="markAsRead(notification)"
            >
              <div class="p-6">
                <div class="flex items-start justify-between">
                  <!-- Contenu principal -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-3 mb-2">
                      <!-- Icône du type -->
                      <div class="flex-shrink-0">
                        <div class="p-2 rounded-lg" [ngClass]="getTypeIconClasses(notification.type)">
                          <ng-container [ngSwitch]="notification.type">
                            <svg *ngSwitchCase="'task_assigned'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                            <svg *ngSwitchCase="'task_due'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <svg *ngSwitchCase="'task_comment'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                            </svg>
                            <svg *ngSwitchDefault class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM4.828 7l6.586 6.586a2 2 0 002.828 0L20.828 7"/>
                            </svg>
                          </ng-container>
                        </div>
                      </div>

                      <!-- Badges -->
                      <div class="flex items-center gap-2">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              [ngClass]="getTypeClasses(notification.type)">
                          {{ getTypeLabel(notification.type) }}
                        </span>

                        <span *ngIf="notification.priority !== 'normal'"
                              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              [ngClass]="getPriorityClasses(notification.priority)">
                          {{ getPriorityLabel(notification.priority) }}
                        </span>

                        <span *ngIf="!notification.read_at"
                              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Non lu
                        </span>
                      </div>
                    </div>

                    <!-- Titre et message -->
                    <h3 class="text-lg font-semibold text-gray-900 mb-2" [ngClass]="{ 'font-bold': !notification.read_at }">
                      {{ notification.title }}
                    </h3>

                    <p class="text-gray-600 text-sm mb-3 leading-relaxed">
                      {{ notification.message }}
                    </p>

                    <!-- Métadonnées -->
                    <div class="flex items-center text-sm text-gray-500 space-x-4">
                      <span class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        {{ formatDate(notification.created_at) }}
                      </span>

                      <span *ngIf="notification.channels?.length" class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h4a1 1 0 011 1v2M7 4h10l1 14H6L7 4z"/>
                        </svg>
                        {{ notification.channels?.join(', ') || 'N/A' }}
                      </span>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="flex items-start space-x-2 ml-4">
                    <button
                      *ngIf="!notification.read_at"
                      (click)="markAsRead(notification); $event.stopPropagation()"
                      class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Marquer comme lu"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </button>

                    <button
                      (click)="deleteNotification(notification); $event.stopPropagation()"
                      class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Actions liées -->
                <div *ngIf="notification.data?.action_url" class="mt-4 pt-4 border-t border-gray-100">
                  <a
                    [href]="notification.data.action_url"
                    class="inline-flex items-center text-sm text-blue-600 hover:text-blue-500 font-medium"
                    (click)="$event.stopPropagation()"
                  >
                    {{ getActionLabel(notification.type) }}
                    <svg class="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div *ngIf="pagination() && pagination()!.last_page > 1" class="mt-8 flex items-center justify-between">
            <div class="text-sm text-gray-700">
              Affichage de {{ getDisplayRange().start }} à {{ getDisplayRange().end }} sur {{ pagination()!.total }} notifications
            </div>
            <div class="flex space-x-2">
              <button
                (click)="goToPage(pagination()!.current_page - 1)"
                [disabled]="pagination()!.current_page <= 1"
                class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Précédent
              </button>

              <span class="px-4 py-2 text-sm font-medium text-gray-700">
                Page {{ pagination()!.current_page }} sur {{ pagination()!.last_page }}
              </span>

              <button
                (click)="goToPage(pagination()!.current_page + 1)"
                [disabled]="pagination()!.current_page >= pagination()!.last_page"
                class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal des préférences -->
      <div *ngIf="showPreferences()" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" (click)="closePreferences()"></div>

          <div class="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Préférences de notifications</h3>

              <form [formGroup]="preferencesForm" class="space-y-4">
                <div>
                  <label class="text-sm font-medium text-gray-700">Canaux de notification</label>
                  <div class="mt-2 space-y-2">
                    <div class="flex items-center">
                      <input type="checkbox" formControlName="email_enabled" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                      <label class="ml-2 text-sm text-gray-600">Email</label>
                    </div>
                    <div class="flex items-center">
                      <input type="checkbox" formControlName="in_app_enabled" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                      <label class="ml-2 text-sm text-gray-600">Application</label>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="text-sm font-medium text-gray-700">Types de notifications</label>
                  <div class="mt-2 space-y-2">
                    <div class="flex items-center">
                      <input type="checkbox" formControlName="task_notifications" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                      <label class="ml-2 text-sm text-gray-600">Notifications de tâches</label>
                    </div>
                    <div class="flex items-center">
                      <input type="checkbox" formControlName="project_notifications" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                      <label class="ml-2 text-sm text-gray-600">Notifications de projets</label>
                    </div>
                    <div class="flex items-center">
                      <input type="checkbox" formControlName="system_notifications" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                      <label class="ml-2 text-sm text-gray-600">Notifications système</label>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="button"
                (click)="savePreferences()"
                [disabled]="isSavingPreferences()"
                class="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto disabled:opacity-50"
              >
                {{ isSavingPreferences() ? 'Sauvegarde...' : 'Sauvegarder' }}
              </button>
              <button
                type="button"
                (click)="closePreferences()"
                class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private notificationsService = inject(NotificationsApiService);
  private loggingService = inject(LoggingService);
  private fb = inject(FormBuilder);

  // État du composant
  notifications = signal<Notification[]>([]);
  pagination = signal<any>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);
  showPreferences = signal(false);
  isSavingPreferences = signal(false);

  // Formulaires
  filtersForm: FormGroup;
  preferencesForm: FormGroup;

  // Statistiques calculées
  notificationStats = computed(() => {
    const all = this.notifications();
    const today = new Date().toISOString().split('T')[0];

    return {
      unread: all.filter(n => !n.read_at).length,
      important: all.filter(n => n.priority === 'high' || n.priority === 'urgent').length,
      today: all.filter(n => n.created_at.startsWith(today)).length
    };
  });

  // Notifications filtrées
  filteredNotifications = computed(() => {
    const filters = this.filtersForm.value;
    let filtered = this.notifications();

    if (filters.status === 'unread') {
      filtered = filtered.filter(n => !n.read_at);
    } else if (filters.status === 'read') {
      filtered = filtered.filter(n => n.read_at);
    }

    if (filters.type) {
      filtered = filtered.filter(n => n.type === filters.type);
    }

    if (filters.priority) {
      filtered = filtered.filter(n => n.priority === filters.priority);
    }

    return filtered;
  });

  constructor() {
    this.filtersForm = this.fb.group({
      status: [''],
      type: [''],
      priority: ['']
    });

    this.preferencesForm = this.fb.group({
      email_enabled: [true],
      in_app_enabled: [true],
      task_notifications: [true],
      project_notifications: [true],
      system_notifications: [true]
    });
  }

  ngOnInit(): void {
    this.loadNotifications();
    this.loadPreferences();
    this.setupRealTimeUpdates();
    this.setupFiltersSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFiltersSubscription(): void {
    // Pas de rechargement automatique sur changement de filtre ici
    // Les filtres sont appliqués côté client via computed()
  }

  private setupRealTimeUpdates(): void {
    // Vérifier les nouvelles notifications toutes les 30 secondes
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.checkForNewNotifications();
      });
  }

  private loadNotifications(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.notificationsService.getNotifications({
      page: 1,
      per_page: 50
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.notifications.set(response.data);
        this.pagination.set(response.meta);
        this.isLoading.set(false);

        this.loggingService.debug('Notifications loaded', {
          component: 'NotificationsComponent',
          action: 'loadNotifications',
          data: { count: response.data.length }
        });
      },
      error: (error) => {
        this.error.set('Erreur lors du chargement des notifications');
        this.isLoading.set(false);

        this.loggingService.error('Failed to load notifications', {
          component: 'NotificationsComponent',
          action: 'loadNotifications',
          data: { error: error.message }
        });
      }
    });
  }

  private checkForNewNotifications(): void {
    this.notificationsService.getNotifications({
      page: 1,
      per_page: 10,
      unread_only: true
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        // Ajouter les nouvelles notifications non présentes
        const existingIds = new Set(this.notifications().map(n => n.id));
        const newNotifications = response.data.filter(n => !existingIds.has(n.id));

        if (newNotifications.length > 0) {
          this.notifications.update(current => [...newNotifications, ...current]);
        }
      },
      error: (error) => {
        // Erreur silencieuse pour les mises à jour en temps réel
        this.loggingService.debug('Failed to check for new notifications', error);
      }
    });
  }

  private loadPreferences(): void {
    this.notificationsService.preferences$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (preferences) => {
          this.preferencesForm.patchValue(preferences);
        },
        error: (error) => {
          this.loggingService.error('Failed to load preferences', error);
        }
      });
  }

  markAsRead(notification: Notification): void {
    if (notification.read_at) return;

    this.notificationsService.markAsRead(notification.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifications.update(notifications =>
            notifications.map(n =>
              n.id === notification.id
                ? { ...n, read_at: new Date().toISOString() }
                : n
            )
          );

          this.loggingService.debug('Notification marked as read', {
            component: 'NotificationsComponent',
            action: 'markAsRead',
            data: { notificationId: notification.id }
          });
        },
        error: (error) => {
          this.loggingService.error('Failed to mark notification as read', error);
        }
      });
  }

  markAllAsRead(): void {
    const unreadIds = this.notifications()
      .filter(n => !n.read_at)
      .map(n => n.id);

    if (unreadIds.length === 0) return;

    this.notificationsService.markAllAsRead(unreadIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const now = new Date().toISOString();
          this.notifications.update(notifications =>
            notifications.map(n => ({ ...n, read_at: n.read_at || now }))
          );

          this.loggingService.info('All notifications marked as read', {
            component: 'NotificationsComponent',
            action: 'markAllAsRead',
            data: { count: unreadIds.length }
          });
        },
        error: (error) => {
          this.loggingService.error('Failed to mark all as read', error);
        }
      });
  }

  deleteNotification(notification: Notification): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette notification ?')) {
      return;
    }

    this.notificationsService.deleteNotification(notification.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifications.update(notifications =>
            notifications.filter(n => n.id !== notification.id)
          );

          this.loggingService.info('Notification deleted', {
            component: 'NotificationsComponent',
            action: 'deleteNotification',
            data: { notificationId: notification.id }
          });
        },
        error: (error) => {
          this.loggingService.error('Failed to delete notification', error);
        }
      });
  }

  openPreferences(): void {
    this.showPreferences.set(true);
  }

  closePreferences(): void {
    this.showPreferences.set(false);
  }

  savePreferences(): void {
    this.isSavingPreferences.set(true);

    const preferences = this.preferencesForm.value as NotificationPreferences;

    // TODO: implement updatePreferences method
    // Temporary mock implementation
    this.isSavingPreferences.set(false);
    this.closePreferences();

    this.loggingService.info('Preferences saved', {
      component: 'NotificationsComponent',
      action: 'savePreferences',
      data: preferences
    });
  }

  goToPage(page: number): void {
    this.notificationsService.getNotifications({
      page: page,
      per_page: 50
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.notifications.set(response.data);
        this.pagination.set(response.meta);
      },
      error: (error) => {
        this.error.set('Erreur lors du chargement de la page');
      }
    });
  }

  // Utility functions
  getTypeClasses(type: NotificationType): string {
    const classes: Record<string, string> = {
      'task_assigned': 'bg-blue-100 text-blue-800',
      'task_due': 'bg-orange-100 text-orange-800',
      'task_comment': 'bg-green-100 text-green-800',
      'project_update': 'bg-purple-100 text-purple-800',
      'system': 'bg-gray-100 text-gray-800'
    };
    return classes[type] || 'bg-gray-100 text-gray-800';
  }

  getTypeIconClasses(type: NotificationType): string {
    const classes: Record<string, string> = {
      'task_assigned': 'bg-blue-100 text-blue-600',
      'task_due': 'bg-orange-100 text-orange-600',
      'task_comment': 'bg-green-100 text-green-600',
      'project_update': 'bg-purple-100 text-purple-600',
      'system': 'bg-gray-100 text-gray-600'
    };
    return classes[type] || 'bg-gray-100 text-gray-600';
  }

  getTypeLabel(type: NotificationType): string {
    const labels: Record<string, string> = {
      'task_assigned': 'Tâche assignée',
      'task_due': 'Échéance',
      'task_comment': 'Commentaire',
      'project_update': 'Projet',
      'system': 'Système'
    };
    return labels[type] || type;
  }

  getPriorityClasses(priority?: NotificationPriority): string {
    const classes: Record<string, string> = {
      'low': 'bg-green-100 text-green-800',
      'normal': 'bg-blue-100 text-blue-800',
      'high': 'bg-orange-100 text-orange-800',
      'urgent': 'bg-red-100 text-red-800'
    };
    return classes[priority || 'normal'] || 'bg-gray-100 text-gray-800';
  }

  getPriorityLabel(priority?: NotificationPriority): string {
    const labels: Record<string, string> = {
      'low': 'Basse',
      'normal': 'Normale',
      'high': 'Haute',
      'urgent': 'Urgente'
    };
    return labels[priority || 'normal'] || 'Normale';
  }

  getActionLabel(type: NotificationType): string {
    const labels: Record<string, string> = {
      'task_assigned': 'Voir la tâche',
      'task_due': 'Voir la tâche',
      'task_comment': 'Voir le commentaire',
      'project_update': 'Voir le projet',
      'system': 'Plus d\'infos'
    };
    return labels[type] || 'Voir plus';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return "À l'instant";
    } else if (diffMins < 60) {
      return `Il y a ${diffMins}min`;
    } else if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    } else if (diffDays < 7) {
      return `Il y a ${diffDays}j`;
    } else {
      return date.toLocaleDateString('fr-FR');
    }
  }

  getDisplayRange(): { start: number; end: number } {
    const meta = this.pagination();
    if (!meta) return { start: 0, end: 0 };

    const start = (meta.current_page - 1) * meta.per_page + 1;
    const end = Math.min(meta.current_page * meta.per_page, meta.total);
    return { start, end };
  }

  // Public methods for template access
  loadNotificationsPublic(): void {
    this.loadNotifications();
  }

  getUnreadCount(): number {
    return this.notifications().filter(n => !n.read_at).length;
  }

  openPreferences(): void {
    // TODO: Implement preferences modal
  }
}