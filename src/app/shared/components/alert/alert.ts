import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AlertAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary';
}

@Component({
  selector: 'ui-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert.html',
  styleUrl: './alert.scss'
})
export class Alert {
  @Input() type: 'success' | 'error' | 'warning' | 'info' = 'info';
  @Input() title?: string;
  @Input() message = '';
  @Input() dismissible = false;
  @Input() icon?: string;
  @Input() actions?: AlertAction[];
  @Input() variant: 'filled' | 'outlined' | 'subtle' = 'filled';

  @Output() dismiss = new EventEmitter<void>();
  @Output() actionClick = new EventEmitter<AlertAction>();

  get iconForType(): string {
    if (this.icon) return this.icon;

    switch (this.type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      case 'info': return 'ⓘ';
      default: return 'ⓘ';
    }
  }

  onDismiss() {
    this.dismiss.emit();
  }

  onActionClick(action: AlertAction) {
    this.actionClick.emit(action);
    action.action();
  }

  trackByFn(index: number, item: AlertAction): string {
    return item.label + index;
  }
}
