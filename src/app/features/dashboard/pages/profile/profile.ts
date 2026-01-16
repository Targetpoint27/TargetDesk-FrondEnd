/**
 * Profile Page Component
 * User profile management and settings
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, Subject, takeUntil } from 'rxjs';

import { AuthFacade } from '../../../auth/auth.facade';
import { UserEntity } from '../../../../domain/entities/user.entity';
import { MessageService } from '../../../../shared/services/message.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class ProfileComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Observables
  currentUser$: Observable<UserEntity | null>;

  // Forms
  profileForm: FormGroup;
  passwordForm: FormGroup;

  // UI State
  isEditingProfile = false;
  isUpdatingProfile = false;
  isUpdatingPassword = false;
  showPasswordForm = false;

  constructor(
    private authFacade: AuthFacade,
    private fb: FormBuilder,
    private messageService: MessageService
  ) {
    this.currentUser$ = this.authFacade.user$;
    this.profileForm = this.createProfileForm();
    this.passwordForm = this.createPasswordForm();
  }

  ngOnInit(): void {
    // Load user data into form
    this.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      if (user) {
        this.profileForm.patchValue({
          firstName: user.getFirstName(),
          lastName: user.getLastName(),
          email: user.email,
          phone: '',
          company: '',
          position: ''
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Profile management
  onEditProfile(): void {
    this.isEditingProfile = true;
  }

  onCancelEditProfile(): void {
    this.isEditingProfile = false;
    // Reset form to original values
    this.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.profileForm.patchValue({
          firstName: user.getFirstName(),
          lastName: user.getLastName(),
          email: user.email,
          phone: '',
          company: '',
          position: ''
        });
      }
    });
  }

  onSaveProfile(): void {
    if (this.profileForm.valid) {
      this.isUpdatingProfile = true;

      // TODO: Implement profile update API call
      setTimeout(() => {
        this.messageService.showSuccess('Profil mis à jour avec succès', {
          title: 'Profil modifié',
          duration: 4000
        });
        this.isUpdatingProfile = false;
        this.isEditingProfile = false;
      }, 1000);
    } else {
      this.markFormGroupTouched(this.profileForm);
    }
  }

  // Password management
  onShowPasswordForm(): void {
    this.showPasswordForm = true;
    this.passwordForm.reset();
  }

  onHidePasswordForm(): void {
    this.showPasswordForm = false;
    this.passwordForm.reset();
  }

  onChangePassword(): void {
    if (this.passwordForm.valid) {
      this.isUpdatingPassword = true;

      // TODO: Implement password change API call
      setTimeout(() => {
        this.messageService.showSuccess('Mot de passe modifié avec succès', {
          title: 'Sécurité mise à jour',
          duration: 4000
        });
        this.isUpdatingPassword = false;
        this.showPasswordForm = false;
        this.passwordForm.reset();
      }, 1000);
    } else {
      this.markFormGroupTouched(this.passwordForm);
    }
  }

  // Form helpers
  private createProfileForm(): FormGroup {
    return this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[\d\s\-\+\(\)\.]{8,20}$/)]],
      company: ['', [Validators.maxLength(100)]],
      position: ['', [Validators.maxLength(100)]]
    });
  }

  private createPasswordForm(): FormGroup {
    return this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(50)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');

    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control && typeof control === 'object' && 'controls' in control) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  // Getters for template
  get firstNameControl() { return this.profileForm.get('firstName'); }
  get lastNameControl() { return this.profileForm.get('lastName'); }
  get emailControl() { return this.profileForm.get('email'); }
  get phoneControl() { return this.profileForm.get('phone'); }
  get companyControl() { return this.profileForm.get('company'); }
  get positionControl() { return this.profileForm.get('position'); }

  get currentPasswordControl() { return this.passwordForm.get('currentPassword'); }
  get newPasswordControl() { return this.passwordForm.get('newPassword'); }
  get confirmPasswordControl() { return this.passwordForm.get('confirmPassword'); }

  // Helper methods for template
  getValidationError(controlName: string, formType: 'profile' | 'password' = 'profile'): string | null {
    const form = formType === 'profile' ? this.profileForm : this.passwordForm;
    const control = form.get(controlName);

    if (control && control.touched && control.errors) {
      if (control.errors['required']) {
        return 'Ce champ est obligatoire';
      }
      if (control.errors['email']) {
        return 'Email invalide';
      }
      if (control.errors['minlength']) {
        return `Minimum ${control.errors['minlength'].requiredLength} caractères`;
      }
      if (control.errors['maxlength']) {
        return `Maximum ${control.errors['maxlength'].requiredLength} caractères`;
      }
      if (control.errors['pattern']) {
        return 'Format invalide';
      }
      if (control.errors['passwordMismatch']) {
        return 'Les mots de passe ne correspondent pas';
      }
    }
    return null;
  }

  getUserInitials(user: UserEntity | null): string {
    if (!user) return 'U';
    return user.getInitials();
  }

  formatDate(date: Date | null): string {
    if (!date) return '-';
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}