import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ClientAppointment, CreateAppointmentRequest, UpdateAppointmentRequest, AppointmentType, AppointmentParticipant } from '../../../domain/models/crm.models';
import { ContactEntity } from '../../../domain/entities/contact.entity';
import { ManageAppointmentsUseCase } from '../../../domain/use-cases/crm/manage-appointments.use-case';
import { MessageService } from '../../services/message.service';

@Component({
  selector: 'app-appointment-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="onClose()">
      <div class="modal-container appointment-modal" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <h3>{{ editingAppointment ? 'Modifier le rendez-vous' : 'Planifier un rendez-vous' }}</h3>
          <button type="button" class="btn-close" (click)="onClose()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="modal-content">
          <form (ngSubmit)="onSubmit()" #appointmentForm="ngForm">
            <!-- Titre -->
            <div class="form-group">
              <label for="title" class="form-label required">Titre</label>
              <input
                type="text"
                id="title"
                name="title"
                class="form-control"
                [(ngModel)]="formData.title"
                #titleControl="ngModel"
                required
                maxlength="255"
                placeholder="Titre du rendez-vous..."
                autocomplete="off">
              <div *ngIf="titleControl.invalid && titleControl.touched" class="form-error">
                <div *ngIf="titleControl.errors?.['required']">Le titre est obligatoire</div>
              </div>
            </div>

            <!-- Date et Durée -->
            <div class="form-row">
              <div class="form-group">
                <label for="scheduled_at" class="form-label required">Date et heure</label>
                <input
                  type="datetime-local"
                  id="scheduled_at"
                  name="scheduled_at"
                  class="form-control"
                  [(ngModel)]="formData.scheduled_at"
                  #dateControl="ngModel"
                  required>
                <div *ngIf="dateControl.invalid && dateControl.touched" class="form-error">
                  <div *ngIf="dateControl.errors?.['required']">La date est obligatoire</div>
                </div>
              </div>

              <div class="form-group">
                <label for="duration" class="form-label required">Durée (minutes)</label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  class="form-control"
                  [(ngModel)]="formData.duration"
                  #durationControl="ngModel"
                  required
                  min="15"
                  step="15"
                  placeholder="60">
                <div *ngIf="durationControl.invalid && durationControl.touched" class="form-error">
                  <div *ngIf="durationControl.errors?.['required']">La durée est obligatoire</div>
                  <div *ngIf="durationControl.errors?.['min']">Durée minimum : 15 minutes</div>
                </div>
              </div>
            </div>

            <!-- Type et Lieu -->
            <div class="form-row">
              <div class="form-group">
                <label for="type" class="form-label">Type</label>
                <select id="type" name="type" class="form-control" [(ngModel)]="formData.type">
                  <option value="commercial">Commercial</option>
                  <option value="support">Support</option>
                  <option value="demo">Démo</option>
                  <option value="negotiation">Négociation</option>
                  <option value="closing">Signature</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              <div class="form-group">
                <label for="location" class="form-label">Lieu</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  class="form-control"
                  [(ngModel)]="formData.location"
                  placeholder="Lieu du rendez-vous..."
                  autocomplete="off">
              </div>
            </div>

            <!-- Description -->
            <div class="form-group">
              <label for="description" class="form-label">Description</label>
              <textarea
                id="description"
                name="description"
                class="form-control"
                [(ngModel)]="formData.description"
                rows="3"
                placeholder="Description du rendez-vous..."
                autocomplete="off"></textarea>
            </div>

            <!-- Participants -->
            <div class="form-group">
              <label class="form-label">Participants</label>

              <!-- Contacts existants -->
              <div *ngIf="contacts.length > 0" class="participants-section">
                <h5>Contacts du client</h5>
                <div class="contact-list">
                  <div *ngFor="let contact of contacts" class="contact-item">
                    <label class="contact-checkbox">
                      <input
                        type="checkbox"
                        [checked]="isContactSelected(contact.id)"
                        (change)="toggleContact(contact)">
                      <span class="contact-info">
                        <strong>{{ contact.full_name }}</strong>
                        <span *ngIf="contact.emails && contact.emails.length > 0" class="contact-email">
                          {{ contact.emails[0]?.email }}
                        </span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Participants externes -->
              <div class="external-participants">
                <h5>Participants externes</h5>
                <div *ngFor="let participant of externalParticipants; let i = index; trackBy: trackParticipant" class="participant-row">
                  <div class="participant-inputs">
                    <input
                      type="text"
                      class="form-control"
                      [(ngModel)]="participant.name"
                      [name]="'participant_name_' + i"
                      placeholder="Nom complet"
                      autocomplete="off">
                    <input
                      type="email"
                      class="form-control"
                      [(ngModel)]="participant.email"
                      [name]="'participant_email_' + i"
                      placeholder="Email"
                      autocomplete="off">
                  </div>
                  <button type="button" class="btn-remove" (click)="removeParticipant(i)" title="Supprimer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
                      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  </button>
                </div>
                <button type="button" class="btn-add-participant" (click)="addParticipant()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2"/>
                    <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  Ajouter un participant
                </button>
              </div>
            </div>

            <!-- Actions -->
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="onClose()" [disabled]="isSubmitting()">
                Annuler
              </button>
              <button type="submit" class="btn btn-primary" [disabled]="appointmentForm.invalid || isSubmitting()">
                <span *ngIf="isSubmitting()" class="spinner"></span>
                {{ isSubmitting() ? (editingAppointment ? 'Modification...' : 'Planification...') : (editingAppointment ? 'Modifier' : 'Planifier') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styleUrl: './appointment-form-modal.component.scss'
})
export class AppointmentFormModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() clientId: number | null = null;
  @Input() contacts: ContactEntity[] = [];
  @Input() editingAppointment: ClientAppointment | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() appointmentCreated = new EventEmitter<ClientAppointment>();
  @Output() appointmentUpdated = new EventEmitter<ClientAppointment>();

  isSubmitting = signal(false);

  formData: CreateAppointmentRequest = {
    title: '',
    description: '',
    scheduled_at: '',
    duration: 60,
    location: '',
    type: 'commercial',
    participants: []
  };

  selectedContactIds: Set<number> = new Set();
  externalParticipants: Array<{ name: string; email: string }> = [];

  constructor(
    private manageAppointmentsUseCase: ManageAppointmentsUseCase,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editingAppointment'] || changes['isOpen']) {
      this.initializeForm();
    }
  }

  private initializeForm(): void {
    console.log('Initializing form - isOpen:', this.isOpen, 'editingAppointment:', this.editingAppointment);

    if (this.editingAppointment && this.isOpen) {
      console.log('Loading appointment data for editing');
      this.loadAppointmentData();
    } else if (this.isOpen) {
      console.log('Setting default values for new appointment');
      this.resetForm();
      // Date par défaut = demain à 14h
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);
      tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
      this.formData.scheduled_at = tomorrow.toISOString().slice(0, 16);
    } else if (!this.isOpen) {
      console.log('Modal is closed, not initializing form');
    }
  }

  onClose(): void {
    this.close.emit();
    this.resetForm();
  }

  isContactSelected(contactId: number): boolean {
    return this.selectedContactIds.has(contactId);
  }

  toggleContact(contact: ContactEntity): void {
    if (this.selectedContactIds.has(contact.id)) {
      this.selectedContactIds.delete(contact.id);
    } else {
      this.selectedContactIds.add(contact.id);
    }
  }

  addParticipant(): void {
    this.externalParticipants.push({ name: '', email: '' });
  }

  removeParticipant(index: number): void {
    this.externalParticipants.splice(index, 1);
  }

  trackParticipant(index: number): number {
    return index;
  }

  loadAppointmentData(): void {
    if (!this.editingAppointment) {
      console.log('No editing appointment found');
      return;
    }

    console.log('Loading appointment data:', this.editingAppointment);

    // D'abord, réinitialiser le formulaire
    this.resetForm();

    // Charger les données du rendez-vous
    this.formData = {
      title: this.editingAppointment.title,
      description: this.editingAppointment.description || '',
      scheduled_at: new Date(this.editingAppointment.scheduled_at).toISOString().slice(0, 16),
      duration: this.editingAppointment.duration,
      location: this.editingAppointment.location || '',
      type: this.editingAppointment.type,
      participants: []
    };

    console.log('Form data loaded:', this.formData);

    // Traiter les participants
    this.selectedContactIds.clear();
    this.externalParticipants = [];

    this.editingAppointment.participants.forEach(participant => {
      if (participant.contact_id) {
        this.selectedContactIds.add(participant.contact_id);
      } else if (participant.name || participant.email) {
        this.externalParticipants.push({
          name: participant.name || '',
          email: participant.email || ''
        });
      }
    });

    console.log('Participants loaded - Selected IDs:', this.selectedContactIds, 'External:', this.externalParticipants);
  }

  onSubmit(): void {
    if (!this.clientId && !this.editingAppointment) {
      this.messageService.showError('Client ID manquant');
      return;
    }

    this.isSubmitting.set(true);

    // Construire la liste des participants
    const participants: AppointmentParticipant[] = [];

    // Ajouter les contacts sélectionnés
    this.selectedContactIds.forEach(contactId => {
      participants.push({ contact_id: contactId });
    });

    // Ajouter les participants externes (non vides)
    this.externalParticipants.forEach(participant => {
      if (participant.name.trim() || participant.email.trim()) {
        participants.push({
          name: participant.name.trim() || undefined,
          email: participant.email.trim() || undefined
        });
      }
    });

    if (this.editingAppointment) {
      // Mode édition
      const updateRequest: UpdateAppointmentRequest = {
        title: this.formData.title,
        description: this.formData.description || undefined,
        scheduled_at: new Date(this.formData.scheduled_at).toISOString(),
        duration: this.formData.duration,
        location: this.formData.location || undefined,
        type: this.formData.type,
        participants: participants.length > 0 ? participants : undefined
      };

      this.manageAppointmentsUseCase.updateAppointment(this.editingAppointment.id, updateRequest)
        .subscribe({
          next: (updatedAppointment) => {
            this.messageService.showSuccess('Rendez-vous modifié avec succès');
            this.appointmentUpdated.emit(updatedAppointment);
            this.onClose();
            this.isSubmitting.set(false);
          },
          error: (error) => {
            this.messageService.showError('Erreur lors de la modification du rendez-vous');
            this.isSubmitting.set(false);
            console.error('Error updating appointment:', error);
          }
        });
    } else {
      // Mode création
      const createRequest: CreateAppointmentRequest = {
        title: this.formData.title,
        description: this.formData.description || undefined,
        scheduled_at: new Date(this.formData.scheduled_at).toISOString(),
        duration: this.formData.duration,
        location: this.formData.location || undefined,
        type: this.formData.type,
        participants: participants.length > 0 ? participants : undefined
      };

      this.manageAppointmentsUseCase.createAppointment(this.clientId!, createRequest)
        .subscribe({
          next: (createdAppointment) => {
            this.messageService.showSuccess('Rendez-vous planifié avec succès');
            this.appointmentCreated.emit(createdAppointment);
            this.onClose();
            this.isSubmitting.set(false);
          },
          error: (error) => {
            this.messageService.showError('Erreur lors de la planification du rendez-vous');
            this.isSubmitting.set(false);
            console.error('Error creating appointment:', error);
          }
        });
    }
  }

  private resetForm(): void {
    this.formData = {
      title: '',
      description: '',
      scheduled_at: '',
      duration: 60,
      location: '',
      type: 'commercial',
      participants: []
    };
    this.selectedContactIds.clear();
    this.externalParticipants = [];
  }
}