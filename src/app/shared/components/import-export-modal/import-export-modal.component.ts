import { Component, Input, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ExportFormat,
  ExportRequest,
  ImportMapping,
  DuplicateAction,
  AVAILABLE_EXPORT_COLUMNS,
  DEFAULT_IMPORT_MAPPING,
  ImportPreviewResponse,
  ImportResponse
} from '../../../domain/models/import-export.models';

import {
  DownloadTemplateUseCase,
  PreviewImportUseCase,
  ImportClientsUseCase,
  ExportClientsUseCase
} from '../../../domain/use-cases/import-export';

import { MessageService } from '../../services/message.service';

export type ImportExportMode = 'export' | 'import' | 'template';

@Component({
  selector: 'app-import-export-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isVisible" class="modal-overlay" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="header-content">
            <div class="header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="header-text">
              <h2>{{ getModalTitle() }}</h2>
              <p>{{ getModalDescription() }}</p>
            </div>
          </div>
          <button class="close-btn" (click)="closeModal()" aria-label="Fermer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- Mode Selection -->
          <div class="mode-tabs">
            <button
              class="tab-btn"
              [class.active]="currentMode() === 'template'"
              (click)="setMode('template')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Modèles
            </button>
            <button
              class="tab-btn"
              [class.active]="currentMode() === 'import'"
              (click)="setMode('import')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Importer
            </button>
            <button
              class="tab-btn"
              [class.active]="currentMode() === 'export'"
              (click)="setMode('export')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Exporter
            </button>
          </div>

          <!-- Template Mode -->
          <div *ngIf="currentMode() === 'template'" class="template-section">
            <div class="section-header">
              <div class="section-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div>
                <h3>Modèles d'import</h3>
                <p>Téléchargez un modèle pré-formaté avec les colonnes requises pour faciliter l'import de vos données.</p>
              </div>
            </div>

            <div class="template-cards">
              <div class="template-card" [class.loading]="isLoading()" (click)="downloadTemplate('csv')">
                <div class="card-icon csv">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                    <path d="M10 12h4M10 16h4" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div class="card-content">
                  <h4>Modèle CSV</h4>
                  <p>Format universel compatible avec Excel et autres tableurs</p>
                </div>
                <div class="card-action">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
              </div>

              <div class="template-card" [class.loading]="isLoading()" (click)="downloadTemplate('excel')">
                <div class="card-icon excel">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M8 8h8M8 12h8M8 16h4" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div class="card-content">
                  <h4>Modèle Excel</h4>
                  <p>Format Excel avec validation et formatage intégrés</p>
                </div>
                <div class="card-action">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Import Mode -->
          <div *ngIf="currentMode() === 'import'" class="import-section">
            <div *ngIf="!importPreview()" class="file-upload">
              <div class="section-header">
                <div class="section-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div>
                  <h3>Importer des données</h3>
                  <p>Sélectionnez un fichier CSV ou Excel contenant vos clients à importer.</p>
                </div>
              </div>

              <div class="upload-zone" [class.has-file]="selectedFile()" (click)="fileInput.click()">
                <input
                  type="file"
                  #fileInput
                  accept=".csv,.xlsx,.xls"
                  (change)="onFileSelected($event)"
                  class="file-input">

                <div *ngIf="!selectedFile()" class="upload-placeholder">
                  <div class="upload-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5"/>
                      <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M12 12v6M9 15l3-3 3 3" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                  </div>
                  <h4>Glissez votre fichier ici</h4>
                  <p>ou cliquez pour sélectionner</p>
                  <span class="file-types">CSV, Excel (.xlsx, .xls)</span>
                </div>

                <div *ngIf="selectedFile()" class="file-selected">
                  <div class="file-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
                      <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  </div>
                  <div class="file-info">
                    <h4>{{ selectedFile()?.name }}</h4>
                    <p>{{ formatFileSize(selectedFile()?.size || 0) }}</p>
                  </div>
                  <button type="button" class="remove-file" (click)="removeFile($event)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div *ngIf="selectedFile()" class="action-bar">
                <button
                  class="btn btn-primary"
                  [disabled]="isLoading()"
                  (click)="previewImport()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  {{ isLoading() ? 'Analyse en cours...' : 'Analyser le fichier' }}
                </button>
              </div>
            </div>

            <!-- Import Preview -->
            <div *ngIf="importPreview()" class="import-preview">
              <div class="section-header">
                <div class="section-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div>
                  <h3>Prévisualisation</h3>
                  <p>Vérifiez les données avant l'import final.</p>
                </div>
              </div>

              <!-- Stats -->
              <div class="stats-grid">
                <div class="stat-card total">
                  <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 11H5a2 2 0 00-2 2v5a2 2 0 002 2h4a2 2 0 002-2v-5a2 2 0 00-2-2zM21 11h-4a2 2 0 00-2 2v5a2 2 0 002 2h4a2 2 0 002-2v-5a2 2 0 00-2-2zM9 3H5a2 2 0 00-2 2v3a2 2 0 002 2h4a2 2 0 002-2V5a2 2 0 00-2-2z" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  </div>
                  <div class="stat-content">
                    <span class="stat-value">{{ importPreview()?.data?.stats?.total_rows || 0 }}</span>
                    <span class="stat-label">Lignes totales</span>
                  </div>
                </div>

                <div class="stat-card valid">
                  <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" stroke-width="2"/>
                      <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  </div>
                  <div class="stat-content">
                    <span class="stat-value">{{ importPreview()?.data?.stats?.valid_rows || 0 }}</span>
                    <span class="stat-label">Valides</span>
                  </div>
                </div>

                <div class="stat-card error">
                  <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                      <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                      <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  </div>
                  <div class="stat-content">
                    <span class="stat-value">{{ importPreview()?.data?.stats?.invalid_rows || 0 }}</span>
                    <span class="stat-label">Erreurs</span>
                  </div>
                </div>

                <div class="stat-card warning">
                  <div class="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2"/>
                      <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2"/>
                      <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  </div>
                  <div class="stat-content">
                    <span class="stat-value">{{ importPreview()?.data?.stats?.duplicates_found || 0 }}</span>
                    <span class="stat-label">Doublons</span>
                  </div>
                </div>
              </div>

              <!-- Duplicate Action -->
              <div *ngIf="(importPreview()?.data?.stats?.duplicates_found || 0) > 0" class="duplicate-section">
                <div class="section-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2"/>
                    <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2"/>
                    <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  <span>Gestion des doublons</span>
                </div>
                <div class="duplicate-options">
                  <label class="option" [class.selected]="duplicateAction === 'ignore'">
                    <input type="radio" [(ngModel)]="duplicateAction" value="ignore" name="duplicateAction">
                    <div class="option-content">
                      <span class="option-title">Ignorer</span>
                      <span class="option-desc">Laisser les données existantes inchangées</span>
                    </div>
                  </label>
                  <label class="option" [class.selected]="duplicateAction === 'update'">
                    <input type="radio" [(ngModel)]="duplicateAction" value="update" name="duplicateAction">
                    <div class="option-content">
                      <span class="option-title">Mettre à jour</span>
                      <span class="option-desc">Compléter les champs vides uniquement</span>
                    </div>
                  </label>
                  <label class="option" [class.selected]="duplicateAction === 'replace'">
                    <input type="radio" [(ngModel)]="duplicateAction" value="replace" name="duplicateAction">
                    <div class="option-content">
                      <span class="option-title">Remplacer</span>
                      <span class="option-desc">Écraser toutes les données existantes</span>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Errors -->
              <div *ngIf="importPreview()?.data?.errors?.length" class="errors-section">
                <h4>Erreurs détectées:</h4>
                <div class="error-list">
                  <div *ngFor="let error of importPreview()?.data?.errors || []" class="error-item">
                    <strong>Ligne {{ error.row_number }}:</strong>
                    <span>{{ getErrorMessage(error) }}</span>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="action-bar">
                <button class="btn btn-outline" (click)="resetImport()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <polyline points="1 4 1 10 7 10" stroke="currentColor" stroke-width="2"/>
                    <path d="M3.51 15a9 9 0 102.13-9.36L1 10" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  Recommencer
                </button>
                <button
                  class="btn btn-primary"
                  [disabled]="isLoading() || !canImport()"
                  (click)="executeImport()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  {{ isLoading() ? 'Import en cours...' : 'Importer ' + (importPreview()?.data?.stats?.valid_rows || 0) + ' clients' }}
                </button>
              </div>
            </div>

            <!-- Import Result -->
            <div *ngIf="importResult()" class="import-result">
              <div class="result-header">
                <div class="result-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" stroke-width="2"/>
                    <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <div>
                  <h3>Import terminé</h3>
                  <p>Voici le résumé des opérations effectuées.</p>
                </div>
              </div>

              <div class="result-stats">
                <div class="result-stat imported">
                  <div class="result-stat-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  </div>
                  <div class="result-stat-content">
                    <span class="result-stat-value">{{ importResult()?.data?.report?.imported || 0 }}</span>
                    <span class="result-stat-label">Nouveaux clients</span>
                  </div>
                </div>

                <div class="result-stat updated">
                  <div class="result-stat-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <polyline points="1 4 1 10 7 10" stroke="currentColor" stroke-width="2"/>
                      <path d="M3.51 15a9 9 0 102.13-9.36L1 10" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  </div>
                  <div class="result-stat-content">
                    <span class="result-stat-value">{{ importResult()?.data?.report?.updated || 0 }}</span>
                    <span class="result-stat-label">Mis à jour</span>
                  </div>
                </div>

                <div class="result-stat ignored">
                  <div class="result-stat-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  </div>
                  <div class="result-stat-content">
                    <span class="result-stat-value">{{ importResult()?.data?.report?.ignored || 0 }}</span>
                    <span class="result-stat-label">Ignorés</span>
                  </div>
                </div>
              </div>

              <div class="action-bar">
                <button class="btn btn-primary" (click)="finishImport()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" stroke-width="2"/>
                    <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  Terminer
                </button>
              </div>
            </div>
          </div>

          <!-- Export Mode -->
          <div *ngIf="currentMode() === 'export'" class="export-section">
            <div class="section-header">
              <div class="section-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="2"/>
                </svg>
              </div>
              <div>
                <h3>Exporter les données</h3>
                <p>Configurez et téléchargez vos données clients dans le format souhaité.</p>
              </div>
            </div>

            <div class="export-configuration">
              <!-- Format Selection -->
              <div class="config-section">
                <h4>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  Format de fichier
                </h4>
                <div class="format-options">
                  <label class="format-option" [class.selected]="exportFormat === 'csv'">
                    <input type="radio" [(ngModel)]="exportFormat" value="csv" name="format">
                    <div class="format-card">
                      <div class="format-icon csv">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
                          <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
                          <path d="M10 12h4M10 16h4" stroke="currentColor" stroke-width="2"/>
                        </svg>
                      </div>
                      <div class="format-content">
                        <span class="format-title">CSV</span>
                        <span class="format-desc">Compatible universellement</span>
                      </div>
                    </div>
                  </label>

                  <label class="format-option" [class.selected]="exportFormat === 'excel'">
                    <input type="radio" [(ngModel)]="exportFormat" value="excel" name="format">
                    <div class="format-card">
                      <div class="format-icon excel">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                          <path d="M8 8h8M8 12h8M8 16h4" stroke="currentColor" stroke-width="2"/>
                        </svg>
                      </div>
                      <div class="format-content">
                        <span class="format-title">Excel</span>
                        <span class="format-desc">Formatage avancé</span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Column Selection -->
              <div class="config-section">
                <h4>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 11H5a2 2 0 00-2 2v5a2 2 0 002 2h4a2 2 0 002-2v-5a2 2 0 00-2-2zM21 11h-4a2 2 0 00-2 2v5a2 2 0 002 2h4a2 2 0 002-2v-5a2 2 0 00-2-2z" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  Colonnes à inclure
                </h4>
                <div class="columns-grid">
                  <label *ngFor="let column of availableColumns" class="column-option" [class.required]="column.required" [class.selected]="isColumnSelected(column.key)">
                    <input
                      type="checkbox"
                      [checked]="isColumnSelected(column.key)"
                      [disabled]="column.required"
                      (change)="toggleColumn(column.key)">
                    <div class="column-content">
                      <span class="column-title">{{ column.label }}</span>
                      <span *ngIf="column.required" class="required-badge">Requis</span>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Filters -->
              <div class="config-section">
                <h4>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  Filtres
                </h4>
                <div class="filters-grid">
                  <div class="filter-group">
                    <label class="filter-label">Type de client</label>
                    <select [(ngModel)]="clientTypeFilter" class="filter-select">
                      <option value="">Tous les types</option>
                      <option value="particulier">Particuliers</option>
                      <option value="entreprise">Entreprises</option>
                    </select>
                  </div>

                  <div class="filter-group">
                    <label class="filter-label">Statut</label>
                    <select [(ngModel)]="statusFilter" class="filter-select">
                      <option value="">Tous les statuts</option>
                      <option value="true">Actifs uniquement</option>
                      <option value="false">Inactifs uniquement</option>
                    </select>
                  </div>

                  <div class="filter-group">
                    <label class="filter-label">Limite d'export</label>
                    <input
                      type="number"
                      [(ngModel)]="exportLimit"
                      min="1"
                      max="10000"
                      placeholder="Max 10 000"
                      class="filter-input">
                  </div>
                </div>
              </div>
            </div>

            <div class="action-bar">
              <button
                class="btn btn-primary"
                [disabled]="isLoading() || !canExport()"
                (click)="executeExport()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="2"/>
                </svg>
                {{ getExportButtonText() }}
              </button>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="isLoading()" class="loading-overlay">
          <div class="loading-content">
            <div class="spinner">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12a9 9 0 11-6.219-8.56" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <p>Traitement en cours...</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './import-export-modal.component.scss'
})
export class ImportExportModalComponent {
  @Input() isVisible = false;
  @Output() close = new EventEmitter<void>();
  @Output() importCompleted = new EventEmitter<void>();

