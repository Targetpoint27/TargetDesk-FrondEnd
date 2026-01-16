import { Component, Input, Output, EventEmitter, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ConfirmationVariant = 'warning' | 'danger' | 'info' | 'success';
export type ConfirmationSize = 'small' | 'medium' | 'large';

export interface ConfirmationAction {
  label: string;
  action: 'confirm' | 'cancel' | 'custom';
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

@Component({
  selector: 'ui-confirmation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation.html',
  styleUrl: './confirmation.scss'
})
export class ConfirmationComponent {
  @Input() title: string = '';
  @Input() message: string = '';
  @Input() variant: ConfirmationVariant = 'warning';
  @Input() size: ConfirmationSize = 'medium';
  @Input() actions: ConfirmationAction[] = [
    { label: 'Cancel', action: 'cancel', variant: 'secondary' },
    { label: 'Confirm', action: 'confirm', variant: 'primary' }
  ];
  @Input() showIcon: boolean = true;
  @Input() closable: boolean = true;
  @Input() loading: boolean = false;
  @Input() disabled: boolean = false;

  @Output() actionClicked = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  @HostBinding('class') get cssClasses(): string {
    return [
      'ui-confirmation',
      `ui-confirmation--${this.variant}`,
      `ui-confirmation--${this.size}`,
      this.loading ? 'ui-confirmation--loading' : '',
      this.disabled ? 'ui-confirmation--disabled' : ''
    ].filter(Boolean).join(' ');
  }

  @HostBinding('attr.role') role = 'dialog';
  @HostBinding('attr.aria-modal') ariaModal = 'true';
  @HostBinding('attr.aria-labelledby') get ariaLabelledBy(): string {
    return this.title ? 'confirmation-title' : '';
  }
  @HostBinding('attr.aria-describedby') get ariaDescribedBy(): string {
    return this.message ? 'confirmation-message' : '';
  }

  onActionClick(action: ConfirmationAction): void {
    if (this.disabled || this.loading || action.disabled) {
      return;
    }

    this.actionClicked.emit(action.action);

    if (action.action === 'cancel') {
      this.onClose();
    }
  }

  onClose(): void {
    if (this.disabled || this.loading) {
      return;
    }

    this.closed.emit();
  }

  getIconClass(): string {
    const iconMap: Record<ConfirmationVariant, string> = {
      warning: 'warning',
      danger: 'error',
      info: 'info',
      success: 'check-circle'
    };
    return iconMap[this.variant];
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.closable) {
      this.onClose();
    }
  }

  trackByAction(index: number, action: ConfirmationAction): string {
    return `${action.action}-${action.label}`;
  }
}
