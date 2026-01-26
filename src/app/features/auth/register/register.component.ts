import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthFacade } from '../auth.facade';
import { MessageService } from '../../../shared/services/message.service';
import { RegisterRequest } from '../../../domain/models/auth.models';

// Custom validator pour vérifier que les mots de passe correspondent
function passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
  const password = control.get('password');
  const confirmPassword = control.get('password_confirmation');

  if (!password || !confirmPassword) {
    return null;
  }

  return password.value === confirmPassword.value ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authFacade = inject(AuthFacade);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  registerForm!: FormGroup;

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
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', [Validators.required]]
    }, { validators: passwordMatchValidator });
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      const userData: RegisterRequest = this.registerForm.value;

      this.authFacade.register$(userData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            // Success is handled by the facade (shows success message)
            this.registerForm.reset();

            // Optional: Additional success handling for email verification
            if (result.requiresEmailVerification) {
              this.messageService.showInfo(
                'Un email de vérification a été envoyé à votre adresse. Veuillez vérifier votre boîte mail.',
                {
                  title: 'Vérification requise',
                  duration: 10000
                }
              );
            }

            // Redirect to dashboard after successful registration
            this.router.navigate(['/dashboard']);
          },
          error: (error) => {
            // Handle validation errors for field display
            if (error.code === 'VALIDATION_ERROR' && error.details?.errors) {
              this.fieldErrors = this.messageService.extractValidationErrors(error.details.errors);
              this.messageService.showError('Veuillez corriger les erreurs de validation', {
                title: 'Erreurs de validation',
                duration: 6000
              });
            } else {
              // Show error toast directly in component
              this.messageService.showError(error.userMessage || 'Erreur lors de l\'inscription', {
                title: 'Erreur d\'inscription',
                duration: 8000
              });
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

  private subscribeToFormChanges(): void {
    // Clear field errors when user starts typing (but only if they have server errors)
    this.registerForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Only clear field errors if user is actively typing (not on form reset)
        if (Object.keys(this.fieldErrors).length > 0) {
          setTimeout(() => this.clearFieldErrors(), 100); // Small delay to prevent immediate clear
        }
      });

  }

  getFieldError(fieldName: string): string {
    // First check for server validation errors
    if (this.fieldErrors[fieldName]) {
      return this.fieldErrors[fieldName];
    }

    // Then check for client validation errors
    const field = this.registerForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} est requis`;
      }
      if (field.errors['email']) {
        return 'Format d\'email invalide';
      }
      if (field.errors['minlength']) {
        const requiredLength = field.errors['minlength'].requiredLength;
        return `${this.getFieldLabel(fieldName)} doit contenir au moins ${requiredLength} caractères`;
      }
    }

    // Erreur de correspondance des mots de passe
    if (fieldName === 'password_confirmation' && this.registerForm.errors?.['passwordMismatch'] && field?.touched) {
      return 'Les mots de passe ne correspondent pas';
    }

    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      name: 'Le nom',
      email: 'L\'email',
      password: 'Le mot de passe',
      password_confirmation: 'La confirmation du mot de passe'
    };
    return labels[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    const hasClientError = !!(field?.invalid && field.touched);
    const hasServerError = !!this.fieldErrors[fieldName];
    const hasPasswordMismatch = fieldName === 'password_confirmation' &&
                               this.registerForm.errors?.['passwordMismatch'] &&
                               field?.touched;

    return hasClientError || hasServerError || hasPasswordMismatch;
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.registerForm.controls).forEach(field => {
      this.registerForm.get(field)?.markAsTouched();
    });
  }

  private validateAllFields(): void {
    Object.keys(this.registerForm.controls).forEach(fieldName => {
      const field = this.registerForm.get(fieldName);
      if (field?.invalid) {
        field.markAsTouched();
      }
    });
  }

  private clearFieldErrors(): void {
    this.fieldErrors = {};
  }
}