import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthFacade } from '../auth.facade';
import { SimpleNotificationService } from '../../../shared/services/simple-notification.service';
import { LoginRequest } from '../../../domain/models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authFacade = inject(AuthFacade);
  private notificationService = inject(SimpleNotificationService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  loginForm!: FormGroup;

  // Reactive state from facade
  isLoading$: Observable<boolean> = this.authFacade.isLoading$;

  // Form field errors (for validation display)
  fieldErrors: { [key: string]: string } = {};

  ngOnInit(): void {
    this.createForm();
    this.subscribeToFormChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  private subscribeToFormChanges(): void {
    // Clear field errors when user starts typing
    this.loginForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.clearFieldErrors();
      });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const credentials: LoginRequest = this.loginForm.value;

      this.authFacade.login$(credentials)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            // Success is handled by the facade (shows success message)
            this.loginForm.reset();

            // Redirect to originally requested URL or dashboard
            const redirectUrl = sessionStorage.getItem('redirectUrl') || '/dashboard';
            sessionStorage.removeItem('redirectUrl');
            this.router.navigate([redirectUrl]);
          },
          error: (error) => {
            // Handle validation errors for field display
            if (error.code === 'VALIDATION_ERROR' && error.details?.errors) {
              // TODO: Handle validation errors if needed
              this.fieldErrors = {};
            } else {
              // Use simple notification service
              this.notificationService.showError(
                error.userMessage || 'Identifiants incorrects',
                'Erreur de connexion'
              );
            }
            // Mark form fields as touched to show validation errors
            this.markAllFieldsAsTouched();
          }
        });
    } else {
      this.markAllFieldsAsTouched();
      this.validateAllFields();
    }
  }

  // Form validation methods
  getFieldError(fieldName: string): string {
    // First check for server validation errors
    if (this.fieldErrors[fieldName]) {
      return this.fieldErrors[fieldName];
    }

    // Then check for client validation errors
    const field = this.loginForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} est requis`;
      }
      if (field.errors['email']) {
        return 'Format d\'email invalide';
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} doit contenir au moins ${field.errors['minlength'].requiredLength} caractères`;
      }
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    const hasClientError = !!(field?.invalid && field.touched);
    const hasServerError = !!this.fieldErrors[fieldName];

    return hasClientError || hasServerError;
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      email: 'L\'email',
      password: 'Le mot de passe'
    };
    return labels[fieldName] || fieldName;
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.loginForm.controls).forEach(field => {
      this.loginForm.get(field)?.markAsTouched();
    });
  }

  private validateAllFields(): void {
    Object.keys(this.loginForm.controls).forEach(fieldName => {
      const field = this.loginForm.get(fieldName);
      if (field?.invalid) {
        // This will trigger getFieldError to show validation messages
        field.markAsTouched();
      }
    });
  }

  private clearFieldErrors(): void {
    this.fieldErrors = {};
  }
}