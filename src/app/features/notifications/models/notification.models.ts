// ========================================
// MODÈLES POUR LE SYSTÈME DE NOTIFICATIONS
// Basé sur DOCUMENTATION_INTEGRATION_API.md
// ========================================

import { UserEntity } from '../../../domain/entities/user.entity';

// ========================================
// ÉNUMÉRATIONS
// ========================================

export enum NotificationType {
  PROJECT_CREATED = 'project_created',
  PROJECT_STATUS_CHANGED = 'project_status_changed'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  PUSH = 'push'
}

// ========================================
// INTERFACES PRINCIPALES
// ========================================

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationData;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  read_at?: string;
  created_at: string;
  updated_at?: string;

  // Relations
  recipient?: UserEntity;
  sender?: UserEntity;

  // Propriétés calculées
  is_read?: boolean;
  time_ago?: string;
  icon?: string;
  color?: string;
}

export interface NotificationData {
  project_id?: number;
  project_title?: string;
  action_url?: string;
  additional_info?: { [key: string]: any };
}

// ========================================
// INTERFACES - PARAMÈTRES ET PRÉFÉRENCES
// ========================================

export interface NotificationPreferences {
  id: number;
  user_id: number;
  project_created: NotificationChannelSettings;
  project_status_changed: NotificationChannelSettings;
  created_at: string;
  updated_at: string;
}

export interface NotificationChannelSettings {
  in_app: boolean;
  email: boolean;
  push: boolean;
  enabled: boolean;
}

// ========================================
// INTERFACES - REQUÊTES API
// ========================================

export interface NotificationFilters {
  page?: number;
  per_page?: number;
  unread_only?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface MarkNotificationsReadRequest {
  notification_ids?: string[];
  mark_all?: boolean;
  type?: NotificationType;
}

export interface UpdateNotificationPreferencesRequest {
  project_created?: NotificationChannelSettings;
  project_status_changed?: NotificationChannelSettings;
}

export interface SendNotificationRequest {
  recipient_ids: number[];
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationData;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  scheduled_for?: string;
}

// ========================================
// INTERFACES - RÉPONSES API
// ========================================

export interface NotificationSummary {
  total_notifications: number;
  unread_notifications: number;
  notifications_by_type: { [type: string]: number };
  recent_notifications: Notification[];
}

export interface NotificationStats {
  daily_count: { [date: string]: number };
  type_distribution: { [type: string]: number };
  read_rate: number;
  average_read_time: number;
}

// ========================================
// CONSTANTES ET LABELS
// ========================================

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  [NotificationType.PROJECT_CREATED]: 'Projet créé',
  [NotificationType.PROJECT_STATUS_CHANGED]: 'Statut de projet modifié'
};

export const NOTIFICATION_PRIORITY_LABELS: Record<NotificationPriority, string> = {
  [NotificationPriority.LOW]: 'Faible',
  [NotificationPriority.NORMAL]: 'Normal',
  [NotificationPriority.HIGH]: 'Élevée',
  [NotificationPriority.URGENT]: 'Urgent'
};

export const NOTIFICATION_PRIORITY_COLORS: Record<NotificationPriority, string> = {
  [NotificationPriority.LOW]: '#6b7280',
  [NotificationPriority.NORMAL]: '#3b82f6',
  [NotificationPriority.HIGH]: '#f59e0b',
  [NotificationPriority.URGENT]: '#ef4444'
};

export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
  [NotificationType.PROJECT_CREATED]: 'create_new_folder',
  [NotificationType.PROJECT_STATUS_CHANGED]: 'folder'
};

export const NOTIFICATION_TYPE_COLORS: Record<NotificationType, string> = {
  [NotificationType.PROJECT_CREATED]: '#10b981',
  [NotificationType.PROJECT_STATUS_CHANGED]: '#3b82f6'
};

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

export function getNotificationIcon(type: NotificationType): string {
  return NOTIFICATION_TYPE_ICONS[type] || 'notifications';
}

export function getNotificationColor(type: NotificationType): string {
  return NOTIFICATION_TYPE_COLORS[type] || '#6b7280';
}

export function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'À l\'instant';
  } else if (diffInMinutes < 60) {
    return `Il y a ${diffInMinutes} min`;
  } else if (diffInHours < 24) {
    return `Il y a ${diffInHours}h`;
  } else if (diffInDays < 7) {
    return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
  } else {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: diffInDays > 365 ? 'numeric' : undefined
    });
  }
}

export function getNotificationPriorityBadge(priority: NotificationPriority): string {
  const colors = NOTIFICATION_PRIORITY_COLORS[priority];
  return colors;
}

export function buildNotificationActionUrl(data: NotificationData): string {
  if (data.action_url) {
    return data.action_url;
  }

  if (data.project_id) {
    return `/dashboard/projects/detail/${data.project_id}`;
  }

  return '/dashboard';
}

export function shouldShowNotification(
  type: NotificationType,
  preferences: NotificationPreferences
): boolean {
  const setting = preferences[type];
  return setting?.enabled && setting?.in_app;
}

export function shouldSendEmailNotification(
  type: NotificationType,
  preferences: NotificationPreferences
): boolean {
  const setting = preferences[type];
  return setting?.enabled && setting?.email;
}

export function shouldSendPushNotification(
  type: NotificationType,
  preferences: NotificationPreferences
): boolean {
  const setting = preferences[type];
  return setting?.enabled && setting?.push;
}

export function getDefaultChannelSettings(): NotificationChannelSettings {
  return {
    in_app: true,
    email: false,
    push: false,
    enabled: true
  };
}

export function getDefaultNotificationPreferences(userId: number): Partial<NotificationPreferences> {
  const defaultSettings = getDefaultChannelSettings();

  return {
    user_id: userId,
    project_created: { ...defaultSettings, email: true },
    project_status_changed: defaultSettings
  };
}