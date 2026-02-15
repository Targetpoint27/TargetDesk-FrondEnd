import { Component, Input, Output, EventEmitter, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Call, Department, UpdateCallRequest } from '../../../../../domain/models/call.model';

@Component({
  selector: 'app-edit-call-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-call-modal.component.html',
  styleUrl: './edit-call-modal.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class EditCallModalComponent implements OnInit {
  @Input() call!: Call;
  @Input() departments: Department[] = [];
  @Output() onSave = new EventEmitter<UpdateCallRequest>();
  @Output() onClose = new EventEmitter<void>();

  editForm!: FormGroup;
  isSubmitting = false;

  urgencyOptions = [
    { value: 'normal', label: 'Normal' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'critique', label: 'Critique' }
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.editForm = this.fb.group({
      phone_number: [this.call.phone_number, [Validators.required]],
      caller_name: [this.call.caller_name],
      object: [this.call.object, [Validators.required]],
      summary: [this.call.summary, [Validators.required]],
      urgency: [this.call.urgency, [Validators.required]],
      department_id: [this.call.department_id, [Validators.required]]
    });
  }

  handleSubmit(): void {
    if (this.editForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.onSave.emit(this.editForm.value);
    }
  }

  handleClose(): void {
    this.onClose.emit();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.editForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.editForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Ce champ est requis';
    }
    return '';
  }
}