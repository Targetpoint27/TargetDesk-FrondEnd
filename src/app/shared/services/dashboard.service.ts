import { Injectable, signal } from '@angular/core';
import { Observable, BehaviorSubject, catchError, throwError, map } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import {
  PeriodType,
  DashboardQueryParams,
  CommercialOverviewResponse,
  CommercialStatsResponse,
  ClientsEvolutionResponse,
  RecentInteractionsResponse,
  InactiveClientsResponse,
  PersonalOverviewResponse,
  PersonalPortfolioResponse,
  TodayTasksResponse,
  UpcomingAppointmentsResponse
} from '../interfaces/dashboard.interface';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly baseUrl = '/dashboard';

  // Signaux pour gestion d'état réactive
  loading = signal(false);
  error = signal<string | null>(null);

  constructor(private apiService: ApiService) {}

  // ===== DASHBOARD COMMERCIAL =====

  /**
   * Récupère les métriques principales du dashboard commercial
   */
  getCommercialOverview(params: DashboardQueryParams = {}): Observable<CommercialOverviewResponse> {
    this.setLoading(true);

    const queryParams = this.buildQueryParams(params);

    return this.apiService.get<CommercialOverviewResponse>(`${this.baseUrl}/commercial/overview`, {
      params: queryParams
    }).pipe(
      map(response => {
        this.setLoading(false);
        this.setError(null);
        return response;
      }),
      catchError(error => {
        this.setLoading(false);
        this.setError(this.handleError(error));
        return throwError(() => error);
      })
    );
  }

  /**
   * Récupère les statistiques de répartition
   */
  getCommercialStats(params: DashboardQueryParams = {}): Observable<CommercialStatsResponse> {
    this.setLoading(true);

    const queryParams = this.buildQueryParams(params);

    return this.apiService.get<CommercialStatsResponse>(`${this.baseUrl}/commercial/stats`, {
      params: queryParams
    }).pipe(
      map(response => {
        this.setLoading(false);
        this.setError(null);
        return response;
      }),
      catchError(error => {
        this.setLoading(false);
        this.setError(this.handleError(error));
        return throwError(() => error);
      })
    );
  }

  /**
   * Récupère l'évolution des clients dans le temps
   */
  getClientsEvolution(params: DashboardQueryParams = {}): Observable<ClientsEvolutionResponse> {
    this.setLoading(true);

    const queryParams = this.buildQueryParams(params);

    return this.apiService.get<ClientsEvolutionResponse>(`${this.baseUrl}/commercial/clients-evolution`, {
      params: queryParams
    }).pipe(
      map(response => {
        this.setLoading(false);
        this.setError(null);
        return response;
      }),
      catchError(error => {
        this.setLoading(false);
        this.setError(this.handleError(error));
        return throwError(() => error);
      })
    );
  }

  /**
   * Récupère les interactions récentes (vue commerciale)
   */
  getCommercialRecentInteractions(limit: number = 10): Observable<RecentInteractionsResponse> {
    this.setLoading(true);

    return this.apiService.get<RecentInteractionsResponse>(`${this.baseUrl}/commercial/interactions/recent`, {
      params: { limit: limit.toString() }
    }).pipe(
      map(response => {
        this.setLoading(false);
        this.setError(null);
        return response;
      }),
      catchError(error => {
        this.setLoading(false);
        this.setError(this.handleError(error));
        return throwError(() => error);
      })
    );
  }

  /**
   * Récupère les clients inactifs
   */
  getInactiveClients(days: number = 30, limit: number = 20): Observable<InactiveClientsResponse> {
    this.setLoading(true);

    return this.apiService.get<InactiveClientsResponse>(`${this.baseUrl}/commercial/clients/inactive`, {
      params: {
        days: days.toString(),
        limit: limit.toString()
      }
    }).pipe(
      map(response => {
        this.setLoading(false);
        this.setError(null);
        return response;
      }),
      catchError(error => {
        this.setLoading(false);
        this.setError(this.handleError(error));
        return throwError(() => error);
      })
    );
  }

  // ===== DASHBOARD PERSONNEL =====

  /**
   * Récupère les métriques personnelles
   */
  getPersonalOverview(params: DashboardQueryParams = {}): Observable<PersonalOverviewResponse> {
    this.setLoading(true);

    const queryParams = this.buildQueryParams(params);

    return this.apiService.get<PersonalOverviewResponse>(`${this.baseUrl}/personal/overview`, {
      params: queryParams
    }).pipe(
      map(response => {
        this.setLoading(false);
        this.setError(null);
        return response;
      }),
      catchError(error => {
        this.setLoading(false);
        this.setError(this.handleError(error));
        return throwError(() => error);
      })
    );
  }

  /**
   * Récupère l'évolution du portefeuille personnel
   */
  getPersonalPortfolio(params: DashboardQueryParams = {}): Observable<PersonalPortfolioResponse> {
    this.setLoading(true);

    const queryParams = this.buildQueryParams(params);

    return this.apiService.get<PersonalPortfolioResponse>(`${this.baseUrl}/personal/portfolio`, {
      params: queryParams
    }).pipe(
      map(response => {
        this.setLoading(false);
        this.setError(null);
        return response;
      }),
      catchError(error => {
        this.setLoading(false);
        this.setError(this.handleError(error));
        return throwError(() => error);
      })
    );
  }

  /**
   * Récupère les tâches du jour
   */
  getTodaysTasks(): Observable<TodayTasksResponse> {
    this.setLoading(true);

    return this.apiService.get<TodayTasksResponse>(`${this.baseUrl}/personal/tasks/today`).pipe(
      map(response => {
        this.setLoading(false);
        this.setError(null);
        return response;
      }),
      catchError(error => {
        this.setLoading(false);
        this.setError(this.handleError(error));
        return throwError(() => error);
      })
    );
  }

  /**
   * Récupère les RDV à venir
   */
  getUpcomingAppointments(days: number = 7, limit: number = 10): Observable<UpcomingAppointmentsResponse> {
    this.setLoading(true);

    return this.apiService.get<UpcomingAppointmentsResponse>(`${this.baseUrl}/personal/appointments/upcoming`, {
      params: {
        days: days.toString(),
        limit: limit.toString()
      }
    }).pipe(
      map(response => {
        this.setLoading(false);
        this.setError(null);
        return response;
      }),
      catchError(error => {
        this.setLoading(false);
        this.setError(this.handleError(error));
        return throwError(() => error);
      })
    );
  }

  /**
   * Récupère les interactions récentes personnelles
   */
  getPersonalRecentInteractions(limit: number = 10): Observable<RecentInteractionsResponse> {
    this.setLoading(true);

    return this.apiService.get<RecentInteractionsResponse>(`${this.baseUrl}/personal/interactions/recent`, {
      params: { limit: limit.toString() }
    }).pipe(
      map(response => {
        this.setLoading(false);
        this.setError(null);
        return response;
      }),
      catchError(error => {
        this.setLoading(false);
        this.setError(this.handleError(error));
        return throwError(() => error);
      })
    );
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Construit les paramètres de requête
   */
  private buildQueryParams(params: DashboardQueryParams): Record<string, string> {
    const queryParams: Record<string, string> = {};

    if (params.period) {
      queryParams['period'] = params.period;
    }

    if (params.start_date) {
      queryParams['start_date'] = params.start_date;
    }

    if (params.end_date) {
      queryParams['end_date'] = params.end_date;
    }

    if (params.limit) {
      queryParams['limit'] = params.limit.toString();
    }

    if (params.days) {
      queryParams['days'] = params.days.toString();
    }

    return queryParams;
  }

  /**
   * Gère les erreurs d'API
   */
  private handleError(error: any): string {
    console.error('Dashboard Service Error:', error);

    if (error?.error?.message) {
      return error.error.message;
    }

    if (error?.message) {
      return error.message;
    }

    switch (error.status) {
      case 401:
        return 'Session expirée. Veuillez vous reconnecter.';
      case 403:
        return 'Accès non autorisé aux données du dashboard.';
      case 404:
        return 'Données du dashboard non trouvées.';
      case 500:
        return 'Erreur serveur. Veuillez réessayer plus tard.';
      default:
        return 'Erreur lors du chargement des données du dashboard.';
    }
  }

  /**
   * Met à jour le state de chargement
   */
  private setLoading(loading: boolean): void {
    this.loading.set(loading);
  }

  /**
   * Met à jour le state d'erreur
   */
  private setError(error: string | null): void {
    this.error.set(error);
  }

  // ===== HELPERS POUR FORMATAGE =====

  /**
   * Formate une période pour l'affichage
   */
  formatPeriod(period: PeriodType): string {
    switch (period) {
      case 'month':
        return 'Ce mois';
      case 'quarter':
        return 'Ce trimestre';
      case 'year':
        return 'Cette année';
      case 'custom':
        return 'Période personnalisée';
      default:
        return 'Période inconnue';
    }
  }

  /**
   * Formate un pourcentage
   */
  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  /**
   * Formate une date relative
   */
  formatRelativeDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Aujourd\'hui';
    } else if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jours`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `Il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
    } else {
      const months = Math.floor(diffDays / 30);
      return `Il y a ${months} mois`;
    }
  }

  /**
   * Détermine la couleur basée sur le statut
   */
  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
      case 'actif':
        return '#10b981'; // green
      case 'inactive':
      case 'inactif':
        return '#ef4444'; // red
      case 'prospect':
        return '#f59e0b'; // amber
      case 'high':
      case 'urgent':
        return '#ef4444'; // red
      case 'medium':
        return '#f59e0b'; // amber
      case 'low':
        return '#6b7280'; // gray
      default:
        return '#6366f1'; // indigo
    }
  }

  /**
   * Génère un ID unique pour les widgets
   */
  generateWidgetId(type: string, endpoint: string): string {
    return `${type}_${endpoint.replace(/[\/\?&=]/g, '_')}_${Date.now()}`;
  }
}