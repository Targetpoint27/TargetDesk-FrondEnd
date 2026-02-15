import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  NotificationPreferences,
  PreferencesFormData,
  PendingReminder,
  ReminderStatistics,
  NotificationResponse,
  UserPreferencesResponse,
  RemindersListResponse
} from '../interfaces/notification.interface';
import { ApiService } from '../api/api.service';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toastService = inject(ToastService);
  private notificationCountSubject = new BehaviorSubject<number>(0);
  public notificationCount$ = this.notificationCountSubject.asObservable();

  constructor(private apiService: ApiService) {}

  error(message: string): void {
    this.toastService.error(message, 'Erreur de supervision');
  }

  success(message: string): void {
    this.toastService.success(message, 'Action réussie');
  }

  getUserPreferences(userId: string): Observable<NotificationPreferences> {
    return this.apiService.get<NotificationResponse<UserPreferencesResponse>>(
      `/users/${userId}/email-preferences`
    ).pipe(
      map(response => response.data.appointment_reminder),
      catchError(error => {
        console.error('Erreur lors du chargement des préférences:', error);
        throw error;
      })
    );
  }

  updateUserPreferences(userId: string, preferences: PreferencesFormData): Observable<NotificationPreferences> {
    return this.apiService.put<NotificationResponse<{ preferences: UserPreferencesResponse }>>(
      `/users/${userId}/email-preferences`,
      { appointment_reminder: preferences }
    ).pipe(
      map(response => response.data.preferences.appointment_reminder),
      catchError(error => {
        console.error('Erreur lors de la mise à jour des préférences:', error);
        throw error;
      })
    );
  }

  getPendingReminders(limit: number = 20): Observable<RemindersListResponse> {
    return this.apiService.get<NotificationResponse<RemindersListResponse>>(
      `/email-reminders/pending`,
      { params: { limit: limit.toString() } }
    ).pipe(
      map(response => {
        this.notificationCountSubject.next(response.data.count);
        return response.data;
      }),
      catchError(error => {
        console.error('Erreur lors du chargement des rappels en attente:', error);
        throw error;
      })
    );
  }

  getSentReminders(limit: number = 50, days: number = 30): Observable<PendingReminder[]> {
    return this.apiService.get<NotificationResponse<RemindersListResponse>>(
      `/email-reminders/sent`,
      { params: { limit: limit.toString(), days: days.toString() } }
    ).pipe(
      map(response => response.data.reminders),
      catchError(error => {
        console.error('Erreur lors du chargement de l\'historique des rappels:', error);
        throw error;
      })
    );
  }

  getReminderStatistics(days: number = 30): Observable<ReminderStatistics> {
    return this.apiService.get<NotificationResponse<ReminderStatistics>>(
      `/email-reminders/statistics`,
      { params: { days: days.toString() } }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Erreur lors du chargement des statistiques:', error);
        throw error;
      })
    );
  }

  refreshNotificationCount(): void {
    this.getPendingReminders(1).subscribe();
  }

  validateTiming(timing: number[]): string[] {
    const errors: string[] = [];
    if (timing.length === 0) {
      errors.push("Au moins un timing doit être sélectionné");
    }
    if (timing.length > 5) {
      errors.push("Maximum 5 timings autorisés");
    }
    timing.forEach(time => {
      if (time < 1 || time > 10080) {
        errors.push("Les timings doivent être entre 1 minute et 1 semaine");
      }
    });
    return errors;
  }
}