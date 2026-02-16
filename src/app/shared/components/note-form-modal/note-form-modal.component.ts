import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ClientNote, CreateNoteRequest, UpdateNoteRequest, NoteType } from '../../../domain/models/crm.models';
import { ManageNotesUseCase } from '../../../domain/use-cases/crm/manage-notes.use-case';
import { MessageService } from '../../services/message.service';

@Component({
  selector: 'app-note-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="onClose()">
      <div class="modal-container note-modal" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <h3>{{ note ? 'Modifier la note' : 'Nouvelle note' }}</h3>
          <button type="button" class="btn-close" (click)="onClose()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="modal-content">
          <form (ngSubmit)="onSubmit()" #noteForm="ngForm">
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
                placeholder="Titre de la note..."
                autocomplete="off"
                [disabled]="readOnly">
              <div *ngIf="titleControl.invalid && titleControl.touched && !readOnly" class="form-error">
                <div *ngIf="titleControl.errors?.['required']">Le titre est obligatoire</div>
              </div>
            </div>

            <!-- Type et Options -->
            <div class="form-row">
              <div class="form-group">
                <label for="type" class="form-label">Type</label>
                <select id="type" name="type" class="form-control" [(ngModel)]="formData.type" [disabled]="readOnly">
                  <option value="normal">Normale</option>
                  <option value="important">Importante</option>
                  <option value="private">Privée</option>
                </select>
              </div>

              <div class="form-group">
                <div class="checkbox-wrapper">
                  <input
                    type="checkbox"
                    id="is_pinned"
                    name="is_pinned"
                    [(ngModel)]="formData.is_pinned"
                    [disabled]="readOnly">
                  <label for="is_pinned" class="checkbox-label">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M16 4v6l3 7v1H5v-1l3-7V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2z" stroke="currentColor" stroke-width="2"/>
                      <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Épingler cette note
                  </label>
                </div>
              </div>
            </div>

            <!-- Contenu -->
            <div class="form-group">
              <label for="content" class="form-label required">Contenu</label>
              <textarea
                id="content"
                name="content"
                class="form-control content-textarea"
                [(ngModel)]="formData.content"
                #contentControl="ngModel"
                required
                rows="8"
                placeholder="Décrivez le contenu de votre note..."
                autocomplete="off"
                [disabled]="readOnly"></textarea>
              <div *ngIf="contentControl.invalid && contentControl.touched && !readOnly" class="form-error">
                <div *ngIf="contentControl.errors?.['required']">Le contenu est obligatoire</div>
              </div>
            </div>

            <!-- Actions -->
            <div class="modal-actions">
              @if (readOnly) {
                <button type="button" class="btn btn-secondary" (click)="onClose()">
                  Fermer
                </button>
              } @else {
                <button type="button" class="btn btn-secondary" (click)="onClose()" [disabled]="isSubmitting()">
                  Annuler
                </button>
                <button type="submit" class="btn btn-primary" [disabled]="noteForm.invalid || isSubmitting()">
                  <span *ngIf="isSubmitting()" class="spinner"></span>
                  {{ isSubmitting() ? 'Enregistrement...' : (note ? 'Modifier' : 'Créer') }}
                </button>
              }
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styleUrl: './note-form-modal.component.scss'
})
export class NoteFormModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() note: ClientNote | null = null;
  @Input() clientId: number | null = null;
  @Input() readOnly: boolean = false; // New input property
  @Output() close = new EventEmitter<void>();
  @Output() noteCreated = new EventEmitter<ClientNote>();
  @Output() noteUpdated = new EventEmitter<ClientNote>();

  isSubmitting = signal(false);

  formData: CreateNoteRequest & { is_pinned: boolean } = {
    title: '',
    content: '',
    type: 'normal',
    is_pinned: false
  };

  constructor(
    private manageNotesUseCase: ManageNotesUseCase,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    if (this.note) {
      this.formData = {
        title: this.note.title,
        content: this.note.content,
        type: this.note.type,
        is_pinned: this.note.is_pinned
      };
    } else {
      this.resetForm();
    }
  }

  onClose(): void {
    this.close.emit();
    this.resetForm();
  }

  onSubmit(): void {
    if (!this.clientId && !this.note) {
      this.messageService.showError('Client ID manquant');
      return;
    }

    this.isSubmitting.set(true);

    if (this.note) {
      // Modification
      const updateRequest: UpdateNoteRequest = {
        title: this.formData.title,
        content: this.formData.content,
        type: this.formData.type,
        is_pinned: this.formData.is_pinned
      };

      this.manageNotesUseCase.updateNote(this.note.id, updateRequest)
        .subscribe({
          next: (updatedNote) => {
            this.messageService.showSuccess('Note modifiée avec succès');
            this.noteUpdated.emit(updatedNote);
            this.onClose();
            this.isSubmitting.set(false);
          },
          error: (error) => {
            this.messageService.showError('Erreur lors de la modification de la note');
            this.isSubmitting.set(false);
            console.error('Error updating note:', error);
          }
        });
    } else {
      // Création
      const createRequest: CreateNoteRequest = {
        title: this.formData.title,
        content: this.formData.content,
        type: this.formData.type,
        is_pinned: this.formData.is_pinned
      };

      this.manageNotesUseCase.createNote(this.clientId!, createRequest)
        .subscribe({
          next: (createdNote) => {
            this.messageService.showSuccess('Note créée avec succès');
            this.noteCreated.emit(createdNote);
            this.onClose();
            this.isSubmitting.set(false);
          },
          error: (error) => {
            this.messageService.showError('Erreur lors de la création de la note');
            this.isSubmitting.set(false);
            console.error('Error creating note:', error);
          }
        });
    }
  }

  private resetForm(): void {
    this.formData = {
      title: '',
      content: '',
      type: 'normal',
      is_pinned: false
    };
  }

  private populateFormData(note: ClientNote): void {
    this.formData = {
      title: note.title,
      content: note.content,
      type: note.type,
      is_pinned: note.is_pinned
    };
  }
}