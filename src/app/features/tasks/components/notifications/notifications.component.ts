// ========================================
// COMPOSANT D'AFFICHAGE DES NOTIFICATIONS
// Panneau de notifications avec actions
// ========================================

import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import {
  NotificationsService,
  TaskNotification,
  NotificationType,
  NotificationPriority
} from '../../services/notifications.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notifications-panel">
      <!-- En-tête -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-semibold text-gray-900">Notifications</h2>
          @if (unreadCount() > 0) {
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {{ unreadCount() }}
            </span>
          }
        </div>

        <div class="flex items-center gap-2">
          @if (unreadCount() > 0) {
            <button
              (click)="markAllAsRead()"
              [disabled]="markingAllAsRead()"
              class="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50">
              <i class="bi bi-check-all mr-1"></i>
              Tout marquer lu
            </button>
          }

          <button
            (click)="refresh()"
            [disabled]="loading()"
            class="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            title="Actualiser">
            <i class="bi bi-arrow-clockwise" [class.animate-spin]="loading()"></i>
          </button>
        </div>
      </div>

      <!-- Filtres -->
      <div class="p-4 border-b border-gray-200 bg-gray-50">
        <div class="flex flex-wrap gap-2">
          <button
            (click)="setFilter('all')"
            [class]="currentFilter() === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700'"
            class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            Toutes ({{ notifications().length }})
          </button>
          <button
            (click)="setFilter('unread')"
            [class]="currentFilter() === 'unread' ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700'"
            class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            Non lues ({{ unreadCount() }})
          </button>
          <button
            (click)="setFilter('tasks')"
            [class]="currentFilter() === 'tasks' ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700'"
            class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            Tâches
          </button>
          <button
            (click)="setFilter('mentions')"
            [class]="currentFilter() === 'mentions' ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700'"
            class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            Mentions
          </button>
        </div>
      </div>

      <!-- Liste des notifications -->
      <div class="max-h-96 overflow-y-auto">
        @if (loading()) {
          <div class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span class="ml-3 text-gray-600">Chargement...</span>
          </div>
        } @else if (error()) {
          <div class="p-4 text-center">
            <div class="text-red-600 mb-2">
              <i class="bi bi-exclamation-triangle text-2xl"></i>
            </div>
            <p class="text-sm text-red-800">{{ error() }}</p>
            <button
              (click)="refresh()"
              class="mt-2 text-sm text-blue-600 hover:text-blue-800">
              Réessayer
            </button>
          </div>
        } @else if (filteredNotifications().length === 0) {
          <div class="p-8 text-center">
            <div class="text-gray-400 mb-2">
              <i class="bi bi-bell text-3xl"></i>
            </div>
            <p class="text-sm text-gray-600">
              @if (currentFilter() === 'unread') {
                Aucune notification non lue
              } @else {
                Aucune notification
              }
            </p>
          </div>
        } @else {
          <div class="divide-y divide-gray-200">
            @for (notification of filteredNotifications(); track notification.id) {
              <div
                class="notification-item p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                [class.bg-blue-50]="!notification.is_read"
                [class.border-l-4]="!notification.is_read"
                [class.border-blue-500]="!notification.is_read"
                (click)="handleNotificationClick(notification)">

                <div class="flex items-start gap-3">
                  <!-- Icône du type de notification -->
                  <div class="flex-shrink-0 mt-1">
                    <div
                      class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                      [style.background-color]="getNotificationColor(notification.type)">
                      <i [class]="getNotificationIcon(notification.type)"></i>
                    </div>
                  </div>

                  <!-- Contenu principal -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <h4 class="text-sm font-medium text-gray-900 truncate">
                          {{ notification.title }}
                        </h4>
                        <p class="text-sm text-gray-600 mt-1 line-clamp-2">
                          {{ notification.message }}
                        </p>
                      </div>

                      <!-- Priorité -->
                      @if (notification.priority === 'urgent' || notification.priority === 'high') {
                        <div class="ml-2">
                          <span
                            [class]="getPriorityClass(notification.priority)"
                            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium">
                            @if (notification.priority === 'urgent') {
                              <i class="bi bi-exclamation-triangle-fill mr-1"></i>
                              Urgent
                            } @else {
                              <i class="bi bi-exclamation-circle-fill mr-1"></i>
                              Haute
                            }
                          </span>
                        </div>
                      }
                    </div>

                    <!-- Métadonnées -->
                    <div class="flex items-center justify-between mt-3">
                      <div class="flex items-center gap-2 text-xs text-gray-500">
                        <span>{{ formatTimeAgo(notification.created_at) }}</span>
                        @if (notification.task_id) {
                          <span>•</span>
                          <span>Tâche #{{ notification.task_id }}</span>
                        }
                      </div>

                      <!-- Actions -->
                      <div class="flex items-center gap-1">
                        @if (!notification.is_read) {
                          <button
                            (click)="markAsRead(notification, $event)"
                            class="p-1 text-gray-400 hover:text-blue-600"
                            title="Marquer comme lu">
                            <i class="bi bi-check"></i>
                          </button>
                        }

                        <div class="relative" #actionMenu>
                          <button
                            (click)="toggleActionMenu(notification.id, $event)"
                            class="p-1 text-gray-400 hover:text-gray-600"
                            title="Actions">
                            <i class="bi bi-three-dots"></i>
                          </button>

                          @if (showActionMenu() === notification.id) {
                            <div class="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                              <div class="py-1">
                                @if (!notification.is_read) {
                                  <button
                                    (click)="markAsRead(notification, $event)"
                                    class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i class="bi bi-check mr-2"></i>
                                    Marquer comme lu
                                  </button>
                                } @else {
                                  <button
                                    (click)="markAsUnread(notification, $event)"
                                    class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i class="bi bi-circle mr-2"></i>
                                    Marquer comme non lu
                                  </button>
                                }
                                <button
                                  (click)="deleteNotification(notification, $event)"
                                  class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                  <i class="bi bi-trash mr-2"></i>
                                  Supprimer
                                </button>
                              </div>
                            </div>
                          }
                        </div>
                      </div>
                    </div>

                    <!-- Actions personnalisées de la notification -->
                    @if (notification.actions && notification.actions.length > 0) {
                      <div class="flex gap-2 mt-3">
                        @for (action of notification.actions; track action.id) {
                          <button
                            (click)="executeAction(notification, action, $event)"
                            [class]="getActionClass(action.type)"
                            class="px-3 py-1 text-xs rounded-md font-medium">
                            {{ action.label }}
                          </button>
                        }
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Pied de page -->
      @if (filteredNotifications().length > 0) {
        <div class="p-4 border-t border-gray-200 bg-gray-50">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600">
              {{ filteredNotifications().length }} notification(s)
            </span>
            <button
              (click)="viewAllNotifications()"
              class="text-blue-600 hover:text-blue-800">
              Voir tout l'historique
            </button>
          </div>
        </div>
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

    .notification-item {
      transition: all 0.2s ease;
    }

    .notification-item:hover {
      transform: translateX(2px);
    }
  `]
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private notificationsService = inject(NotificationsService);
  private router = inject(Router);

  // État du composant
  notifications = signal<TaskNotification[]>([]);
  unreadCount = signal(0);
  loading = signal(false);
  error = signal('');

  // Interface utilisateur
  currentFilter = signal<'all' | 'unread' | 'tasks' | 'mentions'>('all');
  showActionMenu = signal<number | null>(null);
  markingAllAsRead = signal(false);

  // Computed
  filteredNotifications = computed(() => {
    const filter = this.currentFilter();
    const allNotifications = this.notifications();

    switch (filter) {
      case 'unread':
        return allNotifications.filter(n => !n.is_read);
      case 'tasks':
        return allNotifications.filter(n => this.isTaskNotification(n.type));
      case 'mentions':
        return allNotifications.filter(n => n.type === NotificationType.MENTION_RECEIVED);
      default:
        return allNotifications;
    }
  });

  ngOnInit(): void {
    this.setupNotificationSubscriptions();
    this.setupClickOutsideListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupNotificationSubscriptions(): void {
    // S'abonner aux notifications
    this.notificationsService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications.set(notifications);
      });

    // S'abonner au compteur de non-lues
    this.notificationsService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount.set(count);
      });

    // S'abonner à l'état
    const state = this.notificationsService.getNotificationState();
    this.loading.set(state.loading);
    this.error.set(state.error || '');
  }

  private setupClickOutsideListener(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        this.showActionMenu.set(null);
      }
    });
  }

  private isTaskNotification(type: NotificationType): boolean {
    return [
      NotificationType.TASK_ASSIGNED,
      NotificationType.TASK_STATUS_CHANGED,
      NotificationType.TASK_DUE_SOON,
      NotificationType.TASK_OVERDUE,
      NotificationType.TASK_COMPLETED,
      NotificationType.COMMENT_ADDED,
      NotificationType.FILE_UPLOADED,
      NotificationType.DIFFICULTY_REPORTED
    ].includes(type);
  }

  // Actions sur les filtres
  setFilter(filter: 'all' | 'unread' | 'tasks' | 'mentions'): void {
    this.currentFilter.set(filter);
    this.showActionMenu.set(null);
  }

  // Actions sur les notifications
  handleNotificationClick(notification: TaskNotification): void {
    // Marquer comme lue si nécessaire
    if (!notification.is_read) {
      this.markAsRead(notification);
    }

    // Navigation basée sur le type
    this.navigateBasedOnType(notification);
  }

  private navigateBasedOnType(notification: TaskNotification): void {
    switch (notification.type) {
      case NotificationType.TASK_ASSIGNED:
      case NotificationType.TASK_STATUS_CHANGED:
      case NotificationType.TASK_DUE_SOON:
      case NotificationType.TASK_OVERDUE:
      case NotificationType.TASK_COMPLETED:
      case NotificationType.COMMENT_ADDED:
      case NotificationType.FILE_UPLOADED:
      case NotificationType.DIFFICULTY_REPORTED:
        if (notification.task_id) {
          this.router.navigate(['/dashboard/tasks', notification.task_id]);
        }
        break;

      case NotificationType.PROJECT_UPDATE:
      case NotificationType.TEAM_MEMBER_ADDED:
        if (notification.data?.project_id) {
          this.router.navigate(['/dashboard/projects', notification.data.project_id]);
        }
        break;

      default:
        // Navigation par défaut
        this.router.navigate(['/dashboard/notifications']);
    }
  }

  markAsRead(notification: TaskNotification, event?: Event): void {
    event?.stopPropagation();
    this.notificationsService.markAsRead(notification.id).subscribe();
  }

  markAsUnread(notification: TaskNotification, event?: Event): void {
    event?.stopPropagation();
    // TODO: Implémenter markAsUnread dans le service
  }

  markAllAsRead(): void {
    this.markingAllAsRead.set(true);
    this.notificationsService.markAllAsRead().subscribe({
      next: () => {
        this.markingAllAsRead.set(false);
      },
      error: () => {
        this.markingAllAsRead.set(false);
      }
    });
  }

  deleteNotification(notification: TaskNotification, event?: Event): void {
    event?.stopPropagation();
    this.showActionMenu.set(null);

    if (confirm('Supprimer cette notification ?')) {
      this.notificationsService.deleteNotification(notification.id).subscribe();
    }
  }

  toggleActionMenu(notificationId: number, event: Event): void {
    event.stopPropagation();
    const current = this.showActionMenu();
    this.showActionMenu.set(current === notificationId ? null : notificationId);
  }

  executeAction(notification: TaskNotification, action: any, event: Event): void {
    event.stopPropagation();

    // TODO: Implémenter l'exécution des actions personnalisées
    console.log('Executing action:', action, 'for notification:', notification);
  }

  refresh(): void {
    this.notificationsService.refresh();
  }

  viewAllNotifications(): void {
    this.router.navigate(['/dashboard/notifications']);
  }

  // Méthodes utilitaires pour les templates
  getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case NotificationType.TASK_ASSIGNED:
        return 'bi-person-check';
      case NotificationType.TASK_STATUS_CHANGED:
        return 'bi-arrow-repeat';
      case NotificationType.TASK_DUE_SOON:
        return 'bi-clock';
      case NotificationType.TASK_OVERDUE:
        return 'bi-exclamation-triangle';
      case NotificationType.TASK_COMPLETED:
        return 'bi-check-circle';
      case NotificationType.COMMENT_ADDED:
        return 'bi-chat';
      case NotificationType.MENTION_RECEIVED:
        return 'bi-at';
      case NotificationType.FILE_UPLOADED:
        return 'bi-paperclip';
      case NotificationType.DIFFICULTY_REPORTED:
        return 'bi-exclamation-diamond';
      case NotificationType.TIME_SESSION_REMINDER:
        return 'bi-stopwatch';
      case NotificationType.PROJECT_UPDATE:
        return 'bi-folder';
      case NotificationType.DEADLINE_APPROACHING:
        return 'bi-calendar-event';
      case NotificationType.TEAM_MEMBER_ADDED:
        return 'bi-people';
      default:
        return 'bi-bell';
    }
  }

  getNotificationColor(type: NotificationType): string {
    switch (type) {
      case NotificationType.TASK_OVERDUE:
      case NotificationType.DIFFICULTY_REPORTED:
        return '#ef4444'; // Rouge
      case NotificationType.TASK_DUE_SOON:
      case NotificationType.DEADLINE_APPROACHING:
        return '#f59e0b'; // Orange
      case NotificationType.TASK_COMPLETED:
        return '#10b981'; // Vert
      case NotificationType.COMMENT_ADDED:
      case NotificationType.MENTION_RECEIVED:
        return '#8b5cf6'; // Violet
      case NotificationType.FILE_UPLOADED:
        return '#06b6d4'; // Cyan
      default:
        return '#3b82f6'; // Bleu
    }
  }

  getPriorityClass(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 'bg-red-100 text-red-800';
      case NotificationPriority.HIGH:
        return 'bg-orange-100 text-orange-800';
      case NotificationPriority.MEDIUM:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getActionClass(type: string): string {
    switch (type) {
      case 'primary':
        return 'bg-blue-600 text-white hover:bg-blue-700';
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700';
      default:
        return 'bg-gray-200 text-gray-800 hover:bg-gray-300';
    }
  }

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'À l\'instant';
    if (diffMinutes < 60) return `${diffMinutes}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;

    return date.toLocaleDateString('fr-FR');
  }
}