import { Injectable, computed, signal } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, of, timer } from 'rxjs';
import { map, switchMap, tap, catchError, share, retry, retryWhen, delay, take } from 'rxjs/operators';
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

  // ===== HELPER METHODS =====

  /**
   * Détecte si l'erreur est liée au réseau
   */
  private isNetworkError(error: any): boolean {
    // Network-related errors that should trigger retry
    if (!error) return false;

    const networkErrorCodes = [0, 408, 429, 500, 502, 503, 504];
    const networkErrorMessages = ['timeout', 'network', 'connection', 'NETWORK_ERROR'];

    // Check status codes
    if (networkErrorCodes.includes(error.status)) {
      return true;
    }

    // Check error messages
    const errorMessage = (error.message || '').toLowerCase();
    if (networkErrorMessages.some(msg => errorMessage.includes(msg))) {
      return true;
    }

    // Check for undefined errors (often network related)
    if (error.status === undefined && error.message === 'Http failure response for (unknown url): 0 Unknown Error') {
      return true;
    }

    return false;
  }

  /**
   * Retourne un message d'erreur approprié
   */
  private getErrorMessage(error: any): string {
    console.log('[DashboardFacade] Analyzing error for message:', error);

    // Network errors
    if (this.isNetworkError(error)) {
      return 'Problème de connexion détecté. Vérifiez votre réseau et réessayez.';
    }

    // New user errors
    if (this.isNewUserError(error)) {
      return 'Bienvenue ! Votre tableau de bord se configurera automatiquement après vos premières interactions.';
    }

    // Authentication errors
    if (error?.status === 401 || error?.status === 403) {
      return 'Session expirée. Veuillez vous reconnecter.';
    }

    // Server errors
    if (error?.status >= 500) {
      return 'Erreur serveur temporaire. Veuillez réessayer dans quelques instants.';
    }

    // Undefined error (common in production navigation issues)
    if (error === 'undefined' || error?.message === 'undefined' || error?.status === undefined) {
      return 'Erreur de chargement temporaire. Cliquez sur "Réessayer" ou actualisez la page.';
    }

    // Generic fallback
    return 'Erreur lors du chargement des données. Veuillez réessayer.';
  }

  /**
   * Détecte si l'erreur est liée à un nouvel utilisateur
   */
  private isNewUserError(error: any): boolean {
    // Codes d'erreur typiques pour nouveaux utilisateurs
    const newUserErrorCodes = [404, 'NO_DATA', 'EMPTY_PORTFOLIO', 'USER_NOT_INITIALIZED'];
    const errorCode = error?.status || error?.code || error?.message;

    return newUserErrorCodes.some(code =>
      errorCode === code || (typeof errorCode === 'string' && errorCode.includes('NO_DATA'))
    );
  }

  // ===== INITIALISATION =====

  /**
   * Initialise la configuration selon le rôle de l'utilisateur
   */
  private initializeConfig(): void {
    // Récupérer le rôle de l'utilisateur depuis AuthService avec fallback sécurisé
    const user = this.authService.getCurrentUser();
    const userRole = user?.role || 'commercial';

    // Vérifier que l'utilisateur a des permissions de base
    if (!user) {
      console.warn('DashboardFacade: Aucun utilisateur connecté, utilisation du mode par défaut');
    }

    const dashboardType = this.isDashboardManager(userRole) ? 'commercial' : 'personal';

    this._config.set({
      type: dashboardType,
      widgets: this.getDefaultWidgets(dashboardType),
      autoRefresh: true,
      refreshInterval: 300000
    });

    console.log(`DashboardFacade: Configuration initialisée pour ${userRole} - Type: ${dashboardType}`);
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
    const startTime = Date.now();
    console.log('[DashboardFacade] Starting loadCommercialData', { params, timestamp: startTime });

    return combineLatest([
      this.dashboardService.getCommercialOverview(params).pipe(
        tap(() => console.log('[DashboardFacade] Commercial overview loaded')),
        catchError(error => {
          console.warn('[DashboardFacade] Commercial overview failed:', error);
          return of({ data: { metrics: this.getDefaultCommercialMetrics() } });
        })
      ),
      this.dashboardService.getCommercialStats(params).pipe(
        tap(() => console.log('[DashboardFacade] Commercial stats loaded')),
        catchError(error => {
          console.warn('[DashboardFacade] Commercial stats failed:', error);
          return of({ data: this.getDefaultStats() });
        })
      ),
      this.dashboardService.getClientsEvolution(params).pipe(
        tap(() => console.log('[DashboardFacade] Clients evolution loaded')),
        catchError(error => {
          console.warn('[DashboardFacade] Clients evolution failed:', error);
          return of({ data: this.getDefaultEvolution() });
        })
      ),
      this.dashboardService.getCommercialRecentInteractions(10).pipe(
        tap(() => console.log('[DashboardFacade] Recent interactions loaded')),
        catchError(error => {
          console.warn('[DashboardFacade] Recent interactions failed:', error);
          return of({ data: this.getDefaultInteractions() });
        })
      ),
      this.dashboardService.getInactiveClients(30, 20).pipe(
        tap(() => console.log('[DashboardFacade] Inactive clients loaded')),
        catchError(error => {
          console.warn('[DashboardFacade] Inactive clients failed:', error);
          return of({ data: this.getDefaultInactiveClients() });
        })
      )
    ]).pipe(
      // Add retry logic with exponential backoff for network issues
      retryWhen(errors =>
        errors.pipe(
          tap(error => {
            const isNetworkError = this.isNetworkError(error);
            console.warn('[DashboardFacade] Retrying due to error:', error, { isNetworkError });
          }),
          delay(1000), // Wait 1 second before retrying
          take(2) // Maximum 2 retries
        )
      ),
      tap(([overview, stats, evolution, interactions, inactiveClients]) => {
        const loadTime = Date.now() - startTime;
        console.log(`[DashboardFacade] All commercial data loaded successfully in ${loadTime}ms`);

        // Gestion sécurisée des données pour nouveaux utilisateurs
        this._commercialData.set({
          overview: overview?.data?.metrics || this.getDefaultCommercialMetrics(),
          stats: stats?.data || this.getDefaultStats(),
          evolution: evolution?.data || this.getDefaultEvolution(),
          interactions: interactions?.data || this.getDefaultInteractions(),
          inactiveClients: inactiveClients?.data || this.getDefaultInactiveClients()
        });
        this._loading.set(false);
        this._error.set(null); // Clear any previous errors on success
      }),
      catchError(error => {
        const loadTime = Date.now() - startTime;
        this._loading.set(false);

        console.error(`[DashboardFacade] Commercial data load failed after ${loadTime}ms:`, {
          error: error,
          message: error?.message,
          status: error?.status,
          statusText: error?.statusText,
          url: error?.url,
          stack: error?.stack?.split('\n').slice(0, 5)
        });

        // Enhanced error classification
        const errorMessage = this.getErrorMessage(error);
        this._error.set(errorMessage);

        // Always provide fallback data to prevent broken UI
        this._commercialData.set({
          overview: this.getDefaultCommercialMetrics(),
          stats: this.getDefaultStats(),
          evolution: this.getDefaultEvolution(),
          interactions: this.getDefaultInteractions(),
          inactiveClients: this.getDefaultInactiveClients()
        });

        return of(null);
      }),
      share()
    );
  }

  /**
   * Charge les données personnelles
   */
  private loadPersonalData(params: DashboardQueryParams): Observable<any> {
    const startTime = Date.now();
    console.log('[DashboardFacade] Starting loadPersonalData', { params, timestamp: startTime });

    return combineLatest([
      this.dashboardService.getPersonalOverview(params).pipe(
        tap(() => console.log('[DashboardFacade] Personal overview loaded')),
        catchError(error => {
          console.warn('[DashboardFacade] Personal overview failed:', error);
          return of({ data: { metrics: this.getDefaultPersonalMetrics() } });
        })
      ),
      this.dashboardService.getPersonalPortfolio(params).pipe(
        tap(() => console.log('[DashboardFacade] Personal portfolio loaded')),
        catchError(error => {
          console.warn('[DashboardFacade] Personal portfolio failed:', error);
          return of({ data: this.getDefaultPortfolio() });
        })
      ),
      this.dashboardService.getTodaysTasks().pipe(
        tap(() => console.log('[DashboardFacade] Today tasks loaded')),
        catchError(error => {
          console.warn('[DashboardFacade] Today tasks failed:', error);
          return of({ data: this.getDefaultTasks() });
        })
      ),
      this.dashboardService.getUpcomingAppointments(7, 10).pipe(
        tap(() => console.log('[DashboardFacade] Upcoming appointments loaded')),
        catchError(error => {
          console.warn('[DashboardFacade] Upcoming appointments failed:', error);
          return of({ data: this.getDefaultAppointments() });
        })
      ),
      this.dashboardService.getPersonalRecentInteractions(10).pipe(
        tap(() => console.log('[DashboardFacade] Personal recent interactions loaded')),
        catchError(error => {
          console.warn('[DashboardFacade] Personal recent interactions failed:', error);
          return of({ data: this.getDefaultInteractions() });
        })
      )
    ]).pipe(
      // Add retry logic with exponential backoff for network issues
      retryWhen(errors =>
        errors.pipe(
          tap(error => {
            const isNetworkError = this.isNetworkError(error);
            console.warn('[DashboardFacade] Retrying personal data due to error:', error, { isNetworkError });
          }),
          delay(1000), // Wait 1 second before retrying
          take(2) // Maximum 2 retries
        )
      ),
      tap(([overview, portfolio, todayTasks, appointments, interactions]) => {
        const loadTime = Date.now() - startTime;
        console.log(`[DashboardFacade] All personal data loaded successfully in ${loadTime}ms`);

        // Gestion sécurisée des données pour nouveaux utilisateurs
        this._personalData.set({
          overview: overview?.data?.metrics || this.getDefaultPersonalMetrics(),
          portfolio: portfolio?.data || this.getDefaultPortfolio(),
          todayTasks: todayTasks?.data || this.getDefaultTasks(),
          upcomingAppointments: appointments?.data || this.getDefaultAppointments(),
          interactions: interactions?.data || this.getDefaultInteractions()
        });
        this._loading.set(false);
        this._error.set(null); // Clear any previous errors on success
      }),
      catchError(error => {
        const loadTime = Date.now() - startTime;
        this._loading.set(false);

        console.error(`[DashboardFacade] Personal data load failed after ${loadTime}ms:`, {
          error: error,
          message: error?.message,
          status: error?.status,
          statusText: error?.statusText,
          url: error?.url,
          stack: error?.stack?.split('\n').slice(0, 5)
        });

        // Enhanced error classification
        const errorMessage = this.getErrorMessage(error);
        this._error.set(errorMessage);

        // Always provide fallback data to prevent broken UI
        this._personalData.set({
          overview: this.getDefaultPersonalMetrics(),
          portfolio: this.getDefaultPortfolio(),
          todayTasks: this.getDefaultTasks(),
          upcomingAppointments: this.getDefaultAppointments(),
          interactions: this.getDefaultInteractions()
        });

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

  // ===== MÉTHODES UTILITAIRES POUR NOUVEAUX UTILISATEURS =====


  /**
   * Retourne des métriques commerciales par défaut
   */
  private getDefaultCommercialMetrics(): CommercialMetrics {
    return {
      total_active_clients: 0,
      total_prospects: 0,
      new_clients_this_period: 0,
      total_suppliers: 0
    };
  }

  /**
   * Retourne des métriques personnelles par défaut
   */
  private getDefaultPersonalMetrics(): PersonalMetrics {
    return {
      my_active_clients: 0,
      my_prospects: 0,
      my_appointments_upcoming: 0,
      my_overdue_tasks: 0,
      my_interactions_this_period: 0
    };
  }

  /**
   * Retourne des statistiques par défaut
   */
  private getDefaultStats(): CommercialStats {
    return {
      clients_by_status: [],
      clients_by_type: [],
      clients_by_sector: []
    };
  }

  /**
   * Retourne une évolution par défaut
   */
  private getDefaultEvolution(): ClientsEvolution {
    return {
      evolution_data: [],
      period: 'month',
      date_range: {
        start: '',
        end: ''
      }
    };
  }

  /**
   * Retourne des interactions par défaut
   */
  private getDefaultInteractions(): RecentInteractionsData {
    return {
      interactions: [],
      total_found: 0
    };
  }

  /**
   * Retourne des clients inactifs par défaut
   */
  private getDefaultInactiveClients(): InactiveClientsData {
    return {
      clients: [],
      total_found: 0,
      days_threshold: 30
    };
  }

  /**
   * Retourne un portefeuille personnel par défaut
   */
  private getDefaultPortfolio(): PersonalPortfolio {
    return {
      portfolio_evolution: [],
      performance_metrics: {
        conversion_rate: 0,
        avg_interactions_per_client: 0,
        most_active_day: 'Lundi',
        total_clients: 0,
        clients_with_interactions: 0
      }
    };
  }

  /**
   * Retourne des tâches par défaut
   */
  private getDefaultTasks(): TodayTasksData {
    return {
      appointments_today: [],
      follow_ups_due: [],
      summary: {
        total_appointments_today: 0,
        total_follow_ups_due: 0,
        urgent_tasks: 0,
        completion_rate: 0
      }
    };
  }

  /**
   * Retourne des rendez-vous par défaut
   */
  private getDefaultAppointments(): UpcomingAppointmentsData {
    return {
      appointments: [],
      total_found: 0,
      days_ahead: 7
    };
  }

  // ===== CLEANUP =====

  /**
   * Nettoie les resources
   */
  destroy(): void {
    this.stopAutoRefresh();
  }
}