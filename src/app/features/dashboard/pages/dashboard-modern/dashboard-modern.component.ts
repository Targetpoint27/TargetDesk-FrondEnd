import { Component, OnInit, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardFacade } from '../../dashboard.facade';
import { PeriodType } from '../../../../shared/interfaces/dashboard.interface';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Import des composants
import { ClientsEvolutionChartComponent } from '../../../../shared/components/charts/clients-evolution-chart.component';
import { StatsDoughnutChartComponent } from '../../../../shared/components/charts/stats-doughnut-chart.component';
import { UpcomingAppointmentsWidgetComponent } from '../../../../shared/components/widgets/upcoming-appointments-widget.component';

@Component({
  selector: 'app-dashboard-modern',
  standalone: true,
  imports: [
    CommonModule,
    ClientsEvolutionChartComponent,
    StatsDoughnutChartComponent,
    UpcomingAppointmentsWidgetComponent
  ],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">

      <!-- Header moderne -->
      <div class="bg-white/80 backdrop-blur-xl border-b border-white/60 shadow-sm sticky top-0 z-20">
        <div class="max-w-7xl mx-auto px-6 py-6">
          <div class="flex items-center justify-between">
            <!-- Titre et informations -->
            <div>
              <h1 class="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-600 bg-clip-text text-transparent">
                {{ getDashboardTitle() }}
              </h1>
              <div class="flex items-center space-x-4 mt-2">
                <p class="text-slate-600 text-sm">{{ getCurrentDateTime() }}</p>
                <div class="flex items-center space-x-2">
                  <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span class="text-green-600 text-sm font-medium">En ligne</span>
                </div>
              </div>
            </div>

            <!-- Contrôles -->
            <div class="flex items-center space-x-4">

              <!-- Sélecteur de période -->
              <div class="relative">
                <select
                  [value]="currentPeriod()"
                  (change)="onPeriodChange($any($event.target).value)"
                  class="appearance-none bg-white/90 backdrop-blur-sm px-4 py-3 pr-10 border border-gray-200/60 rounded-xl text-sm font-medium text-slate-700 shadow-sm hover:shadow-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 cursor-pointer">
                  <option value="month">Ce mois</option>
                  <option value="quarter">Ce trimestre</option>
                  <option value="year">Cette année</option>
                </select>
                <i class="bi bi-chevron-down absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none"></i>
              </div>

              <!-- Bouton refresh -->
              <button
                (click)="refreshData()"
                [disabled]="isLoading()"
                class="flex items-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md">
                <i class="bi" [class.bi-arrow-clockwise]="!isLoading()" [class.bi-hourglass]="isLoading()"
                   [class.animate-spin]="isLoading()"></i>
                <span class="font-medium">{{ isLoading() ? 'Actualisation...' : 'Actualiser' }}</span>
              </button>

              <!-- Toggle auto-refresh -->
              <button
                (click)="toggleAutoRefresh()"
                [class.bg-green-100]="autoRefreshEnabled()"
                [class.text-green-700]="autoRefreshEnabled()"
                [class.bg-gray-100]="!autoRefreshEnabled()"
                [class.text-gray-600]="!autoRefreshEnabled()"
                class="p-3 rounded-xl transition-all duration-200 hover:shadow-sm"
                title="Auto-actualisation">
                <i class="bi" [class.bi-pause-circle]="autoRefreshEnabled()" [class.bi-play-circle]="!autoRefreshEnabled()"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="max-w-7xl mx-auto px-6 py-8">

        <!-- État d'erreur global -->
        <div *ngIf="globalError()" class="mb-8">
          <div class="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start space-x-4">
            <div class="flex-shrink-0">
              <i class="bi bi-exclamation-triangle text-red-500 text-2xl"></i>
            </div>
            <div class="flex-1">
              <h3 class="text-red-800 font-semibold mb-2">Erreur de chargement</h3>
              <p class="text-red-700 text-sm">{{ globalError() }}</p>
              <button
                (click)="refreshData()"
                class="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 text-sm rounded-lg transition-colors">
                Réessayer
              </button>
            </div>
          </div>
        </div>

        <!-- Dashboard Commercial -->
        <div *ngIf="isCommercialDashboard()">

          <!-- Métriques principales -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

            <!-- Clients Actifs -->
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300">
              <div class="flex items-center justify-between">
                <div>
                  <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4">
                    <i class="bi bi-people-fill text-white text-xl"></i>
                  </div>
                  <div class="text-3xl font-bold text-slate-900 mb-1">
                    {{ formatNumber(getCommercialMetrics()?.total_active_clients || 0) }}
                  </div>
                  <div class="text-sm font-medium text-slate-600">Clients Actifs</div>
                </div>
                <div *ngIf="getCommercialMetrics()?.new_clients_this_period"
                     class="text-right">
                  <div class="flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                    <i class="bi bi-arrow-up"></i>
                    <span>+{{ getCommercialMetrics()!.new_clients_this_period }}</span>
                  </div>
                  <div class="text-xs text-slate-500 mt-1">cette période</div>
                </div>
              </div>
            </div>

            <!-- Prospects -->
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300">
              <div class="flex items-center justify-between">
                <div>
                  <div class="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-4">
                    <i class="bi bi-person-plus-fill text-white text-xl"></i>
                  </div>
                  <div class="text-3xl font-bold text-slate-900 mb-1">
                    {{ formatNumber(getCommercialMetrics()?.total_prospects || 0) }}
                  </div>
                  <div class="text-sm font-medium text-slate-600">Prospects</div>
                </div>
                <div class="text-right">
                  <div class="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium">
                    Pipeline actif
                  </div>
                </div>
              </div>
            </div>

            <!-- Fournisseurs -->
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300">
              <div class="flex items-center justify-between">
                <div>
                  <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
                    <i class="bi bi-building text-white text-xl"></i>
                  </div>
                  <div class="text-3xl font-bold text-slate-900 mb-1">
                    {{ formatNumber(getCommercialMetrics()?.total_suppliers || 0) }}
                  </div>
                  <div class="text-sm font-medium text-slate-600">Fournisseurs</div>
                </div>
              </div>
            </div>

            <!-- Indicateur de performance -->
            <div class="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <div class="flex items-center justify-between">
                <div>
                  <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                    <i class="bi bi-graph-up-arrow text-white text-xl"></i>
                  </div>
                  <div class="text-3xl font-bold mb-1">{{ getGrowthRate() }}%</div>
                  <div class="text-green-100 text-sm font-medium">Croissance</div>
                </div>
                <div class="text-right">
                  <i class="bi bi-arrow-up text-2xl opacity-60"></i>
                </div>
              </div>
            </div>
          </div>

          <!-- Graphiques et widgets principaux -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

            <!-- Évolution des clients -->
            <div class="lg:col-span-2">
              <app-clients-evolution-chart
                [data]="getClientsEvolution()"
                [loading]="isLoading()"
                [error]="globalError()">
              </app-clients-evolution-chart>
            </div>

            <!-- Répartition des clients -->
            <app-stats-doughnut-chart
              [data]="getCommercialStats()"
              [loading]="isLoading()"
              [error]="globalError()">
            </app-stats-doughnut-chart>

            <!-- Activité récente -->
            <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div class="flex items-center justify-between mb-6">
                <h3 class="text-lg font-semibold text-slate-800">Activité Récente</h3>
                <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  {{ getRecentInteractions()?.total_found || 0 }} interactions
                </span>
              </div>

              <div *ngIf="getRecentInteractions()?.interactions?.length; else noActivity" class="space-y-4">
                <div *ngFor="let interaction of getRecentInteractions()!.interactions.slice(0, 5); trackBy: trackInteraction"
                     class="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <i class="bi" [class]="getInteractionIcon(interaction.type)" class="text-blue-600 text-sm"></i>
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-medium text-slate-800">{{ interaction.subject }}</h4>
                    <p class="text-sm text-slate-600 mt-1">{{ interaction.client_name }}</p>
                    <div class="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                      <span>{{ formatRelativeTime(interaction.created_at) }}</span>
                      <span>{{ interaction.created_by }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <ng-template #noActivity>
                <div class="text-center py-8">
                  <i class="bi bi-activity text-4xl text-gray-400 mb-3"></i>
                  <p class="text-slate-500">Aucune activité récente</p>
                </div>
              </ng-template>
            </div>
          </div>
        </div>

        <!-- Dashboard Personnel -->
        <div *ngIf="isPersonalDashboard()">

          <!-- Métriques personnelles -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

            <!-- Mes clients -->
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300">
              <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4">
                <i class="bi bi-person-heart text-white text-xl"></i>
              </div>
              <div class="text-3xl font-bold text-slate-900 mb-1">
                {{ getPersonalMetrics()?.my_active_clients || 0 }}
              </div>
              <div class="text-sm font-medium text-slate-600">Mes Clients</div>
            </div>

            <!-- Mes prospects -->
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300">
              <div class="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-4">
                <i class="bi bi-person-plus text-white text-xl"></i>
              </div>
              <div class="text-3xl font-bold text-slate-900 mb-1">
                {{ getPersonalMetrics()?.my_prospects || 0 }}
              </div>
              <div class="text-sm font-medium text-slate-600">Mes Prospects</div>
            </div>

            <!-- RDV à venir -->
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300">
              <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-4">
                <i class="bi bi-calendar-check text-white text-xl"></i>
              </div>
              <div class="text-3xl font-bold text-slate-900 mb-1">
                {{ getPersonalMetrics()?.my_appointments_upcoming || 0 }}
              </div>
              <div class="text-sm font-medium text-slate-600">RDV à venir</div>
            </div>

            <!-- Interactions ce mois -->
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300">
              <div class="w-12 h-12 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center mb-4">
                <i class="bi bi-chat-dots text-white text-xl"></i>
              </div>
              <div class="text-3xl font-bold text-slate-900 mb-1">
                {{ getPersonalMetrics()?.my_interactions_this_period || 0 }}
              </div>
              <div class="text-sm font-medium text-slate-600">Interactions</div>
            </div>
          </div>

          <!-- Widgets personnels -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

            <!-- RDV à venir -->
            <app-upcoming-appointments-widget
              [data]="getUpcomingAppointments()"
              [loading]="isLoading()"
              [error]="globalError()">
            </app-upcoming-appointments-widget>

            <!-- Activité personnelle -->
            <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div class="flex items-center justify-between mb-6">
                <h3 class="text-lg font-semibold text-slate-800">Mon Activité</h3>
                <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  Ce mois
                </span>
              </div>
              <div class="text-center py-8">
                <i class="bi bi-graph-up text-4xl text-blue-400 mb-3"></i>
                <p class="text-slate-600 mb-2">{{ getPersonalMetrics()?.my_interactions_this_period || 0 }} interactions</p>
                <p class="text-slate-500 text-sm">Continuez sur cette lancée !</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardModernComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Signaux pour l'état réactif
  private _currentPeriod = signal<PeriodType>('month');
  private _autoRefreshEnabled = signal(true);

  // Computed values
  currentPeriod = computed(() => this._currentPeriod());
  autoRefreshEnabled = computed(() => this._autoRefreshEnabled());
  isLoading = computed(() => this.dashboardFacade.loading());
  globalError = computed(() => this.dashboardFacade.error());

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


  getUpcomingAppointments() {
    return this.dashboardFacade.personalData().upcomingAppointments;
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

  // ===== UTILITY METHODS =====

  getCurrentDateTime(): string {
    const now = new Date();
    return now.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value);
  }

  getGrowthRate(): number {
    const metrics = this.getCommercialMetrics();
    if (!metrics) return 0;

    const total = metrics.total_active_clients;
    const newClients = metrics.new_clients_this_period;

    if (total === 0) return 0;
    return Math.round((newClients / total) * 100);
  }

  trackInteraction(index: number, interaction: any): number {
    return interaction.id;
  }

  getInteractionIcon(type: string): string {
    const icons: Record<string, string> = {
      'call': 'bi-telephone',
      'email': 'bi-envelope',
      'meeting': 'bi-people',
      'visit': 'bi-geo-alt'
    };
    return icons[type.toLowerCase()] || 'bi-chat-dots';
  }

  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 60) {
      return `il y a ${diffMinutes} min`;
    } else if (diffHours < 24) {
      return `il y a ${diffHours}h`;
    } else if (diffDays < 7) {
      return `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('fr-FR');
    }
  }
}