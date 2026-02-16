/**
 * Interfaces for EPIC 9: Manager Reporting
 */

export interface PeriodRange {
  start: string;
  end: string;
}

export interface EvolutionKPI {
  current: number;
  previous: number;
  evolution: number; // Percentage
}

export interface ManagerDashboardData {
  period: PeriodRange;
  kpis: {
    total_volume: EvolutionKPI;
    response_rate: string;
    resolution_rate: string;
  };
  graphs: {
    evolution: Record<string, number>; // Date -> Count
    distribution_type: Record<string, number>; // e.g., "entrant" -> 11
  };
}

export interface AgentPerformance {
  agent_id: number;
  name: string;
  calls_count: number;
  load_status: 'vert' | 'orange' | 'rouge'; // Color mapping
}

export interface HeatmapItem {
  hour: number;
  count: number;
}

export interface SatisfactionStat {
  client_satisfaction: string | null;
  count: number;
}

export interface MotifItem {
  object: string;
  count: number;
}

export interface MotifsReportData {
  top_motifs: MotifItem[];
  satisfaction_stats: SatisfactionStat[];
}