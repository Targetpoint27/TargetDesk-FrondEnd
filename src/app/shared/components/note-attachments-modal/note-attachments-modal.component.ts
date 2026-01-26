import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import {
  NoteAttachment,
  UploadAttachmentRequest
} from '../../../domain/models/crm.models';
import { ManageNotesUseCase } from '../../../domain/use-cases/crm/manage-notes.use-case';
import { MessageService } from '../../services/message.service';

@Component({
  selector: 'app-note-attachments-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="onClose()">
      <div class="modal-container attachments-modal" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <h3 class="modal-title">
            <i class="bi bi-paperclip me-2"></i>
            Pièces jointes - {{ noteTitle || 'Note' }}
          </h3>
          <button type="button" class="btn-close" (click)="onClose()" aria-label="Close">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <!-- Content -->
        <div class="modal-content">
          <!-- Upload Section -->
          <div class="upload-section">
            <h4 class="section-title">
              <i class="bi bi-cloud-upload me-2"></i>
              Ajouter une pièce jointe
            </h4>

            <!-- Drop Zone -->
            <div
              class="drop-zone"
              [class.drag-over]="isDragOver"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)">
              <div class="drop-zone-content">
                <i class="bi bi-cloud-upload" style="font-size: 3rem; color: #6c757d;"></i>
                <h5 class="mb-2">Glissez-déposez vos fichiers ici</h5>
                <p class="text-muted mb-3">ou cliquez pour sélectionner (max 10MB)</p>
                <div class="file-types mb-3">
                  <small class="text-muted">PDF, Images, Documents acceptés</small>
                </div>
                <input
                  type="file"
                  #fileInput
                  multiple
                  class="file-input"
                  (change)="onFileSelected($event)">
                <button type="button" class="btn btn-outline-primary" (click)="fileInput.click()">
                  <i class="bi bi-folder2-open me-2"></i>
                  Parcourir les fichiers
                </button>
              </div>
            </div>

            <!-- Description pour les nouveaux fichiers -->
            <div class="upload-description" *ngIf="filesToUpload.length > 0">
              <div class="mb-3">
                <label for="upload-description" class="form-label">
                  <i class="bi bi-chat-left-text me-2"></i>
                  Description (optionnelle)
                </label>
                <input
                  type="text"
                  id="upload-description"
                  class="form-control"
                  [(ngModel)]="uploadDescription"
                  placeholder="Description des fichiers...">
              </div>
            </div>

            <!-- Fichiers en attente d'upload -->
            <div class="files-pending" *ngIf="filesToUpload.length > 0">
              <div class="d-flex align-items-center mb-3">
                <i class="bi bi-hourglass-split me-2 text-warning"></i>
                <h5 class="mb-0">Fichiers à télécharger :</h5>
              </div>
              <div class="files-list">
                @for (file of filesToUpload; track $index; let i = $index) {
                  <div class="file-item pending">
                    <div class="file-info">
                      <div class="file-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/>
                          <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                        </svg>
                      </div>
                      <div class="file-details">
                        <div class="file-name">{{ file.name }}</div>
                        <div class="file-size">{{ formatFileSize(file.size) }}</div>
                      </div>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-danger" (click)="removeFileFromQueue(i)" title="Retirer">
                      <i class="bi bi-x"></i>
                    </button>
                  </div>
                }
              </div>
              <div class="upload-actions d-flex gap-2 justify-content-end">
                <button type="button" class="btn btn-outline-secondary" (click)="clearUploadQueue()">
                  <i class="bi bi-x-circle me-2"></i>
                  Annuler
                </button>
                <button
                  type="button"
                  class="btn btn-primary"
                  (click)="uploadFiles()"
                  [disabled]="isUploading()">
                  <span *ngIf="isUploading()" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  <i *ngIf="!isUploading()" class="bi bi-cloud-upload me-2"></i>
                  {{ isUploading() ? 'Upload en cours...' : 'Télécharger' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Existing Attachments -->
          <div class="attachments-section">
            <h4 class="section-title">
              <i class="bi bi-files me-2"></i>
              Pièces jointes existantes
              <span class="badge bg-primary ms-2">{{ attachments.length }}</span>
            </h4>

            <!-- Loading -->
            <div *ngIf="isLoadingAttachments()" class="text-center py-4">
              <div class="spinner-border text-primary mb-2" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <p class="text-muted mb-0">Chargement des pièces jointes...</p>
            </div>

            <!-- Empty State -->
            <div *ngIf="!isLoadingAttachments() && attachments.length === 0" class="text-center py-4">
              <i class="bi bi-file-earmark" style="font-size: 3rem; color: #6c757d;"></i>
              <p class="text-muted mt-2 mb-0">Aucune pièce jointe pour cette note</p>
            </div>

            <!-- Attachments List -->
            <div *ngIf="!isLoadingAttachments() && attachments.length > 0" class="files-list">
              @for (attachment of attachments; track attachment.id) {
                <div class="file-item">
                  <div class="file-info">
                    <div class="file-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        @switch (getFileType(attachment.mime_type)) {
                          @case ('image') {
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="2"/>
                            <polyline points="21,15 16,10 5,21" stroke="currentColor" stroke-width="2"/>
                          }
                          @case ('pdf') {
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/>
                            <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                            <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2"/>
                            <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2"/>
                          }
                          @default {
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/>
                            <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                          }
                        }
                      </svg>
                    </div>
                    <div class="file-details">
                      <div class="file-name">{{ attachment.original_name }}</div>
                      <div class="file-meta">
                        <span class="file-size">{{ formatFileSize(attachment.size) }}</span>
                        <span class="file-date">• {{ formatDate(attachment.created_at) }}</span>
                      </div>
                      <div class="file-description" *ngIf="attachment.description">
                        {{ attachment.description }}
                      </div>
                    </div>
                  </div>
                  <div class="file-actions d-flex gap-2">
                    <a
                      [href]="attachment.download_url"
                      target="_blank"
                      class="btn btn-sm btn-outline-primary"
                      title="Télécharger">
                      <i class="bi bi-download"></i>
                    </a>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-danger"
                      (click)="deleteAttachment(attachment)"
                      title="Supprimer">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" (click)="onClose()">
            Fermer
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './note-attachments-modal.component.scss'
})
export class NoteAttachmentsModalComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Input() noteId: number | null = null;
  @Input() noteTitle: string | null = null;
  @Input() attachments: NoteAttachment[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() attachmentAdded = new EventEmitter<NoteAttachment>();
  @Output() attachmentDeleted = new EventEmitter<number>();

  private destroy$ = new Subject<void>();

  // Signals
  isLoadingAttachments = signal(false);
  isUploading = signal(false);

  // Upload state
  filesToUpload: File[] = [];
  uploadDescription = '';
  isDragOver = false;

  constructor(
    private manageNotesUseCase: ManageNotesUseCase,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    // Les attachments sont passés en input depuis le parent
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClose(): void {
    this.clearUploadQueue();
    this.close.emit();
  }

  // Drag & Drop handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = Array.from(event.dataTransfer?.files || []);
    this.addFilesToQueue(files);
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files || []);
    this.addFilesToQueue(files);

    // Reset input
    target.value = '';
  }

  addFilesToQueue(files: File[]): void {
    const validFiles = files.filter(file => this.validateFile(file));
    this.filesToUpload.push(...validFiles);
  }

  validateFile(file: File): boolean {
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {
      this.messageService.showError(`Le fichier "${file.name}" est trop volumineux (max 10MB)`);
      return false;
    }

    return true;
  }

  removeFileFromQueue(index: number): void {
    this.filesToUpload.splice(index, 1);
  }

  clearUploadQueue(): void {
    this.filesToUpload = [];
    this.uploadDescription = '';
  }

  uploadFiles(): void {
    if (!this.noteId || this.filesToUpload.length === 0) return;

    this.isUploading.set(true);

    // Upload each file
    const uploads = this.filesToUpload.map(file => {
      const request: UploadAttachmentRequest = {
        file,
        description: this.uploadDescription || undefined
      };

      return this.manageNotesUseCase.addAttachment(this.noteId!, request);
    });

    // Handle all uploads
    const uploadPromises = uploads.map(upload =>
      upload.pipe(takeUntil(this.destroy$)).toPromise()
    );

    Promise.allSettled(uploadPromises).then(results => {
      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');

      if (successful.length > 0) {
        this.messageService.showSuccess(
          `${successful.length} fichier(s) téléchargé(s) avec succès`
        );

        // Emit the new attachments
        successful.forEach(result => {
          if (result.status === 'fulfilled') {
            this.attachmentAdded.emit(result.value);
          }
        });
      }

      if (failed.length > 0) {
        this.messageService.showError(
          `Erreur lors du téléchargement de ${failed.length} fichier(s)`
        );
        console.error('Upload errors:', failed);
      }

      this.clearUploadQueue();
      this.isUploading.set(false);
    });
  }

  deleteAttachment(attachment: NoteAttachment): void {
    if (!confirm(`Supprimer la pièce jointe "${attachment.original_name}" ?`)) return;

    this.manageNotesUseCase.deleteAttachment(attachment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.showSuccess('Pièce jointe supprimée avec succès');
          this.attachmentDeleted.emit(attachment.id);
        },
        error: (error) => {
          this.messageService.showError('Erreur lors de la suppression de la pièce jointe');
          console.error('Error deleting attachment:', error);
        }
      });
  }

  // Utility methods
  getFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    return 'file';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}