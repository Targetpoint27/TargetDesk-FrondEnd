import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ui-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() fullWidth = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';

  @Output() clicked = new EventEmitter<MouseEvent>();

  onClick(event: MouseEvent) {
    if (!this.disabled && !this.loading) {
      this.clicked.emit(event);
    }
  }

  getButtonClasses(): string {
    const classes = ['btn', `btn-${this.variant}`, `btn-${this.size}`];

    if (this.fullWidth) classes.push('btn-full-width');
    if (this.loading) classes.push('btn-loading');

    return classes.join(' ');
  }
}
