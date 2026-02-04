/**
 * Category Selector Component
 * Reusable component for selecting categories in forms
 */

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CategoryEntity, CategoryType, CATEGORY_TYPES, getCategoryTypeInfo } from '../../../domain/entities/category.entity';
import { CategoryBadgeComponent } from '../category-badge/category-badge.component';
import { CategoryFacade } from '../../../features/dashboard/categories/category.facade';

interface CategoryGroup {
  type: CategoryType;
  label: string;
  icon: string;
  categories: CategoryEntity[];
}

@Component({
  selector: 'app-category-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, CategoryBadgeComponent],
  template: `
    <div class="category-selector">
      <!-- Header -->
      <div class="selector-header">
        <div class="header-content">
          <div class="icon-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z"/>
              <circle cx="12" cy="14" r="3"/>
            </svg>
            <h4>Sélection de catégories</h4>
          </div>
          @if (selectedCategoryIds.length > 0) {
            <div class="selection-count">
              <span class="count-badge">{{ selectedCategoryIds.length }}</span>
              <span class="count-label">sélectionnée{{ selectedCategoryIds.length > 1 ? 's' : '' }}</span>
            </div>
          }
        </div>

        @if (showDescription) {
          <p class="description">Choisissez les catégories qui correspondent à ce client</p>
        }
      </div>

      <!-- Loading State -->
      @if (isLoading) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Chargement des catégories...</p>
        </div>
      }

      <!-- Empty State -->
      @else if (categoryGroups.length === 0) {
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h4>Aucune catégorie disponible</h4>
          <p>Créez d'abord des catégories pour pouvoir les assigner aux clients</p>
        </div>
      }

      <!-- Categories by Type -->
      @else {
        <div class="categories-content">
          @for (group of categoryGroups; track group.type; let i = $index) {
            <div class="category-group" [style.animation-delay.ms]="i * 100">
              <!-- Group Header -->
              <div class="group-header">
                <div class="group-info">
                  <div class="group-icon" [innerHTML]="group.icon"></div>
                  <span class="group-label">{{ group.label }}</span>
                  <span class="group-count">({{ group.categories.length }})</span>
                </div>

                @if (group.categories.length > 0) {
                  <div class="group-actions">
                    <button
                      type="button"
                      class="select-all-btn"
                      (click)="toggleGroupSelection(group)"
                      [class.active]="isGroupFullySelected(group)">
                      @if (isGroupFullySelected(group)) {
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="20,6 9,17 4,12"/>
                        </svg>
                        Tout désélectionner
                      } @else {
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="12" y1="5" x2="12" y2="19"/>
                          <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Tout sélectionner
                      }
                    </button>
                  </div>
                }
              </div>

              <!-- Categories List -->
              @if (group.categories.length > 0) {
                <div class="categories-grid">
                  @for (category of group.categories; track category.id; let j = $index) {
                    <div class="category-item"
                         [class.selected]="isSelected(category.id)"
                         [style.animation-delay.ms]="(i * 100) + (j * 50)"
                         (click)="toggleCategory(category.id)">
                      <div class="item-content">
                        <div class="checkbox-area">
                          <div class="checkbox" [class.checked]="isSelected(category.id)">
                            @if (isSelected(category.id)) {
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                <polyline points="20,6 9,17 4,12"/>
                              </svg>
                            }
                          </div>
                        </div>

                        <div class="category-info">
                          <app-category-badge
                            [category]="category"
                            [size]="'small'"
                            [showIcon]="false"
                            [maxNameLength]="20">
                          </app-category-badge>

                          @if (category.description) {
                            <div class="category-description">{{ category.description }}</div>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-group">
                  <p>Aucune catégorie de ce type</p>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Quick Actions Footer -->
      @if (!isLoading && categoryGroups.length > 0) {
        <div class="selector-footer">
          <div class="footer-info">
            @if (selectedCategoryIds.length > 0) {
              <span class="selection-summary">
                {{ selectedCategoryIds.length }} catégorie{{ selectedCategoryIds.length > 1 ? 's' : '' }} sélectionnée{{ selectedCategoryIds.length > 1 ? 's' : '' }}
              </span>
            } @else {
              <span class="no-selection">Aucune catégorie sélectionnée</span>
            }
          </div>

          <div class="footer-actions">
            @if (selectedCategoryIds.length > 0) {
              <button
                type="button"
                class="clear-btn"
                (click)="clearSelection()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Tout effacer
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .category-selector {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }

    /* Header */
    .selector-header {
      padding: 16px 20px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .icon-title {
          display: flex;
          align-items: center;
          gap: 8px;

          svg {
            color: #6b7280;
          }

          h4 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: #374151;
          }
        }

        .selection-count {
          display: flex;
          align-items: center;
          gap: 6px;

          .count-badge {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            background: #3b82f6;
            color: white;
            border-radius: 50%;
            font-weight: 600;
            font-size: 12px;
          }

          .count-label {
            color: #6b7280;
            font-size: 14px;
            font-weight: 500;
          }
        }
      }

      .description {
        margin: 0;
        color: #6b7280;
        font-size: 14px;
        line-height: 1.4;
      }
    }

    /* Loading and Empty States */
    .loading-state, .empty-state {
      padding: 40px 20px;
      text-align: center;

      h4 {
        margin: 12px 0 6px 0;
        font-size: 16px;
        font-weight: 600;
        color: #374151;
      }

      p {
        margin: 0;
        color: #6b7280;
        font-size: 14px;
        line-height: 1.4;
      }

      svg {
        color: #9ca3af;
        margin-bottom: 8px;
      }
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e5e7eb;
      border-top: 3px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    /* Categories Content */
    .categories-content {
      max-height: 400px;
      overflow-y: auto;
      padding: 16px 20px;
    }

    .category-group {
      margin-bottom: 24px;
      animation: fadeInUp 0.3s ease-out;

      &:last-child {
        margin-bottom: 0;
      }

      .group-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid #f3f4f6;

        .group-info {
          display: flex;
          align-items: center;
          gap: 8px;

          .group-icon {
            display: flex;
            align-items: center;
            width: 16px;
            height: 16px;
            color: #6b7280;
          }

          .group-label {
            font-weight: 600;
            font-size: 14px;
            color: #374151;
          }

          .group-count {
            color: #9ca3af;
            font-size: 12px;
            font-weight: 500;
          }
        }

        .select-all-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: transparent;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          color: #6b7280;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            background: #f9fafb;
            border-color: #d1d5db;
          }

          &.active {
            background: #fee2e2;
            border-color: #fca5a5;
            color: #dc2626;
          }

          svg {
            width: 10px;
            height: 10px;
          }
        }
      }

      .categories-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 8px;
      }

      .category-item {
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        animation: fadeInUp 0.3s ease-out;

        &:hover {
          border-color: #d1d5db;
          background: #fafbfc;
        }

        &.selected {
          border-color: #3b82f6;
          background: #f0f9ff;
        }

        .item-content {
          display: flex;
          align-items: flex-start;
          gap: 10px;

          .checkbox-area {
            .checkbox {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 18px;
              height: 18px;
              border: 2px solid #d1d5db;
              border-radius: 4px;
              background: white;
              transition: all 0.2s ease;
              margin-top: 1px;

              &.checked {
                background: #3b82f6;
                border-color: #3b82f6;
                color: white;
              }

              svg {
                opacity: 0;
                transform: scale(0.7);
                transition: all 0.2s ease;
              }

              &.checked svg {
                opacity: 1;
                transform: scale(1);
              }
            }
          }

          .category-info {
            flex: 1;
            min-width: 0;

            .category-description {
              margin-top: 4px;
              font-size: 12px;
              color: #6b7280;
              line-height: 1.3;
            }
          }
        }
      }

      .empty-group {
        text-align: center;
        padding: 20px;
        color: #9ca3af;
        font-size: 13px;
        font-style: italic;
      }
    }

    /* Footer */
    .selector-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;

      .footer-info {
        .selection-summary {
          color: #3b82f6;
          font-size: 14px;
          font-weight: 500;
        }

        .no-selection {
          color: #9ca3af;
          font-size: 14px;
        }
      }

      .clear-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: transparent;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        color: #6b7280;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        svg {
          width: 12px;
          height: 12px;
        }
      }
    }

    /* Animations */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(15px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .categories-content {
        padding: 12px 16px;
      }

      .selector-header {
        padding: 12px 16px;

        .header-content {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
      }

      .category-group .categories-grid {
        grid-template-columns: 1fr;
      }

      .selector-footer {
        flex-direction: column;
        gap: 8px;
        align-items: stretch;
        padding: 12px 16px;
      }
    }
  `]
})
export class CategorySelectorComponent implements OnInit, OnDestroy, OnChanges {
  @Input() selectedCategoryIds: number[] = [];
  @Input() disabled = false;
  @Input() showDescription = true;
  @Input() maxHeight = '400px';
  @Input() allowMultipleTypes = true;

