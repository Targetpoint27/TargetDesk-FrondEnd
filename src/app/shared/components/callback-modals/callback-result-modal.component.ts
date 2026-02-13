import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Call, CallbackResultRequest } from '../../../domain/models/call.model';

@Component({
  selector: 'app-callback-result-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './callback-result-modal.component.html',
  styleUrl: './callback-result-modal.component.scss',
  encapsulation: ViewEncapsulation.None

})
export class CallbackResultModalComponent {
  @Input() call!: Call;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<CallbackResultRequest>();

  resultForm: FormGroup;

  results = [
    { value: 'contacte', label: 'Joint / Contacté' },
    { value: 'messagerie', label: 'Messagerie vocale' },
    { value: 'pas_de_reponse', label: 'Pas de réponse' }
  ];

  constructor(private fb: FormBuilder) {
    this.resultForm = this.fb.group({
      call_result: ['', Validators.required],
      summary: ['', [Validators.required, Validators.minLength(5)]],
      reschedule_date: [''],
      reschedule_time: ['']
    });

    this.resultForm.get('call_result')?.valueChanges.subscribe(val => {
      const dateCtrl = this.resultForm.get('reschedule_date');
      const timeCtrl = this.resultForm.get('reschedule_time');
      
      if (val !== 'contacte') {
        dateCtrl?.setValidators([Validators.required]);
        timeCtrl?.setValidators([Validators.required]);
      } else {
        dateCtrl?.clearValidators();
        timeCtrl?.clearValidators();
      }
      dateCtrl?.updateValueAndValidity();
      timeCtrl?.updateValueAndValidity();
    });
  }

  handleClose() {
    this.onClose.emit();
  }

  handleSubmit() {
    if (this.resultForm.valid) {
      this.onSubmit.emit(this.resultForm.value);
    }
  }
}