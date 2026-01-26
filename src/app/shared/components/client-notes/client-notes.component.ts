import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import {
  ClientNote,
  NoteFilters,
  NotesResponse,
  NoteType,
  NoteAttachment
} from '../../../domain/models/crm.models';
import { ManageNotesUseCase } from '../../../domain/use-cases/crm/manage-notes.use-case';
import { MessageService } from '../../services/message.service';
import { NoteAttachmentsModalComponent } from '../note-attachments-modal/note-attachments-modal.component';

@Component({
  selector: 'app-client-notes',
  standalone: true,
  imports: [CommonModule, FormsModule, NoteAttachmentsModalComponent],
  template: `
    <div class="notes-container">
      <!-- Header avec filtres -->
      <div class="notes-header">
        <div class="title-section">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/>
              <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
            </svg>
            Notes ({{ totalNotes() }})
          </h3>
          <button type="button" class="btn btn-small" (click)="onAddNote()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2"/>
              <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2"/>
            </svg>
            Nouvelle note
          </button>
          <button type="button" class="btn btn-small btn-secondary" (click)="onAddAppointment()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
              <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
              <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
              <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
            </svg>
            Planifier RDV
          </button>
        </div>

        <div class="filters-section">
          <!-- Filtre par type -->
          <select
            class="filter-select"
            [(ngModel)]="selectedType"
            (ngModelChange)="onFilterChange()">
            <option value="">Tous les types</option>
            <option value="normal">Normales</option>
            <option value="important">Importantes</option>
            <option value="private">Privées</option>
          </select>

          <!-- Filtre épinglées -->
          <label class="filter-checkbox">
            <input
              type="checkbox"
              [(ngModel)]="showPinnedOnly"
              (ngModelChange)="onFilterChange()">
            Épinglées uniquement
          </label>
        </div>
      </div>

      <!-- Notes Content -->
      <div class="notes-content" *ngIf="!isLoading(); else loadingTemplate">
        <div class="notes-list" *ngIf="notes().length > 0; else emptyTemplate">
          @for (note of notes(); track note.id) {
            <div class="note-card" [class]="'note-card--' + note.type">
              <!-- Note Header -->
              <div class="note-header">
                <div class="note-meta">
                  <h4 class="note-title">{{ note.title }}</h4>
                  <div class="note-badges">
                    <span class="type-badge" [class]="'type-badge--' + note.type">
                      {{ getTypeLabel(note.type) }}
                    </span>
                    <span *ngIf="note.is_pinned" class="pinned-badge">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M16 4v6l3 7v1H5v-1l3-7V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2z" stroke="currentColor" stroke-width="2"/>
                      </svg>
                      Épinglée
                    </span>
                    <button
                      *ngIf="note.attachments_count > 0"
                      type="button"
                      class="attachments-badge clickable"
                      (click)="openAttachmentsModal(note)"
                      title="Voir les pièces jointes">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.64 16.2a2 2 0 01-2.83-2.83l8.49-8.49" stroke="currentColor" stroke-width="2"/>
                      </svg>
                      {{ note.attachments_count }}
                    </button>
                  </div>
                </div>
                <div class="note-time">
                  <span class="time-main">{{ formatDate(note.created_at) }}</span>
                  <span class="time-relative">{{ formatRelativeTime(note.created_at) }}</span>
                </div>
              </div>

              <!-- Note Content -->
              <div class="note-content">
                <p>{{ note.content }}</p>
              </div>

              <!-- Note Footer -->
              <div class="note-footer">
                <div class="note-user">
                  <span class="user-avatar">{{ getUserInitials(note.user.name) }}</span>
                  <span class="user-name">{{ note.user.name }}</span>
                </div>

                <div class="note-actions">
                  <button type="button" class="btn-icon" (click)="openAttachmentsModal(note)" title="Gérer les pièces jointes">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.64 16.2a2 2 0 01-2.83-2.83l8.49-8.49" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  </button>
                  <button type="button" class="btn-icon" (click)="onTogglePin(note)" title="{{ note.is_pinned ? 'Désépingler' : 'Épingler' }}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M16 4v6l3 7v1H5v-1l3-7V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2z" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  </button>
                  <button type="button" class="btn-icon" (click)="onEditNote(note)" title="Modifier">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button type="button" class="btn-icon danger" (click)="onDeleteNote(note)" title="Supprimer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <polyline points="3,6 5,6 21,6"/>
                      <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="notes-pagination">
            <button
              class="pagination-btn"
              (click)="loadPreviousPage()"
              [disabled]="currentPage() <= 1">
              Précédent
            </button>

            <span class="pagination-info">
              Page {{ currentPage() }} sur {{ totalPages() }}
            </span>

            <button
              class="pagination-btn"
              (click)="loadNextPage()"
              [disabled]="currentPage() >= totalPages()">
              Suivant
            </button>
          </div>
        }
      </div>

      <!-- Loading Template -->
      <ng-template #loadingTemplate>
        <div class="notes-loading">
          <div class="loading-spinner"></div>
          <p>Chargement des notes...</p>
        </div>
      </ng-template>

      <!-- Empty Template -->
      <ng-template #emptyTemplate>
        <div class="notes-empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/>
            <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
          </svg>
          <h4>Aucune note trouvée</h4>
          <p>{{ selectedType || showPinnedOnly ? 'Aucune note ne correspond aux filtres sélectionnés' : 'Aucune note créée pour ce client' }}</p>
          <button type="button" class="btn btn-primary" (click)="onAddNote()">Créer la première note</button>
        </div>
      </ng-template>
    </div>

    <!-- Attachments Modal -->
    <app-note-attachments-modal
      [isOpen]="isAttachmentsModalOpen"
      [noteId]="selectedNoteId()"
      [noteTitle]="selectedNoteTitle()"
      [attachments]="selectedNoteAttachments()"
      (close)="closeAttachmentsModal()"
      (attachmentAdded)="onAttachmentAdded($event)"
      (attachmentDeleted)="onAttachmentDeleted($event)">
    </app-note-attachments-modal>
  `,
  styleUrl: './client-notes.component.scss'
})
export class ClientNotesComponent implements OnInit, OnDestroy {
  @Input() clientId!: number;
  @Output() addNoteRequested = new EventEmitter<void>();
  @Output() addAppointmentRequested = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  // Signals for state management
  notes = signal<ClientNote[]>([]);
  isLoading = signal(false);
  totalNotes = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);

  // Filter state
  selectedType: NoteType | '' = '';
  showPinnedOnly = false;

  // Attachments modal state
  isAttachmentsModalOpen = false;
  selectedNoteId = signal<number | null>(null);
  selectedNoteTitle = signal<string | null>(null);
  selectedNoteAttachments = signal<NoteAttachment[]>([]);

  constructor(
    private manageNotesUseCase: ManageNotesUseCase,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    if (!this.clientId) {
      console.error('ClientNotesComponent: clientId is required');
      return;
    }
    this.loadNotes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadNotes(page: number = 1): void {
    this.isLoading.set(true);
    this.currentPage.set(page);

    const filters: NoteFilters = {
      per_page: 20
    };

    if (this.selectedType) {
      filters.type = this.selectedType;
    }

    if (this.showPinnedOnly) {
      filters.pinned_only = true;
    }

    this.manageNotesUseCase.getClientNotes(this.clientId, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: NotesResponse) => {
          this.notes.set(response.data);
          this.totalNotes.set(response.total);
          this.totalPages.set(response.last_page);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.messageService.showError('Erreur lors du chargement des notes');
          this.isLoading.set(false);
          console.error('Notes loading error:', error);
        }
      });
  }

  onFilterChange(): void {
    this.loadNotes(1);
  }

  loadPreviousPage(): void {
    if (this.currentPage() > 1) {
      this.loadNotes(this.currentPage() - 1);
    }
  }

  loadNextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.loadNotes(this.currentPage() + 1);
    }
  }

  onAddNote(): void {
    this.addNoteRequested.emit();
  }

  onAddAppointment(): void {
    this.addAppointmentRequested.emit();
  }

  onEditNote(note: ClientNote): void {
    // Pour l'instant, juste émettre l'événement d'ajout de note
    // Plus tard, on pourra ajouter un événement pour éditer une note spécifique
    this.addNoteRequested.emit();
  }

  onTogglePin(note: ClientNote): void {
    this.manageNotesUseCase.togglePinNote(note.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.showSuccess(
            note.is_pinned ? 'Note désépinglée' : 'Note épinglée'
          );
          this.loadNotes(this.currentPage());
        },
        error: (error) => {
          this.messageService.showError('Erreur lors de la modification de la note');
          console.error('Error toggling pin:', error);
        }
      });
  }

  onDeleteNote(note: ClientNote): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la note "${note.title}" ?`)) {
      this.manageNotesUseCase.deleteNote(note.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.showSuccess('Note supprimée avec succès');
            this.loadNotes(this.currentPage());
          },
          error: (error) => {
            this.messageService.showError('Erreur lors de la suppression de la note');
            console.error('Error deleting note:', error);
          }
        });
    }
  }

  getTypeLabel(type: NoteType): string {
    switch (type) {
      case 'normal': return 'Normale';
      case 'important': return 'Importante';
      case 'private': return 'Privée';
      default: return type;
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Il y a moins d\'une heure';
    } else if (diffInHours < 24) {
      return `Il y a ${Math.floor(diffInHours)} heure(s)`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `Il y a ${diffInDays} jour(s)`;
    }
  }

  getUserInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  openAttachmentsModal(note: ClientNote): void {
    this.selectedNoteId.set(note.id);
    this.selectedNoteTitle.set(note.title);

    // Use attachments from the note object directly
    this.selectedNoteAttachments.set(note.attachments || []);
    this.isAttachmentsModalOpen = true;
  }

  closeAttachmentsModal(): void {
    this.isAttachmentsModalOpen = false;
    this.selectedNoteId.set(null);
    this.selectedNoteTitle.set(null);
    this.selectedNoteAttachments.set([]);
  }

  onAttachmentAdded(attachment: NoteAttachment): void {
    // Add to current list
    const currentAttachments = this.selectedNoteAttachments();
    this.selectedNoteAttachments.set([...currentAttachments, attachment]);

    // Update the note's attachment count in the notes list
    this.updateNoteAttachmentCount(this.selectedNoteId()!, currentAttachments.length + 1);
  }

  onAttachmentDeleted(attachmentId: number): void {
    // Remove from current list
    const currentAttachments = this.selectedNoteAttachments();
    const updatedAttachments = currentAttachments.filter(att => att.id !== attachmentId);
    this.selectedNoteAttachments.set(updatedAttachments);

    // Update the note's attachment count in the notes list
    this.updateNoteAttachmentCount(this.selectedNoteId()!, updatedAttachments.length);
  }

  private updateNoteAttachmentCount(noteId: number, newCount: number): void {
    const currentNotes = this.notes();
    const updatedNotes = currentNotes.map(note => {
      if (note.id === noteId) {
        return { ...note, attachments_count: newCount };
      }
      return note;
    });
    this.notes.set(updatedNotes);
  }
}