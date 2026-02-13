import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiService } from '../../core/api/api.service';

// Types correspondant aux réponses de l'API backend
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface CommercialOverviewResponse {
  metrics: {
    total_active_clients: number;
    total_prospects: number;
    new_clients_this_period: number;
    total_suppliers: number;
  };
  period_info: {
    period: string;
    start_date: string;
    end_date: string;
  };
}

export interface CommercialStatsResponse {
  clients_by_status: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  clients_by_type: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  clients_by_sector: Array<{
    sector: string;
    count: number;
    percentage: number;
  }>;
}

export interface ClientsEvolutionResponse {
  evolution_data: Array<{
    date: string;
    period: string;
    total_clients: number;
    new_clients: number;
    active_clients: number;
  }>;
  period: string;
  date_range: {
    start: string;
    end: string;
  };
}

export interface RecentInteractionsResponse {
  interactions: Array<{
    id: number;
    type: string;
    client_id: number;
    client_name: string;
    subject: string;
    summary: string;
    created_at: string;
    created_by: string;
  }>;
  total_found: number;
}

export interface InactiveClientsResponse {
  clients: Array<{
    id: number;
    name: string;
    last_interaction_date: string;
    days_without_interaction: number;
    assigned_commercial: string;
  }>;
  total_found: number;
}

export interface PersonalOverviewResponse {
  metrics: {
    my_active_clients: number;
    my_prospects: number;
    my_appointments_upcoming: number;
    my_interactions_this_period: number;
  };
  period_info: {
    period: string;
    start_date: string;
    end_date: string;
  };
  user_id: number;
}

export interface PersonalPortfolioResponse {
  portfolio_evolution: Array<{
    date: string;
    period: string;
    clients_count: number;
    new_clients: number;
    interactions_count: number;
  }>;
  performance_metrics: {
    avg_interactions_per_client: number;
    most_active_day: string;
    conversion_rate: number;
    total_clients: number;
    clients_with_interactions: number;
  };
}