  private readonly downloadTemplateUseCase = inject(DownloadTemplateUseCase);
  private readonly previewImportUseCase = inject(PreviewImportUseCase);
  private readonly importClientsUseCase = inject(ImportClientsUseCase);
  private readonly exportClientsUseCase = inject(ExportClientsUseCase);
  private readonly messageService = inject(MessageService);

  currentMode = signal<ImportExportMode>('template');
  isLoading = signal(false);
  selectedFile = signal<File | null>(null);
  importPreview = signal<ImportPreviewResponse | null>(null);
  importResult = signal<ImportResponse | null>(null);

  duplicateAction: DuplicateAction = 'ignore';
  exportFormat: ExportFormat = 'csv';
  exportColumns = signal<string[]>(['client_id', 'name', 'type', 'email', 'phone']);
  exportFilters = signal<any>({});
  exportLimit = 1000;
  clientTypeFilter: '' | 'particulier' | 'entreprise' = '';
  statusFilter: '' | 'true' | 'false' = '';

  availableColumns = AVAILABLE_EXPORT_COLUMNS;

  canImport = computed(() => {
    const preview = this.importPreview();
    return preview && preview.data.stats.valid_rows > 0;
  });

  canExport = computed(() => {
    return this.exportColumns().length > 0 && this.exportLimit >= 1 && this.exportLimit <= 10000;
  });

