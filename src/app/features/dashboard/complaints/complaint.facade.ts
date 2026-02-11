import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { ComplaintHttpService } from '../../../infrastructure/http/complaint-http.service';
import { Complaint, ComplaintMetrics } from '../../../domain/models/complaint.model';
import { ToastService } from '../../../core/services/toast.service';

@Injectable({ providedIn: 'root' })
export class ComplaintFacade {
  private complaintsSubject = new BehaviorSubject<Complaint[]>([]);
  private metricsSubject = new BehaviorSubject<ComplaintMetrics | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private selectedComplaintSubject = new BehaviorSubject<Complaint | null>(null);

  complaints$ = this.complaintsSubject.asObservable();
  metrics$ = this.metricsSubject.asObservable();
  isLoading$ = this.isLoadingSubject.asObservable();
  selectedComplaint$ = this.selectedComplaintSubject.asObservable();

  constructor(
    private complaintService: ComplaintHttpService,
    private toastService: ToastService
  ) {}

loadAll(): void {
  this.isLoadingSubject.next(true);
  this.complaintService.getAll().pipe(
    tap((response: any) => {
      // 1. Extract the actual array from 'complaints' key
      const rawComplaints = response?.complaints || []; 
      
      // 2. Map raw keys to labels for the UI
      const mappedData = rawComplaints.map((c: any) => ({
        ...c,
        category_label: this.formatLabel(c.category),
        status_label: this.formatLabel(c.status)
      }));

      this.complaintsSubject.next(mappedData);

      // 3. Map the counters from the response
      this.metricsSubject.next({
        total: response?.total || mappedData.length,
        overdue_count: response?.overdue_count || 0,
        pending_count: mappedData.filter((c: any) => 
          c.status === 'ouverte' || c.status === 'en_analyse'
        ).length
      });
    }),
    finalize(() => this.isLoadingSubject.next(false))
  ).subscribe();
}

// Simple helper to turn 'service_insatisfaisant' into 'Service Insatisfaisant'
private formatLabel(val: string): string {
  if (!val) return '';
  return val.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

  loadById(id: number): void {
    this.isLoadingSubject.next(true);
    this.complaintService.getById(id).pipe(
      tap((complaint: Complaint) => {
        this.selectedComplaintSubject.next(complaint);
      }),
      catchError(() => {
        this.toastService.error('Erreur lors du chargement des détails');
        return of(null);
      }),
      finalize(() => this.isLoadingSubject.next(false))
    ).subscribe();
  }

  updateInvestigation(id: number, data: any): void {
    this.isLoadingSubject.next(true);
    this.complaintService.updateProcessing(id, data).pipe(
      tap(() => {
        this.toastService.success('Analyse enregistrée avec succès');
        this.loadById(id);
      }),
      catchError(() => {
        this.toastService.error("Erreur lors de l'enregistrement");
        return of(null);
      }),
      finalize(() => this.isLoadingSubject.next(false))
    ).subscribe();
  }

  resolveComplaint(id: number, data: any): void {
    this.isLoadingSubject.next(true);
    this.complaintService.resolve(id, data).pipe(
      tap(() => {
        this.toastService.success('Réclamation résolue !');
        this.loadById(id);
      }),
      finalize(() => this.isLoadingSubject.next(false))
    ).subscribe();
  }

  closeComplaint(id: number, data: any): void {
    this.isLoadingSubject.next(true);
    this.complaintService.close(id, data).pipe(
      tap(() => {
        this.toastService.success('Réclamation clôturée définitivement.');
        this.loadById(id);
      }),
      finalize(() => this.isLoadingSubject.next(false))
    ).subscribe();
  }
}