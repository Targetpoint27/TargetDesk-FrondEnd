import { Call } from './call.model';

export interface AgentTeamView {
  id: number;
  name: string;
  status: 'active' | 'inactive' | 'unknown';
  calls_today: number;
  active_calls: number;
  avg_handling_time: string;
  load_status: 'vert' | 'orange' | 'rouge';
  last_activity: string | null;
}

export interface TeamKPIs {
  total_calls: number;
  missed_calls: number;
  response_rate: string;
  avg_wait_time: string;
  sla_compliance: string;
}

export interface TeamStats {
  kpis: TeamKPIs;
  graphs: {
    volume_evolution: Record<string, number>;
    status_distribution: Record<string, number>;
  };
}

export interface SupervisorComplaint {
  id: number;
  complaint_id: string;
  category: string;
  severity: 'faible' | 'moyen' | 'eleve' | 'critique';
  status: 'ouverte' | 'en_analyse' | 'en_attente_client' | 'en_attente_interne' | 'resolue' | 'cloture';
  sla_deadline: string;
  sla_status: 'ok' | 'overdue';
  description: string;
  call: Call;
  assigned_agent: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface ReassignCallRequest {
  new_agent_id: number;
  reason: string;
}