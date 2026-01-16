import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './badge.html',
  styleUrl: './badge.scss'
})
export class Badge {
  @Input() text = '';
  @Input() variant: 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' = 'default';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() outline = false;
  @Input() pill = false;
  @Input() dot = false;
}
