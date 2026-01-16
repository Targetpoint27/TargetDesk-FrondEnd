/**
 * Categories Management Page Component
 * Manages category creation, editing, and hierarchy
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, Subject, takeUntil, combineLatest, map, BehaviorSubject } from 'rxjs';

import { CategoryEntity, CreateCategoryRequest, UpdateCategoryRequest, CategoryType, CATEGORY_TYPES, getDefaultColorForType } from '../../../../domain/entities/category.entity';
import { CategoryBadgeComponent } from '../../../../shared/components/category-badge/category-badge.component';
import { CategoryFacade } from '../../categories/category.facade';
import { MessageService } from '../../../../shared/services/message.service';
import { AppError } from '../../../../core/error/error.service';

interface CategoriesState {
  categories: CategoryEntity[];
  filteredCategories: CategoryEntity[];
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: AppError | string | null;
  selectedType: CategoryType | 'all';
  hierarchicalView: boolean;
}

@Component({
  selector: 'app-categories',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CategoryBadgeComponent],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class CategoriesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private internalState$ = new BehaviorSubject<CategoriesState>({
    categories: [],
    filteredCategories: [],
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    error: null,
    selectedType: 'all',
    hierarchicalView: true
  });

  // Observables
  state$: Observable<CategoriesState>;

  // Forms
  categoryForm: FormGroup;

  // UI State
  showCreateForm = false;
  showEditForm = false;
  editingCategory: CategoryEntity | null = null;
  selectedParentCategory: CategoryEntity | null = null;

  // Constants
  readonly CATEGORY_TYPES = CATEGORY_TYPES;
  readonly TYPE_OPTIONS = [
    { value: 'all', label: 'Tous les types' },
    ...CATEGORY_TYPES.map(type => ({ value: type.value, label: type.label }))
  ];

  constructor(
    private categoryFacade: CategoryFacade,
    private fb: FormBuilder,
    private messageService: MessageService
  ) {
    this.categoryForm = this.createCategoryForm();

    // Combine facade observables to create view state
    this.state$ = combineLatest([
      this.categoryFacade.categories$,
      this.categoryFacade.isLoading$,
      this.categoryFacade.isCreating$,
      this.categoryFacade.isUpdating$,
      this.categoryFacade.isDeleting$,
      this.categoryFacade.error$
    ]).pipe(
      takeUntil(this.destroy$),
      map(([categories, isLoading, isCreating, isUpdating, isDeleting, error]) => {
        const currentState = this.internalState$.value;

        // Sort categories hierarchically
        const sortedCategories = this.sortCategoriesHierarchically(categories);

        // Filter categories
        const filteredCategories = currentState.selectedType === 'all'
          ? sortedCategories
          : sortedCategories.filter(cat => cat.type === currentState.selectedType);

        const newState = {
          categories: sortedCategories,
          filteredCategories,
          isLoading,
          isCreating,
          isUpdating,
          isDeleting,
          error,
          selectedType: currentState.selectedType,
          hierarchicalView: currentState.hierarchicalView
        };

        // Sync with internal state
        this.internalState$.next(newState);
        return newState;
      })
    );
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Data operations
  loadCategories(): void {
    this.categoryFacade.loadCategories().subscribe();
  }

  // CRUD Operations
  onCreateCategory(): void {
    if (this.categoryForm.invalid) {
      this.markFormGroupTouched(this.categoryForm);
      return;
    }

    const formValue = this.categoryForm.value;
    const request: CreateCategoryRequest = {
      name: formValue.name,
      description: formValue.description || undefined,
      type: formValue.type,
      color: formValue.color || getDefaultColorForType(formValue.type),
      parent_id: formValue.parent_id || undefined
    };

    this.categoryFacade.createCategory(request).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.closeCreateForm();
      }
    });
  }

  onUpdateCategory(): void {
    if (!this.editingCategory || this.categoryForm.invalid) {
      this.markFormGroupTouched(this.categoryForm);
      return;
    }

    const formValue = this.categoryForm.value;
    const request: UpdateCategoryRequest = {
      name: formValue.name,
      description: formValue.description || undefined,
      type: formValue.type,
      color: formValue.color,
      parent_id: formValue.parent_id || undefined
    };

    this.categoryFacade.updateCategory(this.editingCategory.id, request).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.closeEditForm();
      }
    });
  }

  onDeleteCategory(category: CategoryEntity): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" ?
${category.children_count ? `Attention: ${category.children_count} sous-catégories seront également supprimées.` : ''}`)) {
      this.categoryFacade.deleteCategory(category.id).subscribe();
    }
  }

  // UI Actions
  openCreateForm(): void {
    this.showCreateForm = true;
    this.showEditForm = false;
    this.editingCategory = null;
    this.resetForm();
  }

  openEditForm(category: CategoryEntity): void {
    this.showEditForm = true;
    this.showCreateForm = false;
    this.editingCategory = category;
    this.populateFormForEdit(category);
  }

  closeCreateForm(): void {
    this.showCreateForm = false;
    this.resetForm();
  }

  closeEditForm(): void {
    this.showEditForm = false;
    this.editingCategory = null;
    this.resetForm();
  }

  onTypeFilterChange(type: CategoryType | 'all'): void {
    const currentState = this.internalState$.value;
    this.internalState$.next({
      ...currentState,
      selectedType: type
    });

    // Recharger les données avec le filtre
    const filters = type === 'all' ? {} : { type: type };
    this.categoryFacade.loadCategories(filters).subscribe();
  }


  // Helper methods
  private createCategoryForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      type: ['secteur', [Validators.required]],
      color: ['', []],
      parent_id: [null, []]
    });
  }

  private resetForm(): void {
    this.categoryForm.reset({
      name: '',
      description: '',
      type: 'secteur',
      color: '',
      parent_id: null
    });
    this.selectedParentCategory = null;
  }

  private populateFormForEdit(category: CategoryEntity): void {
    this.categoryForm.patchValue({
      name: category.name,
      description: category.description || '',
      type: category.type,
      color: category.color,
      parent_id: category.parent_id
    });

    // Find the parent category
    this.selectedParentCategory = null;
    if (category.parent_id) {
      const currentCategories = this.categoryFacade.getCurrentCategories();
      const parentCat = currentCategories.find(cat => cat.id === category.parent_id);
      if (parentCat) {
        this.selectedParentCategory = parentCat;
      }
    }
  }

  onTypeChange(): void {
    const selectedType = this.categoryForm.get('type')?.value;
    if (selectedType && !this.categoryForm.get('color')?.value) {
      this.categoryForm.patchValue({
        color: getDefaultColorForType(selectedType)
      });
    }
  }

  selectParentCategory(category: CategoryEntity | null): void {
    this.selectedParentCategory = category;
    this.categoryForm.patchValue({
      parent_id: category?.id || null
    });
  }

  canBeParent(category: CategoryEntity): boolean {
    if (!this.editingCategory) return true;
    return category.id !== this.editingCategory.id;
  }

  getAvailableParents(): CategoryEntity[] {
    const selectedType = this.categoryForm.get('type')?.value;
    const currentCategories = this.categoryFacade.getCurrentCategories();

    return currentCategories.filter(cat =>
      cat.type === selectedType && this.canBeParent(cat)
    );
  }

  getHierarchicalPath(category: CategoryEntity): string {
    return category.full_path || category.name;
  }

  getValidationError(fieldName: string): string {
    const field = this.categoryForm.get(fieldName);
    if (field?.errors && field?.touched) {
      if (field.errors['required']) return 'Ce champ est requis';
      if (field.errors['minlength']) return 'Trop court';
      if (field.errors['maxlength']) return 'Trop long';
    }
    return '';
  }

  clearError(): void {
    this.categoryFacade.clearError();
  }

  // Hierarchical sorting method
  private sortCategoriesHierarchically(categories: CategoryEntity[]): CategoryEntity[] {
    const result: CategoryEntity[] = [];

    // Find root categories (no parent_id)
    const rootCategories = categories
      .filter(cat => !cat.parent_id)
      .sort((a, b) => a.name.localeCompare(b.name));

    // Recursively add categories and their children
    const addCategoryAndChildren = (category: CategoryEntity, depth: number = 0) => {
      const categoryWithDepth = { ...category, depth_level: depth };
      result.push(categoryWithDepth);

      const children = categories
        .filter(cat => cat.parent_id === category.id)
        .sort((a, b) => a.name.localeCompare(b.name));

      children.forEach(child => addCategoryAndChildren(child, depth + 1));
    };

    rootCategories.forEach(rootCat => addCategoryAndChildren(rootCat));
    return result;
  }

  getIndentationLevel(category: CategoryEntity): number {
    return category.depth_level || 0;
  }

  // Utility methods for template
  updateState(partialState: Partial<CategoriesState>): void {
    const currentState = this.internalState$.value;
    this.internalState$.next({
      ...currentState,
      ...partialState
    });
  }

  // Expose internal state methods for template compatibility
  getCurrentState(): CategoriesState {
    return this.internalState$.value;
  }

  // Make Array accessible for template
  Array = Array;

  // Helper methods for template
  formatCategoryType(type: CategoryType): string {
    const categoryTypeInfo = CATEGORY_TYPES.find(t => t.value === type);
    return categoryTypeInfo?.label || type;
  }

  // Additional helper methods for form validation
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control && typeof control === 'object' && 'controls' in control) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  // Getter methods for template
  get nameControl() { return this.categoryForm.get('name'); }
  get descriptionControl() { return this.categoryForm.get('description'); }
  get typeControl() { return this.categoryForm.get('type'); }
  get colorControl() { return this.categoryForm.get('color'); }
  get parentControl() { return this.categoryForm.get('parent_id'); }
}