// ========================================
// SERVICE DE NOTIFICATIONS POUR LES TÂCHES
// Gestion des notifications en temps réel et persistantes
// ========================================

import { Injectable, inject, signal, effect } from '@angular/core';
import { Observable, BehaviorSubject, Subject, fromEvent, merge, timer } from 'rxjs';
import { takeUntil, map, filter, tap, catchError, of, switchMap, debounceTime } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { LoggingService } from '../../../core/logging/logging.service';

export interface TaskNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  task_id?: number;
  user_id: number;
  is_read: boolean;
  priority: NotificationPriority;
  data?: any;
  created_at: string;
  expires_at?: string;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  action: string;
  data?: any;
}

export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_STATUS_CHANGED = 'task_status_changed',
  TASK_DUE_SOON = 'task_due_soon',
  TASK_OVERDUE = 'task_overdue',
  TASK_COMPLETED = 'task_completed',
  COMMENT_ADDED = 'comment_added',
  MENTION_RECEIVED = 'mention_received',
  FILE_UPLOADED = 'file_uploaded',
  DIFFICULTY_REPORTED = 'difficulty_reported',
  TIME_SESSION_REMINDER = 'time_session_reminder',
  PROJECT_UPDATE = 'project_update',
  DEADLINE_APPROACHING = 'deadline_approaching',
  TEAM_MEMBER_ADDED = 'team_member_added'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface NotificationPreferences {
  email: boolean;
  browser: boolean;
  in_app: boolean;
  types: Partial<Record<NotificationType, boolean>>;
}

interface NotificationState {
  notifications: TaskNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private apiService = inject(ApiService);
  private loggingService = inject(LoggingService);

  private destroy$ = new Subject<void>();

  // État des notifications
  private notificationState = signal<NotificationState>({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null
  });

  // Observables publics
  public notifications$ = new BehaviorSubject<TaskNotification[]>([]);
  public unreadCount$ = new BehaviorSubject<number>(0);

  // WebSocket pour les notifications en temps réel
  private webSocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // Préférences utilisateur
  private preferences = signal<NotificationPreferences>({
    email: true,
    browser: true,
    in_app: true,
    types: {}
  });

  // File d'attente des notifications locales
  private notificationQueue: TaskNotification[] = [];
  private isProcessingQueue = false;

  constructor() {
    this.initializeService();
    this.setupPeriodicRefresh();
    this.setupNotificationPermission();
  }

  // ========================================
  // INITIALISATION
  // ========================================

  private initializeService(): void {
    this.loadNotificationPreferences();
    this.loadInitialNotifications();
    this.setupWebSocket();

    // Effect pour mettre à jour les observables quand l'état change
    effect(() => {
      const state = this.notificationState();
      this.notifications$.next(state.notifications);
      this.unreadCount$.next(state.unreadCount);
    });
  }

