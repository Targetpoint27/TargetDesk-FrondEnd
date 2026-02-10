// ========================================
// SERVICE API POUR LE SYSTÈME DE NOTIFICATIONS
// Basé sur DOCUMENTATION_INTEGRATION_API.md
// ========================================

import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, map, tap, catchError, interval } from 'rxjs';
import { ApiService, ApiResponse } from '../../../core/api/api.service';
import { LoggingService } from '../../../core/logging/logging.service';
import {
  Notification,
  NotificationFilters,
  MarkNotificationsReadRequest,
  UpdateNotificationPreferencesRequest,
  SendNotificationRequest,
  NotificationPreferences,
  NotificationSummary,
  NotificationStats
} from '../models/notification.models';

export interface PaginatedNotificationResponse {
  success: boolean;
  data: Notification[];
  meta: {
    current_page: number;
    total: number;
    per_page: number;
    last_page: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsApiService {
  private apiService = inject(ApiService);
  private loggingService = inject(LoggingService);

  // État des notifications
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private preferencesSubject = new BehaviorSubject<NotificationPreferences | null>(null);

  // Observables publics
  public notifications$ = this.notificationsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();
  public preferences$ = this.preferencesSubject.asObservable();

  // Configuration du polling
  private pollingInterval = 30000; // 30 secondes
  private pollingSubscription?: any;

  constructor() {
    this.startPolling();
    this.loadInitialData();
  }

  // ========================================
  // GESTION DES NOTIFICATIONS
  // ========================================

  /**
   * Obtenir mes notifications avec filtres
   */
  getNotifications(filters?: NotificationFilters): Observable<PaginatedNotificationResponse> {
    const params = this.buildNotificationFilters(filters);

    this.loggingService.debug('Fetching notifications', {
      component: 'NotificationsApiService',
      action: 'getNotifications',
      data: { filters, params }
    });

    return this.apiService.get<PaginatedNotificationResponse>('/notifications', { params })
      .pipe(
        tap(response => {
          // Mettre à jour le cache local si c'est la première page sans filtres
          if (!filters?.page || filters.page === 1) {
            this.notificationsSubject.next(response.data);
            this.updateUnreadCount(response.data);
          }

          this.loggingService.debug('Notifications fetched successfully', {
            component: 'NotificationsApiService',
            action: 'getNotifications',
            data: {
              count: response.data.length,
              total: response.meta.total,
              unread: response.data.filter(n => !n.read_at).length
            }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to fetch notifications', {
            component: 'NotificationsApiService',
            action: 'getNotifications',
            data: { error: error.message, filters }
          });
          throw error;
        })
      );
  }

  /**
   * Marquer une notification comme lue
   */
  markAsRead(notificationId: string): Observable<ApiResponse<void>> {
    this.loggingService.debug('Marking notification as read', {
      component: 'NotificationsApiService',
      action: 'markAsRead',
      data: { notificationId }
    });

    return this.apiService.put<ApiResponse<void>>(`/notifications/${notificationId}/read`, {})
      .pipe(
        tap(() => {
          // Mettre à jour le cache local
          this.updateNotificationReadStatus(notificationId, true);

          this.loggingService.debug('Notification marked as read', {
            component: 'NotificationsApiService',
            action: 'markAsRead',
            data: { notificationId }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to mark notification as read', {
            component: 'NotificationsApiService',
            action: 'markAsRead',
            data: { error: error.message, notificationId }
          });
          throw error;
        })
      );
  }

  /**
   * Marquer plusieurs notifications comme lues
   */
  markNotificationsAsRead(request: MarkNotificationsReadRequest): Observable<ApiResponse<void>> {
    this.loggingService.debug('Marking notifications as read', {
      component: 'NotificationsApiService',
      action: 'markNotificationsAsRead',
      data: {
        count: request.notification_ids?.length || 'all',
        markAll: request.mark_all,
        type: request.type
      }
    });

    return this.apiService.post<ApiResponse<void>>('/notifications/mark-all-read', request)
      .pipe(
        tap(() => {
          // Mettre à jour le cache local
          if (request.mark_all) {
            this.markAllNotificationsAsRead(request.type);
          } else if (request.notification_ids) {
            request.notification_ids.forEach(id => {
              this.updateNotificationReadStatus(id, true);
            });
          }

          this.loggingService.info('Notifications marked as read successfully', {
            component: 'NotificationsApiService',
            action: 'markNotificationsAsRead',
            data: { request }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to mark notifications as read', {
            component: 'NotificationsApiService',
            action: 'markNotificationsAsRead',
            data: { error: error.message, request }
          });
          throw error;
        })
      );
  }

  /**
   * Supprimer une notification
   */
  deleteNotification(notificationId: string): Observable<ApiResponse<void>> {
    this.loggingService.debug('Deleting notification', {
      component: 'NotificationsApiService',
      action: 'deleteNotification',
      data: { notificationId }
    });

    return this.apiService.delete<ApiResponse<void>>(`/notifications/${notificationId}`)
      .pipe(
        tap(() => {
          // Supprimer du cache local
          const currentNotifications = this.notificationsSubject.value;
          const updatedNotifications = currentNotifications.filter(n => n.id !== notificationId);
          this.notificationsSubject.next(updatedNotifications);
          this.updateUnreadCount(updatedNotifications);

          this.loggingService.info('Notification deleted successfully', {
            component: 'NotificationsApiService',
            action: 'deleteNotification',
            data: { notificationId }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to delete notification', {
            component: 'NotificationsApiService',
            action: 'deleteNotification',
            data: { error: error.message, notificationId }
          });
          throw error;
        })
      );
  }

  /**
   * Obtenir le résumé des notifications
   */
  getNotificationSummary(): Observable<ApiResponse<NotificationSummary>> {
    return this.apiService.get<ApiResponse<NotificationSummary>>('/notifications/summary')
      .pipe(
        tap(response => {
          if (response.data) {
            this.unreadCountSubject.next(response.data.unread_notifications);
          }
        })
      );
  }

  /**
   * Obtenir les statistiques des notifications
   */
  getNotificationStats(): Observable<ApiResponse<NotificationStats>> {
    return this.apiService.get<ApiResponse<NotificationStats>>('/notifications/stats');
  }

  // ========================================
  // GESTION DES PRÉFÉRENCES
  // ========================================

  /**
   * Obtenir les préférences de notification
   */
  getNotificationPreferences(): Observable<ApiResponse<NotificationPreferences>> {
    return this.apiService.get<ApiResponse<NotificationPreferences>>('/notifications/preferences')
      .pipe(
        tap(response => {
          if (response.data) {
            this.preferencesSubject.next(response.data);
          }
        })
      );
  }

  /**
   * Mettre à jour les préférences de notification
   */
  updateNotificationPreferences(preferences: UpdateNotificationPreferencesRequest): Observable<ApiResponse<NotificationPreferences>> {
    this.loggingService.debug('Updating notification preferences', {
      component: 'NotificationsApiService',
      action: 'updateNotificationPreferences',
      data: { preferencesCount: Object.keys(preferences).length }
    });

    return this.apiService.put<ApiResponse<NotificationPreferences>>('/notifications/preferences', preferences)
      .pipe(
        tap(response => {
          if (response.data) {
            this.preferencesSubject.next(response.data);
          }

          this.loggingService.info('Notification preferences updated successfully', {
            component: 'NotificationsApiService',
            action: 'updateNotificationPreferences'
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to update notification preferences', {
            component: 'NotificationsApiService',
            action: 'updateNotificationPreferences',
            data: { error: error.message }
          });
          throw error;
        })
      );
  }

  // ========================================
  // ENVOI DE NOTIFICATIONS (ADMIN)
  // ========================================

  /**
   * Envoyer une notification personnalisée
   */
  sendNotification(notificationData: SendNotificationRequest): Observable<ApiResponse<void>> {
    this.loggingService.debug('Sending custom notification', {
      component: 'NotificationsApiService',
      action: 'sendNotification',
      data: {
        recipientCount: notificationData.recipient_ids.length,
        type: notificationData.type,
        title: notificationData.title
      }
    });

    return this.apiService.post<ApiResponse<void>>('/notifications/send', notificationData)
      .pipe(
        tap(() => {
          this.loggingService.info('Custom notification sent successfully', {
            component: 'NotificationsApiService',
            action: 'sendNotification',
            data: { recipientCount: notificationData.recipient_ids.length }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to send custom notification', {
            component: 'NotificationsApiService',
            action: 'sendNotification',
            data: { error: error.message }
          });
          throw error;
        })
      );
  }

  // ========================================
  // GESTION EN TEMPS RÉEL
  // ========================================

  /**
   * Démarrer le polling des notifications
   */
  private startPolling(): void {
    this.pollingSubscription = interval(this.pollingInterval).subscribe(() => {
      this.refreshNotifications();
    });
  }

  /**
   * Arrêter le polling des notifications
   */
  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }

  /**
   * Rafraîchir les notifications
   */
  refreshNotifications(): void {
    this.getNotifications({ page: 1, per_page: 20, unread_only: false })
      .subscribe({
        error: (error) => {
          // Logging déjà fait dans getNotifications
        }
      });
  }

  /**
   * Charger les données initiales
   */
  private loadInitialData(): void {
    // Charger les notifications récentes
    this.refreshNotifications();

    // Charger les préférences
    this.getNotificationPreferences().subscribe({
      error: (error) => {
        this.loggingService.error('Failed to load notification preferences', {
          component: 'NotificationsApiService',
          action: 'loadInitialData',
          data: { error: error.message }
        });
      }
    });
  }

  // ========================================
  // MÉTHODES UTILITAIRES PRIVÉES
  // ========================================

  /**
   * Construire les paramètres de filtre
   */
  private buildNotificationFilters(filters?: NotificationFilters): any {
    if (!filters) return {};

    const params: any = {};

    if (filters.page) params.page = filters.page;
    if (filters.per_page) params.per_page = filters.per_page;
    if (filters.unread_only !== undefined) params.unread_only = filters.unread_only;
    if (filters.type) params.type = filters.type;
    if (filters.priority) params.priority = filters.priority;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.search) params.search = filters.search;

    return params;
  }

