import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService, ApiResponse } from '../api/api.service'; // Use your real ApiService
import { 
  ManagerDashboardData, 
  AgentPerformance, 
  HeatmapItem, 
  MotifsReportData 
} from '../../domain/models/manager-report.model';

@Injectable({
  providedIn: 'root'
})
export class ManagerReportService {
  // Your ApiService already knows the base URL/v1, so we just provide the feature path
  private readonly featurePath = 'call-center/manager';

  constructor(private api: ApiService) {}

  /**
   * Fetches main KPI dashboard
   */
  getDashboard(period: string = 'month'): Observable<ManagerDashboardData> {
    return this.api.get<ApiResponse<ManagerDashboardData>>(
      `${this.featurePath}/dashboard`, 
      { params: { period } }
    ).pipe(
      map(res => this.api.unwrapApiResponse<ManagerDashboardData>(res))
    );
  }

  /**
   * Fetches agent performance
   */
  getPerformance(period: string = 'month'): Observable<AgentPerformance[]> {
    return this.api.get<ApiResponse<AgentPerformance[]>>(
      `${this.featurePath}/reports/performance`, 
      { params: { period } }
    ).pipe(
      map(res => this.api.unwrapApiResponse<AgentPerformance[]>(res))
    );
  }

  /**
   * Fetches hourly traffic
   */
  getHeatmap(period: string = 'month'): Observable<HeatmapItem[]> {
    return this.api.get<ApiResponse<HeatmapItem[]>>(
      `${this.featurePath}/reports/heatmap`, 
      { params: { period } }
    ).pipe(
      map(res => this.api.unwrapApiResponse<HeatmapItem[]>(res))
    );
  }

  /**
   * Fetches top motifs
   */
  getMotifs(period: string = 'month'): Observable<MotifsReportData> {
    return this.api.get<ApiResponse<MotifsReportData>>(
      `${this.featurePath}/reports/motifs`, 
      { params: { period } }
    ).pipe(
      map(res => this.api.unwrapApiResponse<MotifsReportData>(res))
    );
  }
}