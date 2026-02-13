import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ComplaintCategory, ComplaintSeverity } from '../../../domain/models/complaint.model';

@Component({
  selector: 'app-create-complaint-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './create-complaint-modal.component.html',
  styleUrl: './create-complaint-modal.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class CreateComplaintModalComponent {
  @Input() callId!: number;
  @Input() clientId?: number | null;
  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<any>();

  complaintForm: FormGroup;

  categories: { value: ComplaintCategory; label: string }[] = [
    { value: 'service_insatisfaisant', label: 'Service Insatisfaisant' },
    { value: 'produit_defectueux', label: 'Produit Défectueux' },
    { value: 'livraison_retard', label: 'Retard de Livraison' },
    { value: 'facturation_erronee', label: 'Erreur de Facturation' },
    { value: 'comportement_personnel', label: 'Comportement Personnel' },
    { value: 'autre', label: 'Autre' }
  ];

  severities: { value: ComplaintSeverity; label: string }[] = [
    { value: 'faible', label: 'Faible' },
    { value: 'moyen', label: 'Moyen' },
    { value: 'eleve', label: 'Élevé' },
    { value: 'critique', label: 'Critique' }
  ];

  constructor(private fb: FormBuilder) {
    this.complaintForm = this.fb.group({
      category: ['', Validators.required],
      severity: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  onSubmit() {
    if (this.complaintForm.valid) {
      this.submit.emit({
        ...this.complaintForm.value,
        call_id: this.callId,
        client_id: this.clientId
      });
    }
  }
}