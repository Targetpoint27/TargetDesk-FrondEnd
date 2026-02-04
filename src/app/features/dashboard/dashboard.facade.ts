import { Injectable, computed, signal } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, of } from 'rxjs';
import { map, switchMap, tap, catchError, share } from 'rxjs/operators';
import { DashboardService } from '../../shared/services/dashboard.service';
import { AuthService } from '../../shared/services/auth.service';
import {
  DashboardState,
  PeriodType,
  DashboardQueryParams,
  CommercialMetrics,
  PersonalMetrics,
  CommercialStats,
  ClientsEvolution,
  RecentInteractionsData,
  InactiveClientsData,
  PersonalPortfolio,
  TodayTasksData,
  UpcomingAppointmentsData,
  DashboardConfig,
  WidgetConfig
} from '../../shared/interfaces/dashboard.interface';

@Injectable({
  providedIn: 'root'
})
export class DashboardFacade {
  // État principal du dashboard en signaux
  private _commercialData = signal<{
    overview: CommercialMetrics | null;
    stats: CommercialStats | null;
    evolution: ClientsEvolution | null;
    interactions: RecentInteractionsData | null;
    inactiveClients: InactiveClientsData | null;
  }>({
    overview: null,
    stats: null,
    evolution: null,
    interactions: null,
    inactiveClients: null
  });

  private _personalData = signal<{
    overview: PersonalMetrics | null;
    portfolio: PersonalPortfolio | null;
    todayTasks: TodayTasksData | null;
    upcomingAppointments: UpcomingAppointmentsData | null;
    interactions: RecentInteractionsData | null;
  }>({
    overview: null,
    portfolio: null,
    todayTasks: null,
    upcomingAppointments: null,
    interactions: null
  });

  // État des filtres
  private _filters = signal<{
    period: PeriodType;
    start_date?: string;
    end_date?: string;
  }>({
    period: 'month'
  });

  // Configuration du dashboard
  private _config = signal<DashboardConfig>({
    type: 'commercial',
    widgets: [],
    autoRefresh: true,
    refreshInterval: 300000 // 5 minutes
  });

  // État de chargement et erreurs
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  // Computed pour exposer les données
  commercialData = computed(() => this._commercialData());
  personalData = computed(() => this._personalData());
  filters = computed(() => this._filters());
  config = computed(() => this._config());
  loading = computed(() => this._loading());
  error = computed(() => this._error());

