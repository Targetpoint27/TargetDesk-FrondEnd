import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SpinnerSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ui-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spinner.html',
  styleUrl: './spinner.scss',
})
export class Spinner {
  @Input() size: SpinnerSize = 'md';
  @Input() color = 'var(--color-primary)';
  @Input() label = 'Chargement...';

  getSpinnerClasses(): string {
    return `spinner spinner-${this.size}`;
  }
}