  /**
   * Mettre à jour le statut de lecture d'une notification dans le cache
   */
  private updateNotificationReadStatus(notificationId: string, isRead: boolean): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(notification => {
      if (notification.id === notificationId) {
        return {
          ...notification,
          read_at: isRead ? new Date().toISOString() : undefined,
          is_read: isRead
        };
      }
      return notification;
    });

    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount(updatedNotifications);
  }

  /**
   * Marquer toutes les notifications comme lues dans le cache
   */
  private markAllNotificationsAsRead(type?: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(notification => {
      if (!type || notification.type === type) {
        return {
          ...notification,
          read_at: new Date().toISOString(),
          is_read: true
        };
      }
      return notification;
    });

    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount(updatedNotifications);
  }

  /**
   * Mettre à jour le compteur de notifications non lues
   */
  private updateUnreadCount(notifications: Notification[]): void {
    const unreadCount = notifications.filter(n => !n.read_at && !n.is_read).length;
    this.unreadCountSubject.next(unreadCount);
  }

  // ========================================
  // MÉTHODES PUBLIQUES UTILITAIRES
  // ========================================

  /**
   * Obtenir le nombre de notifications non lues (synchrone)
   */
  getCurrentUnreadCount(): number {
    return this.unreadCountSubject.value;
  }

  /**
   * Obtenir les notifications actuelles (synchrone)
   */
  getCurrentNotifications(): Notification[] {
    return this.notificationsSubject.value;
  }

  /**
   * Obtenir les préférences actuelles (synchrone)
   */
  getCurrentPreferences(): NotificationPreferences | null {
    return this.preferencesSubject.value;
  }

  /**
   * Ajouter une notification au cache (pour les notifications en temps réel)
   */
  addNotificationToCache(notification: Notification): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = [notification, ...currentNotifications];
    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount(updatedNotifications);

    this.loggingService.debug('Notification added to cache', {
      component: 'NotificationsApiService',
      action: 'addNotificationToCache',
      data: { notificationId: notification.id, type: notification.type }
    });
  }

  /**
   * Nettoyer les ressources
   */
  ngOnDestroy(): void {
    this.stopPolling();
  }
}