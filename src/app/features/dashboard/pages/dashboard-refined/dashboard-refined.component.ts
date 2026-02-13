import { Component, OnInit, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardFacade } from '../../dashboard.facade';
import { PeriodType } from '../../../../shared/interfaces/dashboard.interface';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Import des nouveaux composants épurés
import { MetricCardComponent } from '../../../../shared/components/cards/metric-card.component';
import { SoftWidgetComponent } from '../../../../shared/components/cards/soft-widget.component';
import { InteractionListComponent } from '../../../../shared/components/lists/interaction-list.component';
import { InactiveClientsListComponent } from '../../../../shared/components/lists/inactive-clients-list.component';

// Import des composants graphiques existants
import { ClientsEvolutionChartComponent } from '../../../../shared/components/charts/clients-evolution-chart.component';
import { StatsDoughnutChartComponent } from '../../../../shared/components/charts/stats-doughnut-chart.component';
import { UpcomingAppointmentsWidgetComponent } from '../../../../shared/components/widgets/upcoming-appointments-widget.component';

@Component({
  selector: 'app-dashboard-refined',
  standalone: true,
  imports: [
    CommonModule,
    MetricCardComponent,
    SoftWidgetComponent,
    InteractionListComponent,
    InactiveClientsListComponent,
    ClientsEvolutionChartComponent,
    StatsDoughnutChartComponent,
    UpcomingAppointmentsWidgetComponent
  ],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50/50 via-white to-blue-50/30">

      <!-- Header épuré et soft -->
      <header class="bg-white/40 backdrop-blur-xl border-b border-white/60 shadow-sm sticky top-0 z-30">
        <div class="max-w-8xl mx-auto px-6 py-3">
          <div class="flex items-center justify-between">

            <!-- Title section -->
            <div class="flex items-center space-x-6">
              <div>
                <h1 class="text-2xl font-semibold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">
                  {{ getDashboardTitle() }}
                </h1>
                <p class="text-slate-500 text-sm mt-1">{{ getCurrentDateTime() }}</p>
              </div>

              <!-- Status indicator -->
              <div class="flex items-center space-x-2 px-3 py-2 bg-green-50/50 rounded-full">
                <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span class="text-green-700 text-sm font-medium">Temps réel</span>
              </div>
            </div>

            <!-- Controls -->
            <div class="flex items-center space-x-3">

              <!-- Period selector -->
              <div class="relative">
                <select
                  [value]="currentPeriod()"
                  (change)="onPeriodChange($any($event.target).value)"
                  class="appearance-none bg-white/60 backdrop-blur-sm px-4 py-2.5 pr-10 border border-white/60 rounded-xl text-sm font-medium text-slate-700 shadow-sm hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200">
                  <option value="month">Ce mois</option>
                  <option value="quarter">Ce trimestre</option>
                  <option value="year">Cette année</option>
                </select>
                <i class="bi bi-chevron-down absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
              </div>

              <!-- Auto refresh toggle -->
              <button
                (click)="toggleAutoRefresh()"
                [class.bg-green-50]="autoRefreshEnabled()"
                [class.text-green-600]="autoRefreshEnabled()"
                [class.bg-slate-100]="!autoRefreshEnabled()"
                [class.text-slate-500]="!autoRefreshEnabled()"
                class="p-2.5 rounded-xl transition-all duration-200 hover:scale-105"
                [title]="autoRefreshEnabled() ? 'Désactiver l\\'auto-actualisation' : 'Activer l\\'auto-actualisation'">
                <i class="bi text-sm"
                   [class.bi-arrow-clockwise]="autoRefreshEnabled()"
                   [class.bi-pause-circle]="!autoRefreshEnabled()"></i>
              </button>

              <!-- Refresh button -->
              <button
                (click)="refreshData()"
                [disabled]="isLoading()"
                class="flex items-center space-x-2 px-4 py-2.5 bg-blue-600/90 hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:cursor-not-allowed">
                <i class="bi text-sm"
                   [class.bi-arrow-clockwise]="!isLoading()"
                   [class.bi-hourglass-split]="isLoading()"
                   [class.animate-spin]="isLoading()"></i>
                <span class="font-medium text-sm">{{ isLoading() ? 'Actualisation...' : 'Actualiser' }}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Main content -->
      <main class="max-w-8xl mx-auto px-4 py-4">

        <!-- Global error -->
        <div *ngIf="globalError()" class="mb-4">
          <div class="bg-red-50/60 backdrop-blur-sm border border-red-200/60 rounded-2xl p-6">
            <div class="flex items-start space-x-4">
              <div class="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <i class="bi bi-exclamation-triangle text-red-600"></i>
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-red-800 mb-1">Erreur de chargement</h3>
                <p class="text-red-700 text-sm mb-4">{{ globalError() }}</p>
                <button
                  (click)="refreshData()"
                  class="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 text-sm rounded-lg transition-colors">
                  Réessayer
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Commercial Dashboard -->
        <div *ngIf="isCommercialDashboard()" class="space-y-5">

          <!-- Métriques principales -->
          <section>
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-lg font-semibold text-slate-800">Vue d'ensemble</h2>
              <div class="text-sm text-slate-500">{{ formatPeriod(currentPeriod()) }}</div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <app-metric-card
                icon="bi-people-fill"
                iconBg="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
                [value]="getCommercialMetrics()?.total_active_clients || 0"
                label="Clients Actifs"
                [trend]="clientGrowthTrend()"
                badge="En croissance"
                badgeClass="bg-green-100 text-green-700">
              </app-metric-card>

              <app-metric-card
                icon="bi-person-plus-fill"
                iconBg="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                [value]="getCommercialMetrics()?.total_prospects || 0"
                label="Prospects Actifs"
                badge="Pipeline"
                badgeClass="bg-amber-100 text-amber-700">
              </app-metric-card>

              <app-metric-card
                icon="bi-person-check-fill"
                iconBg="linear-gradient(135deg, #10b981 0%, #059669 100%)"
                [value]="getCommercialMetrics()?.new_clients_this_period || 0"
                label="Nouveaux Clients"
                suffix="ce mois"
                [trend]="newClientsTrend()"
                badgeClass="bg-green-100 text-green-700">
              </app-metric-card>

              <app-metric-card
                icon="bi-building"
                iconBg="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
                [value]="getCommercialMetrics()?.total_suppliers || 0"
                label="Partenaires"
                badge="Actifs"
                badgeClass="bg-purple-100 text-purple-700">
              </app-metric-card>
            </div>
          </section>

          <!-- Graphiques et analyses -->
          <section>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

              <!-- Evolution chart - Large -->
              <div class="lg:col-span-2">
                <app-soft-widget
                  title="Évolution des Clients"
                  subtitle="Croissance dans le temps"
                  icon="bi-graph-up-arrow"
                  iconBg="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
                  [loading]="isLoading()"
                  [error]="globalError()"
                  [hasContent]="!!getClientsEvolution()"
                  (refresh)="refreshData()">

                  <app-clients-evolution-chart
                    [data]="getClientsEvolution()"
                    [loading]="false"
                    [error]="null">
                  </app-clients-evolution-chart>
                </app-soft-widget>
              </div>

              <!-- Répartition stats -->
              <app-soft-widget
                title="Répartition"
                subtitle="Analyse par segments"
                icon="bi-pie-chart"
                iconBg="linear-gradient(135deg, #ec4899 0%, #db2777 100%)"
                [loading]="isLoading()"
                [error]="globalError()"
                [hasContent]="!!getCommercialStats()"
                (refresh)="refreshData()">

                <app-stats-doughnut-chart
                  [data]="getCommercialStats()"
                  [loading]="false"
                  [error]="null">
                </app-stats-doughnut-chart>
              </app-soft-widget>
            </div>
          </section>

          <!-- Activité et alertes -->
          <section>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">

              <!-- Activité récente -->
              <app-soft-widget
                title="Activité Récente"
                [subtitle]="'Dernières interactions (' + (getRecentInteractions()?.total_found || 0) + ')'"
                icon="bi-activity"
                iconBg="linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)"
                [badge]="getRecentInteractions()?.total_found?.toString()"
                badgeClass="bg-cyan-100 text-cyan-700"
                [loading]="isLoading()"
                [error]="globalError()"
                [hasContent]="!!getRecentInteractions()?.interactions?.length"
                [isEmpty]="!getRecentInteractions()?.interactions?.length"
                emptyIcon="bi-chat-dots"
                emptyTitle="Aucune activité récente"
                emptyMessage="Les interactions apparaîtront ici"
                (refresh)="refreshData()">

                <app-interaction-list [interactions]="getRecentInteractions()?.interactions || []">
                </app-interaction-list>
              </app-soft-widget>

              <!-- Clients inactifs -->
              <app-soft-widget
                title="Alertes Clients"
                [subtitle]="'Clients nécessitant une attention (' + (getInactiveClients()?.total_found || 0) + ')'"
                icon="bi-exclamation-triangle"
                iconBg="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                [badge]="getInactiveClients()?.total_found?.toString()"
                badgeClass="bg-amber-100 text-amber-700"
                [loading]="isLoading()"
                [error]="globalError()"
                [hasContent]="!!getInactiveClients()?.clients?.length"
                [isEmpty]="!getInactiveClients()?.clients?.length"
                emptyIcon="bi-check-circle"
                emptyTitle="Aucune alerte client"
                emptyMessage="Tous les clients sont actifs"
                (refresh)="refreshData()">

                <app-inactive-clients-list
                  [clients]="getInactiveClients()?.clients || []"
                  (contact)="onContactClient($event)"
                  (schedule)="onScheduleClient($event)">
                </app-inactive-clients-list>
              </app-soft-widget>
            </div>
          </section>
        </div>

        <!-- Personal Dashboard -->
        <div *ngIf="isPersonalDashboard()" class="space-y-5">

          <!-- Métriques personnelles -->
          <section>
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-lg font-semibold text-slate-800">Mon Tableau de Bord</h2>
              <div class="text-sm text-slate-500">Performance personnelle</div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <app-metric-card
                icon="bi-person-heart"
                iconBg="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
                [value]="getPersonalMetrics()?.my_active_clients || 0"
                label="Mes Clients"
                badge="Portfolio"
                badgeClass="bg-blue-100 text-blue-700">
              </app-metric-card>

              <app-metric-card
                icon="bi-person-plus"
                iconBg="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                [value]="getPersonalMetrics()?.my_prospects || 0"
                label="Mes Prospects"
                badge="Pipeline"
                badgeClass="bg-amber-100 text-amber-700">
              </app-metric-card>

              <app-metric-card
                icon="bi-calendar-check"
                iconBg="linear-gradient(135deg, #10b981 0%, #059669 100%)"
                [value]="getPersonalMetrics()?.my_appointments_upcoming || 0"
                label="RDV à venir"
                badge="Planning"
                badgeClass="bg-green-100 text-green-700">
              </app-metric-card>

              <app-metric-card
                icon="bi-chat-dots"
                iconBg="linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)"
                [value]="getPersonalMetrics()?.my_interactions_this_period || 0"
                label="Interactions"
                badge="Ce mois"
                badgeClass="bg-cyan-100 text-cyan-700">
              </app-metric-card>
            </div>
          </section>

          <!-- Widgets personnels -->
          <section>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">

              <!-- Mes interactions dans soft widget -->
              <app-soft-widget
                title="Mes Interactions"
                subtitle="Activité récente personnelle"
                icon="bi-chat-dots"
                iconBg="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
                [badge]="getPersonalMetrics()?.my_interactions_this_period?.toString()"
                badgeClass="bg-blue-100 text-blue-700"
                [loading]="isLoading()"
                [error]="globalError()"
                [hasContent]="!!getPersonalMetrics()?.my_interactions_this_period"
                (refresh)="refreshData()">

                <div class="text-center py-8">
                  <i class="bi bi-chat-dots text-4xl text-blue-400 mb-4"></i>
                  <div class="text-2xl font-bold text-slate-900 mb-2">
                    {{ getPersonalMetrics()?.my_interactions_this_period || 0 }}
                  </div>
                  <p class="text-slate-600">interactions ce mois</p>
                </div>
              </app-soft-widget>

              <!-- RDV à venir dans soft widget -->
              <app-soft-widget
                title="Rendez-vous Prévus"
                subtitle="Planning des prochains jours"
                icon="bi-calendar-week"
                iconBg="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
                [badge]="getUpcomingAppointments()?.total_found?.toString()"
                badgeClass="bg-purple-100 text-purple-700"
                [loading]="isLoading()"
                [error]="globalError()"
                [hasContent]="!!getUpcomingAppointments()?.appointments?.length"
                [isEmpty]="!getUpcomingAppointments()?.appointments?.length"
                emptyIcon="bi-calendar-plus"
                emptyTitle="Aucun RDV prévu"
                emptyMessage="Votre planning est libre"
                (refresh)="refreshData()">

                <app-upcoming-appointments-widget
                  [data]="getUpcomingAppointments()"
                  [loading]="false"
                  [error]="null">
                </app-upcoming-appointments-widget>
              </app-soft-widget>
            </div>
          </section>

          <!-- Portfolio evolution si disponible -->
          <section *ngIf="getPersonalPortfolio()">
            <app-soft-widget
              title="Évolution de Mon Portefeuille"
              subtitle="Performance et croissance"
              icon="bi-graph-up"
              iconBg="linear-gradient(135deg, #10b981 0%, #059669 100%)"
              [loading]="isLoading()"
              [error]="globalError()"
              [hasContent]="!!getPersonalPortfolio()"
              (refresh)="refreshData()">

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="text-center p-4 bg-green-50/50 rounded-xl">
                  <div class="text-2xl font-bold text-green-600 mb-1">
                    {{ getPersonalPortfolio()?.performance_metrics?.conversion_rate?.toFixed(1) }}%
                  </div>
                  <div class="text-sm text-slate-600">Taux de conversion</div>
                </div>
                <div class="text-center p-4 bg-blue-50/50 rounded-xl">
                  <div class="text-2xl font-bold text-blue-600 mb-1">
                    {{ getPersonalPortfolio()?.performance_metrics?.avg_interactions_per_client?.toFixed(1) }}
                  </div>
                  <div class="text-sm text-slate-600">Interactions/client</div>
                </div>
                <div class="text-center p-4 bg-purple-50/50 rounded-xl">
                  <div class="text-2xl font-bold text-purple-600 mb-1">
                    {{ getPersonalPortfolio()?.performance_metrics?.most_active_day }}
                  </div>
                  <div class="text-sm text-slate-600">Jour le plus actif</div>
                </div>
              </div>
            </app-soft-widget>
          </section>
        </div>

      </main>
    </div>
  `
})
export class DashboardRefinedComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Signaux pour l'état réactif
  private _currentPeriod = signal<PeriodType>('month');
  private _autoRefreshEnabled = signal(true);

  // Computed values
  currentPeriod = computed(() => this._currentPeriod());
  autoRefreshEnabled = computed(() => this._autoRefreshEnabled());
  isLoading = computed(() => this.dashboardFacade.loading());
  globalError = computed(() => this.dashboardFacade.error() || undefined);

  // Computed trends to avoid expression changed errors
  clientGrowthTrend = computed(() => {
    const metrics = this.getCommercialMetrics();
    if (!metrics?.total_active_clients || !metrics?.new_clients_this_period) return 0;
    return Math.round((metrics.new_clients_this_period / metrics.total_active_clients) * 1000) / 10;
  });

  newClientsTrend = computed(() => 7.5);

  constructor(private dashboardFacade: DashboardFacade) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.dashboardFacade.destroy();
  }

  // ===== DATA GETTERS =====

  getDashboardTitle(): string {
    return this.dashboardFacade.getDashboardTitle();
  }

  isCommercialDashboard(): boolean {
    return this.dashboardFacade.config().type === 'commercial';
  }

  isPersonalDashboard(): boolean {
    return this.dashboardFacade.config().type === 'personal';
  }

  getCommercialMetrics() {
    return this.dashboardFacade.commercialData().overview;
  }

  getPersonalMetrics() {
    return this.dashboardFacade.personalData().overview;
  }

  getCommercialStats() {
    return this.dashboardFacade.commercialData().stats;
  }

  getClientsEvolution() {
    return this.dashboardFacade.commercialData().evolution;
  }

  getRecentInteractions() {
    return this.isCommercialDashboard()
      ? this.dashboardFacade.commercialData().interactions
      : this.dashboardFacade.personalData().interactions;
  }

  getInactiveClients() {
    return this.dashboardFacade.commercialData().inactiveClients;
  }


  getUpcomingAppointments() {
    return this.dashboardFacade.personalData().upcomingAppointments;
  }

  getPersonalPortfolio() {
    return this.dashboardFacade.personalData().portfolio;
  }

  // ===== UTILITY METHODS =====

  getCurrentDateTime(): string {
    const now = new Date();
    return now.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  formatPeriod(period: PeriodType): string {
    const periods: Record<PeriodType, string> = {
      'month': 'Ce mois',
      'quarter': 'Ce trimestre',
      'year': 'Cette année',
      'custom': 'Période personnalisée'
    };
    return periods[period];
  }



  // ===== ACTIONS =====

  loadInitialData(): void {
    this.dashboardFacade.loadDashboardData().pipe(
      takeUntil(this.destroy$)
    ).subscribe();
  }

  refreshData(): void {
    this.dashboardFacade.refreshData();
  }

  onPeriodChange(period: PeriodType): void {
    this._currentPeriod.set(period);
    this.dashboardFacade.setPeriod(period);
  }

  toggleAutoRefresh(): void {
    const newState = !this._autoRefreshEnabled();
    this._autoRefreshEnabled.set(newState);
    this.dashboardFacade.toggleAutoRefresh(newState);
  }

  startAutoRefresh(): void {
    if (this._autoRefreshEnabled()) {
      this.dashboardFacade.startAutoRefresh();
    }
  }

  // ===== EVENT HANDLERS =====

  onContactClient(client: any): void {
    console.log('Contacting client:', client);
    // Implémentation de la logique de contact
  }

  onScheduleClient(client: any): void {
    console.log('Scheduling appointment with client:', client);
    // Implémentation de la logique de planification
  }
}