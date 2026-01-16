/**
 * Category Badges List Component
 * Displays multiple category badges with overflow handling
 */

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryEntity, CategorySummary } from '../../../domain/entities/category.entity';
import { CategoryBadgeComponent } from '../category-badge/category-badge.component';

@Component({
  selector: 'app-category-badges-list',
  imports: [CommonModule, CategoryBadgeComponent],
  template: `
    <div class="category-badges-list" [class.compact]="compact">
      @if (displayMode === 'summary' && categoriesSummary?.length) {
        <!-- Summary mode: Show count by type -->
        @for (summary of categoriesSummary; track summary.type) {
          @for (categoryInfo of summary.categories; track categoryInfo.id) {
            <app-category-badge
              [category]="getCategoryFromSummary(categoryInfo)"
              [count]="getCountForCategory(summary, categoryInfo)"
              [size]="size"
              [showCount]="showCount"
              [showIcon]="showIcon"
              [maxNameLength]="maxNameLength">
            </app-category-badge>
          }
        }
      } @else if (displayMode === 'full' && categories?.length) {
        <!-- Full mode: Show individual categories -->
        @for (category of visibleCategories; track category.id) {
          <app-category-badge
            [category]="category"
            [size]="size"
            [showCount]="false"
            [showIcon]="showIcon"
            [maxNameLength]="maxNameLength">
          </app-category-badge>
        }

        @if (hasOverflow) {
          <span class="overflow-indicator" [title]="getOverflowTooltip()">
            +{{ overflowCount }}
          </span>
        }
      } @else {
        <!-- Empty state -->
        <span class="no-categories">{{ emptyMessage }}</span>
      }
    </div>
  `,
  styles: [`
    .category-badges-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      align-items: center;

      &.compact {
        gap: 0.25rem;
      }

      .overflow-indicator {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.25rem 0.5rem;
        background: #f3f4f6;
        color: #6b7280;
        border-radius: 0.375rem;
        font-size: 0.75rem;
        font-weight: 500;
        cursor: help;
        border: 1px solid #e5e7eb;
        min-width: 2rem;
        text-align: center;
      }

      .no-categories {
        color: #9ca3af;
        font-style: italic;
        font-size: 0.75rem;
      }
    }
  `]
})
export class CategoryBadgesListComponent {
  @Input() categories: CategoryEntity[] = [];
  @Input() categoriesSummary: CategorySummary[] = [];
  @Input() displayMode: 'full' | 'summary' = 'full';
  @Input() maxVisible: number = 3;
  @Input() size: 'small' | 'medium' | 'large' = 'small';
  @Input() showCount: boolean = false;
  @Input() showIcon: boolean = true;
  @Input() compact: boolean = false;
  @Input() maxNameLength?: number = 15;
  @Input() emptyMessage: string = 'Aucune catégorie';

  get visibleCategories(): CategoryEntity[] {
    if (!this.categories?.length) return [];
    return this.categories.slice(0, this.maxVisible);
  }

  get hasOverflow(): boolean {
    return this.categories.length > this.maxVisible;
  }

  get overflowCount(): number {
    return Math.max(0, this.categories.length - this.maxVisible);
  }

  getCategoryFromSummary(categoryInfo: { id: number; name: string; color: string }): CategoryEntity {
    // Create a minimal CategoryEntity from summary info
    const summary = this.categoriesSummary.find(s =>
      s.categories.some(c => c.id === categoryInfo.id)
    );

    return {
      id: categoryInfo.id,
      name: categoryInfo.name,
      color: categoryInfo.color,
      type: summary?.type || 'personnalisee',
      description: null,
      parent_id: null,
      is_active: true,
      created_by: 0,
      created_at: '',
      updated_at: ''
    } as CategoryEntity;
  }

  getCountForCategory(summary: CategorySummary, categoryInfo: { id: number; name: string; color: string }): number {
    // In summary mode, show the count only if there's one category of this type
    return summary.count === 1 ? 0 : summary.count;
  }

  getOverflowTooltip(): string {
    if (!this.hasOverflow) return '';

    const hiddenCategories = this.categories.slice(this.maxVisible);
    const names = hiddenCategories.map(cat => cat.name).join(', ');

    return `Catégories supplémentaires:\n${names}`;
  }
}