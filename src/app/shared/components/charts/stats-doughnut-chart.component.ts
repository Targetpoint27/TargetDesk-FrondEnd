import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartConfiguration } from 'chart.js';
import { BaseChartComponent } from './base-chart.component';
import { CommercialStats, StatItem } from '../../interfaces/dashboard.interface';

@Component({
  selector: 'app-stats-doughnut-chart',
  standalone: true,
  imports: [CommonModule, BaseChartComponent],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-lg font-semibold text-slate-800">{{ title }}</h3>
          <p class="text-sm text-slate-600 mt-1">{{ subtitle }}</p>
        </div>
        <div class="flex items-center space-x-2">
          <!-- Tabs de sélection -->
          <div class="flex bg-gray-100 rounded-lg p-1">
            <button
              *ngFor="let type of availableTypes"
              (click)="selectType(type.key)"
              [class.bg-white]="selectedType === type.key"
              [class.shadow-sm]="selectedType === type.key"
              [class.text-blue-600]="selectedType === type.key"
              [class.font-medium]="selectedType === type.key"
              class="px-3 py-1 text-xs rounded-md transition-all duration-200">
              {{ type.label }}
            </button>
          </div>
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
      <div *ngIf="!loading && !error && chartConfig" class="flex items-center">
        <div class="flex-1">
          <app-base-chart
            [config]="chartConfig"
            [height]="280"
            #chartComponent>
          </app-base-chart>
        </div>

        <!-- Legend personnalisée -->
        <div class="ml-6 space-y-2">
          <div
            *ngFor="let item of currentData; let i = index"
            class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
            <div
              class="w-4 h-4 rounded-full flex-shrink-0"
              [style.background-color]="getColor(i)">
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-700 truncate">
                {{ getLabel(item) }}
              </p>
              <div class="flex items-center space-x-2 text-xs text-slate-500">
                <span>{{ item.count }} clients</span>
                <span>•</span>
                <span class="font-medium text-blue-600">{{ item.percentage.toFixed(1) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && !error && !hasData" class="flex items-center justify-center h-64">
        <div class="text-center">
          <i class="bi bi-pie-chart text-4xl text-gray-400 mb-2"></i>
          <p class="text-slate-600">Aucune donnée de répartition disponible</p>
        </div>
      </div>
    </div>
  `
})
export class StatsDoughnutChartComponent implements OnInit, OnChanges {
  @Input() data: CommercialStats | null = null;
  @Input() loading: boolean = false;
  @Input() error: string | null = null;

  chartConfig: ChartConfiguration | null = null;
  hasData: boolean = false;
  selectedType: string = 'status';
  currentData: StatItem[] = [];

  title: string = 'Répartition des Clients';
  subtitle: string = 'Analyse de la distribution';

  availableTypes = [
    { key: 'status', label: 'Statut', field: 'clients_by_status' },
    { key: 'type', label: 'Type', field: 'clients_by_type' },
    { key: 'sector', label: 'Secteur', field: 'clients_by_sector' }
  ];

  private colors = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#ec4899', // pink
    '#6b7280'  // gray
  ];

  ngOnInit(): void {
    this.updateChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['loading'] || changes['error']) {
      this.updateChart();
    }
  }

  selectType(type: string): void {
    this.selectedType = type;
    this.updateChart();
  }

  private updateChart(): void {
    if (!this.data || this.loading || this.error) {
      this.chartConfig = null;
      this.hasData = false;
      return;
    }

    const selectedConfig = this.availableTypes.find(t => t.key === this.selectedType);
    if (!selectedConfig) return;

    this.currentData = (this.data as any)[selectedConfig.field] || [];
    this.hasData = this.currentData.length > 0;

    if (!this.hasData) {
      this.chartConfig = null;
      return;
    }

    // Mise à jour du titre
    this.updateTitleAndSubtitle();

    this.chartConfig = {
      type: 'doughnut',
      data: {
        labels: this.currentData.map(item => this.getLabel(item)),
        datasets: [{
          data: this.currentData.map(item => item.count),
          backgroundColor: this.currentData.map((_, index) => this.getColor(index)),
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false // Utilise la légende personnalisée
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#f8fafc',
            bodyColor: '#f8fafc',
            borderColor: '#334155',
            borderWidth: 1,
            cornerRadius: 8,
            callbacks: {
              label: (context: any) => {
                const item = this.currentData[context.dataIndex];
                return [
                  `${context.label}: ${item.count} clients`,
                  `${item.percentage.toFixed(1)}% du total`
                ];
              }
            }
          }
        },
        hover: {
          mode: 'nearest'
        },
        animation: {
          duration: 1000,
          easing: 'easeInOutQuart'
        }
      }
    };
  }

  private updateTitleAndSubtitle(): void {
    const selectedConfig = this.availableTypes.find(t => t.key === this.selectedType);
    if (selectedConfig) {
      this.title = `Répartition par ${selectedConfig.label}`;
      this.subtitle = `Distribution des clients par ${selectedConfig.label.toLowerCase()}`;
    }
  }

  getLabel(item: StatItem): string {
    if (item.status) return this.formatStatusLabel(item.status);
    if (item.type) return this.formatTypeLabel(item.type);
    if (item.sector) return item.sector;
    return 'Inconnu';
  }

  private formatStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'active': 'Actif',
      'inactive': 'Inactif',
      'prospect': 'Prospect',
      'archived': 'Archivé'
    };
    return labels[status.toLowerCase()] || status;
  }

  private formatTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'entreprise': 'Entreprise',
      'particulier': 'Particulier',
      'association': 'Association',
      'freelance': 'Freelance'
    };
    return labels[type.toLowerCase()] || type;
  }

  getColor(index: number): string {
    return this.colors[index % this.colors.length];
  }
}