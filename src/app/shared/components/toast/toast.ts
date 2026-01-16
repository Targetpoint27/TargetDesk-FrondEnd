import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ToastData {
  id?: string;
  message: string;
  title?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  persistent?: boolean;
  icon?: string;
  actions?: ToastAction[];
}

export interface ToastAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary';
}

@Component({
  selector: 'ui-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.html',
  styleUrl: './toast.scss'
})
export class Toast implements OnInit, OnDestroy {
  @Input() data: ToastData = { message: '' };
  @Input() visible = true;
  @Input() position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center' = 'top-right';

  @Output() dismiss = new EventEmitter<void>();
  @Output() actionClick = new EventEmitter<ToastAction>();

  private autoCloseTimer?: number;

  get iconForType(): string {
    if (this.data.icon) return this.data.icon;

    switch (this.data.type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      case 'info': return 'ⓘ';
      default: return 'ⓘ';
    }
  }

  ngOnInit() {
    if (!this.data.persistent && this.data.duration !== 0) {
      const duration = this.data.duration || 5000;
      this.autoCloseTimer = window.setTimeout(() => {
        this.close();
      }, duration);
    }
  }

  ngOnDestroy() {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
    }
  }

  close() {
    this.visible = false;
    setTimeout(() => {
      this.dismiss.emit();
    }, 300); // Wait for animation to complete
  }

  onActionClick(action: ToastAction) {
    this.actionClick.emit(action);
    action.action();
  }

  stopAutoClose() {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
    }
  }

  resumeAutoClose() {
    if (!this.data.persistent && this.data.duration !== 0) {
      const duration = this.data.duration || 5000;
      this.autoCloseTimer = window.setTimeout(() => {
        this.close();
      }, duration);
    }
  }

  trackByFn(index: number, item: ToastAction): string {
    return item.label + index;
  }
}