export interface UpcomingAppointmentsResponse {
  appointments: Array<{
    id: number;
    client_id: number;
    client_name: string;
    subject: string;
    scheduled_at: string;
    status: string;
    priority: string;
    location: string;
  }>;
  total_found: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardApiService {
  private readonly baseUrl = `${environment.api.baseUrl}/dashboard`;

  constructor(
    private http: HttpClient,
    private apiService: ApiService
  ) {}

  /**
   * Obtient les headers avec authentification pour les requêtes
   */
  private getAuthHeaders(): HttpHeaders {
    const authHeaders = this.apiService.getAuthHeaders();
    let headers = new HttpHeaders({
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    });

    // Ajouter le token d'authentification si disponible
    if (authHeaders['Authorization']) {
      headers = headers.set('Authorization', authHeaders['Authorization']);
    }

    return headers;
  }

  // ===== DASHBOARD COMMERCIAL (MANAGER) =====

  /**
   * Récupère les métriques clés pour le dashboard manager
   */
  getCommercialOverview(period: string = 'month', startDate?: string, endDate?: string): Observable<CommercialOverviewResponse> {
    let params = new HttpParams().set('period', period);

    if (startDate && endDate) {
      params = params.set('start_date', startDate).set('end_date', endDate);
    }

    return this.http.get<ApiResponse<CommercialOverviewResponse>>(`${this.baseUrl}/commercial/overview`, {
      params,
      headers: this.getAuthHeaders()
    }).pipe(map(response => response.data));
  }

  /**
   * Récupère les statistiques de répartition pour graphiques
   */
  getCommercialStats(): Observable<CommercialStatsResponse> {
    return this.http.get<ApiResponse<CommercialStatsResponse>>(`${this.baseUrl}/commercial/stats`, {
      headers: this.getAuthHeaders()
    }).pipe(map(response => response.data));
  }

  /**
   * Récupère l'évolution temporelle des clients
   */
  getClientsEvolution(period: string = 'month'): Observable<ClientsEvolutionResponse> {
    const params = new HttpParams().set('period', period);

    return this.http.get<ApiResponse<ClientsEvolutionResponse>>(`${this.baseUrl}/commercial/clients-evolution`, {
      params,
      headers: this.getAuthHeaders()
    }).pipe(map(response => response.data));
  }

  /**
   * Récupère les interactions récentes sur l'ensemble du CRM
   */
  getRecentInteractions(limit: number = 10): Observable<RecentInteractionsResponse> {
    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<ApiResponse<RecentInteractionsResponse>>(`${this.baseUrl}/commercial/interactions/recent`, {
      params,
      headers: this.getAuthHeaders()
    }).pipe(map(response => response.data));
  }

  /**
   * Récupère les clients sans interactions récentes
   */
  getInactiveClients(days: number = 30, limit: number = 20): Observable<InactiveClientsResponse> {
    const params = new HttpParams()
      .set('days', days.toString())
      .set('limit', limit.toString());

    return this.http.get<ApiResponse<InactiveClientsResponse>>(`${this.baseUrl}/commercial/clients/inactive`, {
      params,
      headers: this.getAuthHeaders()
    }).pipe(map(response => response.data));
  }

  // ===== DASHBOARD PERSONNEL (COMMERCIAL) =====

  /**
   * Récupère les métriques personnelles filtrées sur l'utilisateur
   */
  getPersonalOverview(period: string = 'month'): Observable<PersonalOverviewResponse> {
    const params = new HttpParams().set('period', period);

    return this.http.get<ApiResponse<PersonalOverviewResponse>>(`${this.baseUrl}/personal/overview`, {
      params,
      headers: this.getAuthHeaders()
    }).pipe(map(response => response.data));
  }

  /**
   * Récupère l'évolution du portefeuille personnel
   */
  getPersonalPortfolio(period: string = 'month'): Observable<PersonalPortfolioResponse> {
    const params = new HttpParams().set('period', period);

    return this.http.get<ApiResponse<PersonalPortfolioResponse>>(`${this.baseUrl}/personal/portfolio`, {
      params,
      headers: this.getAuthHeaders()
    }).pipe(map(response => response.data));
  }


  /**
   * Récupère les RDV à venir
   */
  getUpcomingAppointments(days: number = 7, limit: number = 10): Observable<UpcomingAppointmentsResponse> {
    const params = new HttpParams()
      .set('days', days.toString())
      .set('limit', limit.toString());

    return this.http.get<ApiResponse<UpcomingAppointmentsResponse>>(`${this.baseUrl}/personal/appointments/upcoming`, {
      params,
      headers: this.getAuthHeaders()
    }).pipe(map(response => response.data));
  }

  /**
   * Récupère les interactions récentes de l'utilisateur
   */
  getMyRecentInteractions(limit: number = 10): Observable<RecentInteractionsResponse> {
    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<ApiResponse<RecentInteractionsResponse>>(`${this.baseUrl}/personal/interactions/recent`, {
      params,
      headers: this.getAuthHeaders()
    }).pipe(map(response => response.data));
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Combine plusieurs appels API pour le dashboard manager
   */
  getFullCommercialDashboard(period: string = 'month'): Observable<{
    overview: CommercialOverviewResponse;
    stats: CommercialStatsResponse;
    evolution: ClientsEvolutionResponse;
    interactions: RecentInteractionsResponse;
    inactive: InactiveClientsResponse;
  }> {
    return this.http.get<any>(`${this.baseUrl}/commercial/full?period=${period}`, {
      headers: this.getAuthHeaders()
    }).pipe(map(response => response.data));
  }

  /**
   * Combine plusieurs appels API pour le dashboard personnel
   */
  getFullPersonalDashboard(period: string = 'month'): Observable<{
    overview: PersonalOverviewResponse;
    portfolio: PersonalPortfolioResponse;
    appointments: UpcomingAppointmentsResponse;
    interactions: RecentInteractionsResponse;
  }> {
    return this.http.get<any>(`${this.baseUrl}/personal/full?period=${period}`, {
      headers: this.getAuthHeaders()
    }).pipe(map(response => response.data));
  }
}