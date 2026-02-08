import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ClientCall, CreateCallRequest, UpdateCallRequest, CallType, CallOutcome } from '../../../domain/models/crm.models';
import { ContactEntity } from '../../../domain/entities/contact.entity';
import { ManageCallsUseCase } from '../../../domain/use-cases/crm/manage-calls.use-case';
import { MessageService } from '../../services/message.service';

@Component({
  selector: 'app-call-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="onClose()">
      <div class="modal-container call-modal" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <h3>{{ editingCall ? "Modifier l'appel" : "Enregistrer un appel" }}</h3>
          <button type="button" class="btn-close" (click)="onClose()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="modal-content">
          <form (ngSubmit)="onSubmit()" #callForm="ngForm">
            <!-- Contact et Téléphone -->
            <div class="form-row">
              <div class="form-group">
                <label for="contact_id" class="form-label">Contact</label>
                <select id="contact_id" name="contact_id" class="form-control" [(ngModel)]="formData.contact_id" (ngModelChange)="onContactChange($event)">
                  <option value="">Aucun contact spécifique</option>
                  <option *ngFor="let contact of contacts" [value]="contact.id">
                    {{ contact.full_name }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="phone_number" class="form-label required">
                  Numéro
                  <span *ngIf="formData.contact_id" class="text-xs text-gray-500">(auto-complété)</span>
                </label>
                <input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  class="form-control"
                  [(ngModel)]="formData.phone_number"
                  #phoneControl="ngModel"
                  required
                  placeholder="0123456789"
                  [class.bg-gray-50]="formData.contact_id"
                  autocomplete="off">
                <div *ngIf="phoneControl.invalid && phoneControl.touched" class="form-error">
                  <div *ngIf="phoneControl.errors?.['required']">Le numéro est obligatoire</div>
                </div>
                <div *ngIf="formData.contact_id" class="text-xs text-gray-600 mt-1">
                  ℹ️ Numéro récupéré du contact sélectionné
                </div>
              </div>
            </div>

            <!-- Type et Date -->
            <div class="form-row">
              <div class="form-group">
                <label for="type" class="form-label">Type d'appel</label>
                <select id="type" name="type" class="form-control" [(ngModel)]="formData.type">
                  <option value="outgoing">Sortant</option>
                  <option value="incoming">Entrant</option>
                  <option value="missed">Manqué</option>
                </select>
              </div>

              <div class="form-group">
                <label for="called_at" class="form-label">Date et heure</label>
                <input
                  type="datetime-local"
                  id="called_at"
                  name="called_at"
                  class="form-control"
                  [(ngModel)]="formData.called_at">
              </div>
            </div>

            <!-- Durée et Résultat -->
            <div class="form-row">
              <div class="form-group">
                <label for="duration" class="form-label">Durée (minutes)</label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  class="form-control"
                  [(ngModel)]="formData.duration"
                  min="0"
                  step="1"
                  placeholder="0">
              </div>

              <div class="form-group">
                <label for="outcome" class="form-label">Résultat</label>
                <select id="outcome" name="outcome" class="form-control" [(ngModel)]="formData.outcome">
                  <option value="positive">Positif</option>
                  <option value="neutral">Neutre</option>
                  <option value="negative">Négatif</option>
                  <option value="no_answer">Pas de réponse</option>
                </select>
              </div>
            </div>

            <!-- Sujet -->
            <div class="form-group">
              <label for="subject" class="form-label required">Sujet</label>
              <input
                type="text"
                id="subject"
                name="subject"
                class="form-control"
                [(ngModel)]="formData.subject"
                #subjectControl="ngModel"
                required
                placeholder="Sujet de l'appel..."
                autocomplete="off">
              <div *ngIf="subjectControl.invalid && subjectControl.touched" class="form-error">
                <div *ngIf="subjectControl.errors?.['required']">Le sujet est obligatoire</div>
              </div>
            </div>

            <!-- Résumé -->
            <div class="form-group">
              <label for="summary" class="form-label">Résumé</label>
              <textarea
                id="summary"
                name="summary"
                class="form-control"
                [(ngModel)]="formData.summary"
                rows="4"
                placeholder="Résumé de la conversation..."
                autocomplete="off"></textarea>
            </div>

            <!-- Suivi -->
            <div class="form-group">
              <div class="checkbox-wrapper">
                <input
                  type="checkbox"
                  id="follow_up_required"
                  name="follow_up_required"
                  [(ngModel)]="formData.follow_up_required"
                  (change)="onFollowUpToggle()">
                <label for="follow_up_required" class="checkbox-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 11l3 3 8-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Suivi requis
                </label>
              </div>

              <div *ngIf="formData.follow_up_required" class="follow-up-date">
                <label for="follow_up_date" class="form-label">Date de suivi</label>
                <input
                  type="date"
                  id="follow_up_date"
                  name="follow_up_date"
                  class="form-control"
                  [(ngModel)]="formData.follow_up_date">
              </div>
            </div>

            <!-- Actions -->
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="onClose()" [disabled]="isSubmitting()">
                Annuler
              </button>
              <button type="submit" class="btn btn-primary" [disabled]="callForm.invalid || isSubmitting()">
                <span *ngIf="isSubmitting()" class="spinner"></span>
                {{ isSubmitting() ? (editingCall ? 'Modification...' : 'Enregistrement...') : (editingCall ? 'Modifier' : 'Enregistrer') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styleUrl: './call-form-modal.component.scss'
})
export class CallFormModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() clientId: number | null = null;
  @Input() contacts: ContactEntity[] = [];
  @Input() defaultPhone?: string;
  @Input() editingCall: ClientCall | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() callCreated = new EventEmitter<ClientCall>();
  @Output() callUpdated = new EventEmitter<ClientCall>();

  isSubmitting = signal(false);

  formData: CreateCallRequest & { called_at: string } = {
    contact_id: undefined,
    phone_number: '',
    type: 'outgoing',
    called_at: '',
    duration: 0,
    subject: '',
    summary: '',
    outcome: 'positive',
    follow_up_required: false,
    follow_up_date: ''
  };

  constructor(
    private manageCallsUseCase: ManageCallsUseCase,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editingCall'] || changes['isOpen']) {
      this.initializeForm();
    }
  }

  private initializeForm(): void {
    console.log('Initializing form - isOpen:', this.isOpen, 'editingCall:', this.editingCall);

    if (this.editingCall && this.isOpen) {
      console.log('Loading call data for editing');
      this.loadCallData();
    } else if (this.isOpen) {
      console.log('Setting default values for new call');
      this.resetForm();
      if (this.defaultPhone) {
        this.formData.phone_number = this.defaultPhone;
      }

      // Date/heure par défaut = maintenant
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      this.formData.called_at = now.toISOString().slice(0, 16);
    } else if (!this.isOpen) {
      console.log('Modal is closed, not initializing form');
    }
  }

  onClose(): void {
    this.close.emit();
    this.resetForm();
  }

  onFollowUpToggle(): void {
    if (!this.formData.follow_up_required) {
      this.formData.follow_up_date = '';
    } else {
      // Date de suivi par défaut = demain
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      this.formData.follow_up_date = tomorrow.toISOString().split('T')[0];
    }
  }

  loadCallData(): void {
    if (!this.editingCall) {
      console.log('No editing call found');
      return;
    }

    console.log('Loading call data:', this.editingCall);

    // D'abord, réinitialiser le formulaire
    this.resetForm();

    // Format de date sécurisé
    let formattedDate = '';
    if (this.editingCall.called_at) {
      try {
        const date = new Date(this.editingCall.called_at);
        if (!isNaN(date.getTime())) {
          // Ajuster pour le timezone local pour l'affichage dans datetime-local
          const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
          formattedDate = localDate.toISOString().slice(0, 16);
        }
      } catch (error) {
        console.warn('Invalid date format:', this.editingCall.called_at, error);
        // Date par défaut = maintenant si la date est invalide
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        formattedDate = now.toISOString().slice(0, 16);
      }
    } else {
      // Date par défaut = maintenant si pas de date
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      formattedDate = now.toISOString().slice(0, 16);
    }

    // Charger les données de l'appel
    this.formData = {
      contact_id: this.editingCall.contact_id,
      phone_number: this.editingCall.phone_number || '',
      type: this.editingCall.type || 'outgoing',
      called_at: formattedDate,
      duration: this.editingCall.duration || 0,
      subject: this.editingCall.subject || '',
      summary: this.editingCall.summary || '',
      outcome: this.editingCall.outcome || 'positive',
      follow_up_required: this.editingCall.follow_up_required || false,
      follow_up_date: this.editingCall.follow_up_date || ''
    };

    console.log('Form data loaded:', this.formData);
  }

  onSubmit(): void {
    if (!this.clientId && !this.editingCall) {
      this.messageService.showError('Client ID manquant');
      return;
    }

    this.isSubmitting.set(true);

    if (this.editingCall) {
      // Mode édition
      const updateRequest: UpdateCallRequest = {
        contact_id: this.formData.contact_id || undefined,
        phone_number: this.formData.phone_number,
        type: this.formData.type,
        called_at: this.formData.called_at ? new Date(this.formData.called_at).toISOString() : undefined,
        duration: this.formData.duration,
        subject: this.formData.subject,
        summary: this.formData.summary || undefined,
        outcome: this.formData.outcome,
        follow_up_required: this.formData.follow_up_required,
        follow_up_date: this.formData.follow_up_required ? this.formData.follow_up_date : undefined
      };

      this.manageCallsUseCase.updateCall(this.editingCall.id, updateRequest)
        .subscribe({
          next: (updatedCall) => {
            this.messageService.showSuccess('Appel modifié avec succès');
            this.callUpdated.emit(updatedCall);
            this.onClose();
            this.isSubmitting.set(false);
          },
          error: (error) => {
            this.messageService.showError('Erreur lors de la modification de l\'appel');
            this.isSubmitting.set(false);
            console.error('Error updating call:', error);
          }
        });
    } else {
      // Mode création
      const createRequest: CreateCallRequest = {
        contact_id: this.formData.contact_id || undefined,
        phone_number: this.formData.phone_number,
        type: this.formData.type,
        called_at: this.formData.called_at ? new Date(this.formData.called_at).toISOString() : undefined,
        duration: this.formData.duration,
        subject: this.formData.subject,
        summary: this.formData.summary || undefined,
        outcome: this.formData.outcome,
        follow_up_required: this.formData.follow_up_required,
        follow_up_date: this.formData.follow_up_required ? this.formData.follow_up_date : undefined
      };

      this.manageCallsUseCase.createCall(this.clientId!, createRequest)
        .subscribe({
          next: (createdCall) => {
            this.messageService.showSuccess('Appel enregistré avec succès');
            this.callCreated.emit(createdCall);
            this.onClose();
            this.isSubmitting.set(false);
          },
          error: (error) => {
            this.messageService.showError('Erreur lors de l\'enregistrement de l\'appel');
            this.isSubmitting.set(false);
            console.error('Error creating call:', error);
          }
        });
    }
  }

  onContactChange(contactId: string): void {
    if (!contactId) {
      // Si aucun contact sélectionné, revenir au numéro par défaut
      this.formData.phone_number = this.defaultPhone || '';
      return;
    }

    // Trouver le contact sélectionné
    const selectedContact = this.contacts.find(c => c.id === parseInt(contactId));
    if (selectedContact) {
      // Récupérer le téléphone principal du contact
      const primaryPhone = selectedContact.getPrimaryPhone();
      if (primaryPhone) {
        this.formData.phone_number = primaryPhone.phone;
      } else if (selectedContact.phones && selectedContact.phones.length > 0) {
        // Si pas de téléphone principal, prendre le premier disponible
        this.formData.phone_number = selectedContact.phones[0].phone;
      }
    }
  }

  private resetForm(): void {
    this.formData = {
      contact_id: undefined,
      phone_number: this.defaultPhone || '',
      type: 'outgoing',
      called_at: '',
      duration: 0,
      subject: '',
      summary: '',
      outcome: 'positive',
      follow_up_required: false,
      follow_up_date: ''
    };
  }
}