  getModalTitle(): string {
    switch (this.currentMode()) {
      case 'template': return 'Modèles d\'import';
      case 'import': return 'Importer des clients';
      case 'export': return 'Exporter des clients';
      default: return '';
    }
  }

  getModalDescription(): string {
    switch (this.currentMode()) {
      case 'template': return 'Téléchargez des modèles pré-formatés pour faciliter vos imports';
      case 'import': return 'Importez vos données clients depuis un fichier CSV ou Excel';
      case 'export': return 'Exportez vos données clients dans le format souhaité';
      default: return '';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  removeFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile.set(null);
  }

  getExportButtonText(): string {
    return this.isLoading() ? 'Export en cours...' : "Télécharger l'export";
  }

  setMode(mode: ImportExportMode): void {
    this.currentMode.set(mode);
    this.resetState();
  }

  closeModal(): void {
    this.close.emit();
  }

  async downloadTemplate(format: ExportFormat): Promise<void> {
    try {
      this.isLoading.set(true);
      const blob = await this.downloadTemplateUseCase.execute(format).toPromise();
      if (blob) {
        this.downloadBlob(blob, `template_clients.${format === 'excel' ? 'xlsx' : 'csv'}`);
        this.messageService.showSuccess(`Modèle ${format.toUpperCase()} téléchargé avec succès`);
      }
    } catch (error: any) {
      this.messageService.showError(error.message || 'Erreur lors du téléchargement');
    } finally {
      this.isLoading.set(false);
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
    }
  }

  async previewImport(): Promise<void> {
    const file = this.selectedFile();
    if (!file) return;

    try {
      this.isLoading.set(true);
      const response = await this.previewImportUseCase.execute({
        file,
        mapping: DEFAULT_IMPORT_MAPPING
      }).toPromise();

      if (response) {
        this.importPreview.set(response);
        this.messageService.showSuccess('Analyse terminée');
      }
    } catch (error: any) {
      this.messageService.showError(error.message || 'Erreur lors de l\'analyse');
    } finally {
      this.isLoading.set(false);
    }
  }

  async executeImport(): Promise<void> {
    const file = this.selectedFile();
    if (!file || !this.canImport()) return;

    try {
      this.isLoading.set(true);
      const response = await this.importClientsUseCase.execute({
        file,
        mapping: DEFAULT_IMPORT_MAPPING,
        duplicate_action: this.duplicateAction
      }).toPromise();

      if (response) {
        this.importResult.set(response);
        this.messageService.showSuccess(`Import terminé: ${response.data.report.imported} clients importés`);
      }
    } catch (error: any) {
      this.messageService.showError(error.message || 'Erreur lors de l\'import');
    } finally {
      this.isLoading.set(false);
    }
  }

  async executeExport(): Promise<void> {
    if (!this.canExport()) return;

    const exportRequest: ExportRequest = {
      format: this.exportFormat,
      columns: this.exportColumns(),
      limit: this.exportLimit,
      filters: {
        type: this.clientTypeFilter === '' ? undefined : this.clientTypeFilter,
        is_active: this.statusFilter === '' ? undefined : this.statusFilter === 'true'
      }
    };

    try {
      this.isLoading.set(true);
      const blob = await this.exportClientsUseCase.execute(exportRequest).toPromise();
      if (blob) {
        const extension = this.exportFormat === 'excel' ? 'xlsx' : 'csv';
        const filename = `export_clients_${new Date().toISOString().split('T')[0]}.${extension}`;
        this.downloadBlob(blob, filename);
        this.messageService.showSuccess('Export téléchargé avec succès');
        this.closeModal();
      }
    } catch (error: any) {
      this.messageService.showError(error.message || 'Erreur lors de l\'export');
    } finally {
      this.isLoading.set(false);
    }
  }

  resetImport(): void {
    this.selectedFile.set(null);
    this.importPreview.set(null);
    this.importResult.set(null);
  }

  finishImport(): void {
    this.importCompleted.emit();
    this.closeModal();
  }

  isColumnSelected(columnKey: string): boolean {
    return this.exportColumns().includes(columnKey);
  }

  toggleColumn(columnKey: string): void {
    const columns = this.exportColumns();
    const column = this.availableColumns.find(col => col.key === columnKey);

    if (column?.required) return;

    if (columns.includes(columnKey)) {
      this.exportColumns.set(columns.filter(col => col !== columnKey));
    } else {
      this.exportColumns.set([...columns, columnKey]);
    }
  }

  getErrorMessage(error: any): string {
    if (error.validation?.errors) {
      return Object.values(error.validation.errors).flat().join(', ');
    }
    return 'Erreur de validation';
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private resetState(): void {
    this.isLoading.set(false);
    this.selectedFile.set(null);
    this.importPreview.set(null);
    this.importResult.set(null);
    this.duplicateAction = 'ignore';
    this.exportFormat = 'csv';
    this.exportColumns.set(['client_id', 'name', 'type', 'email', 'phone']);
    this.exportFilters.set({});
    this.exportLimit = 1000;
    this.clientTypeFilter = '';
    this.statusFilter = '';
  }
}