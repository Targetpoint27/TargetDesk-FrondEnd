import { Component, OnInit, OnDestroy, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthFacade } from '../../../features/auth/auth.facade';
import {
  PendingReminder,
  NotificationPreferences,
  PreferencesFormData,
  TIMING_PRESETS
} from '../../../core/interfaces/notification.interface';

@Component({
  selector: 'app-notification-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-modal.component.html',
  styleUrl: './notification-modal.component.scss'
})
export class NotificationModalComponent implements OnInit, OnDestroy {
  @Output() closeModal = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  // Tab management
  activeTab: 'pending' | 'sent' | 'preferences' = 'pending';

  // Data observables
  pendingReminders: PendingReminder[] = [];
  sentReminders: PendingReminder[] = [];
  preferences: NotificationPreferences | null = null;

  // Loading states
  loading = {
    pending: false,
    sent: false,
    preferences: false,
    saving: false
  };

  // Form data for preferences
  preferencesForm: PreferencesFormData = {
    timing: [],
    email_enabled: true
  };

  // Available timing presets
  timingPresets = TIMING_PRESETS;

  // Current user ID
  currentUserId: string | null = null;

  constructor(
    private notificationService: NotificationService,
    private authFacade: AuthFacade,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Get current user ID
    this.authFacade.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user?.id) {
          this.currentUserId = user.id;
          this.loadUserPreferences();
        }
      });

    this.loadPendingReminders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Tab management
  setActiveTab(tab: 'pending' | 'sent' | 'preferences'): void {
    this.activeTab = tab;

    switch (tab) {
      case 'sent':
        this.loadSentReminders();
        break;
      case 'preferences':
        this.loadUserPreferences();
        break;
    }
  }

  // Data loading methods
  loadPendingReminders(): void {
    this.loading.pending = true;
    this.notificationService.getPendingReminders(20)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.pendingReminders = data.reminders;
          this.loading.pending = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Erreur lors du chargement des rappels en attente:', error);
          this.loading.pending = false;
          this.cdr.detectChanges();
        }
      });
  }

  loadSentReminders(): void {
    if (this.loading.sent) return;

    this.loading.sent = true;
    this.notificationService.getSentReminders(50, 30)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reminders) => {
          this.sentReminders = reminders;
          this.loading.sent = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Erreur lors du chargement de l\'historique:', error);
          this.loading.sent = false;
          this.cdr.detectChanges();
        }
      });
  }


  loadUserPreferences(): void {
    if (!this.currentUserId || this.loading.preferences) return;

    this.loading.preferences = true;
    this.notificationService.getUserPreferences(this.currentUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (preferences) => {
          this.preferences = preferences;
          this.preferencesForm = {
            timing: [...preferences.timing],
            email_enabled: preferences.email_enabled
          };
          this.loading.preferences = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Erreur lors du chargement des préférences:', error);
          this.loading.preferences = false;
          this.cdr.detectChanges();
        }
      });
  }

  // Preferences management
  onTimingChange(value: number, checked: boolean): void {
    if (checked) {
      if (!this.preferencesForm.timing.includes(value)) {
        this.preferencesForm.timing.push(value);
        this.preferencesForm.timing.sort((a, b) => a - b);
      }
    } else {
      this.preferencesForm.timing = this.preferencesForm.timing.filter(t => t !== value);
    }
  }

  isTimingSelected(value: number): boolean {
    return this.preferencesForm.timing.includes(value);
  }

  savePreferences(): void {
    if (!this.currentUserId || this.loading.saving) return;

    // Validate form
    const errors = this.notificationService.validateTiming(this.preferencesForm.timing);
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    this.loading.saving = true;
    this.notificationService.updateUserPreferences(this.currentUserId, this.preferencesForm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedPreferences) => {
          this.preferences = updatedPreferences;
          this.loading.saving = false;
          this.cdr.detectChanges();
          alert('Préférences sauvegardées avec succès');
        },
        error: (error) => {
          console.error('Erreur lors de la sauvegarde:', error);
          this.loading.saving = false;
          this.cdr.detectChanges();
          alert('Erreur lors de la sauvegarde des préférences');
        }
      });
  }

  // Utility methods
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('fr-FR');
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // Modal actions
  onClose(): void {
    this.closeModal.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}