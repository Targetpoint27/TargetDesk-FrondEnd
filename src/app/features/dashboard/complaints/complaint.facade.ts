import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { ComplaintHttpService } from '../../../infrastructure/http/complaint-http.service';
import { Complaint, ComplaintMetrics, ComplaintListResponse } from '../../../domain/models/complaint.model';
import { ToastService } from '../../../core/services/toast.service';

@Injectable({ providedIn: 'root' })
export class ComplaintFacade {
  private complaintsSubject = new BehaviorSubject<Complaint[]>([]);
  private metricsSubject = new BehaviorSubject<ComplaintMetrics | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private selectedComplaintSubject = new BehaviorSubject<Complaint | null>(null);
  selectedComplaint$ = this.selectedComplaintSubject.asObservable();

  complaints$ = this.complaintsSubject.asObservable();
  metrics$ = this.metricsSubject.asObservable();
  isLoading$ = this.isLoadingSubject.asObservable();

  constructor(
    private complaintService: ComplaintHttpService,
    private toastService: ToastService
  ) {}

  loadAll(): void {
    this.isLoadingSubject.next(true);
    this.complaintService.getAll().pipe(
      tap((response: ComplaintListResponse) => {
        this.complaintsSubject.next(response.data);
        this.metricsSubject.next(response.metrics);
      }),
      catchError(() => {
        this.toastService.error('Erreur lors du chargement des réclamations');
        return of({ data: [], metrics: { total: 0, overdue_count: 0 } });
      }),
      finalize(() => this.isLoadingSubject.next(false))
    ).subscribe();
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
        this.loadById(id); // Refresh data
      }),
      catchError(() => {
        this.toastService.error("Erreur lors de l'enregistrement");
        return of(null);
      }),
      finalize(() => this.isLoadingSubject.next(false))
    ).subscribe();
  }
}