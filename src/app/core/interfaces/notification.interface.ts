export interface NotificationPreferences {
  timing: number[];
  email_enabled: boolean;
  is_active: boolean;
  formatted_timing: string[];
}

export interface PreferencesFormData {
  timing: number[];
  email_enabled: boolean;
}

export interface PendingReminder {
  id: number;
  appointment_id: number;
  type: string;
  formatted_type: string;
  scheduled_for: string;
  email_to: string;
  appointment: {
    id: number;
    title: string;
    scheduled_at: string;
    client_name: string;
    status: string;
  };
}

export interface ReminderStatistics {
  period_days: number;
  total_reminders: number;
  sent_reminders: number;
  failed_reminders: number;
  pending_reminders: number;
  success_rate: number;
  failure_rate: number;
}

export interface NotificationResponse<T> {
  success: boolean;
  data: T;
}

export interface UserPreferencesResponse {
  user_id: string;
  appointment_reminder: NotificationPreferences;
}

export interface RemindersListResponse {
  reminders: PendingReminder[];
  count: number;
}

export const TIMING_PRESETS = [
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "1 heure", value: 60 },
  { label: "2 heures", value: 120 },
  { label: "1 jour", value: 1440 },
  { label: "1 semaine", value: 10080 }
];