  private loadNotificationPreferences(): void {
    const savedPrefs = localStorage.getItem('notification_preferences');
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs);
        this.preferences.set({ ...this.preferences(), ...prefs });
      } catch (error) {
        this.loggingService.error('Failed to parse notification preferences', {
          component: 'NotificationsService',
          data: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
    }
  }

  private setupNotificationPermission(): void {
    if ('Notification' in window && this.preferences().browser) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          this.loggingService.debug('Notification permission', {
            component: 'NotificationsService',
            data: { permission }
          });
        });
      }
    }
  }

  // ========================================
  // GESTION DES NOTIFICATIONS API
  // ========================================

  private loadInitialNotifications(): void {
    this.notificationState.update(state => ({ ...state, loading: true, error: null }));

    this.apiService.get<{ data: TaskNotification[] }>('/notifications', {
      params: { per_page: 50, include_read: true }
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        const notifications = response.data || [];
        const unreadCount = notifications.filter(n => !n.is_read).length;

        this.notificationState.update(state => ({
          ...state,
          notifications,
          unreadCount,
          loading: false,
          error: null
        }));

        this.loggingService.debug('Initial notifications loaded', {
          component: 'NotificationsService',
          data: { count: notifications.length, unreadCount }
        });
      },
      error: (error) => {
        this.notificationState.update(state => ({
          ...state,
          loading: false,
          error: 'Erreur lors du chargement des notifications'
        }));

        this.loggingService.error('Failed to load notifications', {
          component: 'NotificationsService',
          data: { error: error.message }
        });
      }
    });
  }

  /**
   * Marquer une notification comme lue
   */
  markAsRead(notificationId: number): Observable<void> {
    return this.apiService.put<{ success: boolean }>(`/notifications/${notificationId}/read`, {})
      .pipe(
        tap(() => {
          this.notificationState.update(state => {
            const notifications = state.notifications.map(n =>
              n.id === notificationId ? { ...n, is_read: true } : n
            );
            const unreadCount = notifications.filter(n => !n.is_read).length;

            return { ...state, notifications, unreadCount };
          });

          this.loggingService.debug('Notification marked as read', {
            component: 'NotificationsService',
            data: { notificationId }
          });
        }),
        map(() => void 0),
        catchError(error => {
          this.loggingService.error('Failed to mark notification as read', {
            component: 'NotificationsService',
            data: { error: error.message, notificationId }
          });
          return of(void 0);
        })
      );
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  markAllAsRead(): Observable<void> {
    return this.apiService.put<{ success: boolean }>('/notifications/mark-all-read', {})
      .pipe(
        tap(() => {
          this.notificationState.update(state => ({
            ...state,
            notifications: state.notifications.map(n => ({ ...n, is_read: true })),
            unreadCount: 0
          }));

          this.loggingService.debug('All notifications marked as read', {
            component: 'NotificationsService'
          });
        }),
        map(() => void 0),
        catchError(error => {
          this.loggingService.error('Failed to mark all notifications as read', {
            component: 'NotificationsService',
            data: { error: error.message }
          });
          return of(void 0);
        })
      );
  }

  /**
   * Supprimer une notification
   */
  deleteNotification(notificationId: number): Observable<void> {
    return this.apiService.delete<{ success: boolean }>(`/notifications/${notificationId}`)
      .pipe(
        tap(() => {
          this.notificationState.update(state => {
            const notifications = state.notifications.filter(n => n.id !== notificationId);
            const unreadCount = notifications.filter(n => !n.is_read).length;

            return { ...state, notifications, unreadCount };
          });

          this.loggingService.debug('Notification deleted', {
            component: 'NotificationsService',
            data: { notificationId }
          });
        }),
        map(() => void 0),
        catchError(error => {
          this.loggingService.error('Failed to delete notification', {
            component: 'NotificationsService',
            data: { error: error.message, notificationId }
          });
          return of(void 0);
        })
      );
  }

  // ========================================
  // WEBSOCKET TEMPS RÉEL
  // ========================================

  private setupWebSocket(): void {
    // Récupérer l'URL WebSocket depuis l'API service
    const baseUrl = this.apiService.getBaseUrl().replace('http', 'ws');
    const wsUrl = `${baseUrl}/notifications/stream`;

    try {
      this.webSocket = new WebSocket(wsUrl);

      this.webSocket.onopen = () => {
        this.reconnectAttempts = 0;
        this.loggingService.debug('WebSocket connected', {
          component: 'NotificationsService'
        });
      };

      this.webSocket.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data) as TaskNotification;
          this.handleRealtimeNotification(notification);
        } catch (error) {
          this.loggingService.error('Failed to parse WebSocket message', {
            component: 'NotificationsService',
            data: { error: error instanceof Error ? error.message : 'Unknown error' }
          });
        }
      };

      this.webSocket.onclose = () => {
        this.loggingService.debug('WebSocket disconnected', {
          component: 'NotificationsService'
        });

        // Tentative de reconnexion
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++;
            this.setupWebSocket();
          }, Math.pow(2, this.reconnectAttempts) * 1000); // Backoff exponentiel
        }
      };

      this.webSocket.onerror = (error) => {
        this.loggingService.error('WebSocket error', {
          component: 'NotificationsService',
          data: { error }
        });
      };

    } catch (error) {
      this.loggingService.error('Failed to setup WebSocket', {
        component: 'NotificationsService',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
  }

  private handleRealtimeNotification(notification: TaskNotification): void {
    // Ajouter à la file d'attente
    this.notificationQueue.push(notification);

    // Mettre à jour l'état immédiatement
    this.notificationState.update(state => ({
      ...state,
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.is_read ? 0 : 1)
    }));

    // Traiter la file d'attente
    this.processNotificationQueue();

    this.loggingService.debug('Realtime notification received', {
      component: 'NotificationsService',
      data: { type: notification.type, taskId: notification.task_id }
    });
  }

  private processNotificationQueue(): void {
    if (this.isProcessingQueue || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    // Traiter les notifications une par une avec un délai
    const processNext = () => {
      if (this.notificationQueue.length === 0) {
        this.isProcessingQueue = false;
        return;
      }

      const notification = this.notificationQueue.shift()!;
      this.showNotification(notification);

      // Délai entre les notifications pour éviter le spam
      setTimeout(processNext, 1000);
    };

    processNext();
  }

  // ========================================
  // AFFICHAGE DES NOTIFICATIONS
  // ========================================

  private showNotification(notification: TaskNotification): void {
    // Vérifier les préférences
    if (!this.shouldShowNotification(notification)) {
      return;
    }

    // Notification navigateur
    if (this.preferences().browser && 'Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/assets/icons/notification.png',
        badge: '/assets/icons/badge.png',
        tag: `task-${notification.task_id}`, // Éviter les doublons
        requireInteraction: notification.priority === NotificationPriority.URGENT
      });

      browserNotification.onclick = () => {
        this.handleNotificationClick(notification);
        browserNotification.close();
      };

      // Auto-fermeture après 5 secondes sauf pour les urgentes
      if (notification.priority !== NotificationPriority.URGENT) {
        setTimeout(() => browserNotification.close(), 5000);
      }
    }

    // Notification in-app (toast)
    if (this.preferences().in_app) {
      this.showInAppNotification(notification);
    }
  }

  private showInAppNotification(notification: TaskNotification): void {
    // Créer un événement personnalisé pour le toast
    const toastEvent = new CustomEvent('showToast', {
      detail: {
        type: this.getToastType(notification.priority),
        title: notification.title,
        message: notification.message,
        duration: this.getToastDuration(notification.priority),
        actions: notification.actions,
        onClick: () => this.handleNotificationClick(notification)
      }
    });

    window.dispatchEvent(toastEvent);
  }

  private shouldShowNotification(notification: TaskNotification): boolean {
    // Vérifier les préférences globales
    if (!this.preferences().in_app && !this.preferences().browser) {
      return false;
    }

    // Vérifier les préférences par type
    const typePreference = this.preferences().types[notification.type];
    if (typePreference !== undefined && !typePreference) {
      return false;
    }

    // Vérifier si la notification n'est pas expirée
    if (notification.expires_at && new Date() > new Date(notification.expires_at)) {
      return false;
    }

    return true;
  }

  private handleNotificationClick(notification: TaskNotification): void {
    // Marquer comme lue
    if (!notification.is_read) {
      this.markAsRead(notification.id).subscribe();
    }

    // Navigation selon le type
    switch (notification.type) {
      case NotificationType.TASK_ASSIGNED:
      case NotificationType.TASK_STATUS_CHANGED:
      case NotificationType.TASK_DUE_SOON:
      case NotificationType.TASK_OVERDUE:
      case NotificationType.COMMENT_ADDED:
        if (notification.task_id) {
          // Émettre un événement de navigation
          const navEvent = new CustomEvent('navigateToTask', {
            detail: { taskId: notification.task_id }
          });
          window.dispatchEvent(navEvent);
        }
        break;

      case NotificationType.PROJECT_UPDATE:
        if (notification.data?.project_id) {
          const navEvent = new CustomEvent('navigateToProject', {
            detail: { projectId: notification.data.project_id }
          });
          window.dispatchEvent(navEvent);
        }
        break;

      default:
        // Navigation par défaut vers les notifications
        const navEvent = new CustomEvent('navigateToNotifications');
        window.dispatchEvent(navEvent);
    }

    this.loggingService.debug('Notification clicked', {
      component: 'NotificationsService',
      data: { notificationId: notification.id, type: notification.type }
    });
  }

  // ========================================
  // UTILITAIRES
  // ========================================

  private getToastType(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 'error';
      case NotificationPriority.HIGH:
        return 'warning';
      case NotificationPriority.MEDIUM:
        return 'info';
      default:
        return 'success';
    }
  }

  private getToastDuration(priority: NotificationPriority): number {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 0; // Pas d'auto-fermeture
      case NotificationPriority.HIGH:
        return 8000;
      case NotificationPriority.MEDIUM:
        return 5000;
      default:
        return 3000;
    }
  }

  private setupPeriodicRefresh(): void {
    // Actualiser les notifications toutes les 5 minutes
    timer(0, 5 * 60 * 1000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.apiService.get<{ unread_count: number }>('/notifications/unread-count'))
      )
      .subscribe({
        next: (response) => {
          const serverUnreadCount = response.unread_count || 0;
          const currentUnreadCount = this.notificationState().unreadCount;

          // Si le nombre de non-lues diffère, recharger
          if (serverUnreadCount !== currentUnreadCount) {
            this.loadInitialNotifications();
          }
        },
        error: () => {
          // Silent error pour le refresh périodique
        }
      });
  }

  // ========================================
  // API PUBLIQUE
  // ========================================

  /**
   * Obtenir l'état actuel des notifications
   */
  getNotificationState(): NotificationState {
    return this.notificationState();
  }

  /**
   * Obtenir les préférences de notifications
   */
  getPreferences(): NotificationPreferences {
    return this.preferences();
  }

  /**
   * Mettre à jour les préférences
   */
  updatePreferences(newPreferences: Partial<NotificationPreferences>): void {
    const updated = { ...this.preferences(), ...newPreferences };
    this.preferences.set(updated);

    localStorage.setItem('notification_preferences', JSON.stringify(updated));

    this.loggingService.debug('Notification preferences updated', {
      component: 'NotificationsService',
      data: { preferences: updated }
    });
  }

  /**
   * Actualiser manuellement les notifications
   */
  refresh(): void {
    this.loadInitialNotifications();
  }

  /**
   * Nettoyer le service
   */
  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.webSocket) {
      this.webSocket.close();
    }

    this.notificationQueue = [];
    this.isProcessingQueue = false;
  }
}