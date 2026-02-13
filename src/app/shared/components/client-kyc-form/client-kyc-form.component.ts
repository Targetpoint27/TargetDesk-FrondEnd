/**
 * Client KYC Multi-Step Form Component
 * Formulaire KYC moderne en 5 étapes pour création/modification de clients
 */

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { CategorySelectorComponent } from '../category-selector/category-selector.component';

// Types KYC
interface KYCFormData {
  // Step 1 - Signalétique Client (champs existants + nouveaux)
  name: string;
  type: 'particulier' | 'entreprise';
  email: string;
  phone: string;
  address: string;
  siret: string;
  sector: string;
  website: string;
  notes: string;
  brand_workshop: string; // Nouveau
  legal_form: string; // Nouveau

  // Step 2 - Documents personne morale
  kbis_document: File | null;
  beneficial_owners_document: File | null;

  // Step 3 - Représentants légaux
  legal_representative_first_name: string;
  legal_representative_last_name: string;
  legal_rep_id_document: File | null;
  legal_rep_address_proof: File | null;
  legal_rep_housing_certificate: File | null;

  // Step 4 - Bénéficiaires effectifs
  beneficial_owner_first_name: string;
  beneficial_owner_last_name: string;
  beneficial_owner_id_document: File | null;
  beneficial_owner_address_proof: File | null;
  beneficial_owner_housing_certificate: File | null;

  // Step 5 - Relation bancaire
  bank: string;
  bank_account_type: string;
  payment_method: string;
  payment_in_foreign_currency: boolean;
  has_bank_identity_statement: boolean;
}

interface Step {
  id: number;
  title: string;
  description: string;
  icon: string;
  isValid: boolean;
  isCompleted: boolean;
}

