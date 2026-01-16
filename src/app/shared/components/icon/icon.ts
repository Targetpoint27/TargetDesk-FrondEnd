import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-icon',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './icon.html',
  styleUrl: './icon.scss'
})
export class Icon {
  @Input() name = '';
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() color?: string;
  @Input() spin = false;
  @Input() ariaLabel?: string;
}
