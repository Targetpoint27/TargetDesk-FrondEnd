// ========================================
// COMPOSANT FORMULAIRE DE PROJET
// Création et modification de projets
// ========================================

import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectRiskIndicator,
  ProjectClientType,
  ExternalClientInfo,
  RISK_LEVEL_LABELS,
  CLIENT_TYPE_LABELS
} from '../../models/project.models';
import { UserEntity } from '../../../../domain/entities/user.entity';
import { ClientEntity } from '../../../../domain/entities/client.entity';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="project-form">
      <form [formGroup]="projectForm" (ngSubmit)="handleSubmit()" class="space-y-6">
        <!-- En-tête du formulaire -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900">
              {{ isEditMode() ? 'Modifier le projet' : 'Nouveau projet' }}
            </h2>
            @if (project && project.code) {
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 font-mono">
                {{ project.code }}
              </span>
            }
          </div>

          <!-- Messages d'erreur globaux -->
          @if (errorMessage()) {
            <div class="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div class="flex">
                <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <div class="ml-3">
                  <p class="text-sm text-red-800">{{ errorMessage() }}</p>
                </div>
              </div>
            </div>
          }

          <!-- Informations de base -->
          <div class="space-y-6">
            <h3 class="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Informations générales</h3>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Nom du projet -->
              <div class="lg:col-span-2">
                <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
                  Nom du projet *
                </label>
                <input
                  type="text"
                  id="name"
                  formControlName="name"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Saisir le nom du projet..."
                  [class.border-red-500]="isFieldInvalid('name')"
                >
                @if (isFieldInvalid('name')) {
                  <p class="mt-1 text-sm text-red-600">Le nom du projet est obligatoire</p>
                }
              </div>

              <!-- Département -->
              <div>
                <label for="department" class="block text-sm font-medium text-gray-700 mb-2">
                  Département *
                </label>
                <select
                  id="department"
                  formControlName="department"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  [class.border-red-500]="isFieldInvalid('department')"
                >
                  <option value="">Sélectionner un département</option>
                  @for (dept of departmentOptions; track dept) {
                    <option [value]="dept">{{ dept }}</option>
                  }
                </select>
                @if (isFieldInvalid('department')) {
                  <p class="mt-1 text-sm text-red-600">Le département est obligatoire</p>
                }
              </div>

              <!-- Chef de projet -->
              <div>
                <label for="project_manager_id" class="block text-sm font-medium text-gray-700 mb-2">
                  Chef de projet *
                </label>
                <select
                  id="project_manager_id"
                  formControlName="project_manager_id"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  [class.border-red-500]="isFieldInvalid('project_manager_id')"
                >
                  <option value="">Sélectionner un chef de projet</option>
                  @for (manager of availableManagers || []; track manager.id) {
                    <option [value]="manager.id">{{ getManagerDisplayName(manager) }}</option>
                  }
                </select>
                @if (isFieldInvalid('project_manager_id')) {
                  <p class="mt-1 text-sm text-red-600">Le chef de projet est obligatoire</p>
                }
              </div>

              <!-- Dates -->
              <div>
                <label for="start_date" class="block text-sm font-medium text-gray-700 mb-2">
                  Date de début *
                </label>
                <input
                  type="date"
                  id="start_date"
                  formControlName="start_date"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  [class.border-red-500]="isFieldInvalid('start_date')"
                >
                @if (isFieldInvalid('start_date')) {
                  <p class="mt-1 text-sm text-red-600">La date de début est obligatoire</p>
                }
              </div>

              <div>
                <label for="planned_end_date" class="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin prévue *
                </label>
                <input
                  type="date"
                  id="planned_end_date"
                  formControlName="planned_end_date"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  [class.border-red-500]="isFieldInvalid('planned_end_date')"
                >
                @if (isFieldInvalid('planned_end_date')) {
                  <p class="mt-1 text-sm text-red-600">La date de fin est obligatoire</p>
                }
                @if (projectForm.hasError('endDateBeforeStart', 'planned_end_date')) {
                  <p class="mt-1 text-sm text-red-600">La date de fin doit être postérieure à la date de début</p>
                }
              </div>

              <!-- Indicateur de risque -->
              <div>
                <label for="risk_indicator" class="block text-sm font-medium text-gray-700 mb-2">
                  Niveau de risque
                </label>
                <select
                  id="risk_indicator"
                  formControlName="risk_indicator"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  @for (risk of riskOptions; track risk.value) {
                    <option [value]="risk.value">{{ risk.label }}</option>
                  }
                </select>
              </div>

              <!-- Budget estimé -->
              <div>
                <label for="estimated_budget" class="block text-sm font-medium text-gray-700 mb-2">
                  Budget estimé (€)
                </label>
                <input
                  type="number"
                  id="estimated_budget"
                  formControlName="estimated_budget"
                  min="0"
                  step="0.01"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="0.00"
                >
              </div>
            </div>

            <!-- Description -->
            <div>
              <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                formControlName="description"
                rows="4"
                class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Description détaillée du projet..."
              ></textarea>
            </div>

            <!-- Objectifs -->
            <div>
              <label for="objectives" class="block text-sm font-medium text-gray-700 mb-2">
                Objectifs
              </label>
              <textarea
                id="objectives"
                formControlName="objectives"
                rows="3"
                class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Objectifs du projet..."
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Configuration client -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-6">Information client</h3>

          <!-- Type de client -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-3">Type de client</label>
            <div class="flex space-x-4">
              @for (clientType of clientTypeOptions; track clientType.value) {
                <label class="flex items-center">
                  <input
                    type="radio"
                    [value]="clientType.value"
                    formControlName="client_type"
                    class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  >
                  <span class="ml-2 text-sm text-gray-700">{{ clientType.label }}</span>
                </label>
              }
            </div>
          </div>

          <!-- Client interne -->
          @if (projectForm.get('client_type')?.value === 'interne') {
            <div>
              <label for="client_id" class="block text-sm font-medium text-gray-700 mb-2">
                Client interne *
              </label>
              <select
                id="client_id"
                formControlName="client_id"
                class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                [class.border-red-500]="isFieldInvalid('client_id')"
              >
                <option value="">Sélectionner un client</option>
                @for (client of availableClients; track client.id) {
                  <option [value]="client.id">{{ getClientDisplayName(client) }}</option>
                }
              </select>
              @if (isFieldInvalid('client_id')) {
                <p class="mt-1 text-sm text-red-600">Vous devez sélectionner un client interne</p>
              }
            </div>
          }

          <!-- Client externe -->
          @if (projectForm.get('client_type')?.value === 'externe') {
            <div class="space-y-4" formGroupName="external_client_info">
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label for="external_name" class="block text-sm font-medium text-gray-700 mb-2">
                    Nom du client *
                  </label>
                  <input
                    type="text"
                    id="external_name"
                    formControlName="name"
                    class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Nom du client externe..."
                    [class.border-red-500]="isNestedFieldInvalid('external_client_info', 'name')"
                  >
                  @if (isNestedFieldInvalid('external_client_info', 'name')) {
                    <p class="mt-1 text-sm text-red-600">Le nom du client externe est obligatoire</p>
                  }
                </div>

                <div>
                  <label for="external_company" class="block text-sm font-medium text-gray-700 mb-2">
                    Entreprise
                  </label>
                  <input
                    type="text"
                    id="external_company"
                    formControlName="company"
                    class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Nom de l'entreprise..."
                  >
                </div>

                <div>
                  <label for="external_email" class="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="external_email"
                    formControlName="email"
                    class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="client@example.com"
                  >
                </div>

                <div>
                  <label for="external_phone" class="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    id="external_phone"
                    formControlName="phone"
                    class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="+33 1 23 45 67 89"
                  >
                </div>
              </div>

              <div>
                <label for="external_address" class="block text-sm font-medium text-gray-700 mb-2">
                  Adresse
                </label>
                <textarea
                  id="external_address"
                  formControlName="address"
                  rows="3"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Adresse complète du client..."
                ></textarea>
              </div>
            </div>
          }
        </div>

        <!-- Actions du formulaire -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-500">
              * Champs obligatoires
            </div>
            <div class="flex items-center space-x-3">
              <button
                type="button"
                (click)="onCancel.emit()"
                class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                [disabled]="projectForm.invalid || isSubmitting()"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                @if (isSubmitting()) {
                  <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                }
                {{ isEditMode() ? 'Modifier' : 'Créer' }} le projet
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  `
})
export class ProjectFormComponent implements OnInit, OnChanges {
  @Input() project: Project | null = null;
  @Input() availableManagers: UserEntity[] = [];
  @Input() availableClients: ClientEntity[] = [];
  @Input() loading = false;

  @Output() onSubmit = new EventEmitter<CreateProjectRequest | UpdateProjectRequest>();
  @Output() onCancel = new EventEmitter<void>();

  projectForm!: FormGroup;
  isSubmitting = signal(false);
  errorMessage = signal('');

  // Options pour les sélects
  departmentOptions = ['IT', 'Marketing', 'Commercial', 'RH', 'Finance', 'Production'];

  riskOptions = [
    { value: 'low' as ProjectRiskIndicator, label: RISK_LEVEL_LABELS.low },
    { value: 'medium' as ProjectRiskIndicator, label: RISK_LEVEL_LABELS.medium },
    { value: 'high' as ProjectRiskIndicator, label: RISK_LEVEL_LABELS.high }
  ];

  clientTypeOptions = [
    { value: '' as ProjectClientType, label: 'Aucun client' },
    { value: 'interne' as ProjectClientType, label: CLIENT_TYPE_LABELS.interne },
    { value: 'externe' as ProjectClientType, label: CLIENT_TYPE_LABELS.externe }
  ];

  // Computed properties
  isEditMode = computed(() => !!this.project?.id);

  constructor(private fb: FormBuilder) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.setupFormValidations();
    this.setupFormSubscriptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] && this.project) {
      this.populateForm();
    }
  }

  private initializeForm(): void {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      department: ['', [Validators.required, Validators.maxLength(255)]],
      project_manager_id: ['', Validators.required],
      start_date: ['', Validators.required],
      planned_end_date: ['', Validators.required],
      description: [''],
      objectives: [''],
      estimated_budget: ['', [Validators.min(0)]],
      risk_indicator: ['low'],
      client_type: [''],
      client_id: [''],
      external_client_info: this.fb.group({
        name: [''],
        company: [''],
        email: ['', Validators.email],
        phone: [''],
        address: ['']
      })
    });
  }

  private setupFormValidations(): void {
    // Validation personnalisée pour les dates
    this.projectForm.addValidators((form) => {
      const startDate = form.get('start_date')?.value;
      const endDate = form.get('planned_end_date')?.value;

      if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
        form.get('planned_end_date')?.setErrors({ endDateBeforeStart: true });
        return { endDateBeforeStart: true };
      }

      return null;
    });
  }

  private setupFormSubscriptions(): void {
    // Surveillance du type de client pour validation conditionnelle
    this.projectForm.get('client_type')?.valueChanges.subscribe(clientType => {
      const clientIdControl = this.projectForm.get('client_id');
      const externalNameControl = this.projectForm.get('external_client_info.name');

      // Reset des validations
      clientIdControl?.clearValidators();
      externalNameControl?.clearValidators();

      if (clientType === 'interne') {
        clientIdControl?.setValidators([Validators.required]);
      } else if (clientType === 'externe') {
        externalNameControl?.setValidators([Validators.required]);
      }

      clientIdControl?.updateValueAndValidity();
      externalNameControl?.updateValueAndValidity();
    });
  }

  private populateForm(): void {
    if (!this.project) return;

    const formData = {
      name: this.project.name,
      department: this.project.department,
      project_manager_id: this.project.project_manager_id,
      start_date: this.project.start_date,
      planned_end_date: this.project.planned_end_date,
      description: this.project.description || '',
      objectives: this.project.objectives || '',
      estimated_budget: this.project.estimated_budget || '',
      risk_indicator: this.project.risk_indicator || 'low',
      client_type: this.project.client_type || '',
      client_id: this.project.client_id || '',
      external_client_info: this.project.external_client_info || {
        name: '',
        company: '',
        email: '',
        phone: '',
        address: ''
      }
    };

    this.projectForm.patchValue(formData);
  }

  handleSubmit(): void {
    if (this.projectForm.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const formValue = this.projectForm.value;

    // Nettoyer les données selon le type de client
    const cleanedData = { ...formValue };

    if (cleanedData.client_type !== 'interne') {
      delete cleanedData.client_id;
    }

    if (cleanedData.client_type !== 'externe') {
      delete cleanedData.external_client_info;
    }

    // Supprimer les champs vides
    Object.keys(cleanedData).forEach(key => {
      if (cleanedData[key] === '' || cleanedData[key] === null || cleanedData[key] === undefined) {
        delete cleanedData[key];
      }
    });

    this.onSubmit.emit(cleanedData);

    // Reset du state de soumission (sera géré par le parent)
    setTimeout(() => this.isSubmitting.set(false), 1000);
  }

  setError(message: string): void {
    this.errorMessage.set(message);
    this.isSubmitting.set(false);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.projectForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isNestedFieldInvalid(groupName: string, fieldName: string): boolean {
    const field = this.projectForm.get(`${groupName}.${fieldName}`);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.projectForm.controls).forEach(key => {
      const control = this.projectForm.get(key);
      control?.markAsTouched();

      // Pour les groupes imbriqués
      if (control instanceof FormGroup) {
        Object.keys(control.controls).forEach(nestedKey => {
          control.get(nestedKey)?.markAsTouched();
        });
      }
    });
  }

  getManagerDisplayName(manager: UserEntity): string {
    if (manager.name) {
      return manager.name;
    }

    // Essayer d'utiliser les méthodes de l'entité
    const firstName = manager.getFirstName();
    const lastName = manager.getLastName();

    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }

    if (manager.email) {
      return manager.email;
    }

    return `Utilisateur #${manager.id}`;
  }

  getClientDisplayName(client: ClientEntity): string {
    return client.getDisplayName();
  }
}