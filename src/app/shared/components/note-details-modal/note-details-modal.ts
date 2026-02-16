import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { ClientNote } from '../../../domain/models/crm.models'; // Import ClientNote

@Component({
  selector: 'app-note-details-modal',
  standalone: true, // Mark as standalone
  imports: [CommonModule], // Add CommonModule here
  templateUrl: './note-details-modal.html',
  styleUrl: './note-details-modal.scss',
})
export class NoteDetailsModalComponent { // Renamed class
  @Input() isOpen = false;
  @Input() note: ClientNote | null = null;
  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }

  // Utility methods to format display
  getTypeLabel(type: ClientNote['type']): string {
    switch (type) {
      case 'normal': return 'Normale';
      case 'important': return 'Importante';
      case 'private': return 'Privée';
      default: return type;
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  getUserInitials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
