import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Call, CloseCallRequest } from '../../../../../domain/models/call.model';

@Component({
  selector: 'app-close-call-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './close-call-modal.component.html',
  styleUrl: './close-call-modal.component.scss'
})
export class CloseCallModalComponent implements OnInit {
  @Input() call!: Call;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<CloseCallRequest>();

  closeForm!: FormGroup;
  isSubmitting = false;

  finalResultOptions = [
    { value: 'resolu_satisfait', label: 'Résolu - Client Satisfait', icon: '😊', color: 'text-green-600' },
    { value: 'resolu_insatisfait', label: 'Résolu - Client Insatisfait', icon: '😐', color: 'text-yellow-600' },
    { value: 'transfere', label: 'Transféré', icon: '↗️', color: 'text-blue-600' },
    { value: 'non_resolu', label: 'Non Résolu', icon: '❌', color: 'text-red-600' }
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.closeForm = this.fb.group({
      resolution_summary: ['', [Validators.required, Validators.minLength(10)]],
      final_result: ['', [Validators.required]]
    });
  }

    handleSubmit(): void {
    if (this.closeForm.valid && !this.isSubmitting) {
        this.isSubmitting = true;
        
        const closeData: CloseCallRequest = {
        resolution_summary: this.closeForm.value.resolution_summary,
        final_result: this.closeForm.value.final_result as CloseCallRequest['final_result']
        };
        
        this.onSubmit.emit(closeData);
    }
    }

  handleClose(): void {
    this.onClose.emit();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.closeForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.closeForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Ce champ est requis';
      if (field.errors['minlength']) return 'Minimum 10 caractères requis';
    }
    return '';
  }
}