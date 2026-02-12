// Call types
export type CallType = 'entrant' | 'sortant';
export type CallStatus = 'nouveau' | 'a_traiter' | 'en_cours' | 'en_attente' | 'resolu' | 'cloture' | 'a_rappeler' | 'annule';
export type CallUrgency = 'normal' | 'urgent' | 'critique';

// Call interface
export interface Call {
  id: number;
  call_id: string;
  type: CallType;
  phone_number: string;
  caller_name?: string;
  caller_email?: string;
  client_id?: number;
  contact_id?: number;
  department_id: number;
  assigned_to?: number;
  motif_id?: number;
  custom_motif?: string;
  object: string;
  summary: string;
  status: CallStatus;
  urgency: CallUrgency;
  resolution_summary?: string;
  final_result?: string;
  is_overdue?: boolean;
  time_until?: string;
  
  // Callback fields
  scheduled_callback_date?: string;
  scheduled_callback_time?: string;
  callback_reason?: string;
  callback_notes?: string;
  callback_attempts: number;
  last_callback_at?: string;
  
  // Outbound fields
  outbound_reason?: string;
  call_result?: string;
  call_duration_seconds?: number;
  
  // Related to
  related_to_type?: string;
  related_to_id?: number;
  
  // Timestamps
  created_by: number;
  closed_by?: number;
  closed_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  reopened_at?: string;
  
  // Treatment
  treatment_time_seconds?: number;
  reopen_reason?: string;
  
  // Meta
  notes_count?: number;
  time_elapsed?: string;
  is_active?: boolean;
  
  // Relationships
  department?: Department;
  assignee?: User;
  assigned_agent?: User;
  client?: Client;
  contact?: any;
  creator?: User;
  closer?: User;
  motif?: CallMotif;
  notes?: CallNote[];
}

// Create Call Request
export interface CreateCallRequest {
  type: CallType;
  phone_number: string;
  caller_name?: string;
  caller_email?: string;
  client_id?: number;
  contact_id?: number;
  custom_motif?: string;
  motif_id?: number;
  outbound_reason?: string;
  call_result?: string;
  call_duration_seconds?: number;
  department_id: number;
  object: string;
  summary: string;
  urgency?: CallUrgency;
}

// Update Call Request
export interface UpdateCallRequest {
  phone_number?: string;
  caller_name?: string;
  caller_email?: string;
  department_id?: number;
  assigned_to?: number;
  motif_id?: number;
  object?: string;
  summary?: string;
  urgency?: CallUrgency;
}

// Store Missed Call Request
export interface StoreMissedCallRequest {
  phone_number: string;
  department_id: number;
  caller_name?: string;
  notes?: string;
  client_id?: number;
}

// Change Status Request
export interface ChangeStatusRequest {
  status: CallStatus;
  resolution_summary?: string;
  comment?: string;
}

// Schedule Callback Request
export interface ScheduleCallbackRequest {
  date: string;
  time: string;
  reason?: string;
  notes?: string;
}

// Close Call Request
export interface CloseCallRequest {
  resolution_summary: string;
  final_result: 'resolu_satisfait' | 'resolu_insatisfait' | 'transfere' | 'non_resolu';
}

// Callback Result Request
export interface CallbackResultRequest {
  call_result: string;
  summary: string;
  reschedule_date?: string;
  reschedule_time?: string;
}

// API Response types
export interface CallResponse {
  success: boolean;
  message: string;
  data: Call;
}

export interface CallListResponse {
  success: boolean;
  message: string;
  data: Call[];
}

// Supporting models
export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  manager_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CallMotif {
  id: number;
  label: string;
  category: 'info' | 'reclamation' | 'support' | 'commercial' | 'autre';
  parent_id?: number;
  department_id?: number;
  sla_hours?: number;
  suggested_script?: string;
  display_order: number;
  is_active: boolean;
  children?: CallMotif[];
  parent?: CallMotif;
  department?: Department;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  email_verified_at?: string;
  status: string;
  department_id?: number;
  phone?: string;
  department?: Department | null;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Client {
  id: number;
  name: string;
  client_id?: string;
  email?: string;
  phone?: string;
  sector?: string;
  type?: 'particulier' | 'entreprise';
}

// Call Note
export interface CallNote {
  id: number;
  call_id: number;
  note: string;
  is_important: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  creator?: User;
}

export interface LinkClientRequest {
  client_id: number;
}

export interface ClientResponse {
  success: boolean;
  message: string;
  data: Client;
}