import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ManagerFacade } from '../../manager/manager.facade';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

Chart.register(...registerables);

@Component({
  selector: 'app-manager-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss'
})
export class AnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  public selectedPeriod = 'month';
  private charts: Record<string, Chart> = {};
  private subs = new Subscription();
  public isExporting = false;

  constructor(public facade: ManagerFacade) {}

  ngOnInit(): void {
    this.facade.loadAllReports(this.selectedPeriod);
  }

  ngAfterViewInit(): void {
    // Listen for data changes to update charts
    this.subs.add(
      this.facade.dashboard$.subscribe(data => {
        if (data) this.updateTrendsChart(data.graphs.evolution);
      })
    );
    this.subs.add(
      this.facade.heatmap$.subscribe(data => {
        if (data.length) this.updateHeatmapChart(data);
      })
    );
  }

  onPeriodChange(): void {
    this.facade.loadAllReports(this.selectedPeriod);
  }

  private updateTrendsChart(evolution: Record<string, number>): void {
    const ctx = document.getElementById('trendsChart') as HTMLCanvasElement;
    if (!ctx) return;
    this.renderChart('trends', ctx, 'line', {
      labels: Object.keys(evolution),
      datasets: [{
        label: 'Volume d\'appels',
        data: Object.values(evolution),
        borderColor: '#4f46e5',
        tension: 0.4,
        fill: true,
        backgroundColor: 'rgba(79, 70, 229, 0.1)'
      }]
    });
  }

  private updateHeatmapChart(data: any[]): void {
    const ctx = document.getElementById('heatmapChart') as HTMLCanvasElement;
    if (!ctx) return;
    this.renderChart('heatmap', ctx, 'bar', {
      labels: data.map(d => `${d.hour}h`),
      datasets: [{
        label: 'Appels par heure',
        data: data.map(d => d.count),
        backgroundColor: '#f59e0b'
      }]
    });
  }

  private renderChart(id: string, ctx: HTMLCanvasElement, type: any, data: any): void {
    if (this.charts[id]) this.charts[id].destroy();
    this.charts[id] = new Chart(ctx, { type, data, options: { responsive: true, maintainAspectRatio: false } });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    Object.values(this.charts).forEach(c => c.destroy());
  }

  public exportToPDF(): void {
    this.isExporting = true;
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();

    // 1. Document Header
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text(`Rapport d'Analyses Manager - ${this.selectedPeriod}`, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Département: TargetDesk | Date: ${dateStr}`, 14, 30);

    // 2. Capture current KPI data from the Facade
    this.facade.dashboard$.subscribe(dash => {
      if (!dash) return;
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 35, 196, 35);

      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('Indicateurs Clés (KPIs):', 14, 45);
      doc.setFontSize(10);
      doc.text(`- Volume Total: ${dash.kpis.total_volume.current}`, 20, 52);
      doc.text(`- Taux de Réponse: ${dash.kpis.response_rate}`, 20, 58);
      doc.text(`- Taux de Résolution: ${dash.kpis.resolution_rate}`, 20, 64);
    }).unsubscribe();

    // 3. Generate Agent Table
    this.facade.performance$.subscribe(agents => {
      const tableData = agents.map(a => [
        a.name, 
        a.calls_count.toString(), 
        a.load_status.toUpperCase()
      ]);
      
      autoTable(doc, {
        startY: 75,
        head: [['Nom de l\'Agent', 'Appels Traités', 'État de la Charge']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 9 }
      });

      doc.save(`TargetDesk_Manager_Report_${this.selectedPeriod}_${dateStr}.pdf`);
      this.isExporting = false;
    }).unsubscribe();
  }
}