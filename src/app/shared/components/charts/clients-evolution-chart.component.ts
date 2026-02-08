import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartConfiguration } from 'chart.js';
import { BaseChartComponent } from './base-chart.component';
import { ClientsEvolution, EvolutionDataPoint } from '../../interfaces/dashboard.interface';

@Component({
  selector: 'app-clients-evolution-chart',
  standalone: true,
  imports: [CommonModule, BaseChartComponent],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-lg font-semibold text-slate-800">Évolution des Clients</h3>
          <p class="text-sm text-slate-600 mt-1">Évolution du nombre de clients dans le temps</p>
        </div>
        <div class="flex items-center space-x-2">
          <button
            (click)="downloadChart()"
            class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Télécharger le graphique">
            <i class="bi bi-download text-sm"></i>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="flex items-center justify-center h-64">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-slate-600">Chargement du graphique...</span>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="flex items-center justify-center h-64">
        <div class="text-center">
          <i class="bi bi-exclamation-triangle text-4xl text-red-400 mb-2"></i>
          <p class="text-slate-600">{{ error }}</p>
        </div>
      </div>

      <!-- Chart -->
      <div *ngIf="!loading && !error && chartConfig">
        <app-base-chart
          [config]="chartConfig"
          [height]="320"
          #chartComponent>
        </app-base-chart>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && !error && !hasData" class="flex items-center justify-center h-64">
        <div class="text-center">
          <i class="bi bi-graph-up text-4xl text-gray-400 mb-2"></i>
          <p class="text-slate-600">Aucune donnée d'évolution disponible</p>
        </div>
      </div>
    </div>
  `
})
export class ClientsEvolutionChartComponent implements OnInit, OnChanges {
  @Input() data: ClientsEvolution | null = null;
  @Input() loading: boolean = false;
  @Input() error: string | null = null;

  chartConfig: ChartConfiguration | null = null;
  hasData: boolean = false;

  ngOnInit(): void {
    this.updateChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['loading'] || changes['error']) {
      this.updateChart();
    }
  }

  private updateChart(): void {
    if (!this.data || this.loading || this.error) {
      this.chartConfig = null;
      this.hasData = false;
      return;
    }

    const evolutionData = this.data.evolution_data || [];
    this.hasData = evolutionData.length > 0;

    if (!this.hasData) {
      this.chartConfig = null;
      return;
    }

    this.chartConfig = {
      type: 'line',
      data: {
        labels: evolutionData.map(item => this.formatPeriodLabel(item.period)),
        datasets: [
          {
            label: 'Total Clients',
            data: evolutionData.map(item => item.total_clients),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
          },
          {
            label: 'Nouveaux Clients',
            data: evolutionData.map(item => item.new_clients),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
          },
          {
            label: 'Clients Actifs',
            data: evolutionData.map(item => item.active_clients),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 3,
            fill: false,
            tension: 0.4,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: '#f59e0b',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            borderDash: [5, 5],
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Période',
              color: '#64748b',
              font: {
                size: 12,
                weight: 500
              }
            },
            grid: {
              color: '#f1f5f9',
              display: false
            },
            ticks: {
              color: '#64748b',
              font: {
                size: 11
              }
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Nombre de clients',
              color: '#64748b',
              font: {
                size: 12,
                weight: 500
              }
            },
            beginAtZero: true,
            grid: {
              color: '#f1f5f9',
              display: false
            },
            ticks: {
              color: '#64748b',
              font: {
                size: 11
              },
              callback: function(value: any) {
                return Number.isInteger(value) ? value : '';
              }
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20,
              color: '#475569',
              font: {
                size: 12,
                weight: 500
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#f8fafc',
            bodyColor: '#f8fafc',
            borderColor: '#334155',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              title: function(context: any) {
                return `Période: ${context[0].label}`;
              },
              label: function(context: any) {
                return `${context.dataset.label}: ${context.parsed.y}`;
              }
            }
          }
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        hover: {
          mode: 'index',
          intersect: false,
        },
        elements: {
          line: {
            borderJoinStyle: 'round',
            borderCapStyle: 'round'
          }
        }
      }
    };
  }

  private formatPeriodLabel(period: string): string {
    // Format: "2026-01" → "Jan 2026"
    if (period.match(/^\d{4}-\d{2}$/)) {
      const [year, month] = period.split('-');
      const monthNames = [
        'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
        'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
      ];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    }
    return period;
  }

  public downloadChart(): void {
    // Cette méthode sera implementée via ViewChild si nécessaire
    console.log('Download chart functionality');
  }
}