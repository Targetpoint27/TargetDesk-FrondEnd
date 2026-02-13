import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx'; //
import jsPDF from 'jspdf'; //
import autoTable from 'jspdf-autotable'; //
import { DailyActivityReport } from '../../domain/models/report.model';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  /**
   * Generates an Excel file from the call list
   */
  exportToExcel(data: any[], fileName: string): void {
    // 1. Create worksheet from JSON data
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // 2. Create workbook and add the sheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Appels du Jour');
    
    // 3. Trigger download
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }

  /**
   * Generates a professional PDF with summary and table
   */
  exportToPDF(reportData: DailyActivityReport, fileName: string): void {
    const doc = new jsPDF();
    const dateStr = reportData.date;

    // --- Header Section ---
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235); // TargetDesk Blue
    doc.text('TARGETDESK - Rapport d\'Activité', 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Date du rapport: ${dateStr}`, 14, 30);

    // --- Summary Section (KPIs) ---
    doc.setDrawColor(230);
    doc.line(14, 35, 196, 35); // Horizontal line

    doc.setFontSize(11);
    doc.text(`Total traités: ${reportData.summary.total_treated}`, 14, 45);
    doc.text(`Clôturés: ${reportData.summary.total_closed}`, 80, 45);
    doc.text(`Temps moyen: ${reportData.summary.avg_time_per_call}`, 150, 45);

    // --- Table Section ---
    const head = [['Heure', 'Type', 'Appelant', 'Objet', 'Statut']];
    const body = reportData.calls.map(c => [
      c.time, 
      c.type.toUpperCase(), 
      c.caller, 
      c.object, 
      c.status.toUpperCase()
    ]);

    autoTable(doc, {
      startY: 55,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });

    // --- Footer ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} sur ${pageCount} - Généré par TargetDesk CRM`, 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`${fileName}.pdf`);
  }
}