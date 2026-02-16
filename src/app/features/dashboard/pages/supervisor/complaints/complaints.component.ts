import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SupervisorFacade } from '../../../supervisor/supervisor.facade';
import { SupervisorComplaint } from '../../../../../domain/models/supervisor.model';
import { Observable, Subscription } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import { ReassignModalComponent } from '../dashboard/reassign-modal/reassign-modal.component';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-supervisor-complaints',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ReassignModalComponent],
  templateUrl: './complaints.component.html',
  styleUrl: './complaints.component.scss'
})
export class SupervisorComplaintsComponent implements OnInit, AfterViewInit, OnDestroy {
  public complaints$!: Observable<SupervisorComplaint[]>;
  public stats$!: Observable<any>;
  public isLoading$!: Observable<boolean>;
  
  private chart: Chart | undefined;
  private chartSubscription: Subscription | undefined;

  public showReassignModal = false;
  public selectedComplaint: SupervisorComplaint | null = null;

  public filters = {
    severity: '',
    status: '',
    category: '',
    agent: '',
    period: 'month'
  };

  constructor(public facade: SupervisorFacade) {
    this.complaints$ = this.facade.complaints$;
    this.stats$ = this.facade.complaintStats$;
    this.isLoading$ = this.facade.isLoading$;
  }

  ngOnInit(): void {
    this.facade.loadComplaints();
    // Necessary to populate teamView$ for the reassign modal
    this.facade.loadDashboardData(); 
  }

  ngAfterViewInit(): void {
    if (this.facade.complaintChartData$) {
      this.chartSubscription = this.facade.complaintChartData$.subscribe(
        (data: { labels: string[], values: number[] }) => {
          if (data && data.labels.length > 0) {
            this.renderChart(data.labels, data.values);
          }
        }
      );
    }
  }

  private renderChart(labels: string[], values: number[]): void {
    const ctx = document.getElementById('complaintsChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Nombre de réclamations',
          data: values,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#6366f1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: '#94a3b8' },
            grid: { color: '#f1f5f9' }
          },
          x: {
            ticks: { color: '#94a3b8' },
            grid: { display: false }
          }
        }
      }
    });
  }

  applyFilters(): void {
    this.facade.loadComplaints();
  }

  openReassignModal(complaint: SupervisorComplaint): void {
    this.selectedComplaint = complaint;
    this.showReassignModal = true;
  }

  onReassign(event: any): void {
    if (this.selectedComplaint && event) {
      this.facade.reassignCall(
        this.selectedComplaint.call.id.toString(),
        event.agentId,
        event.reason
      ).subscribe(() => {
        this.showReassignModal = false;
        this.refreshData();
      });
    }
  }

  /**
   * Actions now correctly subscribe to observables to trigger the API call 
   * and refresh the local state on success
   */
    onEscalate(id: number): void {
        this.facade.escalate(id).subscribe(() => this.refreshData());
    }

    onValidate(id: number): void {
        this.facade.validate(id).subscribe(() => this.refreshData());
    }

    onClose(id: number): void {
        this.facade.close(id).subscribe(() => this.refreshData());
    }

  /**
   * Helper to keep the table and KPI summary tiles in sync
   */
  private refreshData(): void {
    this.facade.loadComplaints();
    this.facade.loadDashboardData();
  }

  ngOnDestroy(): void {
    if (this.chartSubscription) {
      this.chartSubscription.unsubscribe();
    }
    if (this.chart) {
      this.chart.destroy();
    }
  }
}