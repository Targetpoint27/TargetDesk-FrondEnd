import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';
import { ScheduleCallbackModalComponent } from '../../../../../shared/components/callback-modals/schedule-callback-modal.component';
import { ScheduleCallbackRequest } from '../../../../../domain/models/call.model';


import { Call, CallStatus } from '../../../../../domain/models/call.model';
import { CallFacade } from '../../../call-center/calls/call.facade';

import { EditCallModalComponent } from '../edit-call-modal/edit-call-modal.component';
import { UpdateCallRequest } from '../../../../../domain/models/call.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CloseCallModalComponent } from '../close-call-modal/close-call-modal.component';
import { CloseCallRequest } from '../../../../../domain/models/call.model';

@Component({
  selector: 'app-call-details',
  standalone: true,
  imports: [CommonModule, RouterModule, EditCallModalComponent, CloseCallModalComponent, ReactiveFormsModule, ScheduleCallbackModalComponent],
  templateUrl: './call-details.component.html',
  styleUrl: './call-details.component.scss'
})
export class CallDetailsComponent implements OnInit, OnDestroy {
  isScheduleModalOpen = false;
  private destroy$ = new Subject<void>();
  
  call$!: Observable<Call | null>;
  isLoading$!: Observable<boolean>;

  // Modal state
  isEditModalOpen = false;
  departments: any[] = [];

  // Note form
  showNoteForm = false;
  noteForm!: FormGroup;
  isAddingNote = false;

  // Close modal state
  isCloseModalOpen = false;

  // Status dropdown state
  showStatusDropdown = false;
  availableStatuses: Array<{ value: CallStatus; label: string; color: string }> = [
    { value: 'nouveau', label: 'Nouveau', color: 'text-green-700' },
    { value: 'a_traiter', label: 'À traiter', color: 'text-yellow-700' },
    { value: 'en_cours', label: 'En cours', color: 'text-blue-700' },
    { value: 'en_attente', label: 'En attente', color: 'text-orange-700' },
    { value: 'resolu', label: 'Résolu', color: 'text-purple-700' },
    { value: 'a_rappeler', label: 'À rappeler', color: 'text-red-700' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private callFacade: CallFacade,
    private fb: FormBuilder
  ) {
    this.call$ = this.callFacade.currentCall$;
    this.isLoading$ = this.callFacade.isLoading$;

    // Initialize note form
    this.noteForm = this.fb.group({
        note: ['', [Validators.required]],
        is_important: [false]
    });
  }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
      // Close status dropdown when clicking outside
      if (this.showStatusDropdown) {
        const target = event.target as HTMLElement;
        if (!target.closest('.relative')) {
          this.closeStatusDropdown();
        }
      }
    }

  ngOnInit(): void {
    const callId = Number(this.route.snapshot.params['id']);
    this.callFacade.loadCallDetails(callId).subscribe();
  }
  


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.callFacade.clearCurrentCall();
  }

  goBack(): void {
    this.router.navigate(['/dashboard/call-center/dashboard']);
  }

  getStatusClass(status: string): string {
    const classes: any = {
      'a_traiter': 'bg-yellow-100 text-yellow-800',
      'en_cours': 'bg-blue-100 text-blue-800',
      'cloture': 'bg-gray-100 text-gray-800',
      'a_rappeler': 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getUrgencyClass(urgency: string): string {
    const classes: any = {
      'critique': 'bg-red-100 text-red-800',
      'urgent': 'bg-orange-100 text-orange-800',
      'normal': 'bg-blue-100 text-blue-800'
    };
    return classes[urgency] || 'bg-blue-100 text-blue-800';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Edit Modal Methods
  openEditModal(call: any): void {
  // Extract departments from call or you can fetch them separately
  if (call.department) {
      this.departments = [call.department]; // For now, just use current department
      // TODO: Fetch all departments if needed
  }
  this.isEditModalOpen = true;
  }

  closeEditModal(): void {
  this.isEditModalOpen = false;
  }

  handleSaveCall(updateData: UpdateCallRequest): void {
  const callId = Number(this.route.snapshot.params['id']);
  
  this.callFacade.updateCall(callId, updateData).subscribe({
      next: () => {
      this.closeEditModal();
      this.callFacade.loadCallDetails(callId).subscribe();
      },
      error: (error) => {
      console.error('Error updating call:', error);
      }
  });
  }

  // Note Methods
  toggleNoteForm(): void {
  this.showNoteForm = !this.showNoteForm;
  if (!this.showNoteForm) {
      this.noteForm.reset({ is_important: false });
  }
  }

  handleAddNote(): void {
    if (this.noteForm.valid && !this.isAddingNote) {
      this.isAddingNote = true;
      const callId = Number(this.route.snapshot.params['id']);
      
      this.callFacade.addNote(callId, this.noteForm.value).subscribe({
      next: () => {
          this.isAddingNote = false;
          this.toggleNoteForm();
          this.callFacade.loadCallDetails(callId).subscribe();
      },
      error: () => {
          this.isAddingNote = false;
      }
      });
    }
  }

  // Status Dropdown Methods
  toggleStatusDropdown(): void {
    this.showStatusDropdown = !this.showStatusDropdown;
  }

  closeStatusDropdown(): void {
    this.showStatusDropdown = false;
  }

  handleStatusChange(newStatus: CallStatus, currentCall: any): void {
    if (newStatus === currentCall.status) {
      this.closeStatusDropdown();
      return;
    }

    const callId = Number(this.route.snapshot.params['id']);
    
    this.callFacade.changeCallStatus(callId, { status: newStatus }).subscribe({
      next: () => {
        this.closeStatusDropdown();
        this.callFacade.loadCallDetails(callId).subscribe();
      },
      error: (error) => {
        console.error('Error changing status:', error);
        this.closeStatusDropdown();
      }
    });
  }

  // Close Call Modal Methods
  openCloseModal(): void {
    this.isCloseModalOpen = true;
  }

  closeCloseModal(): void {
    this.isCloseModalOpen = false;
  }

  handleCloseCall(closeData: any): void {
    const callId = Number(this.route.snapshot.params['id']);
    
    this.callFacade.closeCall(callId, closeData as CloseCallRequest).subscribe({
      next: () => {
        this.closeCloseModal();
        this.callFacade.loadCallDetails(callId).subscribe();
      },
      error: (error) => {
        console.error('Error closing call:', error);
      }
    });
  }

  openScheduleModal(): void {
    this.isScheduleModalOpen = true;
  }

  closeScheduleModal(): void {
    this.isScheduleModalOpen = false;
  }

  handleScheduleCallback(data: ScheduleCallbackRequest): void {
    const callId = Number(this.route.snapshot.params['id']);
    
    this.callFacade.scheduleCall(callId, data).subscribe({
      next: () => {
        this.closeScheduleModal();
        this.callFacade.loadCallDetails(callId).subscribe();
      },
      error: (error) => {
        console.error('Error scheduling callback:', error);
      }
    });
  }
}