@Component({
  selector: 'app-client-kyc-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CategorySelectorComponent],
  template: `
    <div class="kyc-form-wrapper">
      <!-- Stepper horizontal -->
      <div class="mb-8">
        <div class="flex items-center space-x-4 overflow-x-auto pb-2">
          <div
            *ngFor="let step of steps(); let i = index"
            class="flex items-center min-w-0 flex-shrink-0"
            [class.opacity-50]="step.id > currentStep()">

            <!-- Circle avec numéro/icône -->
            <div
              class="flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300"
              [ngClass]="{
                'bg-blue-600 border-blue-600 text-white': step.id === currentStep(),
                'bg-green-600 border-green-600 text-white': step.isCompleted,
                'bg-white border-gray-300 text-gray-400': step.id > currentStep() && !step.isCompleted,
                'cursor-pointer hover:bg-gray-50': canGoToStep(step.id)
              }"
              (click)="canGoToStep(step.id) && goToStep(step.id)">

              <i *ngIf="step.isCompleted" class="fas fa-check text-sm"></i>
              <span *ngIf="!step.isCompleted" class="text-sm font-medium">{{ step.id }}</span>
            </div>

            <!-- Titre de l'étape -->
            <div class="ml-3 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{{ step.title }}</p>
              <p class="text-xs text-gray-500 truncate">{{ step.description }}</p>
            </div>

            <!-- Ligne de connexion -->
            <div
              *ngIf="i < steps().length - 1"
              class="flex-1 h-0.5 mx-4 min-w-8"
              [ngClass]="{
                'bg-green-600': step.isCompleted,
                'bg-gray-300': !step.isCompleted
              }">
            </div>
          </div>
        </div>
      </div>

      <!-- Contenu dynamique des étapes -->
      <form [formGroup]="form" class="space-y-6">

        <!-- Step 1 - Signalétique Client -->
        <div *ngIf="currentStep() === 1" class="step-content">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

            <!-- Nom du client -->
            <div class="col-span-full">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Nom du client <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                formControlName="name"
                placeholder="Nom complet ou raison sociale"
                class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-300]="form.get('name')?.invalid && form.get('name')?.touched">
              <div *ngIf="form.get('name')?.invalid && form.get('name')?.touched"
                   class="text-red-500 text-xs mt-1">
                Le nom est obligatoire (minimum 2 caractères)
              </div>
            </div>

            <!-- Type de client -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Type de client <span class="text-red-500">*</span>
              </label>
              <select
                formControlName="type"
                class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900">
                <option value="" disabled>Sélectionnez un type</option>
                <option value="entreprise">Entreprise</option>
                <option value="particulier">Particulier</option>
              </select>
            </div>

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Email <span class="text-red-500">*</span>
              </label>
              <input
                type="email"
                formControlName="email"
                placeholder="contact@entreprise.com"
                class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                [class.border-red-300]="form.get('email')?.invalid && form.get('email')?.touched">
              <div *ngIf="form.get('email')?.invalid && form.get('email')?.touched"
                   class="text-red-500 text-xs mt-1">
                Email invalide
              </div>
            </div>

            <!-- Téléphone -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
              <input
                type="tel"
                formControlName="phone"
                placeholder="+33 1 23 45 67 89"
                class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>

            <!-- SIRET -->
            <div *ngIf="form.get('type')?.value === 'entreprise'">
              <label class="block text-sm font-medium text-gray-700 mb-2">SIRET</label>
              <input
                type="text"
                formControlName="siret"
                placeholder="12345678901234"
                maxlength="14"
                class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                [class.border-red-300]="form.get('siret')?.invalid && form.get('siret')?.touched">
              <div *ngIf="form.get('siret')?.invalid && form.get('siret')?.touched"
                   class="text-red-500 text-xs mt-1">
                Le SIRET doit contenir exactement 14 chiffres
              </div>
            </div>

            <!-- Secteur -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Secteur d'activité</label>
              <input
                type="text"
                formControlName="sector"
                placeholder="Technologie, Commerce, Service..."
                class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>

            <!-- Marque/Atelier (nouveau) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Marque/Atelier</label>
              <input
                type="text"
                formControlName="brand_workshop"
                placeholder="Nom de la marque ou atelier"
                class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>

            <!-- Site web -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Site web</label>
              <input
                type="url"
                formControlName="website"
                placeholder="https://www.exemple.com"
                class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>

            <!-- Adresse -->
            <div class="col-span-full">
              <label class="block text-sm font-medium text-gray-700 mb-2">Adresse complète</label>
              <textarea
                formControlName="address"
                rows="2"
                placeholder="123 Rue de la Paix, 75001 Paris"
                class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none">
              </textarea>
            </div>

            <!-- Forme juridique (nouveau) -->
            <div class="col-span-full" *ngIf="form.get('type')?.value === 'entreprise'">
              <label class="block text-sm font-medium text-gray-700 mb-3">
                Forme juridique <span class="text-red-500">*</span>
              </label>
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <label *ngFor="let option of legalFormOptions"
                       class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                       [class.border-blue-500]="form.get('legal_form')?.value === option.value"
                       [class.bg-blue-50]="form.get('legal_form')?.value === option.value">
                  <input
                    type="radio"
                    [value]="option.value"
                    formControlName="legal_form"
                    class="sr-only">
                  <div class="text-center w-full">
                    <div class="text-sm font-medium text-gray-900">{{ option.label }}</div>
                  </div>
                </label>
              </div>
            </div>

            <!-- Sélection des catégories -->
            <div class="col-span-full">
              <label class="block text-sm font-medium text-gray-700 mb-2">Catégories</label>
              <app-category-selector
                [selectedCategoryIds]="selectedCategoryIds"
                (selectionChange)="onCategoriesChanged($event)">
              </app-category-selector>
            </div>

            <!-- Notes -->
            <div class="col-span-full">
              <label class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                formControlName="notes"
                rows="3"
                placeholder="Informations complémentaires..."
                class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none">
              </textarea>
            </div>
          </div>
        </div>

        <!-- Step 2 - Identification personne morale -->
        <div *ngIf="currentStep() === 2" class="step-content">
          <div class="space-y-8">

            <div class="text-left">
              <i class="fas fa-building text-4xl text-blue-600 mb-4"></i>
              <h3 class="text-lg font-medium text-gray-900">Identification de la personne morale</h3>
              <p class="text-gray-600">Téléchargez les documents officiels de votre entreprise</p>
            </div>

            <!-- Document Kbis -->
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Document Kbis
                </label>
                <div class="upload-zone border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                     (click)="kbisFileInput.click()"
                     (dragover)="onDragOver($event)"
                     (drop)="onDrop($event, 'kbis')">

                  <input #kbisFileInput type="file" class="hidden"
                         accept=".pdf,.jpg,.jpeg,.png"
                         (change)="onFileSelected($event, 'kbis')">

                  <div *ngIf="!uploadedFiles['kbis']">
                    <i class="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-3"></i>
                    <p class="text-gray-600">Cliquez ou glissez votre document Kbis ici</p>
                    <p class="text-xs text-gray-500 mt-2">PDF, JPG, PNG - Max 10MB</p>
                  </div>

                  <div *ngIf="uploadedFiles['kbis']" class="text-green-600">
                    <i class="fas fa-check-circle text-2xl mb-2"></i>
                    <p class="font-medium">{{ uploadedFiles['kbis']?.name }}</p>
                    <button type="button"
                            (click)="removeFile('kbis', $event)"
                            class="text-red-500 hover:text-red-700 mt-2 text-sm">
                      <i class="fas fa-trash mr-1"></i>Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Document bénéficiaires effectifs -->
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Document légal attestant des bénéficiaires effectifs
                </label>
                <div class="upload-zone border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                     (click)="beneficiaryDocInput.click()"
                     (dragover)="onDragOver($event)"
                     (drop)="onDrop($event, 'beneficiary_doc')">

                  <input #beneficiaryDocInput type="file" class="hidden"
                         accept=".pdf,.jpg,.jpeg,.png"
                         (change)="onFileSelected($event, 'beneficiary_doc')">

                  <div *ngIf="!uploadedFiles['beneficiary_doc']">
                    <i class="fas fa-users text-3xl text-gray-400 mb-3"></i>
                    <p class="text-gray-600">Cliquez ou glissez le document des bénéficiaires effectifs</p>
                    <p class="text-xs text-gray-500 mt-2">PDF, JPG, PNG - Max 10MB</p>
                  </div>

                  <div *ngIf="uploadedFiles['beneficiary_doc']" class="text-green-600">
                    <i class="fas fa-check-circle text-2xl mb-2"></i>
                    <p class="font-medium">{{ uploadedFiles['beneficiary_doc']?.name }}</p>
                    <button type="button"
                            (click)="removeFile('beneficiary_doc', $event)"
                            class="text-red-500 hover:text-red-700 mt-2 text-sm">
                      <i class="fas fa-trash mr-1"></i>Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3 - Représentants légaux -->
        <div *ngIf="currentStep() === 3" class="step-content">
          <div class="space-y-8">

            <div class="text-left">
              <i class="fas fa-user-tie text-4xl text-blue-600 mb-4"></i>
              <h3 class="text-lg font-medium text-gray-900">Vérification de l'identité du représentant légal</h3>
              <p class="text-gray-600">Informations et documents du représentant légal</p>
            </div>

            <!-- Informations personnelles -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Prénom du représentant légal
                </label>
                <input
                  type="text"
                  formControlName="legal_representative_first_name"
                  placeholder="Prénom"
                  class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Nom du représentant légal
                </label>
                <input
                  type="text"
                  formControlName="legal_representative_last_name"
                  placeholder="Nom"
                  class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900">
              </div>
            </div>

            <!-- Document d'identité -->
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Copie du document d'identification (recto/verso)
                </label>
                <div class="upload-zone border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                     (click)="legalRepIdInput.click()"
                     (dragover)="onDragOver($event)"
                     (drop)="onDrop($event, 'legal_rep_id')">

                  <input #legalRepIdInput type="file" class="hidden"
                         accept=".pdf,.jpg,.jpeg,.png"
                         (change)="onFileSelected($event, 'legal_rep_id')">

                  <div *ngIf="!uploadedFiles['legal_rep_id']">
                    <i class="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-3"></i>
                    <p class="text-gray-600">Cliquez ou glissez votre document d'identité ici</p>
                    <p class="text-xs text-gray-500 mt-2">PDF, JPG, PNG - Max 10MB</p>
                  </div>

                  <div *ngIf="uploadedFiles['legal_rep_id']" class="text-green-600">
                    <i class="fas fa-check-circle text-2xl mb-2"></i>
                    <p class="font-medium">{{ uploadedFiles['legal_rep_id']?.name }}</p>
                    <button type="button"
                            (click)="removeFile('legal_rep_id', $event)"
                            class="text-red-500 hover:text-red-700 mt-2 text-sm">
                      <i class="fas fa-trash mr-1"></i>Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Justificatif de domicile -->
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Justificatif de domicile
                </label>
                <div class="upload-zone border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                     (click)="legalRepAddressInput.click()"
                     (dragover)="onDragOver($event)"
                     (drop)="onDrop($event, 'legal_rep_address')">

                  <input #legalRepAddressInput type="file" class="hidden"
                         accept=".pdf,.jpg,.jpeg,.png"
                         (change)="onFileSelected($event, 'legal_rep_address')">

                  <div *ngIf="!uploadedFiles['legal_rep_address']">
                    <i class="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-3"></i>
                    <p class="text-gray-600">Cliquez ou glissez votre justificatif de domicile ici</p>
                    <p class="text-xs text-gray-500 mt-2">PDF, JPG, PNG - Max 10MB</p>
                  </div>

                  <div *ngIf="uploadedFiles['legal_rep_address']" class="text-green-600">
                    <i class="fas fa-check-circle text-2xl mb-2"></i>
                    <p class="font-medium">{{ uploadedFiles['legal_rep_address']?.name }}</p>
                    <button type="button"
                            (click)="removeFile('legal_rep_address', $event)"
                            class="text-red-500 hover:text-red-700 mt-2 text-sm">
                      <i class="fas fa-trash mr-1"></i>Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Attestation de logement -->
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Attestation de logement
                </label>
                <div class="upload-zone border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                     (click)="legalRepHousingInput.click()"
                     (dragover)="onDragOver($event)"
                     (drop)="onDrop($event, 'legal_rep_housing')">

                  <input #legalRepHousingInput type="file" class="hidden"
                         accept=".pdf,.jpg,.jpeg,.png"
                         (change)="onFileSelected($event, 'legal_rep_housing')">

                  <div *ngIf="!uploadedFiles['legal_rep_housing']">
                    <i class="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-3"></i>
                    <p class="text-gray-600">Cliquez ou glissez votre attestation de logement ici</p>
                    <p class="text-xs text-gray-500 mt-2">PDF, JPG, PNG - Max 10MB</p>
                  </div>

                  <div *ngIf="uploadedFiles['legal_rep_housing']" class="text-green-600">
                    <i class="fas fa-check-circle text-2xl mb-2"></i>
                    <p class="font-medium">{{ uploadedFiles['legal_rep_housing']?.name }}</p>
                    <button type="button"
                            (click)="removeFile('legal_rep_housing', $event)"
                            class="text-red-500 hover:text-red-700 mt-2 text-sm">
                      <i class="fas fa-trash mr-1"></i>Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4 - Bénéficiaires effectifs -->
        <div *ngIf="currentStep() === 4" class="step-content">
          <div class="space-y-8">

            <div class="text-left">
              <i class="fas fa-users text-4xl text-blue-600 mb-4"></i>
              <h3 class="text-lg font-medium text-gray-900">Vérification de l'identité des bénéficiaires effectifs</h3>
              <p class="text-gray-600">Informations et documents des bénéficiaires effectifs</p>
            </div>

            <!-- Informations personnelles -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Prénom du bénéficiaire effectif
                </label>
                <input
                  type="text"
                  formControlName="beneficial_owner_first_name"
                  placeholder="Prénom"
                  class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Nom du bénéficiaire effectif
                </label>
                <input
                  type="text"
                  formControlName="beneficial_owner_last_name"
                  placeholder="Nom"
                  class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900">
              </div>
            </div>

            <!-- Document d'identité -->
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Copie du document d'identification (recto/verso)
                </label>
                <div class="upload-zone border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                     (click)="benefOwnerIdInput.click()"
                     (dragover)="onDragOver($event)"
                     (drop)="onDrop($event, 'beneficial_owner_id')">

                  <input #benefOwnerIdInput type="file" class="hidden"
                         accept=".pdf,.jpg,.jpeg,.png"
                         (change)="onFileSelected($event, 'beneficial_owner_id')">

                  <div *ngIf="!uploadedFiles['beneficial_owner_id']">
                    <i class="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-3"></i>
                    <p class="text-gray-600">Cliquez ou glissez votre document d'identité ici</p>
                    <p class="text-xs text-gray-500 mt-2">PDF, JPG, PNG - Max 10MB</p>
                  </div>

                  <div *ngIf="uploadedFiles['beneficial_owner_id']" class="text-green-600">
                    <i class="fas fa-check-circle text-2xl mb-2"></i>
                    <p class="font-medium">{{ uploadedFiles['beneficial_owner_id']?.name }}</p>
                    <button type="button"
                            (click)="removeFile('beneficial_owner_id', $event)"
                            class="text-red-500 hover:text-red-700 mt-2 text-sm">
                      <i class="fas fa-trash mr-1"></i>Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Justificatif de domicile -->
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Justificatif de domicile
                </label>
                <div class="upload-zone border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                     (click)="benefOwnerAddressInput.click()"
                     (dragover)="onDragOver($event)"
                     (drop)="onDrop($event, 'beneficial_owner_address')">

                  <input #benefOwnerAddressInput type="file" class="hidden"
                         accept=".pdf,.jpg,.jpeg,.png"
                         (change)="onFileSelected($event, 'beneficial_owner_address')">

                  <div *ngIf="!uploadedFiles['beneficial_owner_address']">
                    <i class="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-3"></i>
                    <p class="text-gray-600">Cliquez ou glissez votre justificatif de domicile ici</p>
                    <p class="text-xs text-gray-500 mt-2">PDF, JPG, PNG - Max 10MB</p>
                  </div>

                  <div *ngIf="uploadedFiles['beneficial_owner_address']" class="text-green-600">
                    <i class="fas fa-check-circle text-2xl mb-2"></i>
                    <p class="font-medium">{{ uploadedFiles['beneficial_owner_address']?.name }}</p>
                    <button type="button"
                            (click)="removeFile('beneficial_owner_address', $event)"
                            class="text-red-500 hover:text-red-700 mt-2 text-sm">
                      <i class="fas fa-trash mr-1"></i>Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Attestation de logement -->
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Attestation de logement
                </label>
                <div class="upload-zone border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                     (click)="benefOwnerHousingInput.click()"
                     (dragover)="onDragOver($event)"
                     (drop)="onDrop($event, 'beneficial_owner_housing')">

                  <input #benefOwnerHousingInput type="file" class="hidden"
                         accept=".pdf,.jpg,.jpeg,.png"
                         (change)="onFileSelected($event, 'beneficial_owner_housing')">

                  <div *ngIf="!uploadedFiles['beneficial_owner_housing']">
                    <i class="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-3"></i>
                    <p class="text-gray-600">Cliquez ou glissez votre attestation de logement ici</p>
                    <p class="text-xs text-gray-500 mt-2">PDF, JPG, PNG - Max 10MB</p>
                  </div>

                  <div *ngIf="uploadedFiles['beneficial_owner_housing']" class="text-green-600">
                    <i class="fas fa-check-circle text-2xl mb-2"></i>
                    <p class="font-medium">{{ uploadedFiles['beneficial_owner_housing']?.name }}</p>
                    <button type="button"
                            (click)="removeFile('beneficial_owner_housing', $event)"
                            class="text-red-500 hover:text-red-700 mt-2 text-sm">
                      <i class="fas fa-trash mr-1"></i>Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 5 - Relations bancaires -->
        <div *ngIf="currentStep() === 5" class="step-content">
          <div class="space-y-8">

            <div class="text-left">
              <i class="fas fa-university text-4xl text-blue-600 mb-4"></i>
              <h3 class="text-lg font-medium text-gray-900">Relation bancaire et moyens de paiement</h3>
              <p class="text-gray-600">Informations sur vos relations bancaires et moyens de paiement</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

              <!-- Nom de la banque -->
              <div class="col-span-full">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Avec quelle banque travaillez-vous principalement pour vos activités professionnelles ?
                </label>
                <input
                  type="text"
                  formControlName="bank"
                  placeholder="Crédit Agricole, BNP Paribas, Société Générale..."
                  class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900">
              </div>

              <!-- Type de compte -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-3">
                  Quels comptes utilisez-vous pour vos opérations ?
                </label>
                <div class="space-y-2">
                  <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                         [class.border-blue-500]="form.get('bank_account_type')?.value === 'professionnel'"
                         [class.bg-blue-50]="form.get('bank_account_type')?.value === 'professionnel'">
                    <input
                      type="radio"
                      value="professionnel"
                      formControlName="bank_account_type"
                      class="sr-only">
                    <i class="fas fa-building text-blue-600 mr-3"></i>
                    <span class="text-gray-900">Compte professionnel d'entreprise</span>
                  </label>

                  <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                         [class.border-blue-500]="form.get('bank_account_type')?.value === 'autre'"
                         [class.bg-blue-50]="form.get('bank_account_type')?.value === 'autre'">
                    <input
                      type="radio"
                      value="autre"
                      formControlName="bank_account_type"
                      class="sr-only">
                    <i class="fas fa-user text-blue-600 mr-3"></i>
                    <span class="text-gray-900">Autre</span>
                  </label>
                </div>
              </div>

              <!-- Moyens de paiement -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-3">
                  Quels moyens utilisez-vous pour recevoir vos paiements B2B ?
                </label>
                <div class="space-y-2">
                  <label *ngFor="let method of paymentMethods"
                         class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                         [class.border-blue-500]="form.get('payment_method')?.value === method.value"
                         [class.bg-blue-50]="form.get('payment_method')?.value === method.value">
                    <input
                      type="radio"
                      [value]="method.value"
                      formControlName="payment_method"
                      class="sr-only">
                    <i [class]="method.icon + ' text-blue-600 mr-3'"></i>
                    <span class="text-gray-900">{{ method.label }}</span>
                  </label>
                </div>
              </div>

              <!-- Paiements en devises étrangères -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-3">
                  Autorisez-vous des paiements en devises internationales ?
                </label>
                <div class="space-y-2">
                  <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                         [class.border-blue-500]="form.get('payment_in_foreign_currency')?.value === true"
                         [class.bg-blue-50]="form.get('payment_in_foreign_currency')?.value === true">
                    <input
                      type="radio"
                      [value]="true"
                      formControlName="payment_in_foreign_currency"
                      class="sr-only">
                    <i class="fas fa-check-circle text-green-600 mr-3"></i>
                    <span class="text-gray-900">Oui</span>
                  </label>

                  <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                         [class.border-blue-500]="form.get('payment_in_foreign_currency')?.value === false"
                         [class.bg-blue-50]="form.get('payment_in_foreign_currency')?.value === false">
                    <input
                      type="radio"
                      [value]="false"
                      formControlName="payment_in_foreign_currency"
                      class="sr-only">
                    <i class="fas fa-times-circle text-red-600 mr-3"></i>
                    <span class="text-gray-900">Non</span>
                  </label>
                </div>
              </div>

              <!-- Relevé d'identité bancaire -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-3">
                  Disposez-vous d'un relevé d'identité bancaire ?
                </label>
                <div class="space-y-2">
                  <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                         [class.border-blue-500]="form.get('has_bank_identity_statement')?.value === true"
                         [class.bg-blue-50]="form.get('has_bank_identity_statement')?.value === true">
                    <input
                      type="radio"
                      [value]="true"
                      formControlName="has_bank_identity_statement"
                      class="sr-only">
                    <i class="fas fa-check-circle text-green-600 mr-3"></i>
                    <span class="text-gray-900">Oui</span>
                  </label>

                  <label class="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                         [class.border-blue-500]="form.get('has_bank_identity_statement')?.value === false"
                         [class.bg-blue-50]="form.get('has_bank_identity_statement')?.value === false">
                    <input
                      type="radio"
                      [value]="false"
                      formControlName="has_bank_identity_statement"
                      class="sr-only">
                    <i class="fas fa-times-circle text-red-600 mr-3"></i>
                    <span class="text-gray-900">Non</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      <!-- Navigation footer -->
      <div class="form-footer flex justify-between items-center pt-8 border-t border-gray-200">
        <button
          type="button"
          (click)="previousStep()"
          [disabled]="currentStep() === 1"
          class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          <i class="fas fa-chevron-left mr-2"></i>
          Précédent
        </button>

        <div class="text-sm text-gray-500">
          {{ getStepCompletionText() }}
        </div>

        <button
          type="button"
          (click)="nextStep()"
          [disabled]="!canProceedToNextStep()"
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {{ currentStep() === totalSteps ? 'Terminer' : 'Suivant' }}
          <i class="fas" [class.fa-chevron-right]="currentStep() < totalSteps" [class.fa-check]="currentStep() === totalSteps" class="ml-2"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .kyc-form-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
      background: white;
      border-radius: 1rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .step-content {
      min-height: 400px;
      animation: fadeIn 0.3s ease-in-out;
    }

    .upload-zone {
      transition: all 0.3s ease;
    }

    .upload-zone:hover {
      border-color: #3b82f6;
      background-color: #f8fafc;
    }

    .upload-zone-small {
      transition: all 0.3s ease;
      min-height: 120px;
    }

    .upload-zone-small:hover {
      border-color: #3b82f6;
      background-color: #f8fafc;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    input:focus, textarea:focus, select:focus {
      outline: none;
      ring: 2px;
      ring-color: #3b82f6;
    }

    select {
      color: #1f2937 !important;
      background-color: white !important;
    }

    select option {
      color: #1f2937 !important;
    }

    select option:disabled {
      color: #9ca3af !important;
    }

    .form-header {
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 2rem;
    }

    .form-footer {
      background: #f9fafb;
      margin: 2rem -2rem -2rem -2rem;
      padding: 1.5rem 2rem;
      border-radius: 0 0 1rem 1rem;
    }
  `]
})
export class ClientKycFormComponent implements OnInit, OnDestroy {
  @Input() isEditMode = false;
  @Input() initialData: Partial<KYCFormData> | null = null;
  @Output() formSubmit = new EventEmitter<KYCFormData>();
  @Output() formCancel = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  // Signals pour la réactivité
  currentStep = signal(1);
  totalSteps = 5;

