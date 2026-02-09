// Call types
export type CallType = 'entrant' | 'sortant';
export type CallStatus = 'nouveau' | 'en_cours' | 'en_attente' | 'resolu' | 'cloture' | 'a_rappeler';
export type CallUrgency = 'basse' | 'normale' | 'haute' | 'critique';

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
  object: string;
  summary: string;
  status: CallStatus;
  urgency: CallUrgency;
  resolution_summary?: string;
  scheduled_callback_date?: string;
  scheduled_callback_time?: string;
  callback_reason?: string;
  callback_notes?: string;
  callback_attempts: number;
  last_callback_at?: string;
  call_duration?: number;
  notes_count?: number;
  created_by: number;
  closed_by?: number;
  closed_at?: string;
  created_at: string;
  updated_at: string;
  
  // Relationships
  department?: Department;
  assignee?: User;
  client?: Client;
  creator?: User;
  motif?: CallMotif;
}

// Create Call Request
export interface CreateCallRequest {
  type: CallType;
  phone_number: string;
  caller_name?: string;
  caller_email?: string;
  client_id?: number;
  contact_id?: number;
  department_id: number;
  motif_id?: number;
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

// Change Status Request
export interface ChangeStatusRequest {
  status: CallStatus;
  resolution_summary?: string;
}

// Schedule Callback Request
export interface ScheduleCallbackRequest {
  scheduled_callback_date: string;
  scheduled_callback_time: string;
  callback_reason: string;
  callback_notes?: string;
}

// Close Call Request
export interface CloseCallRequest {
  resolution_summary: string;
}

// Callback Result Request
export interface CallbackResultRequest {
  callback_result: string;
  next_action: string;
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
}

export interface User {
  id: number;
  name: string;
  email: string;
  status: string;
  department_id?: number;
}

export interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  sector?: string;
}

// Call Note
export interface CallNote {
  id: number;
  call_id: number;
  user_id: number;
  note: string;
  is_important: boolean;
  created_at: string;
  user?: User;
}