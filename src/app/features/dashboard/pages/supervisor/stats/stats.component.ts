import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { SupervisorFacade } from '../../../supervisor/supervisor.facade';
import { Observable } from 'rxjs';
import { TeamStats } from '../../../../../domain/models/supervisor.model';
import { ChartConfiguration, ChartType } from 'chart.js';

@Component({
  selector: 'app-supervisor-stats',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss']
})
export class SupervisorStatsComponent implements OnInit {
  // 1. Expose Object to the template context
  public Object = Object; 
  
  public stats$!: Observable<TeamStats | null>;
  public currentPeriod: string = 'month';

  // Chart Configurations
  public lineChartType: ChartType = 'line';
  public barChartType: ChartType = 'bar';

  constructor(private supervisorFacade: SupervisorFacade) {
    this.stats$ = this.supervisorFacade.stats$;
  }

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(period: string = 'month'): void {
    this.currentPeriod = period;
    this.supervisorFacade.loadStats(period);
  }

  // 2. Evolution Chart Helper (Line)
  getEvolutionData(evolution: Record<string, number>): ChartConfiguration['data'] {
    return {
      labels: Object.keys(evolution),
      datasets: [
        {
          data: Object.values(evolution),
          label: 'Volume d\'appels',
          fill: true,
          tension: 0.4,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          pointBackgroundColor: '#2563eb'
        }
      ]
    };
  }

  // 3. Status Distribution Helper (Bar)
  getDistributionData(distribution: Record<string, number>): ChartConfiguration['data'] {
    return {
      labels: Object.keys(distribution),
      datasets: [
        {
          data: Object.values(distribution),
          label: 'Répartition par Statut',
          backgroundColor: [
            '#10b981', // Vert (Traité)
            '#f59e0b', // Orange (En cours)
            '#ef4444', // Rouge (Urgent/Manqué)
            '#3b82f6'  // Bleu (Nouveau)
          ],
          borderRadius: 6
        }
      ]
    };
  }
}