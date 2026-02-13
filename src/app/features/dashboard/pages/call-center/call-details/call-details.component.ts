import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';

import { Call, CallStatus } from '../../../../../domain/models/call.model';
import { CallFacade } from '../../../call-center/calls/call.facade';
import { ModalService } from '../../../../../core/services/modal.service';

import { EditCallModalComponent } from '../edit-call-modal/edit-call-modal.component';
import { CloseCallModalComponent } from '../close-call-modal/close-call-modal.component';
import { UpdateCallRequest, CloseCallRequest, ScheduleCallbackRequest } from '../../../../../domain/models/call.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-call-details',
  standalone: true,
  imports: [CommonModule, RouterModule, EditCallModalComponent, CloseCallModalComponent, ReactiveFormsModule],
  templateUrl: './call-details.component.html',
  styleUrl: './call-details.component.scss'
})
export class CallDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  call$!: Observable<Call | null>;
  isLoading$!: Observable<boolean>;

  // Modal state — edit and close remain inline, others use CDK overlay
  isEditModalOpen = false;
  isCloseModalOpen = false;
  departments: any[] = [];

  // Note form
  showNoteForm = false;
  noteForm!: FormGroup;
  isAddingNote = false;

  // Status dropdown state
  showStatusDropdown = false;
  availableStatuses: Array<{ value: CallStatus; label: string; color: string }> = [
    { value: 'nouveau',    label: 'Nouveau',     color: 'text-green-700' },
    { value: 'a_traiter',  label: 'À traiter',   color: 'text-yellow-700' },
    { value: 'en_cours',   label: 'En cours',    color: 'text-blue-700' },
    { value: 'en_attente', label: 'En attente',  color: 'text-orange-700' },
    { value: 'resolu',     label: 'Résolu',      color: 'text-purple-700' },
    { value: 'a_rappeler', label: 'À rappeler',  color: 'text-red-700' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public callFacade: CallFacade,
    private fb: FormBuilder,
    private modalService: ModalService
  ) {
    this.call$ = this.callFacade.currentCall$;
    this.isLoading$ = this.callFacade.isLoading$;

    this.noteForm = this.fb.group({
      note: ['', [Validators.required]],
      is_important: [false]
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showStatusDropdown) {
      const target = event.target as HTMLElement;
      if (!target.closest('.status-dropdown-wrap')) {
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
      'nouveau':    'bg-green-100 text-green-800',
      'a_traiter':  'bg-yellow-100 text-yellow-800',
      'en_cours':   'bg-blue-100 text-blue-800',
      'en_attente': 'bg-orange-100 text-orange-800',
      'resolu':     'bg-purple-100 text-purple-800',
      'a_rappeler': 'bg-red-100 text-red-800',
      'cloture':    'bg-gray-100 text-gray-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getUrgencyClass(urgency: string): string {
    const classes: any = {
      'critique': 'bg-red-100 text-red-800',
      'urgent':   'bg-orange-100 text-orange-800',
      'normal':   'bg-blue-100 text-blue-800'
    };
    return classes[urgency] || 'bg-blue-100 text-blue-800';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  // ── CDK Modal openers ───────────────────────────────────────────────────────

  openLinkModal(): void {
    const callId = Number(this.route.snapshot.params['id']);
    this.modalService.openLinkClient((clientId) => {
      this.callFacade.linkCallToClient(callId, clientId);
      this.callFacade.loadClientHistory(clientId);
    });
  }

  openScheduleModal(): void {
    this.call$.subscribe(call => {
      if (!call) return;
      const callId = Number(this.route.snapshot.params['id']);
      this.modalService.openScheduleCallback(call, (data) => {
        this.callFacade.scheduleCall(callId, data).subscribe({
          next: () => this.callFacade.loadCallDetails(callId).subscribe(),
          error: (e) => console.error('Error scheduling callback:', e)
        });
      });
    }).unsubscribe();
  }

  openComplaintModal(): void {
    this.call$.subscribe(call => {
      if (!call) return;
      this.modalService.openCreateComplaint(call.id, call.client_id, (data) => {
        this.callFacade.convertToComplaint(data).subscribe();
      });
    }).unsubscribe();
  }

  openChangeLinkModal(): void {
    const callId = Number(this.route.snapshot.params['id']);
    this.modalService.openLinkClient((clientId) => {
      this.callFacade.linkCallToClient(callId, clientId);
      this.callFacade.loadClientHistory(clientId);
    });
  }

  // ── Edit modal (stays inline — uses complex [call] input) ──────────────────

  openEditModal(call: any): void {
    if (call.department) {
      this.departments = [call.department];
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
      error: (e) => console.error('Error updating call:', e)
    });
  }

  // ── Close modal (stays inline) ─────────────────────────────────────────────

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
      error: (e) => console.error('Error closing call:', e)
    });
  }

  // ── Note methods ───────────────────────────────────────────────────────────

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
        error: () => { this.isAddingNote = false; }
      });
    }
  }

  // ── Status dropdown ────────────────────────────────────────────────────────

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
      error: (e) => {
        console.error('Error changing status:', e);
        this.closeStatusDropdown();
      }
    });
  }
}