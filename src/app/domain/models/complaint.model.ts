export type ComplaintStatus = 'ouverte' | 'en_analyse' | 'resolue' | 'cloture';
export type ComplaintSeverity = 'faible' | 'moyen' | 'eleve' | 'critique';
export type ComplaintCategory = 
  | 'produit_defectueux' 
  | 'service_insatisfaisant' 
  | 'livraison_retard' 
  | 'facturation_erronee' 
  | 'comportement_personnel' 
  | 'autre';

export interface ComplaintMetrics {
  total: number;
  overdue_count: number;
  pending_count?: number;
}

export interface ComplaintListResponse {
  data: Complaint[];
  metrics: ComplaintMetrics;
}

export interface Complaint {
  id: number;
  complaint_id: string; 
  complaint_number: string;
  call_id: number;
  client_id: number | null;
  client_name: string;
  category: ComplaintCategory;
  category_label: string;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  status_label: string;
  description: string;
  root_cause: string | null;
  actions_taken: string | null;
  proposed_solution: string | null;
  sla_deadline: string; 
  is_overdue: boolean;  
  sla_text: string;     
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  client?: any; 
  assigned_agent?: any; 
}

export interface StoreComplaintRequest {
  call_id: number;
  client_id?: number;
  category: ComplaintCategory;
  severity: ComplaintSeverity;
  description: string;
}

export interface ProcessComplaintRequest {
  status: 'en_analyse';
  assigned_to: number;
  root_cause: string;
  actions_taken: string;
  proposed_solution: string;
}