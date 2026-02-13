import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts'; // Fixed import
import { ReportFacade } from '../../../call-center/reports/report.facade';
import { ExportService } from '../../../../../shared/services/export.service';
import { ChartType } from 'chart.js';
import { Observable } from 'rxjs';
import { DailyActivityReport } from '../../../../../domain/models/report.model';

@Component({
  selector: 'app-daily-report',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './daily-report.component.html',
  styleUrls: ['./daily-report.component.scss']
})
export class DailyReportComponent implements OnInit {
  // Declare these without assigning them immediately to avoid the initialization error
  public report$: Observable<DailyActivityReport | null>;
  public isLoading$: Observable<boolean>;

  // Allow Object keys access in template
  public Object = Object;

  // Chart Configurations
  public doughnutChartType: ChartType = 'doughnut';
  public barChartType: ChartType = 'bar';

  constructor(
    private reportFacade: ReportFacade,
    private exportService: ExportService
  ) {
    // Assign them here - the facade is now officially initialized
    this.report$ = this.reportFacade.report$;
    this.isLoading$ = this.reportFacade.isLoading$;
  }

  ngOnInit(): void {
    this.reportFacade.loadDailyReport(); // Fetch data for today
  }

  onViewYesterday(): void {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    this.reportFacade.loadDailyReport(dateStr); //
  }

  exportToExcel(data: DailyActivityReport): void {
    this.exportService.exportToExcel(data.calls, `Rapport_Appels_${data.date}`); //
  }

  exportToPDF(data: DailyActivityReport): void {
    this.exportService.exportToPDF(data, `Rapport_Appels_${data.date}`); //
  }
}