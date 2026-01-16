/**
 * Category Facade
 * Manages category state and operations
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, of, map } from 'rxjs';

import { CategoryEntity, CreateCategoryRequest, UpdateCategoryRequest } from '../../../domain/entities/category.entity';
import { CategoryApiRepository } from '../../../infrastructure/repositories/category-api.repository';
import { MessageService } from '../../../shared/services/message.service';

@Injectable({
  providedIn: 'root'
})
export class CategoryFacade {
  private categoriesSubject = new BehaviorSubject<CategoryEntity[]>([]);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private isCreatingSubject = new BehaviorSubject<boolean>(false);
  private isUpdatingSubject = new BehaviorSubject<boolean>(false);
  private isDeletingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  // Observables
  categories$ = this.categoriesSubject.asObservable();
  isLoading$ = this.isLoadingSubject.asObservable();
  isCreating$ = this.isCreatingSubject.asObservable();
  isUpdating$ = this.isUpdatingSubject.asObservable();
  isDeleting$ = this.isDeletingSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  constructor(
    private categoryRepository: CategoryApiRepository,
    private messageService: MessageService
  ) {}

  // Load categories
  loadCategories(filters: any = {}): Observable<CategoryEntity[]> {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.categoryRepository.getCategories(filters).pipe(
      tap(categories => {
        console.log('Categories loaded in facade:', categories.length);
        this.categoriesSubject.next(categories);
        this.isLoadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error loading categories:', error);
        this.isLoadingSubject.next(false);
        this.errorSubject.next('Erreur lors du chargement des catégories');
        this.messageService.showError('Erreur lors du chargement des catégories');
        return of([]);
      })
    );
  }

  // Create category
  createCategory(request: CreateCategoryRequest): Observable<CategoryEntity | null> {
    this.isCreatingSubject.next(true);
    this.errorSubject.next(null);

    return this.categoryRepository.createCategory(request).pipe(
      tap(category => {
        this.isCreatingSubject.next(false);
        this.messageService.showSuccess('Catégorie créée avec succès');
        // Reload categories to get updated list
        this.loadCategories().subscribe();
      }),
      catchError(error => {
        console.error('Error creating category:', error);
        this.isCreatingSubject.next(false);
        this.errorSubject.next('Erreur lors de la création de la catégorie');
        this.messageService.showError('Erreur lors de la création de la catégorie');
        return of(null);
      })
    );
  }

  // Update category
  updateCategory(id: number, request: UpdateCategoryRequest): Observable<CategoryEntity | null> {
    this.isUpdatingSubject.next(true);
    this.errorSubject.next(null);

    return this.categoryRepository.updateCategory(id, request).pipe(
      tap(category => {
        this.isUpdatingSubject.next(false);
        this.messageService.showSuccess('Catégorie modifiée avec succès');
        // Reload categories to get updated list
        this.loadCategories().subscribe();
      }),
      catchError(error => {
        console.error('Error updating category:', error);
        this.isUpdatingSubject.next(false);
        this.errorSubject.next('Erreur lors de la modification de la catégorie');
        this.messageService.showError('Erreur lors de la modification de la catégorie');
        return of(null);
      })
    );
  }

  // Delete category
  deleteCategory(id: number): Observable<boolean> {
    this.isDeletingSubject.next(true);
    this.errorSubject.next(null);

    return this.categoryRepository.deleteCategory(id).pipe(
      tap(() => {
        this.isDeletingSubject.next(false);
        this.messageService.showSuccess('Catégorie supprimée avec succès');
        // Reload categories to get updated list
        this.loadCategories().subscribe();
      }),
      map(() => true),
      catchError(error => {
        console.error('Error deleting category:', error);
        this.isDeletingSubject.next(false);
        this.errorSubject.next('Erreur lors de la suppression de la catégorie');
        this.messageService.showError('Erreur lors de la suppression de la catégorie');
        return of(false);
      })
    );
  }

  // Clear error
  clearError(): void {
    this.errorSubject.next(null);
  }

  // Get current categories
  getCurrentCategories(): CategoryEntity[] {
    return this.categoriesSubject.getValue();
  }
}