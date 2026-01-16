import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, Observable } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';

import { ContactEntity, ContactCivility, ContactEmailType, ContactPhoneType, CreateContactData, UpdateContactData } from '../../../domain/entities/contact.entity';
import { ContactFacade } from '../../../application/facades/contact.facade';
import { CreateContactParams } from '../../../application/use-cases/contact/create-contact.use-case';
import { ClientEntity } from '../../../domain/entities/client.entity';
import { SupplierEntity } from '../../../domain/entities/supplier.entity';
import { ClientRepository, PaginationResult } from '../../../domain/repositories/client.repository';
import { SupplierRepository } from '../../../domain/repositories/supplier.repository';

@Component({
  selector: 'app-contact-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './contact-form-modal.component.html',
  styleUrls: ['./contact-form-modal.component.scss']
})
export class ContactFormModalComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isOpen = false;
  @Input() contact: ContactEntity | null = null; // Pour l'édition
  @Input() entityId: number | null = null; // ID du client ou fournisseur
  @Input() entityType: 'client' | 'supplier' | null = null; // Type d'entité

  @Output() close = new EventEmitter<void>();
  @Output() contactCreated = new EventEmitter<ContactEntity>();
  @Output() contactUpdated = new EventEmitter<ContactEntity>();

  private destroy$ = new Subject<void>();

  contactForm: FormGroup;
  isLoading = false;
  error: string | null = null;


  // Options pour les selects
  civilityOptions: { value: ContactCivility; label: string }[] = [
    { value: 'M.', label: 'M.' },
    { value: 'Mme', label: 'Mme' },
    { value: 'Dr.', label: 'Dr.' },
    { value: 'Prof.', label: 'Prof.' },
    { value: 'Maître', label: 'Maître' }
  ];

  emailTypeOptions: { value: ContactEmailType; label: string }[] = [
    { value: 'professionnel', label: 'Professionnel' },
    { value: 'personnel', label: 'Personnel' }
  ];

  phoneTypeOptions: { value: ContactPhoneType; label: string }[] = [
    { value: 'bureau', label: 'Bureau' },
    { value: 'mobile', label: 'Mobile' },
    { value: 'fax', label: 'Fax' },
    { value: 'autre', label: 'Autre' }
  ];

  // Observables pour les listes
  clients$: Observable<ClientEntity[]>;
  suppliers$: Observable<SupplierEntity[]>;

  constructor(
    private fb: FormBuilder,
    private contactFacade: ContactFacade,
    private clientRepository: ClientRepository,
    private supplierRepository: SupplierRepository
  ) {
    this.contactForm = this.createForm();

    // Charger la liste des clients et fournisseurs
    this.clients$ = this.clientRepository.getAll().pipe(
      map((result: PaginationResult<ClientEntity>) => result.items || [])
    );
    this.suppliers$ = this.supplierRepository.getAll().pipe(
      map((result: PaginationResult<SupplierEntity>) => result.items || [])
    );
  }

  ngOnInit(): void {
    if (this.contact) {
      this.populateFormForEdit();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contact']) {
      if (this.contact) {
        this.populateFormForEdit();
        this.updateEntityValidators();
      } else {
        this.resetForm();
        this.updateEntityValidators();
      }
    }

    // Reset form when opening for new contact creation
    if (changes['isOpen'] && changes['isOpen'].currentValue && !changes['isOpen'].previousValue) {
      if (!this.contact) {
        this.resetForm();
        this.updateEntityValidators();
      } else {
        this.populateFormForEdit();
        this.updateEntityValidators();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isEditMode(): boolean {
    return this.contact !== null;
  }

  get modalTitle(): string {
    return this.isEditMode ? 'Modifier le contact' : 'Nouveau contact';
  }

  get submitButtonText(): string {
    return this.isEditMode ? 'Modifier' : 'Ajouter';
  }

  get showEntitySelection(): boolean {
    return !this.isEditMode && (!this.entityId || !this.entityType);
  }


  get emails(): FormArray {
    return this.contactForm.get('emails') as FormArray;
  }

  get phones(): FormArray {
    return this.contactForm.get('phones') as FormArray;
  }

  // Création du formulaire
  private createForm(): FormGroup {
    const form = this.fb.group({
      entityType: [this.entityType || ''],
      entityId: [this.entityId || null],
      civility: [''],
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      last_name: ['', [Validators.required, Validators.minLength(2)]],
      function: [''],
      department: [''],
      emails: this.fb.array([this.createEmailFormGroup()], [Validators.minLength(1)]),
      phones: this.fb.array([])
    });

    this.updateEntityValidators(form);

    return form;
  }

  private updateEntityValidators(form: FormGroup = this.contactForm): void {
    if (!form) return;

    const entityTypeControl = form.get('entityType');
    const entityIdControl = form.get('entityId');

    // En mode édition, les champs entité ne sont pas requis car ils ne sont pas affichés
    if (this.isEditMode) {
      entityTypeControl?.clearValidators();
      entityIdControl?.clearValidators();
    } else {
      // En mode création, ajouter les validateurs seulement si la sélection est nécessaire
      if (!this.entityId || !this.entityType) {
        entityTypeControl?.setValidators([Validators.required]);
        entityIdControl?.setValidators([Validators.required]);
      } else {
        entityTypeControl?.clearValidators();
        entityIdControl?.clearValidators();
      }
    }

    entityTypeControl?.updateValueAndValidity();
    entityIdControl?.updateValueAndValidity();
  }

  private createEmailFormGroup(email?: { email: string; type: ContactEmailType; is_primary: boolean }): FormGroup {
    return this.fb.group({
      email: [email?.email || '', [Validators.required, Validators.email]],
      type: [email?.type || 'professionnel'],
      is_primary: [email?.is_primary || false]
    });
  }

  private createPhoneFormGroup(phone?: { phone: string; type: ContactPhoneType; is_primary: boolean }): FormGroup {
    return this.fb.group({
      phone: [phone?.phone || '', [Validators.required]],
      type: [phone?.type || 'bureau'],
      is_primary: [phone?.is_primary || false]
    });
  }

  // Gestion des emails
  addEmail(): void {
    this.emails.push(this.createEmailFormGroup());
  }

  removeEmail(index: number): void {
    if (this.emails.length > 1) {
      this.emails.removeAt(index);
      this.ensureOnePrimaryEmail();
    }
  }

  onEmailPrimaryChange(index: number): void {
    // Désélectionner les autres emails principaux
    for (let i = 0; i < this.emails.length; i++) {
      if (i !== index) {
        this.emails.at(i).get('is_primary')?.setValue(false);
      }
    }
  }

  private ensureOnePrimaryEmail(): void {
    const hasPrimary = this.emails.controls.some(control => control.get('is_primary')?.value);
    if (!hasPrimary && this.emails.length > 0) {
      this.emails.at(0).get('is_primary')?.setValue(true);
    }
  }

  // Gestion des téléphones
  addPhone(): void {
    this.phones.push(this.createPhoneFormGroup());
  }

  removePhone(index: number): void {
    this.phones.removeAt(index);
    this.ensureOnePrimaryPhone();
  }

  onPhonePrimaryChange(index: number): void {
    // Désélectionner les autres téléphones principaux
    for (let i = 0; i < this.phones.length; i++) {
      if (i !== index) {
        this.phones.at(i).get('is_primary')?.setValue(false);
      }
    }
  }

  private ensureOnePrimaryPhone(): void {
    const hasPrimary = this.phones.controls.some(control => control.get('is_primary')?.value);
    if (!hasPrimary && this.phones.length > 0) {
      this.phones.at(0).get('is_primary')?.setValue(true);
    }
  }

  // Populate form pour l'édition
  private populateFormForEdit(): void {
    if (!this.contact) return;

    // Informations de base
    const basicData = {
      civility: this.contact.civility || '',
      first_name: this.contact.first_name,
      last_name: this.contact.last_name,
      function: this.contact['function'] || '',
      department: this.contact.department || ''
    };

    this.contactForm.patchValue(basicData);

    // Emails
    this.emails.clear();

    if (this.contact.emails && this.contact.emails.length > 0) {
      this.contact.emails.forEach((email) => {
        this.emails.push(this.createEmailFormGroup({
          email: email.email,
          type: email.type,
          is_primary: email.is_primary
        }));
      });
    } else {
      this.addEmail();
    }

    // Téléphones
    this.phones.clear();

    if (this.contact.phones && this.contact.phones.length > 0) {
      this.contact.phones.forEach((phone) => {
        this.phones.push(this.createPhoneFormGroup({
          phone: phone.phone,
          type: phone.type,
          is_primary: phone.is_primary
        }));
      });
    }

    // S'assurer qu'il y a au moins un email
    if (this.emails.length === 0) {
      this.addEmail();
    }
  }

  // Validation et soumission
  onSubmit(): void {
    if (this.contactForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    // S'assurer qu'il y a au moins un email principal
    this.ensureOnePrimaryEmail();

    // S'assurer qu'il y a au plus un téléphone principal
    if (this.phones.length > 0) {
      this.ensureOnePrimaryPhone();
    }

    const formData = this.contactForm.value;

    if (this.isEditMode && this.contact) {
      this.updateContact(formData);
    } else {
      this.createContact(formData);
    }
  }

  onEntityTypeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const entityType = target.value;

    // Réinitialiser entityId quand le type change
    this.contactForm.patchValue({
      entityType: entityType,
      entityId: null
    });
  }

  private createContact(formData: any): void {
    // Utiliser les valeurs du formulaire ou les props si prédéfinies
    const entityId = formData.entityId || this.entityId;
    const entityType = formData.entityType || this.entityType;

    if (!entityId || !entityType) {
      this.error = 'Veuillez sélectionner un client ou fournisseur';
      return;
    }

    this.isLoading = true;
    this.error = null;

    const contactData: CreateContactData = {
      civility: formData.civility || undefined,
      first_name: formData.first_name,
      last_name: formData.last_name,
      function: formData.function || undefined,
      department: formData.department || undefined,
      emails: formData.emails,
      phones: formData.phones.length > 0 ? formData.phones : undefined
    };

    const params: CreateContactParams = {
      entityId: entityId,
      entityType: entityType,
      contactData
    };

    this.contactFacade.createContact(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (contact) => {
          this.isLoading = false;
          this.contactCreated.emit(contact);
          this.onClose();
        },
        error: (error) => {
          this.isLoading = false;
          this.error = error.message || 'Erreur lors de la création du contact';
        }
      });
  }

  private updateContact(formData: any): void {
    if (!this.contact) return;

    this.isLoading = true;
    this.error = null;

    const updateData: UpdateContactData = {
      id: this.contact.id,
      civility: formData.civility || undefined,
      first_name: formData.first_name,
      last_name: formData.last_name,
      function: formData.function || undefined,
      department: formData.department || undefined,
      emails: formData.emails,
      phones: formData.phones.length > 0 ? formData.phones : undefined
    };

    this.contactFacade.updateContact(this.contact.id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (contact) => {
          this.isLoading = false;
          this.contactUpdated.emit(contact);
          this.onClose();
        },
        error: (error) => {
          this.isLoading = false;
          this.error = error.message || 'Erreur lors de la modification du contact';
        }
      });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.contactForm.controls).forEach(key => {
      const control = this.contactForm.get(key);
      control?.markAsTouched();

      if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          if (arrayControl instanceof FormGroup) {
            Object.keys(arrayControl.controls).forEach(subKey => {
              arrayControl.get(subKey)?.markAsTouched();
            });
          }
        });
      }
    });
  }

  // Méthodes utilitaires pour la validation
  isFieldInvalid(fieldName: string): boolean {
    const field = this.contactForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.contactForm.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    if (field.errors['required']) return 'Ce champ est requis';
    if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
    if (field.errors['email']) return 'Format d\'email invalide';
    if (field.errors['pattern']) return 'Format invalide';

    return 'Champ invalide';
  }

  isEmailInvalid(index: number, fieldName: string): boolean {
    const emailControl = this.emails.at(index);
    const field = emailControl.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getEmailError(index: number, fieldName: string): string {
    const emailControl = this.emails.at(index);
    const field = emailControl.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    if (field.errors['required']) return 'Email requis';
    if (field.errors['email']) return 'Format d\'email invalide';

    return 'Champ invalide';
  }

  isPhoneInvalid(index: number, fieldName: string): boolean {
    const phoneControl = this.phones.at(index);
    const field = phoneControl.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getPhoneError(index: number, fieldName: string): string {
    const phoneControl = this.phones.at(index);
    const field = phoneControl.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    if (field.errors['required']) return 'Téléphone requis';
    if (field.errors['pattern']) return 'Format de téléphone français invalide (ex: 0123456789)';

    return 'Champ invalide';
  }

  // Gestion de la modal
  private resetForm(): void {
    this.contactForm.reset();
    this.error = null;
    this.isLoading = false;

    // Réinitialiser les FormArrays
    this.emails.clear();
    this.phones.clear();
    this.addEmail(); // Ajouter un email par défaut
  }

  onClose(): void {
    this.resetForm();
    this.close.emit();
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  preventDefault(event: Event): void {
    event.stopPropagation();
  }
}