  // Formulaire réactif
  form: FormGroup;

  // États des étapes
  steps = signal<Step[]>([
    {
      id: 1,
      title: 'Signalétique Client',
      description: 'Informations de base',
      icon: 'fas fa-user',
      isValid: false,
      isCompleted: false
    },
    {
      id: 2,
      title: 'Personne Morale',
      description: 'Documents officiels',
      icon: 'fas fa-building',
      isValid: false,
      isCompleted: false
    },
    {
      id: 3,
      title: 'Représentant Légal',
      description: 'Vérification identité',
      icon: 'fas fa-user-tie',
      isValid: false,
      isCompleted: false
    },
    {
      id: 4,
      title: 'Bénéficiaire Effectif',
      description: 'Vérification identité',
      icon: 'fas fa-users',
      isValid: false,
      isCompleted: false
    },
    {
      id: 5,
      title: 'Relation Bancaire',
      description: 'Moyens de paiement',
      icon: 'fas fa-university',
      isValid: false,
      isCompleted: false
    }
  ]);

  // Options pour les sélecteurs
  legalFormOptions = [
    { value: 'individuel', label: 'Individuel' },
    { value: 'sarl', label: 'SARL' },
    { value: 'sas', label: 'SAS' },
    { value: 'sa', label: 'SA' },
    { value: 'cooperative', label: 'Coopérative' },
    { value: 'autre', label: 'Autre' }
  ];

