/**
 * Dashboard Interface Definitions
 * Interfaces pour les données du dashboard commercial et personnel
 */

// ===== TYPES DE BASE =====

export type PeriodType = 'month' | 'quarter' | 'year' | 'custom';

export interface PeriodInfo {
  period: PeriodType;
  start_date: string;
  end_date: string;
}

// ===== DASHBOARD COMMERCIAL =====

export interface CommercialMetrics {
  total_active_clients: number;
  total_prospects: number;
  new_clients_this_period: number;
  total_suppliers: number;
}

export interface CommercialOverviewResponse {
  success: boolean;
  message: string;
  data: {
    metrics: CommercialMetrics;
    period_info: PeriodInfo;
  };
}

// Statistiques de répartition
export interface StatItem {
  status?: string;
  type?: string;
  sector?: string;
  count: number;
  percentage: number;
}

export interface CommercialStats {
  clients_by_status: StatItem[];
  clients_by_type: StatItem[];
  clients_by_sector: StatItem[];
}

export interface CommercialStatsResponse {
  success: boolean;
  data: CommercialStats;
}

// Évolution des clients
export interface EvolutionDataPoint {
  date: string;
  period: string;
  total_clients: number;
  new_clients: number;
  active_clients: number;
}

export interface ClientsEvolution {
  evolution_data: EvolutionDataPoint[];
  period: PeriodType;
  date_range: {
    start: string;
    end: string;
  };
}

export interface ClientsEvolutionResponse {
  success: boolean;
  data: ClientsEvolution;
}

// Interactions récentes
export interface RecentInteraction {
  id: number;
  type: string;
  client_id: number;
  client_name: string;
  subject: string;
  summary: string;
  created_at: string;
  created_by: string;
}

export interface RecentInteractionsData {
  interactions: RecentInteraction[];
  total_found: number;
}

export interface RecentInteractionsResponse {
  success: boolean;
  data: RecentInteractionsData;
}

// Clients inactifs
export interface InactiveClient {
  id: number;
  name: string;
  email: string;
  last_interaction_date: string;
  days_since_last_interaction: number;
  status: string;
}

export interface InactiveClientsData {
  clients: InactiveClient[];
  total_found: number;
  days_threshold: number;
}

export interface InactiveClientsResponse {
  success: boolean;
  data: InactiveClientsData;
}

// ===== DASHBOARD PERSONNEL =====

export interface PersonalMetrics {
  my_active_clients: number;
  my_prospects: number;
  my_appointments_upcoming: number;
  my_interactions_this_period: number;
}

export interface PersonalOverviewResponse {
  success: boolean;
  data: {
    metrics: PersonalMetrics;
    period_info: PeriodInfo;
    user_id: number;
  };
}

// Portfolio personnel
export interface PortfolioDataPoint {
  date: string;
  period: string;
  clients_count: number;
  new_clients: number;
  interactions_count: number;
}

export interface PerformanceMetrics {
  avg_interactions_per_client: number;
  most_active_day: string;
  conversion_rate: number;
  total_clients: number;
  clients_with_interactions: number;
}

export interface PersonalPortfolio {
  portfolio_evolution: PortfolioDataPoint[];
  performance_metrics: PerformanceMetrics;
}

export interface PersonalPortfolioResponse {
  success: boolean;
  data: PersonalPortfolio;
}


// RDV à venir
export interface UpcomingAppointment {
  id: number;
  client_id: number;
  client_name: string;
  subject: string;
  scheduled_at: string;
  status: string;
  priority: string;
  location?: string;
}

export interface UpcomingAppointmentsData {
  appointments: UpcomingAppointment[];
  total_found: number;
  days_ahead: number;
}

export interface UpcomingAppointmentsResponse {
  success: boolean;
  data: UpcomingAppointmentsData;
}

// ===== WIDGETS & CONFIGURATION =====

export type WidgetType = 'metric' | 'chart' | 'list';
export type WidgetSize = 'small' | 'medium' | 'large';

export interface WidgetConfig {
  id: string;
  title: string;
  type: WidgetType;
  size: WidgetSize;
  endpoint: string;
  refreshInterval?: number;
  chartType?: 'line' | 'bar' | 'doughnut' | 'pie';
  clickAction?: {
    route: string;
    params?: Record<string, string>;
  };
}

export interface DashboardConfig {
  type: 'commercial' | 'personal';
  widgets: WidgetConfig[];
  autoRefresh: boolean;
  refreshInterval: number;
}

// ===== PARAMÈTRES DE REQUÊTE =====

export interface DashboardQueryParams {
  period?: PeriodType;
  start_date?: string;
  end_date?: string;
  limit?: number;
  days?: number;
}

// ===== GESTION D'ÉTAT =====

export interface DashboardState {
  commercial: {
    overview: CommercialMetrics | null;
    stats: CommercialStats | null;
    evolution: ClientsEvolution | null;
    interactions: RecentInteractionsData | null;
    inactiveClients: InactiveClientsData | null;
    loading: boolean;
    error: string | null;
  };
  personal: {
    overview: PersonalMetrics | null;
    portfolio: PersonalPortfolio | null;
    upcomingAppointments: UpcomingAppointmentsData | null;
    interactions: RecentInteractionsData | null;
    loading: boolean;
    error: string | null;
  };
  filters: {
    period: PeriodType;
    start_date?: string;
    end_date?: string;
  };
  config: DashboardConfig;
}

// ===== HELPERS =====

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    [key: string]: any;
  }[];
}

export interface MetricCard {
  title: string;
  value: number;
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon?: string;
  route?: string;
  color?: string;
}