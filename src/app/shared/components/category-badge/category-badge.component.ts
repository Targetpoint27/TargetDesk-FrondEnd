/**
 * Category Badge Component
 * Displays a category as a colored badge with icon
 */

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryEntity, getCategoryTypeInfo } from '../../../domain/entities/category.entity';

@Component({
  selector: 'app-category-badge',
  imports: [CommonModule],
  template: `
    <span
      class="category-badge"
      [style.background-color]="backgroundColor"
      [style.color]="textColor"
      [class.small]="size === 'small'"
      [class.large]="size === 'large'"
      [title]="getTooltip()">

      @if (showIcon) {
        <span class="category-icon" [innerHTML]="typeInfo.icon"></span>
      }

      <span class="category-name">{{ displayName }}</span>

      @if (showCount && count && count > 0) {
        <span class="category-count">{{ count }}</span>
      }
    </span>
  `,
  styles: [`
    .category-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
      border: 1px solid rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      &.small {
        padding: 0.125rem 0.375rem;
        font-size: 0.6875rem;
        gap: 0.125rem;

        .category-icon svg {
          width: 12px;
          height: 12px;
        }
      }

      &.large {
        padding: 0.375rem 0.75rem;
        font-size: 0.875rem;
        gap: 0.375rem;

        .category-icon svg {
          width: 16px;
          height: 16px;
        }
      }

      .category-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;

        svg {
          width: 14px;
          height: 14px;
          color: inherit;
        }
      }

      .category-name {
        line-height: 1;
      }

      .category-count {
        background: rgba(0, 0, 0, 0.15);
        border-radius: 0.5rem;
        padding: 0.125rem 0.25rem;
        font-size: 0.625rem;
        font-weight: 600;
        min-width: 1rem;
        text-align: center;
        line-height: 1;
      }
    }
  `]
})
export class CategoryBadgeComponent {
  @Input() category!: CategoryEntity;
  @Input() count?: number;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() showIcon: boolean = true;
  @Input() showCount: boolean = false;
  @Input() maxNameLength?: number;

  get displayName(): string {
    if (!this.category?.name) return '';

    if (this.maxNameLength && this.category.name.length > this.maxNameLength) {
      return this.category.name.substring(0, this.maxNameLength) + '...';
    }

    return this.category.name;
  }

  get typeInfo() {
    return getCategoryTypeInfo(this.category?.type || 'personnalisee');
  }

  get backgroundColor(): string {
    return this.category?.color || '#007bff';
  }

  get textColor(): string {
    // Calculate if we need dark or light text based on background color
    const hex = this.backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  getTooltip(): string {
    if (!this.category) return '';

    const parts = [
      `${this.typeInfo.label}: ${this.category.name}`
    ];

    if (this.category.description) {
      parts.push(this.category.description);
    }

    if (this.category.full_path && this.category.full_path !== this.category.name) {
      parts.push(`Chemin: ${this.category.full_path}`);
    }

    return parts.join('\n');
  }
}