  // Observable pour l'auto-refresh
  private autoRefreshTimer?: any;

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService
  ) {
    this.initializeConfig();
  }

  // ===== INITIALISATION =====

  /**
   * Initialise la configuration selon le rôle de l'utilisateur
   */
  private initializeConfig(): void {
    // Récupérer le rôle de l'utilisateur depuis AuthService
    const userRole = this.authService.getCurrentUser()?.role || 'commercial';

    const dashboardType = this.isDashboardManager(userRole) ? 'commercial' : 'personal';

    this._config.set({
      type: dashboardType,
      widgets: this.getDefaultWidgets(dashboardType),
      autoRefresh: true,
      refreshInterval: 300000
    });
  }

  /**
   * Détermine si l'utilisateur est un manager
   */
  private isDashboardManager(role: string): boolean {
    return ['admin', 'manager', 'directeur'].includes(role.toLowerCase());
  }

  /**
   * Retourne les widgets par défaut selon le type
   */
  private getDefaultWidgets(type: 'commercial' | 'personal'): WidgetConfig[] {
    if (type === 'commercial') {
      return [
        {
          id: 'commercial-overview',
          title: 'Vue d\'ensemble',
          type: 'metric',
          size: 'large',
          endpoint: 'commercial/overview'
        },
        {
          id: 'clients-evolution',
          title: 'Évolution des clients',
          type: 'chart',
          size: 'large',
          endpoint: 'commercial/clients-evolution',
          chartType: 'line'
        },
        {
          id: 'stats-repartition',
          title: 'Répartition clients',
          type: 'chart',
          size: 'medium',
          endpoint: 'commercial/stats',
          chartType: 'doughnut'
        },
        {
          id: 'recent-interactions',
          title: 'Interactions récentes',
          type: 'list',
          size: 'medium',
          endpoint: 'commercial/interactions/recent'
        },
        {
          id: 'inactive-clients',
          title: 'Clients inactifs',
          type: 'list',
          size: 'medium',
          endpoint: 'commercial/clients/inactive'
        }
      ];
    } else {
      return [
        {
          id: 'personal-overview',
          title: 'Mon portefeuille',
          type: 'metric',
          size: 'large',
          endpoint: 'personal/overview'
        },
        {
          id: 'today-tasks',
          title: 'À faire aujourd\'hui',
          type: 'task',
          size: 'large',
          endpoint: 'personal/tasks/today'
        },
        {
          id: 'portfolio-evolution',
          title: 'Évolution de mon portefeuille',
          type: 'chart',
          size: 'large',
          endpoint: 'personal/portfolio',
          chartType: 'line'
        },
        {
          id: 'upcoming-appointments',
          title: 'RDV à venir',
          type: 'list',
          size: 'medium',
          endpoint: 'personal/appointments/upcoming'
        },
        {
          id: 'my-recent-interactions',
          title: 'Mes interactions récentes',
          type: 'list',
          size: 'medium',
          endpoint: 'personal/interactions/recent'
        }
      ];
    }
  }

  // ===== GESTION DES DONNÉES =====

  /**
   * Charge toutes les données du dashboard
   */
  loadDashboardData(): Observable<any> {
    this._loading.set(true);
    this._error.set(null);

    const dashboardType = this._config().type;
    const params = this.buildQueryParams();

    if (dashboardType === 'commercial') {
      return this.loadCommercialData(params);
    } else {
      return this.loadPersonalData(params);
    }
  }

  /**
   * Charge les données commerciales
   */
  private loadCommercialData(params: DashboardQueryParams): Observable<any> {
    return combineLatest([
      this.dashboardService.getCommercialOverview(params),
      this.dashboardService.getCommercialStats(params),
      this.dashboardService.getClientsEvolution(params),
      this.dashboardService.getCommercialRecentInteractions(10),
      this.dashboardService.getInactiveClients(30, 20)
    ]).pipe(
      tap(([overview, stats, evolution, interactions, inactiveClients]) => {
        this._commercialData.set({
          overview: overview.data.metrics,
          stats: stats.data,
          evolution: evolution.data,
          interactions: interactions.data,
          inactiveClients: inactiveClients.data
        });
        this._loading.set(false);
      }),
      catchError(error => {
        this._loading.set(false);
        this._error.set('Erreur lors du chargement des données commerciales');
        console.error('Commercial data load error:', error);
        return of(null);
      }),
      share()
    );
  }

  /**
   * Charge les données personnelles
   */
  private loadPersonalData(params: DashboardQueryParams): Observable<any> {
    return combineLatest([
      this.dashboardService.getPersonalOverview(params),
      this.dashboardService.getPersonalPortfolio(params),
      this.dashboardService.getTodaysTasks(),
      this.dashboardService.getUpcomingAppointments(7, 10),
      this.dashboardService.getPersonalRecentInteractions(10)
    ]).pipe(
      tap(([overview, portfolio, todayTasks, appointments, interactions]) => {
        this._personalData.set({
          overview: overview.data.metrics,
          portfolio: portfolio.data,
          todayTasks: todayTasks.data,
          upcomingAppointments: appointments.data,
          interactions: interactions.data
        });
        this._loading.set(false);
      }),
      catchError(error => {
        this._loading.set(false);
        this._error.set('Erreur lors du chargement des données personnelles');
        console.error('Personal data load error:', error);
        return of(null);
      }),
      share()
    );
  }

  // ===== GESTION DES FILTRES =====

  /**
   * Met à jour la période de filtrage
   */
  setPeriod(period: PeriodType): void {
    this._filters.update(current => ({
      ...current,
      period,
      start_date: undefined,
      end_date: undefined
    }));
    this.loadDashboardData().subscribe();
  }

  /**
   * Met à jour une période personnalisée
   */
  setCustomPeriod(start_date: string, end_date: string): void {
    this._filters.set({
      period: 'custom',
      start_date,
      end_date
    });
    this.loadDashboardData().subscribe();
  }

  /**
   * Construit les paramètres de requête
   */
  private buildQueryParams(): DashboardQueryParams {
    const filters = this._filters();
    return {
      period: filters.period,
      start_date: filters.start_date,
      end_date: filters.end_date
    };
  }

  // ===== GESTION DES WIDGETS =====

  /**
   * Ajoute un widget au dashboard
   */
  addWidget(widget: WidgetConfig): void {
    this._config.update(current => ({
      ...current,
      widgets: [...current.widgets, widget]
    }));
  }

  /**
   * Supprime un widget
   */
  removeWidget(widgetId: string): void {
    this._config.update(current => ({
      ...current,
      widgets: current.widgets.filter(w => w.id !== widgetId)
    }));
  }

  /**
   * Réorganise les widgets
   */
  reorderWidgets(widgets: WidgetConfig[]): void {
    this._config.update(current => ({
      ...current,
      widgets
    }));
  }

  /**
   * Met à jour la configuration d'un widget
   */
  updateWidget(widgetId: string, updates: Partial<WidgetConfig>): void {
    this._config.update(current => ({
      ...current,
      widgets: current.widgets.map(w =>
        w.id === widgetId ? { ...w, ...updates } : w
      )
    }));
  }

  // ===== AUTO-REFRESH =====

  /**
   * Démarre l'auto-refresh
   */
  startAutoRefresh(): void {
    this.stopAutoRefresh();

    const interval = this._config().refreshInterval;

    this.autoRefreshTimer = setInterval(() => {
      this.loadDashboardData().subscribe();
    }, interval);
  }

  /**
   * Arrête l'auto-refresh
   */
  stopAutoRefresh(): void {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = undefined;
    }
  }

  /**
   * Met à jour l'intervalle d'auto-refresh
   */
  setAutoRefreshInterval(interval: number): void {
    this._config.update(current => ({
      ...current,
      refreshInterval: interval
    }));

    if (this._config().autoRefresh) {
      this.startAutoRefresh();
    }
  }

  /**
   * Active/désactive l'auto-refresh
   */
  toggleAutoRefresh(enabled: boolean): void {
    this._config.update(current => ({
      ...current,
      autoRefresh: enabled
    }));

    if (enabled) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  // ===== ACTIONS SPÉCIFIQUES =====

  /**
   * Rafraîchit manuellement les données
   */
  refreshData(): void {
    this.loadDashboardData().subscribe();
  }

  /**
   * Navigue vers une page spécifique avec filtres
   */
  navigateToDetails(route: string, filters?: Record<string, any>): void {
    // Cette méthode sera implémentée avec Angular Router
    console.log(`Navigation to ${route} with filters:`, filters);
  }

  /**
   * Exporte les données du dashboard
   */
  exportData(format: 'pdf' | 'excel' = 'pdf'): void {
    // À implémenter selon les besoins
    console.log(`Exporting dashboard data as ${format}`);
  }

  // ===== GETTERS UTILITAIRES =====

  /**
   * Retourne les métriques principales selon le type
   */
  getMainMetrics(): CommercialMetrics | PersonalMetrics | null {
    const config = this._config();
    return config.type === 'commercial'
      ? this._commercialData().overview
      : this._personalData().overview;
  }

  /**
   * Retourne le titre du dashboard
   */
  getDashboardTitle(): string {
    const config = this._config();
    return config.type === 'commercial'
      ? 'Dashboard'
      : 'Mon Dashboard Personnel';
  }

  /**
   * Vérifie si des données sont disponibles
   */
  hasData(): boolean {
    const config = this._config();
    if (config.type === 'commercial') {
      return this._commercialData().overview !== null;
    } else {
      return this._personalData().overview !== null;
    }
  }

  // ===== CLEANUP =====

  /**
   * Nettoie les resources
   */
  destroy(): void {
    this.stopAutoRefresh();
  }
}