  @Output() selectionChange = new EventEmitter<number[]>();
  @Output() categorySelected = new EventEmitter<CategoryEntity>();
  @Output() categoryDeselected = new EventEmitter<CategoryEntity>();

  categoryGroups: CategoryGroup[] = [];
  isLoading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private categoryFacade: CategoryFacade,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedCategoryIds']) {
      console.log('CategorySelector: selectedCategoryIds changed:', {
        previous: changes['selectedCategoryIds'].previousValue,
        current: changes['selectedCategoryIds'].currentValue,
        firstChange: changes['selectedCategoryIds'].firstChange
      });

      // Update internal state when input changes
      if (changes['selectedCategoryIds'].currentValue) {
        this.selectedCategoryIds = [...changes['selectedCategoryIds'].currentValue];
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCategories(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    // Subscribe to categories from facade
    this.categoryFacade.categories$
      .pipe(takeUntil(this.destroy$))
      .subscribe(categories => {
        this.buildCategoryGroups(categories);
        this.isLoading = false;
        this.cdr.detectChanges();
      });

    // Load categories if not already loaded
    this.categoryFacade.loadCategories().subscribe();
  }

  private buildCategoryGroups(categories: CategoryEntity[]): void {
    this.categoryGroups = CATEGORY_TYPES.map(typeInfo => {
      const typeCategories = categories.filter(cat => cat.type === typeInfo.value);

      return {
        type: typeInfo.value,
        label: typeInfo.label,
        icon: typeInfo.icon,
        categories: typeCategories
      };
    }).filter(group => group.categories.length > 0);
  }

  isSelected(categoryId: number): boolean {
    return this.selectedCategoryIds.includes(categoryId);
  }

  toggleCategory(categoryId: number): void {
    if (this.disabled) return;

    const isCurrentlySelected = this.isSelected(categoryId);
    let newSelection: number[];

    if (isCurrentlySelected) {
      newSelection = this.selectedCategoryIds.filter(id => id !== categoryId);
      const category = this.findCategoryById(categoryId);
      if (category) {
        this.categoryDeselected.emit(category);
      }
    } else {
      newSelection = [...this.selectedCategoryIds, categoryId];
      const category = this.findCategoryById(categoryId);
      if (category) {
        this.categorySelected.emit(category);
      }
    }

    this.selectedCategoryIds = newSelection;
    this.selectionChange.emit(newSelection);
  }

  toggleGroupSelection(group: CategoryGroup): void {
    if (this.disabled) return;

    const isFullySelected = this.isGroupFullySelected(group);

    if (isFullySelected) {
      // Remove all categories from this group
      const groupCategoryIds = group.categories.map(cat => cat.id);
      this.selectedCategoryIds = this.selectedCategoryIds.filter(id => !groupCategoryIds.includes(id));
    } else {
      // Add all categories from this group
      const groupCategoryIds = group.categories.map(cat => cat.id);
      const newIds = groupCategoryIds.filter(id => !this.selectedCategoryIds.includes(id));
      this.selectedCategoryIds = [...this.selectedCategoryIds, ...newIds];
    }

    this.selectionChange.emit(this.selectedCategoryIds);
  }

  isGroupFullySelected(group: CategoryGroup): boolean {
    if (group.categories.length === 0) return false;
    return group.categories.every(cat => this.isSelected(cat.id));
  }

  clearSelection(): void {
    if (this.disabled) return;
    this.selectedCategoryIds = [];
    this.selectionChange.emit([]);
  }

  private findCategoryById(categoryId: number): CategoryEntity | undefined {
    for (const group of this.categoryGroups) {
      const category = group.categories.find(cat => cat.id === categoryId);
      if (category) return category;
    }
    return undefined;
  }

  // Public methods for parent components
  getSelectedCategories(): CategoryEntity[] {
    return this.selectedCategoryIds
      .map(id => this.findCategoryById(id))
      .filter(cat => cat !== undefined) as CategoryEntity[];
  }

  setSelectedCategories(categoryIds: number[]): void {
    this.selectedCategoryIds = [...categoryIds];
    this.cdr.detectChanges();
  }

  getSelectionSummary(): string {
    const count = this.selectedCategoryIds.length;
    return count > 0
      ? `${count} catégorie${count > 1 ? 's' : ''} sélectionnée${count > 1 ? 's' : ''}`
      : 'Aucune sélection';
  }
}