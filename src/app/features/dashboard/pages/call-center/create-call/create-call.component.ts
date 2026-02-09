import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

import { CallFacade } from '../../../call-center/calls/call.facade';
import { CreateCallRequest, CallType, Department } from '../../../../../domain/models/call.model';
import { ApiService } from '../../../../../core/api/api.service';

interface Client {
  id: number;
  client_id: string;
  name: string;
  email: string;
  phone: string;
}

@Component({
  selector: 'app-create-call',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-call.component.html',
  styleUrl: './create-call.component.scss'
})
export class CreateCallComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  callForm: FormGroup;

  departments: Department[] = [];
  clients: Client[] = [];
  filteredClients: Client[] = [];

  isLoadingDepartments = false;
  isSearchingClients = false;
  isSubmitting = false;

  showClientDropdown = false;
  selectedClient: Client | null = null;

  readonly callTypes: { value: CallType; label: string }[] = [
    { value: 'entrant', label: 'Entrant' },
    { value: 'sortant', label: 'Sortant' }
  ];

  readonly urgencyLevels = [
    { value: 'normal', label: 'Normal', color: 'blue' },
    { value: 'urgent', label: 'Urgent', color: 'orange' },
    { value: 'critique', label: 'Critique', color: 'red' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private callFacade: CallFacade,
    private apiService: ApiService
  ) {
    this.callForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadDepartments();
    this.setupClientSearch();
    this.setupCallTypeValidation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      type: ['entrant', [Validators.required]],
      phone_number: ['', [Validators.required, Validators.pattern(/^[0-9+\s()-]+$/)]],
      caller_name: [''],
      caller_email: ['', [Validators.email]],
      department_id: [null, [Validators.required]],
      custom_motif: [''],
      outbound_reason: [''],
      call_result: [''],
      call_duration_seconds: [null],
      object: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      summary: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
      urgency: ['normal'],
      client_id: [null],
      client_search: ['']
    });
  }

  private setupCallTypeValidation(): void {
    this.callForm.get('type')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(type => {
        const outboundReasonControl = this.callForm.get('outbound_reason');
        
        if (type === 'sortant') {
          outboundReasonControl?.setValidators([Validators.required]);
        } else {
          outboundReasonControl?.clearValidators();
        }
        outboundReasonControl?.updateValueAndValidity();
      });
  }

  private loadDepartments(): void {
    this.isLoadingDepartments = true;
    
    this.apiService.get<any>('/admin/departments')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.departments = response.data || [];
          this.isLoadingDepartments = false;
        },
        error: (error) => {
          console.error('Error loading departments:', error);
          this.isLoadingDepartments = false;
        }
      });
  }

  private setupClientSearch(): void {
    this.callForm.get('client_search')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => {
          if (!query || query.length < 2) {
            this.filteredClients = [];
            this.showClientDropdown = false;
            return of({ data: { clients: [] } });
          }

          this.isSearchingClients = true;
          this.showClientDropdown = true;
          return this.apiService.get<any>('/clients', {
            params: { search: query, per_page: 10 }
          });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.filteredClients = response.data?.clients || [];
          this.isSearchingClients = false;
        },
        error: (error) => {
          console.error('Error searching clients:', error);
          this.isSearchingClients = false;
          this.filteredClients = [];
        }
      });
  }

  selectClient(client: Client): void {
    this.selectedClient = client;
    this.callForm.patchValue({
      client_id: client.id,
      client_search: client.name,
      caller_name: client.name,
      caller_email: client.email,
      phone_number: client.phone
    });
    this.showClientDropdown = false;
  }

  clearClient(): void {
    this.selectedClient = null;
    this.callForm.patchValue({
      client_id: null,
      client_search: ''
    });
  }

    onSubmit(): void {
    if (this.callForm.invalid) {
        this.markFormGroupTouched(this.callForm);
        return;
    }

    const formValue = this.callForm.value;
    
    const request: CreateCallRequest = {
        type: formValue.type,
        phone_number: formValue.phone_number,
        caller_name: formValue.caller_name || undefined,
        caller_email: formValue.caller_email || undefined,
        client_id: formValue.client_id || undefined,
        department_id: formValue.department_id,
        object: formValue.object,
        summary: formValue.summary,
        urgency: formValue.urgency
    };

    if (formValue.type === 'sortant') {
        request.outbound_reason = formValue.outbound_reason;
        if (formValue.call_result) request.call_result = formValue.call_result;
        if (formValue.call_duration_seconds) request.call_duration_seconds = formValue.call_duration_seconds;
    } else {
        if (formValue.custom_motif) request.custom_motif = formValue.custom_motif;
    }

    this.isSubmitting = true;

    this.callFacade.createCall(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
        next: (call) => {
            if (call) {
            // Navigate back to dashboard instead of to call details
            this.router.navigate(['/dashboard/call-center/dashboard']);
            }
            this.isSubmitting = false;
        },
        error: (error) => {
            console.error('Error creating call:', error);
            this.isSubmitting = false;
        }
        });
    }

  onCancel(): void {
    this.router.navigate(['/dashboard/call-center']);
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

  isFieldInvalid(fieldName: string): boolean {
    const field = this.callForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.callForm.get(fieldName);
    if (field?.errors && field?.touched) {
      if (field.errors['required']) return 'Ce champ est requis';
      if (field.errors['email']) return 'Email invalide';
      if (field.errors['pattern']) return 'Format invalide';
      if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
      if (field.errors['maxlength']) return `Maximum ${field.errors['maxlength'].requiredLength} caractères`;
    }
    return '';
  }

  get typeControl() { return this.callForm.get('type'); }
  get phoneControl() { return this.callForm.get('phone_number'); }
  get callerNameControl() { return this.callForm.get('caller_name'); }
  get callerEmailControl() { return this.callForm.get('caller_email'); }
  get departmentControl() { return this.callForm.get('department_id'); }
  get customMotifControl() { return this.callForm.get('custom_motif'); }
  get objectControl() { return this.callForm.get('object'); }
  get summaryControl() { return this.callForm.get('summary'); }
  get urgencyControl() { return this.callForm.get('urgency'); }
  get clientSearchControl() { return this.callForm.get('client_search'); }
}