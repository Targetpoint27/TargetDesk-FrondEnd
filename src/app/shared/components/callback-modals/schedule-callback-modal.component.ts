import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Call, ScheduleCallbackRequest } from '../../../domain/models/call.model';

@Component({
  selector: 'app-schedule-callback-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './schedule-callback-modal.component.html',
  styleUrl: './schedule-callback-modal.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class ScheduleCallbackModalComponent {
  @Input() call!: Call;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<ScheduleCallbackRequest>();

  scheduleForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.scheduleForm = this.fb.group({
      date: ['', Validators.required],
      time: ['', Validators.required],
      reason: ['', Validators.required],
      notes: ['']
    });
  }

  handleClose() {
    this.onClose.emit();
  }

  handleSubmit() {
    if (this.scheduleForm.valid) {
      this.onSubmit.emit(this.scheduleForm.value);
    }
  }
}