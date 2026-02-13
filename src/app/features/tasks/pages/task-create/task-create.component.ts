import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, Observable, combineLatest, of } from 'rxjs';
import { takeUntil, catchError, map } from 'rxjs/operators';

import { TasksApiService } from '../../services/tasks-api.service';
import { ProjectsApiService } from '../../../projects/services/projects-api.service';
import { ApiService } from '../../../../core/api/api.service';
import {
  CreateTaskRequest,
  TaskStatus,
  TaskPriority,
  TaskType,
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_TYPE_OPTIONS
} from '../../../../shared/interfaces/task.interface';
import { Project } from '../../../projects/models/project.models';

@Component({
  selector: 'app-task-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">Créer une nouvelle tâche</h1>
              <p class="mt-2 text-gray-600">Remplissez les informations ci-dessous pour créer une tâche.</p>
            </div>
            <button
              type="button"
              (click)="onCancel()"
              class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg class="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
              Annuler
            </button>
          </div>
        </div>

        <!-- Form -->
        <div class="bg-white shadow-lg rounded-lg overflow-hidden">
          <form [formGroup]="taskForm" (ngSubmit)="onSubmit()">
            <!-- Form Content -->
            <div class="px-6 py-6 space-y-6">
              <!-- Project Selection -->
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label for="project_id" class="block text-sm font-medium text-gray-900 mb-2">
                    Projet <span class="text-red-500">*</span>
                  </label>
                  <select
                    id="project_id"
                    formControlName="project_id"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    [class.border-red-300]="isFieldInvalid('project_id')"
                  >
                    <option value="" disabled>Sélectionner un projet</option>
                    <option *ngFor="let project of projects$ | async" [value]="project.id">
                      {{ project.name }}
                    </option>
                  </select>
                  <div *ngIf="isFieldInvalid('project_id')" class="mt-1 text-sm text-red-600">
                    {{ getFieldError('project_id') }}
                  </div>
                </div>

                <!-- Task Type -->
                <div>
                  <label for="type" class="block text-sm font-medium text-gray-900 mb-2">
                    Type de tâche
                  </label>
                  <select
                    id="type"
                    formControlName="type"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option *ngFor="let option of taskTypeOptions" [value]="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </div>
              </div>

              <!-- Task Title -->
              <div>
                <label for="title" class="block text-sm font-medium text-gray-900 mb-2">
                  Titre de la tâche <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  formControlName="title"
                  placeholder="Entrez le titre de la tâche"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  [class.border-red-300]="isFieldInvalid('title')"
                />
                <div *ngIf="isFieldInvalid('title')" class="mt-1 text-sm text-red-600">
                  {{ getFieldError('title') }}
                </div>
              </div>

              <!-- Description -->
              <div>
                <label for="description" class="block text-sm font-medium text-gray-900 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  formControlName="description"
                  rows="4"
                  placeholder="Décrivez la tâche en détail..."
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                ></textarea>
              </div>

              <!-- Priority and Status -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="priority" class="block text-sm font-medium text-gray-900 mb-2">
                    Priorité
                  </label>
                  <select
                    id="priority"
                    formControlName="priority"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option *ngFor="let option of taskPriorityOptions" [value]="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </div>

                <div>
                  <label for="status" class="block text-sm font-medium text-gray-900 mb-2">
                    Statut initial
                  </label>
                  <select
                    id="status"
                    formControlName="status"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option *ngFor="let option of taskStatusOptions" [value]="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </div>
              </div>

              <!-- Assigned User -->
              <div>
                <label for="assigned_to" class="block text-sm font-medium text-gray-900 mb-2">
                  Assigner à
                </label>
                <select
                  id="assigned_to"
                  formControlName="assigned_to"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Non assigné</option>
                  <option *ngFor="let user of users$ | async" [value]="user.id">
                    {{ user.first_name }} {{ user.last_name }} ({{ user.email }})
                  </option>
                </select>
              </div>

              <!-- Due Date and Estimated Hours -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="due_date" class="block text-sm font-medium text-gray-900 mb-2">
                    Date d'échéance
                  </label>
                  <input
                    type="date"
                    id="due_date"
                    formControlName="due_date"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label for="estimated_hours" class="block text-sm font-medium text-gray-900 mb-2">
                    Temps estimé (heures)
                  </label>
                  <input
                    type="number"
                    id="estimated_hours"
                    formControlName="estimated_hours"
                    placeholder="Ex: 8"
                    min="0"
                    step="0.5"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <!-- Form Actions -->
            <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div *ngIf="isLoading" class="flex items-center text-blue-600">
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Création en cours...
                </div>
              </div>

              <div class="flex items-center space-x-3">
                <button
                  type="button"
                  (click)="onCancel()"
                  class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  [disabled]="isLoading"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  class="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  [disabled]="taskForm.invalid || isLoading"
                >
                  {{ isLoading ? 'Création...' : 'Créer la tâche' }}
                </button>
              </div>
            </div>
          </form>
        </div>

        <!-- Error Message -->
        <div *ngIf="errorMessage" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div class="flex items-center">
            <svg class="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-sm text-red-800">{{ errorMessage }}</span>
          </div>
        </div>

        <!-- Success Message -->
        <div *ngIf="successMessage" class="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div class="flex items-center">
            <svg class="h-5 w-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span class="text-sm text-green-800">{{ successMessage }}</span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TaskCreateComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  taskForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Data for dropdowns
  projects$: Observable<Project[]> = of([]);
  users$: Observable<any[]> = of([]);

  // Options for selects
  taskStatusOptions = TASK_STATUS_OPTIONS;
  taskPriorityOptions = TASK_PRIORITY_OPTIONS;
  taskTypeOptions = TASK_TYPE_OPTIONS;

  // Project ID from route params (if navigating from a specific project)
  projectIdFromRoute: number | null = null;

  constructor(
    private fb: FormBuilder,
    private tasksApiService: TasksApiService,
    private projectsApiService: ProjectsApiService,
    private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.taskForm = this.createForm();
    this.loadDropdownData();
  }

  ngOnInit(): void {
    // Check for project ID in route params
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      if (params['projectId']) {
        this.projectIdFromRoute = parseInt(params['projectId'], 10);
        this.taskForm.patchValue({ project_id: this.projectIdFromRoute });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      project_id: ['', Validators.required],
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
      description: [''],
      type: ['tache'],
      priority: ['normale'],
      status: ['a_faire'],
      assigned_to: [null],
      due_date: [''],
      estimated_hours: [null, [Validators.min(0)]]
    });
  }

  private loadDropdownData(): void {
    // Load projects using simple API call (as requested for projects list)
    this.projects$ = this.apiService.get('projects').pipe(
      map((response: any) => {
        // Handle API response format
        if (response?.data?.data) {
          return response.data.data;
        } else if (response?.data) {
          return Array.isArray(response.data) ? response.data : [response.data];
        }
        return [];
      }),
      catchError(error => {
        console.error('Error loading projects:', error);
        return of([]);
      })
    );

    // Load users using the same pattern as project-create component
    this.users$ = this.apiService.get('users').pipe(
      map((response: any) => {
        // Handle API response format - Structure: { success: true, data: { data: [...] } }
        let users: any[] = [];
        if (response && typeof response === 'object' && 'success' in response && response.success) {
          const responseData = (response as any).data;
          if (responseData && 'data' in responseData && Array.isArray(responseData.data)) {
            users = responseData.data;
          }
        }
        return users;
      }),
      catchError(error => {
        console.error('Error loading users:', error);
        return of([]);
      })
    );
  }

  onSubmit(): void {
    if (this.taskForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const formValue = this.taskForm.value;
    const projectId = formValue.project_id;

    // Prepare task data according to API documentation
    const taskData: any = {
      project_id: parseInt(projectId, 10),
      title: formValue.title,
      description: formValue.description || undefined,
      type: formValue.type,
      priority: formValue.priority,
      status: formValue.status,
      estimated_hours: formValue.estimated_hours || undefined,
      due_date: formValue.due_date || undefined,
      assigned_to: formValue.assigned_to ? [parseInt(formValue.assigned_to, 10)] : []
    };

    // Create task
    this.tasksApiService.createTask(projectId, taskData)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          this.isLoading = false;
          this.errorMessage = error?.message || 'Erreur lors de la création de la tâche';
          throw error;
        })
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage = 'Tâche créée avec succès!';

          // Navigate to my tasks with task detail drawer open
          setTimeout(() => {
            if (response?.data?.id) {
              this.router.navigate(['/dashboard/tasks/my-tasks'], {
                queryParams: { taskId: response.data.id }
              });
            } else {
              this.router.navigate(['/dashboard/tasks/my-tasks']);
            }
          }, 1500);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error?.message || 'Erreur lors de la création de la tâche';
        }
      });
  }

  onCancel(): void {
    // Navigate back to task list or previous page
    if (this.projectIdFromRoute) {
      this.router.navigate(['/dashboard/projects/detail', this.projectIdFromRoute]);
    } else {
      this.router.navigate(['/dashboard/tasks/my-tasks']);
    }
  }

  // Form validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.taskForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.taskForm.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    if (field.errors['required']) return 'Ce champ est requis';
    if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
    if (field.errors['maxlength']) return `Maximum ${field.errors['maxlength'].requiredLength} caractères`;
    if (field.errors['min']) return `La valeur doit être supérieure ou égale à ${field.errors['min'].min}`;
    if (field.errors['email']) return 'Format d\'email invalide';

    return 'Champ invalide';
  }

  private markFormGroupTouched(): void {
    Object.keys(this.taskForm.controls).forEach(key => {
      const control = this.taskForm.get(key);
      control?.markAsTouched();
    });
  }
}