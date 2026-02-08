import { Component, ElementRef, Input, OnInit, OnDestroy, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-base-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container" [style.height.px]="height">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: [`
    .chart-container {
      position: relative;
      width: 100%;
    }

    canvas {
      max-height: 100%;
      max-width: 100%;
    }
  `]
})
export class BaseChartComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('chartCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() config!: ChartConfiguration;
  @Input() height: number = 300;
  @Input() responsive: boolean = true;
  @Input() maintainAspectRatio: boolean = false;

  private chart: Chart | null = null;

  ngOnInit(): void {
    this.createChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.chart && (changes['config'] && !changes['config'].firstChange)) {
      this.updateChart();
    }
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private createChart(): void {
    if (this.chart) {
      this.destroyChart();
    }

    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Configuration par défaut
    const defaultConfig: Partial<ChartConfiguration> = {
      options: {
        responsive: this.responsive,
        maintainAspectRatio: this.maintainAspectRatio,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    };

    // Merge des configurations
    const mergedConfig = this.deepMerge(defaultConfig, this.config);

    this.chart = new Chart(ctx, mergedConfig as ChartConfiguration);
  }

  private updateChart(): void {
    if (!this.chart) return;

    // Mise à jour des données
    this.chart.data = this.config.data;

    // Mise à jour des options si nécessaires
    if (this.config.options) {
      this.chart.options = this.deepMerge(this.chart.options, this.config.options);
    }

    this.chart.update('active');
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  // Méthodes publiques pour interaction
  public updateData(data: any): void {
    if (this.chart) {
      this.chart.data = data;
      this.chart.update();
    }
  }

  public getChart(): Chart | null {
    return this.chart;
  }

  public downloadChart(filename: string = 'chart'): void {
    if (this.chart) {
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = this.chart.toBase64Image();
      link.click();
    }
  }
}