import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" *ngIf="isVisible" (click)="onOverlayClick($event)">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="icon-container" [ngClass]="iconClass">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.258c-.77-.833-2.694-.833-3.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
          </div>
        </div>

        <div class="modal-body">
          <h3 class="modal-title">{{ title }}</h3>
          <p class="modal-message">{{ message }}</p>
        </div>

        <div class="modal-actions">
          <button type="button"
                  class="btn btn-secondary"
                  (click)="onCancel()">
            {{ cancelText }}
          </button>
          <button type="button"
                  class="btn btn-danger"
                  (click)="onConfirm()">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./confirmation-modal.component.scss']
})
export class ConfirmationModalComponent {
  @Input() isVisible = false;
  @Input() title = 'Confirmer l\'action';
  @Input() message = 'Êtes-vous sûr de vouloir continuer ?';
  @Input() confirmText = 'Confirmer';
  @Input() cancelText = 'Annuler';
  @Input() type: 'warning' | 'danger' | 'info' = 'warning';

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  get iconClass(): string {
    switch (this.type) {
      case 'danger':
        return 'icon-danger';
      case 'info':
        return 'icon-info';
      case 'warning':
      default:
        return 'icon-warning';
    }
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}