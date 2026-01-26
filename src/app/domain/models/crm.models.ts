/**
 * Modèles de domaine CRM - Notes, Appels, Rendez-vous, Timeline
 */

// Types de base
export type NoteType = 'normal' | 'important' | 'private';
export type CallType = 'incoming' | 'outgoing' | 'missed';
export type CallOutcome = 'positive' | 'neutral' | 'negative' | 'no_answer';
export type AppointmentType = 'commercial' | 'support' | 'demo' | 'negotiation' | 'closing' | 'other';
export type AppointmentStatus = 'planned' | 'confirmed' | 'completed' | 'cancelled' | 'postponed';
export type TimelineType = 'note' | 'call' | 'appointment' | 'email' | 'opportunity' | 'modification';
export type ImportanceLevel = 'low' | 'normal' | 'high' | 'critical';
export type PrivacyLevel = 'public' | 'private' | 'team';

// Entité Utilisateur pour les relations
export interface CrmUser {
  id: number;
  name: string;
  email?: string;
}

// Modèle Pièce jointe
export interface NoteAttachment {
  id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  description?: string;
  download_url: string;
  created_at: string;
}

// Modèles Notes Client
export interface ClientNote {
  id: number;
  title: string;
  content: string;
  type: NoteType;
  is_pinned: boolean;
  attachments_count: number;
  created_at: string;
  updated_at: string;
  user: CrmUser;
  attachments: NoteAttachment[];
}

export interface CreateNoteRequest {
  title: string;
  content: string;
  type: NoteType;
  is_pinned?: boolean;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  type?: NoteType;
  is_pinned?: boolean;
}

export interface NoteFilters {
  type?: NoteType;
  pinned_only?: boolean;
  per_page?: number;
}

// Modèles Appels Client
export interface ClientCall {
  id: number;
  contact_id?: number;
  phone_number: string;
  type: CallType;
  called_at: string;
  duration: number; // en minutes
  subject: string;
  summary?: string;
  outcome: CallOutcome;
  follow_up_required: boolean;
  follow_up_date?: string;
  follow_up_completed: boolean;
  created_at: string;
  updated_at: string;
  user: CrmUser;
  contact?: {
    id: number;
    name: string;
    email?: string;
  };
}

export interface CreateCallRequest {
  contact_id?: number;
  phone_number: string;
  type: CallType;
  called_at?: string;
  duration: number;
  subject: string;
  summary?: string;
  outcome: CallOutcome;
  follow_up_required?: boolean;
  follow_up_date?: string;
}

export interface UpdateCallRequest {
  contact_id?: number;
  phone_number?: string;
  type?: CallType;
  called_at?: string;
  duration?: number;
  subject?: string;
  summary?: string;
  outcome?: CallOutcome;
  follow_up_required?: boolean;
  follow_up_date?: string;
}

export interface CallFilters {
  type?: CallType;
  outcome?: CallOutcome;
  follow_up_required?: boolean;
  date_from?: string;
  date_to?: string;
  per_page?: number;
}

export interface CallStats {
  total_calls: number;
  outgoing_calls: number;
  positive_calls: number;
  pending_follow_ups: number;
  total_duration: number;
}

// Modèles Rendez-vous Client
export interface AppointmentParticipant {
  contact_id?: number;
  name?: string;
  email?: string;
}

export interface ClientAppointment {
  id: number;
  title: string;
  description?: string;
  scheduled_at: string;
  duration: number;
  location?: string;
  type: AppointmentType;
  status: AppointmentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  user: CrmUser;
  participants: AppointmentParticipant[];
}

export interface CreateAppointmentRequest {
  title: string;
  description?: string;
  scheduled_at: string;
  duration: number;
  location?: string;
  type: AppointmentType;
  participants?: AppointmentParticipant[];
}

export interface UpdateAppointmentRequest {
  title?: string;
  description?: string;
  scheduled_at?: string;
  duration?: number;
  location?: string;
  type?: AppointmentType;
  participants?: AppointmentParticipant[];
}

export interface UpdateAppointmentStatusRequest {
  status: AppointmentStatus;
  notes?: string;
}

export interface AppointmentFilters {
  status?: AppointmentStatus;
  date_from?: string;
  date_to?: string;
  per_page?: number;
}

export interface AppointmentStats {
  total_appointments: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  this_month: number;
}

// Modèles Timeline Unifiée
export interface TimelineItem {
  id: number;
  type: TimelineType;
  title: string;
  summary: string;
  importance_level: ImportanceLevel;
  privacy_level: PrivacyLevel;
  occurred_at: string;
  metadata: {
    [key: string]: any;
  };
  user: CrmUser;
}

export interface TimelineFilters {
  type?: TimelineType;
  user_id?: number;
  date_from?: string;
  date_to?: string;
  per_page?: number;
  page?: number;
}

export interface TimelineStats {
  total_interactions: number;
  by_type: {
    [key in TimelineType]?: number;
  };
  by_month: {
    [month: string]: number;
  };
}

// Réponses API
export interface NotesResponse {
  current_page: number;
  data: ClientNote[];
  total: number;
  last_page: number;
  per_page: number;
}

export interface CallsResponse {
  calls: {
    current_page: number;
    data: ClientCall[];
    total: number;
    last_page: number;
    per_page: number;
  };
  stats: CallStats;
}

export interface AppointmentsResponse {
  appointments: {
    current_page: number;
    data: ClientAppointment[];
    total: number;
    last_page: number;
    per_page: number;
  };
  stats: AppointmentStats;
}

export interface TimelineResponse {
  timeline: {
    current_page: number;
    data: TimelineItem[];
    total: number;
    last_page: number;
    per_page: number;
  };
  stats: TimelineStats;
}

// Réponses Dashboard
export interface DashboardCallsResponse {
  data: ClientCall[];
  total: number;
}

export interface DashboardAppointmentsResponse {
  data: ClientAppointment[];
  total: number;
}

export interface DashboardInteractionsResponse {
  data: TimelineItem[];
  total: number;
}

// Upload de fichiers
export interface UploadAttachmentRequest {
  file: File;
  description?: string;
}

// Export timeline
export interface TimelineExportRequest {
  format?: 'csv' | 'xlsx';
  type?: TimelineType;
  date_from?: string;
  date_to?: string;
}

export interface TimelineExportResponse {
  filename: string;
  format: string;
  records_count: number;
  download_url: string;
  metadata: TimelineExportMetadata;
  preview_data: ExportPreviewData[];
  columns: string[];
}

export interface TimelineExportMetadata {
  exported_at: string;
  exported_by: string;
  client_info: {
    id: number;
    client_id: string;
    name: string;
  };
  date_range: {
    from: string;
    to: string;
  };
  types_included: TimelineType[];
  total_by_type: {
    [key in TimelineType]?: number;
  };
}

export interface ExportPreviewData {
  Date: string;
  Type: string;
  Titre: string;
  Résumé: string;
  Utilisateur: string;
  Importance: string;
  Confidentialité: string;
  'Lien détail': string;
}