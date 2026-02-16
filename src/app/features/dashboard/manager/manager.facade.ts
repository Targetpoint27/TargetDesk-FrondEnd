import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, Observable, finalize, tap } from 'rxjs';
import { ManagerReportService } from '../../../core/services/manager-report.service';
import { 
  ManagerDashboardData, 
  AgentPerformance, 
  HeatmapItem, 
  MotifsReportData 
} from '../../../domain/models/manager-report.model';
import { LoggingService } from '../../../core/logging/logging.service';

@Injectable({
  providedIn: 'root'
})
export class ManagerFacade {
  // State Subjects
  private dashboardSubject = new BehaviorSubject<ManagerDashboardData | null>(null);
  public dashboard$ = this.dashboardSubject.asObservable();

  private performanceSubject = new BehaviorSubject<AgentPerformance[]>([]);
  public performance$ = this.performanceSubject.asObservable();

  private heatmapSubject = new BehaviorSubject<HeatmapItem[]>([]);
  public heatmap$ = this.heatmapSubject.asObservable();

  private motifsSubject = new BehaviorSubject<MotifsReportData | null>(null);
  public motifs$ = this.motifsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.loadingSubject.asObservable();

  constructor(
    private reportService: ManagerReportService,
    private loggingService: LoggingService
  ) {}

  /**
   * Centralized method to load all manager reports at once
   * Ensures that changing the period (week/month/year) updates the entire dashboard
   */
  public loadAllReports(period: string = 'month'): void {
    this.loadingSubject.next(true);

    // Using forkJoin to fire all 4 backend requests in parallel
    forkJoin({
      dashboard: this.reportService.getDashboard(period),
      performance: this.reportService.getPerformance(period),
      heatmap: this.reportService.getHeatmap(period),
      motifs: this.reportService.getMotifs(period)
    }).pipe(
      finalize(() => this.loadingSubject.next(false)),
      tap({
        error: (err) => this.loggingService.error('ManagerFacade: Failed to load analytics', err)
      })
    ).subscribe({
      next: (data) => {
        this.dashboardSubject.next(data.dashboard);
        this.performanceSubject.next(data.performance);
        this.heatmapSubject.next(data.heatmap);
        this.motifsSubject.next(data.motifs);
      }
    });
  }

  /**
   * Helper to refresh data without changing the current period
   */
  public refreshCurrent(period: string): void {
    this.loadAllReports(period);
  }
}