  paymentMethods = [
    { value: 'bancaire', label: 'Paiement bancaire', icon: 'fas fa-university' },
    { value: 'carte', label: 'Paiement par carte', icon: 'fas fa-credit-card' },
    { value: 'mobile_money', label: 'Mobile Money', icon: 'fas fa-mobile-alt' },
    { value: 'autre', label: 'Autre', icon: 'fas fa-ellipsis-h' }
  ];

  // Gestion des fichiers uploadés
  uploadedFiles: { [key: string]: File | null } = {};

  // Catégories sélectionnées
  selectedCategoryIds: number[] = [];

  constructor(private fb: FormBuilder) {
    this.form = this.createForm();
  }

  ngOnInit(): void {
    // Pré-remplir le formulaire si des données initiales sont fournies
    if (this.initialData) {
      this.form.patchValue(this.initialData);
    }

    // Écouter les changements du formulaire pour mettre à jour la validation des étapes
    this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateStepValidation();
      });

    // Validation initiale
    this.updateStepValidation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      // Step 1 - Signalétique Client
      name: ['', [Validators.required, Validators.minLength(2)]],
      type: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      address: [''],
      siret: ['', [Validators.pattern(/^\d{14}$/)]],
      sector: [''],
      website: [''],
      notes: [''],
      brand_workshop: [''],
      legal_form: [''],

      // Step 3 - Représentants légaux
      legal_representative_first_name: [''],
      legal_representative_last_name: [''],

      // Step 4 - Bénéficiaires effectifs
      beneficial_owner_first_name: [''],
      beneficial_owner_last_name: [''],

      // Step 5 - Relation bancaire
      bank: [''],
      bank_account_type: [''],
      payment_method: [''],
      payment_in_foreign_currency: [false],
      has_bank_identity_statement: [false]
    });
  }

  // Navigation entre les étapes
  nextStep(): void {
    if (this.canProceedToNextStep()) {
      if (this.currentStep() === this.totalSteps) {
        this.submitForm();
      } else {
        this.markStepAsCompleted(this.currentStep());
        this.currentStep.set(this.currentStep() + 1);
      }
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  goToStep(stepNumber: number): void {
    if (this.canGoToStep(stepNumber)) {
      this.currentStep.set(stepNumber);
    }
  }

  canGoToStep(stepNumber: number): boolean {
    // Peut aller à une étape si elle est validée ou si c'est l'étape suivante
    const targetStep = this.steps().find(s => s.id === stepNumber);
    if (!targetStep) return false;

    // Peut toujours aller à l'étape 1
    if (stepNumber === 1) return true;

    // Peut aller à une étape si toutes les étapes précédentes sont complétées
    for (let i = 1; i < stepNumber; i++) {
      const step = this.steps().find(s => s.id === i);
      if (!step?.isCompleted) return false;
    }

    return true;
  }

  canProceedToNextStep(): boolean {
    const currentStepData = this.steps().find(s => s.id === this.currentStep());
    return currentStepData?.isValid || false;
  }

  private markStepAsCompleted(stepNumber: number): void {
    const steps = this.steps();
    const stepIndex = steps.findIndex(s => s.id === stepNumber);
    if (stepIndex >= 0) {
      steps[stepIndex].isCompleted = true;
      this.steps.set([...steps]);
    }
  }

  // Validation des étapes
  private updateStepValidation(): void {
    const steps = this.steps();

    // Step 1 - Signalétique
    steps[0].isValid = this.validateStep1();

    // Step 2 - Documents (validation basée sur les fichiers uploadés)
    steps[1].isValid = this.validateStep2();

    // Step 3 - Représentant légal
    steps[2].isValid = this.validateStep3();

    // Step 4 - Bénéficiaire effectif
    steps[3].isValid = this.validateStep4();

    // Step 5 - Relation bancaire
    steps[4].isValid = this.validateStep5();

    this.steps.set([...steps]);
  }

  private validateStep1(): boolean {
    const nameValid = this.form.get('name')?.valid;
    const emailValid = this.form.get('email')?.valid;
    const typeValid = this.form.get('type')?.valid;

    // Validation SIRET conditionnelle pour entreprise (optionnel)
    const type = this.form.get('type')?.value;
    const siretValid = type === 'entreprise'
      ? !this.form.get('siret')?.value || this.form.get('siret')?.valid
      : true;

    // Forme juridique est optionnelle selon l'API
    // Tous les autres champs KYC sont optionnels

    // Seuls name, email et type sont obligatoires selon l'API
    return !!(nameValid && emailValid && typeValid && siretValid);
  }

  private validateStep2(): boolean {
    // Step 2 est optionnel - les documents KYC ne sont pas obligatoires
    return true; // Toujours valide, les documents sont optionnels
  }

  private validateStep3(): boolean {
    // Step 3 est optionnel - les informations représentant légal ne sont pas obligatoires
    // Tous les champs sont optionnels
    return true;
  }

  private validateStep4(): boolean {
    // Step 4 est optionnel - les informations bénéficiaire effectif ne sont pas obligatoires
    // Tous les champs sont optionnels
    return true;
  }

  private validateStep5(): boolean {
    // Step 5 est optionnel - les informations bancaires ne sont pas obligatoires
    // L'utilisateur peut remplir seulement certains champs ou aucun
    return true;
  }

  // Gestion des fichiers
  onFileSelected(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validation taille (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('Le fichier est trop volumineux (max 10MB)');
        return;
      }

      // Validation type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Type de fichier non autorisé. Utilisez JPG, PNG ou PDF.');
        return;
      }

      this.uploadedFiles[fieldName] = file;
      this.updateStepValidation();
    }
  }

  removeFile(fieldName: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.uploadedFiles[fieldName] = null;
    this.updateStepValidation();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent, fieldName: string): void {
    event.preventDefault();

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];

      // Même validation que onFileSelected
      if (file.size > 10 * 1024 * 1024) {
        alert('Le fichier est trop volumineux (max 10MB)');
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Type de fichier non autorisé. Utilisez JPG, PNG ou PDF.');
        return;
      }

      this.uploadedFiles[fieldName] = file;
      this.updateStepValidation();
    }
  }

  // Utilitaires
  getStepCompletionText(): string {
    const completedSteps = this.steps().filter(s => s.isCompleted).length;
    return `${completedSteps}/${this.totalSteps} étapes complétées`;
  }

  // Soumission du formulaire
  private submitForm(): void {
    if (this.form.valid && this.allStepsValid()) {
      const formData: KYCFormData = {
        ...this.form.value,
        // Ajouter les fichiers uploadés
        kbis_document: this.uploadedFiles['kbis'],
        beneficial_owners_document: this.uploadedFiles['beneficiary_doc'],
        legal_rep_id_document: this.uploadedFiles['legal_rep_id'],
        legal_rep_address_proof: this.uploadedFiles['legal_rep_address'],
        legal_rep_housing_certificate: this.uploadedFiles['legal_rep_housing'],
        beneficial_owner_id_document: this.uploadedFiles['beneficial_owner_id'],
        beneficial_owner_address_proof: this.uploadedFiles['beneficial_owner_address'],
        beneficial_owner_housing_certificate: this.uploadedFiles['beneficial_owner_housing']
      };

      this.formSubmit.emit(formData);
    }
  }

  private allStepsValid(): boolean {
    return this.steps().every(step => step.isValid);
  }

  // Gestion des catégories
  onCategoriesChanged(categoryIds: number[]): void {
    this.selectedCategoryIds = categoryIds;
    this.updateStepValidation();
  }

  onCancel(): void {
    this.formCancel.emit();
  }
}