import { Component, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CardVariant = 'default' | 'outlined' | 'elevated' | 'filled';
export type CardSize = 'small' | 'medium' | 'large';

@Component({
  selector: 'ui-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.html',
  styleUrl: './card.scss'
})
export class CardComponent {
  @Input() variant: CardVariant = 'default';
  @Input() size: CardSize = 'medium';
  @Input() padding: boolean = true;
  @Input() clickable: boolean = false;
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() imageUrl?: string;
  @Input() imageAlt?: string;

  @HostBinding('class') get cssClasses(): string {
    return [
      'ui-card',
      `ui-card--${this.variant}`,
      `ui-card--${this.size}`,
      this.padding ? 'ui-card--padded' : '',
      this.clickable ? 'ui-card--clickable' : '',
      this.disabled ? 'ui-card--disabled' : '',
      this.loading ? 'ui-card--loading' : ''
    ].filter(Boolean).join(' ');
  }

  @HostBinding('attr.role') get role(): string | null {
    return this.clickable ? 'button' : null;
  }

  @HostBinding('attr.tabindex') get tabindex(): number | null {
    return this.clickable && !this.disabled ? 0 : null;
  }

  @HostBinding('attr.aria-disabled') get ariaDisabled(): boolean | null {
    return this.clickable && this.disabled ? true : null;
  }

  @HostBinding('attr.aria-busy') get ariaBusy(): boolean | null {
    return this.loading ? true : null;
  }
}

export { CardComponent as Card };
export type CardPadding = 'none' | 'small' | 'medium' | 'large';