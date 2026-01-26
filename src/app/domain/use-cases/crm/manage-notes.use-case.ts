import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CrmRepository } from '../../repositories/crm.repository';
import {
  ClientNote,
  CreateNoteRequest,
  UpdateNoteRequest,
  NoteFilters,
  NotesResponse,
  NoteAttachment,
  UploadAttachmentRequest
} from '../../models/crm.models';

@Injectable({
  providedIn: 'root'
})
export class ManageNotesUseCase {

  constructor(private crmRepository: CrmRepository) {}

  /**
   * Récupère les notes d'un client
   */
  getClientNotes(clientId: number, filters?: NoteFilters): Observable<NotesResponse> {
    return this.crmRepository.getClientNotes(clientId, filters);
  }

  /**
   * Crée une nouvelle note
   */
  createNote(clientId: number, request: CreateNoteRequest): Observable<ClientNote> {
    // Validation métier si nécessaire
    if (!request.title?.trim()) {
      throw new Error('Le titre de la note est obligatoire');
    }

    if (!request.content?.trim()) {
      throw new Error('Le contenu de la note est obligatoire');
    }

    return this.crmRepository.createNote(clientId, request);
  }

  /**
   * Récupère une note spécifique
   */
  getNote(noteId: number): Observable<ClientNote> {
    return this.crmRepository.getNote(noteId);
  }

  /**
   * Met à jour une note
   */
  updateNote(noteId: number, request: UpdateNoteRequest): Observable<ClientNote> {
    return this.crmRepository.updateNote(noteId, request);
  }

  /**
   * Supprime une note
   */
  deleteNote(noteId: number): Observable<void> {
    return this.crmRepository.deleteNote(noteId);
  }

  /**
   * Épingle/désépingle une note
   */
  togglePinNote(noteId: number): Observable<ClientNote> {
    return this.crmRepository.togglePinNote(noteId);
  }

  /**
   * Ajoute une pièce jointe à une note
   */
  addAttachment(noteId: number, request: UploadAttachmentRequest): Observable<NoteAttachment> {
    // Validation du fichier
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (request.file.size > maxSize) {
      throw new Error('Le fichier ne peut pas dépasser 10MB');
    }

    return this.crmRepository.addNoteAttachment(noteId, request);
  }

  /**
   * Supprime une pièce jointe
   */
  deleteAttachment(attachmentId: number): Observable<void> {
    return this.crmRepository.deleteNoteAttachment(attachmentId);
  }
}