import { Component, OnInit, OnDestroy, computed, signal, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DashboardFacade } from '../../dashboard.facade';
import { AuthService } from '../../../../shared/services/auth.service';
import { DashboardApiService } from '../../../../shared/services/dashboard-api.service';
import {
  PeriodType,
  CommercialMetrics,
  PersonalMetrics,
  WidgetConfig
} from '../../../../shared/interfaces/dashboard.interface';
import {
  CommercialOverviewResponse,
  CommercialStatsResponse,
  ClientsEvolutionResponse,
  RecentInteractionsResponse,
  InactiveClientsResponse,
  PersonalOverviewResponse,
  PersonalPortfolioResponse,
  TodaysTasksResponse,
  UpcomingAppointmentsResponse
} from '../../../../shared/services/dashboard-api.service';

declare var Chart: any;

@Component({
  selector: 'app-dashboard-home',
  imports: [CommonModule],
  templateUrl: './dashboard-home.html',
  standalone: true
})
export class DashboardHome implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('evolutionChart') evolutionChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('portfolioChart') portfolioChart!: ElementRef<HTMLCanvasElement>;

  private evolutionChartInstance: any = null;
  private portfolioChartInstance: any = null;

  // Signaux pour l'état local
  selectedPeriod = signal<PeriodType>('month');
  showCustomPeriodDialog = signal(false);
  customStartDate = signal('');
  customEndDate = signal('');

  // Signaux pour les données API
  apiLoading = signal(false);
  apiError = signal<string | null>(null);
  commercialOverview = signal<CommercialOverviewResponse | null>(null);
  commercialStats = signal<CommercialStatsResponse | null>(null);
  clientsEvolution = signal<ClientsEvolutionResponse | null>(null);
  recentInteractions = signal<RecentInteractionsResponse | null>(null);
  inactiveClients = signal<InactiveClientsResponse | null>(null);
  personalOverview = signal<PersonalOverviewResponse | null>(null);
  personalPortfolio = signal<PersonalPortfolioResponse | null>(null);
  todaysTasks = signal<TodaysTasksResponse | null>(null);
  upcomingAppointments = signal<UpcomingAppointmentsResponse | null>(null);

  // Computed properties pour réactivité
  dashboardData = computed(() => this.dashboardFacade.getMainMetrics());
  isCommercial = computed(() => this.dashboardFacade.config().type === 'commercial');
  loading = computed(() => this.dashboardFacade.loading());
  error = computed(() => this.dashboardFacade.error());
  widgets = computed(() => this.dashboardFacade.config().widgets);
  dashboardTitle = computed(() => this.dashboardFacade.getDashboardTitle());

  // Types de périodes disponibles
  readonly periodOptions = [
    { value: 'month', label: 'Ce mois' },
    { value: 'quarter', label: 'Ce trimestre' },
    { value: 'year', label: 'Cette année' },
    { value: 'custom', label: 'Période personnalisée' }
  ] as const;

  constructor(
    public dashboardFacade: DashboardFacade,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private dashboardApiService: DashboardApiService
  ) {
    this.loadChartJs();
  }

  private async loadChartJs(): Promise<void> {
    try {
      const chartModule = await import('chart.js');
      (window as any).Chart = chartModule.Chart;
      chartModule.Chart.register(...chartModule.registerables);
    } catch (error) {
      console.error('Error loading Chart.js:', error);
    }
  }

  ngOnInit(): void {
    this.loadDashboardData();
    if (this.dashboardFacade.config().autoRefresh) {
      this.dashboardFacade.startAutoRefresh();
    }
  }

  ngAfterViewInit(): void {
    // Attendre que Chart.js soit chargé et que les éléments DOM soient disponibles
    setTimeout(() => {
      this.waitForChartJsAndInitialize();
    }, 100);
  }

  private async waitForChartJsAndInitialize(): Promise<void> {
    // Attendre que Chart.js soit chargé
    let attempts = 0;
    const maxAttempts = 50; // 5 secondes max

    while (!(window as any).Chart && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!(window as any).Chart) {
      console.error('Chart.js failed to load after 5 seconds');
      return;
    }

    console.log('Chart.js loaded, waiting for DOM elements...');

    // Attendre que les éléments DOM soient disponibles
    attempts = 0;
    while ((!this.evolutionChart?.nativeElement && !this.portfolioChart?.nativeElement) && attempts < maxAttempts) {
      this.cdr.detectChanges(); // Forcer la détection des changements
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (this.evolutionChart?.nativeElement || this.portfolioChart?.nativeElement) {
      console.log('DOM elements found, initializing charts...');
      this.initializeCharts();
    } else {
      console.error('Chart DOM elements not found after 5 seconds');
    }
  }

  ngOnDestroy(): void {
    if (this.evolutionChartInstance) {
      this.evolutionChartInstance.destroy();
    }
    if (this.portfolioChartInstance) {
      this.portfolioChartInstance.destroy();
    }
    this.dashboardFacade.destroy();
  }

  // ===== GESTION DES DONNÉES =====

  loadDashboardData(): void {
    this.apiLoading.set(true);
    this.apiError.set(null);

    const period = this.selectedPeriod();
    const startDate = this.customStartDate();
    const endDate = this.customEndDate();

    if (this.isManager()) {
      // Chargement des données pour le dashboard commercial (manager)
      this.loadCommercialDashboardData(period, startDate, endDate);
    } else {
      // Chargement des données pour le dashboard personnel (commercial)
      this.loadPersonalDashboardData(period);
    }
  }

  private loadCommercialDashboardData(period: string, startDate?: string, endDate?: string): void {
    // Charger toutes les données commercial en parallèle
    Promise.all([
      this.dashboardApiService.getCommercialOverview(period, startDate, endDate).toPromise(),
      this.dashboardApiService.getCommercialStats().toPromise(),
      this.dashboardApiService.getClientsEvolution(period).toPromise(),
      this.dashboardApiService.getRecentInteractions(10).toPromise(),
      this.dashboardApiService.getInactiveClients(30, 20).toPromise()
    ]).then(([overview, stats, evolution, interactions, inactive]) => {
      this.commercialOverview.set(overview || null);
      this.commercialStats.set(stats || null);
      this.clientsEvolution.set(evolution || null);
      this.recentInteractions.set(interactions || null);
      this.inactiveClients.set(inactive || null);

      this.apiLoading.set(false);
      console.log('Commercial dashboard data loaded successfully');

      // Initialiser les graphiques après le chargement des données
      setTimeout(() => {
        this.retryChartsInitialization();
      }, 500);
    }).catch(error => {
      console.error('Error loading commercial dashboard data:', error);
      this.apiError.set('Erreur lors du chargement des données');
      this.apiLoading.set(false);
    });
  }

  private loadPersonalDashboardData(period: string): void {
    // Charger toutes les données personnelles en parallèle
    Promise.all([
      this.dashboardApiService.getPersonalOverview(period).toPromise(),
      this.dashboardApiService.getPersonalPortfolio(period).toPromise(),
      this.dashboardApiService.getTodaysTasks().toPromise(),
      this.dashboardApiService.getUpcomingAppointments(7, 10).toPromise(),
      this.dashboardApiService.getMyRecentInteractions(10).toPromise()
    ]).then(([overview, portfolio, tasks, appointments, interactions]) => {
      this.personalOverview.set(overview || null);
      this.personalPortfolio.set(portfolio || null);
      this.todaysTasks.set(tasks || null);
      this.upcomingAppointments.set(appointments || null);
      this.recentInteractions.set(interactions || null);

      this.apiLoading.set(false);
      console.log('Personal dashboard data loaded successfully');

      // Initialiser les graphiques après le chargement des données
      setTimeout(() => {
        this.retryChartsInitialization();
      }, 500);
    }).catch(error => {
      console.error('Error loading personal dashboard data:', error);
      this.apiError.set('Erreur lors du chargement des données');
      this.apiLoading.set(false);
    });
  }

  private retryChartsInitialization(): void {
    // Réessayer si les graphiques n'ont pas été créés
    if (!this.evolutionChartInstance && !this.portfolioChartInstance) {
      console.log('Retrying charts initialization...');
      this.cdr.detectChanges();
      setTimeout(() => {
        this.waitForChartJsAndInitialize();
      }, 100);
    }
  }

  refreshData(): void {
    this.dashboardFacade.refreshData();
  }

  // ===== GESTION DES FILTRES =====

  onPeriodChange(period: PeriodType): void {
    this.selectedPeriod.set(period);

    if (period === 'custom') {
      this.showCustomPeriodDialog.set(true);
    } else {
      this.dashboardFacade.setPeriod(period);
    }
  }

  applyCustomPeriod(): void {
    const startDate = this.customStartDate();
    const endDate = this.customEndDate();

    if (startDate && endDate) {
      this.dashboardFacade.setCustomPeriod(startDate, endDate);
      this.showCustomPeriodDialog.set(false);
    }
  }

  cancelCustomPeriod(): void {
    this.showCustomPeriodDialog.set(false);
    this.selectedPeriod.set('month');
  }

  // ===== NAVIGATION VERS DÉTAILS =====

  navigateToActiveClients(): void {
    this.router.navigate(['/clients'], {
      queryParams: { filter: 'active', period: this.selectedPeriod() }
    });
  }

  navigateToProspects(): void {
    this.router.navigate(['/clients'], {
      queryParams: { filter: 'prospect', period: this.selectedPeriod() }
    });
  }

  navigateToNewClients(): void {
    this.router.navigate(['/clients'], {
      queryParams: { filter: 'new', period: this.selectedPeriod() }
    });
  }

  navigateToSuppliers(): void {
    this.router.navigate(['/suppliers']);
  }

  navigateToInteraction(interactionId: number): void {
    this.router.navigate(['/interactions', interactionId]);
  }

  navigateToClient(clientId: number): void {
    this.router.navigate(['/clients', clientId]);
  }

  navigateToAppointments(): void {
    this.router.navigate(['/appointments']);
  }

  // ===== GESTION DES WIDGETS =====

  onMetricClick(metricType: string): void {
    switch (metricType) {
      case 'active_clients':
        this.navigateToActiveClients();
        break;
      case 'prospects':
        this.navigateToProspects();
        break;
      case 'new_clients':
        this.navigateToNewClients();
        break;
      case 'suppliers':
        this.navigateToSuppliers();
        break;
      case 'appointments':
        this.navigateToAppointments();
        break;
      default:
        console.log('Metric clicked:', metricType);
    }
  }

  toggleAutoRefresh(): void {
    const currentConfig = this.dashboardFacade.config();
    this.dashboardFacade.toggleAutoRefresh(!currentConfig.autoRefresh);
  }

  // ===== HELPERS POUR TEMPLATE =====

  getCurrentTime(): string {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date());
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('fr-FR').format(num);
  }

  formatPercentage(num: number): string {
    return `${num.toFixed(1)}%`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
      case 'actif':
        return 'text-green-600';
      case 'inactive':
      case 'inactif':
        return 'text-red-600';
      case 'prospect':
        return 'text-amber-600';
      default:
        return 'text-gray-600';
    }
  }

  getMetricIcon(metricType: string): string {
    switch (metricType) {
      case 'active_clients':
        return 'users';
      case 'prospects':
        return 'user-plus';
      case 'new_clients':
        return 'trending-up';
      case 'suppliers':
        return 'truck';
      case 'appointments':
        return 'calendar';
      case 'overdue_tasks':
        return 'clock';
      default:
        return 'bar-chart';
    }
  }

  shouldShowWidget(widget: WidgetConfig): boolean {
    return true;
  }

  getCommercialMetrics(): any | null {
    const overview = this.commercialOverview();
    return overview ? overview.metrics : null;
  }

  getPersonalMetrics(): any | null {
    const overview = this.personalOverview();
    return overview ? overview.metrics : null;
  }

  // Nouvelles méthodes pour accéder aux données API
  getCommercialStats(): any | null {
    return this.commercialStats();
  }

  getClientsEvolutionData(): any | null {
    return this.clientsEvolution();
  }

  getRecentInteractionsData(): any | null {
    return this.recentInteractions();
  }

  getInactiveClientsData(): any | null {
    return this.inactiveClients();
  }

  getTodaysTasksData(): any | null {
    return this.todaysTasks();
  }

  getUpcomingAppointmentsData(): any | null {
    return this.upcomingAppointments();
  }

  getPersonalPortfolioData(): any | null {
    return this.personalPortfolio();
  }

  isManager(): boolean {
    const user = this.authService.getCurrentUser();
    return ['admin', 'manager', 'directeur'].includes(user?.role?.toLowerCase() || '');
  }

  // ===== GESTION D'ERREURS =====

  onImageError(event: any): void {
    event.target.style.display = 'none';
  }

  retryLoadData(): void {
    this.loadDashboardData();
  }

  // ===== GRAPHIQUES CHART.JS =====

  initializeCharts(): void {
    console.log('Initializing charts...');
    console.log('evolutionChart element:', this.evolutionChart);
    console.log('portfolioChart element:', this.portfolioChart);
    this.initEvolutionChart();
    this.initPortfolioChart();
  }

  private initEvolutionChart(): void {
    console.log('initEvolutionChart called');
    console.log('evolutionChart nativeElement:', this.evolutionChart?.nativeElement);
    console.log('Chart available:', !!(window as any).Chart);

    if (!this.evolutionChart?.nativeElement || !(window as any).Chart) {
      console.log('Early return from initEvolutionChart');
      return;
    }

    const ctx = this.evolutionChart.nativeElement.getContext('2d');
    console.log('Canvas context:', ctx);
    if (!ctx) {
      console.log('No canvas context available');
      return;
    }

    // Utiliser uniquement les données API
    const evolutionData = this.clientsEvolution();
    if (!evolutionData?.evolution_data?.length) {
      console.warn('Aucune donnée d\'évolution disponible pour les graphiques');
      return;
    }

    const monthlyData = evolutionData.evolution_data.map(item => ({
      month: new Date(item.date).toLocaleDateString('fr-FR', { month: 'short' }),
      clients: item.total_clients,
      prospects: 0, // À calculer depuis les stats
      nouveaux: item.new_clients
    }));

    console.log('Creating evolution chart...');
    this.evolutionChartInstance = new (window as any).Chart(ctx, {
      type: 'line',
      data: {
        labels: monthlyData.map(d => d.month),
        datasets: [
          {
            label: 'Clients Actifs',
            data: monthlyData.map(d => d.clients),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4
          },
          {
            label: 'Prospects',
            data: monthlyData.map(d => d.prospects),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4
          },
          {
            label: 'Nouveaux Clients',
            data: monthlyData.map(d => d.nouveaux),
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                size: 12,
                weight: 500
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#374151',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: false
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 11
              },
              color: '#6b7280'
            }
          },
          y: {
            grid: {
              color: 'rgba(229, 231, 235, 0.5)'
            },
            ticks: {
              font: {
                size: 11
              },
              color: '#6b7280'
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });
    console.log('Evolution chart created successfully:', this.evolutionChartInstance);
  }

  private initPortfolioChart(): void {
    if (!this.portfolioChart?.nativeElement || !(window as any).Chart) return;

    const ctx = this.portfolioChart.nativeElement.getContext('2d');
    if (!ctx) return;

    // Utiliser uniquement les données API
    const portfolioData = this.personalPortfolio();
    if (!portfolioData?.portfolio_evolution?.length) {
      console.warn('Aucune donnée de portfolio disponible pour les graphiques');
      return;
    }

    const weeklyData = portfolioData.portfolio_evolution.map((item, index) => ({
      week: `S${index + 1}`,
      clients: item.clients_count,
      interactions: item.interactions_count,
      rdv: Math.floor(item.interactions_count / 2) // Estimation des RDV
    }));

    this.portfolioChartInstance = new (window as any).Chart(ctx, {
      type: 'bar',
      data: {
        labels: weeklyData.map(d => d.week),
        datasets: [
          {
            label: 'Mes Clients',
            data: weeklyData.map(d => d.clients),
            backgroundColor: 'rgba(139, 92, 246, 0.8)',
            borderColor: '#8b5cf6',
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: 'Interactions',
            data: weeklyData.map(d => d.interactions),
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: '#3b82f6',
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: 'RDV',
            data: weeklyData.map(d => d.rdv),
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderColor: '#22c55e',
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15,
              font: {
                size: 11,
                weight: 500
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#374151',
            borderWidth: 1,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 10
              },
              color: '#6b7280'
            }
          },
          y: {
            grid: {
              color: 'rgba(229, 231, 235, 0.5)'
            },
            ticks: {
              font: {
                size: 10
              },
              color: '#6b7280'
            }
          }
        }
      }
    });
  }

  updateCharts(): void {
    if (this.evolutionChartInstance) {
      this.evolutionChartInstance.update();
    }
    if (this.portfolioChartInstance) {
      this.portfolioChartInstance.update();
    }
  }
}