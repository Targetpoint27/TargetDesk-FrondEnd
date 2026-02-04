import { Component, Input, OnInit, OnDestroy, signal, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Subject, takeUntil, Observable } from 'rxjs';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { PermissionService } from '../../../core/auth/permission.service';
import { PERMISSIONS } from '../../../domain/models/permission.models';

import { ClientDocumentFacade, DocumentsState } from '../../../features/dashboard/clients/document.facade';
import { Document, DocumentCategory, DocumentVersion, UpdateDocumentRequest, DocumentSortField } from '../../../domain/entities/document.entity';
import { MessageService } from '../../services/message.service';

@Component({
  selector: 'app-client-documents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PdfViewerModule
  ],
  template: `
    <div class="document-management-container">
      <!-- Header Section -->
      <header class="document-header">
        <div class="header-left">
          <h2>Documents du client</h2>
          @if (documentsState().statistics) {
            <div class="stats-bar">
              <div class="stat-badge">
                <i class="bi bi-file-earmark"></i>
                <span>{{ documentsState().statistics.total_documents }} documents</span>
              </div>
              <div class="stat-badge">
                <i class="bi bi-hdd"></i>
                <span>{{ documentsState().statistics.formatted_total_size }}</span>
              </div>
            </div>
          }
        </div>
        <div class="header-actions">
          @if (canCreateDocument$ | async) {
            <button class="btn btn-primary" (click)="onAddDocument()">
              <i class="bi bi-plus-circle"></i>
              Ajouter un document
            </button>
          }
        </div>
      </header>

      <!-- Search and Filter Bar -->
      <div class="filter-bar d-flex flex-column gap-3">
        <div class="search-section">
          <div class="search-input-container">
            <i class="bi bi-search search-icon"></i>
            <input
              type="text"
              class="form-control search-input"
              placeholder="Rechercher dans les documents..."
              [(ngModel)]="searchTerm"
              (input)="onSearch()">
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 15px; flex-wrap: nowrap;">
          <select class="form-select" style="width: 180px;" [(ngModel)]="selectedCategory" (change)="onCategoryFilter()">
            <option value="">Toutes catégories</option>
            <option value="contrat">Contrats</option>
            <option value="devis">Devis</option>
            <option value="facture">Factures</option>
            <option value="autre">Autres</option>
          </select>

          <select class="form-select" style="width: 150px;" [(ngModel)]="sortBy" (change)="onSortChange()">
            <option value="date">Plus récents</option>
            <option value="name">Nom A-Z</option>
            <option value="size">Taille</option>
            <option value="type">Type</option>
          </select>

          <div class="btn-group" style="margin-left: 10px;" role="group">
            <button type="button"
                    class="btn"
                    style="border-radius: 0;"
                    [class.btn-primary]="viewMode === 'grid'"
                    [class.btn-outline-secondary]="viewMode !== 'grid'"
                    (click)="viewMode = 'grid'">
              <i class="bi bi-grid-3x3-gap"></i>
            </button>
            <button type="button"
                    class="btn"
                    style="border-radius: 0;"
                    [class.btn-primary]="viewMode === 'list'"
                    [class.btn-outline-secondary]="viewMode !== 'list'"
                    (click)="viewMode = 'list'">
              <i class="bi bi-list-ul"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      @if (documentsState().isLoading) {
        <div class="loading-state text-center">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Chargement...</span>
          </div>
          <h4>Chargement des documents...</h4>
        </div>
      }

      <!-- Error State -->
      @if (documentsState().error) {
        <div class="error-state text-center">
          <i class="bi bi-exclamation-triangle-fill text-danger"></i>
          <h4>Erreur de chargement</h4>
          <p>{{ documentsState().error }}</p>
          <button class="btn btn-primary" (click)="loadDocuments()">
            <i class="bi bi-arrow-clockwise"></i>
            Réessayer
          </button>
        </div>
      }

      <!-- Empty State -->
      @if (!documentsState().isLoading && !documentsState().error && documentsState().documents.length === 0) {
        <div class="empty-state text-center">
          <i class="bi bi-folder-x"></i>
          <h4>Aucun document disponible</h4>
          <p>Ce client n'a pas encore de documents.</p>
          @if (canCreateDocument$ | async) {
            <button class="btn btn-primary" (click)="onAddDocument()">
              <i class="bi bi-cloud-upload"></i>
              Ajouter le premier document
            </button>
          }
        </div>
      }

      <!-- Documents Content -->
      @if (!documentsState().isLoading && !documentsState().error && documentsState().documents.length > 0) {

        <!-- Grid View -->
        @if (viewMode === 'grid') {
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
            @for (document of documentsState().documents; track document.id) {
              <div class="card document-card" style="height: auto; min-height: 200px;">
                <div class="dropdown" [class.show]="openDropdown === document.id">
                  <button
                    class="btn btn-link dropdown-toggle"
                    type="button"
                    style="position: absolute; top: 10px; right: 10px; z-index: 10;"
                    (click)="toggleDropdown(document.id); $event.stopPropagation()">
                    <i class="bi bi-three-dots-vertical"></i>
                  </button>
                  <ul class="dropdown-menu" [class.show]="openDropdown === document.id" (click)="$event.stopPropagation()">
                    @if (canViewDocument$ | async) {
                      <li><button type="button" class="dropdown-item" (click)="onPreview(document); closeDropdown()">
                        <i class="bi bi-eye"></i> Aperçu
                      </button></li>
                    }
                    @if (canViewDocument$ | async) {
                      <li><button type="button" class="dropdown-item" (click)="onDownload(document); closeDropdown()">
                        <i class="bi bi-download"></i> Télécharger
                      </button></li>
                    }
                    @if (canUpdateDocument$ | async) {
                      <li><button type="button" class="dropdown-item" (click)="onEdit(document); closeDropdown()">
                        <i class="bi bi-pencil"></i> Modifier
                      </button></li>
                    }
                    @if ((canViewDocument$ | async) || (canUpdateDocument$ | async) || (canDeleteDocument$ | async)) {
                      <li><hr class="dropdown-divider"></li>
                    }
                    @if (canDeleteDocument$ | async) {
                      <li><button type="button" class="dropdown-item text-danger" (click)="onDelete(document); closeDropdown()">
                        <i class="bi bi-trash"></i> Supprimer
                      </button></li>
                    }
                  </ul>
                </div>

                <div class="card-body text-center" style="padding: 20px;">
                  <div class="file-icon" style="font-size: 48px; margin-bottom: 15px; color: #6c757d;">
                    <i class="{{ getFileIcon(document.mimeType) }}"></i>
                  </div>
                  <h6 class="card-title" style="font-size: 14px; font-weight: 600; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ document.title }}</h6>
                  <p class="card-text" style="font-size: 12px; color: #6c757d; margin-bottom: 10px;">
                    {{ document.formattedSize }} • {{ formatDate(document.updatedAt) }}
                  </p>
                  <span class="badge bg-secondary" style="font-size: 11px;">{{ document.categoryInfo.label }}</span>
                </div>
              </div>
            }
          </div>
        }

        <!-- List View -->
        @if (viewMode === 'list') {
          <div style="width: 100%; overflow-x: auto;">
            <table class="table table-hover" style="width: 100%; min-width: 100%;">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      class="form-check-input"
                      [checked]="isAllSelected()"
                      [indeterminate]="isPartiallySelected()"
                      (change)="toggleSelectAll()">
                  </th>
                  <th>Document</th>
                  <th>Catégorie</th>
                  <th>Taille</th>
                  <th>Modifié</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (document of documentsState().documents; track document.id) {
                  <tr [class.table-active]="isSelected(document.id)">
                    <td>
                      <input
                        type="checkbox"
                        class="form-check-input"
                        [checked]="isSelected(document.id)"
                        (change)="toggleSelection(document.id)">
                    </td>
                    <td>
                      <div class="d-flex align-items-center">
                        <i class="{{ getFileIcon(document.mimeType) }} me-2"></i>
                        <div>
                          <div>{{ document.title }}</div>
                          <small class="text-muted">{{ document.originalName }}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="badge bg-secondary">{{ document.categoryInfo.label }}</span>
                    </td>
                    <td>{{ document.formattedSize }}</td>
                    <td>{{ formatDate(document.updatedAt) }}</td>
                    <td>
                      <div class="btn-group btn-group-sm">
                        @if (canViewDocument$ | async) {
                          <button class="btn btn-outline-primary" (click)="onPreview(document)" title="Aperçu">
                            <i class="bi bi-eye"></i>
                          </button>
                        }
                        @if (canViewDocument$ | async) {
                          <button class="btn btn-outline-secondary" (click)="onDownload(document)" title="Télécharger">
                            <i class="bi bi-download"></i>
                          </button>
                        }
                        @if (canUpdateDocument$ | async) {
                          <button class="btn btn-outline-secondary" (click)="onEdit(document)" title="Modifier">
                            <i class="bi bi-pencil"></i>
                          </button>
                        }
                        @if (canDeleteDocument$ | async) {
                          <button class="btn btn-outline-danger" (click)="onDelete(document)" title="Supprimer">
                            <i class="bi bi-trash"></i>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }

      <!-- Upload Modal -->
      @if (showUploadModal()) {
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center"
             (click)="onCloseUploadModal()">
          <div class="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4"
               (click)="$event.stopPropagation()">

            <!-- Header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                <i class="bi bi-cloud-upload mr-2 text-blue-600"></i>
                Ajouter un document
              </h3>
              <button type="button"
                      class="text-gray-400 hover:text-gray-600 transition-colors"
                      (click)="onCloseUploadModal()">
                <i class="bi bi-x text-xl"></i>
              </button>
            </div>

            <form [formGroup]="uploadForm" (ngSubmit)="onSubmitUpload()">
              <div class="p-6">
                  <!-- Upload Zone -->
                  <div class="relative border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                       [class.border-blue-400]="isDragOver"
                       [class.bg-blue-50]="isDragOver"
                       [class.border-green-400]="selectedFile"
                       [class.bg-green-50]="selectedFile"
                       (dragover)="onDragOver($event)"
                       (dragleave)="onDragLeave($event)"
                       (drop)="onDrop($event)"
                       (click)="fileInput.click()">

                    @if (!selectedFile) {
                      <div class="space-y-4">
                        <i class="bi bi-cloud-arrow-up text-4xl text-gray-400"></i>
                        <div>
                          <h4 class="text-lg font-medium text-gray-700">Glissez votre fichier ici</h4>
                          <p class="text-gray-500 mt-1">ou cliquez pour parcourir</p>
                        </div>
                        <div class="text-xs text-gray-400">
                          PDF, Word, Excel, PowerPoint, Images
                        </div>
                      </div>
                    } @else {
                      <div class="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
                        <div class="flex items-center space-x-3">
                          <i class="{{ getFileIcon(selectedFile.type || '') }} text-2xl"></i>
                          <div class="text-left">
                            <div class="font-medium text-gray-900">{{ selectedFile.name }}</div>
                            <div class="text-sm text-gray-500">{{ formatFileSize(selectedFile.size || 0) }}</div>
                          </div>
                        </div>
                        <button type="button"
                                class="text-red-400 hover:text-red-600 transition-colors"
                                (click)="removeFile(); $event.stopPropagation()"
                                title="Supprimer le fichier">
                          <i class="bi bi-x text-xl"></i>
                        </button>
                      </div>
                    }
                  </div>

                  <input #fileInput type="file" class="hidden" (change)="onFileSelected($event)"
                         accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.bmp,.svg,.webp,.txt,.csv,.rtf"
                         multiple="false">

                  <!-- Form Fields -->
                  <div class="space-y-6 mt-6">
                    <div>
                      <label for="title" class="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <i class="bi bi-card-text mr-2"></i>
                        Titre du document *
                      </label>
                      <input
                        type="text"
                        id="title"
                        formControlName="title"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        [class.border-red-500]="uploadForm.get('title')?.invalid && uploadForm.get('title')?.touched"
                        [class.focus:ring-red-500]="uploadForm.get('title')?.invalid && uploadForm.get('title')?.touched"
                        placeholder="Entrez le nom du document">
                      @if (uploadForm.get('title')?.invalid && uploadForm.get('title')?.touched) {
                        <div class="flex items-center mt-1 text-sm text-red-600">
                          <i class="bi bi-exclamation-circle mr-1"></i>
                          Le titre est obligatoire
                        </div>
                      }
                    </div>

                    <div>
                      <label for="category" class="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <i class="bi bi-tag mr-2"></i>
                        Catégorie *
                      </label>
                      <select
                        id="category"
                        formControlName="category"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        [class.border-red-500]="uploadForm.get('category')?.invalid && uploadForm.get('category')?.touched"
                        [class.focus:ring-red-500]="uploadForm.get('category')?.invalid && uploadForm.get('category')?.touched">
                        <option value="">Choisir une catégorie</option>
                        <option value="contrat">Contrat</option>
                        <option value="devis">Devis</option>
                        <option value="facture">Facture</option>
                        <option value="autre">Autre</option>
                      </select>
                      @if (uploadForm.get('category')?.invalid && uploadForm.get('category')?.touched) {
                        <div class="flex items-center mt-1 text-sm text-red-600">
                          <i class="bi bi-exclamation-circle mr-1"></i>
                          Veuillez sélectionner une catégorie
                        </div>
                      }
                    </div>

                    <div>
                      <label for="description" class="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <i class="bi bi-file-text mr-2"></i>
                        Description <span class="text-gray-500">(optionnel)</span>
                      </label>
                      <textarea
                        id="description"
                        formControlName="description"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows="3"
                        placeholder="Ajoutez une description du document..."></textarea>
                    </div>
                  </div>

                  <!-- Upload Progress -->
                  @if (documentsState().isUploading) {
                    <div class="mt-6">
                      <div class="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Téléchargement en cours...</span>
                        <span>{{ documentsState().uploadProgress }}%</span>
                      </div>
                      <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                             [style.width.%]="documentsState().uploadProgress"></div>
                      </div>
                    </div>
                  }
                </div>

                <!-- Footer -->
                <div class="flex justify-end space-x-3 px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                  <button type="button"
                          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          (click)="onCloseUploadModal()"
                          [disabled]="documentsState().isUploading">
                    Annuler
                  </button>
                  <button type="submit"
                          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          [disabled]="uploadForm.invalid || !selectedFile || documentsState().isUploading">
                    @if (documentsState().isUploading) {
                      <span class="inline-flex items-center">
                        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Téléchargement...
                      </span>
                    } @else {
                      <span class="inline-flex items-center">
                        <i class="bi bi-cloud-check mr-2"></i>
                        Ajouter le document
                      </span>
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
      }

      <!-- Preview Modal -->
      @if (showPreviewModal()) {
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
             (click)="onClosePreviewModal()">
          <div class="relative bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col"
               (click)="$event.stopPropagation()">

            <!-- Header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                <i class="bi bi-eye mr-2 text-blue-600"></i>
                <span class="truncate">Aperçu - {{ currentPreviewDocument?.title }}</span>
              </h3>
              <button type="button"
                      class="text-gray-400 hover:text-gray-600 transition-colors"
                      (click)="onClosePreviewModal()">
                <i class="bi bi-x text-xl"></i>
              </button>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-hidden p-4" style="min-height: 400px; position: relative;">
                <div [style.display]="loadingPreview ? 'flex' : 'none'" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
                  <div class="text-center">
                    <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                    <p class="mt-4 text-gray-600">Chargement de l'aperçu...</p>
                  </div>
                </div>

                <div [style.display]="!loadingPreview && previewUrl ? 'block' : 'none'" class="h-full w-full">
                  <div [style.display]="currentPreviewDocument?.mimeType?.includes('pdf') ? 'block' : 'none'" class="h-full w-full">
                    <pdf-viewer
                      [src]="previewUrl || ''"
                      [render-text]="true"
                      [original-size]="false"
                      [fit-to-page]="true"
                      [zoom]="1"
                      [show-all]="true"
                      [page]="1"
                      class="w-full h-full min-h-96">
                    </pdf-viewer>
                  </div>

                  <div [style.display]="currentPreviewDocument?.mimeType?.includes('image') ? 'flex' : 'none'" class="flex items-center justify-center h-full">
                    <img [src]="previewUrl" class="max-w-full max-h-full object-contain" alt="Aperçu du document">
                  </div>

                  <div [style.display]="!currentPreviewDocument?.mimeType?.includes('pdf') && !currentPreviewDocument?.mimeType?.includes('image') ? 'flex' : 'none'" class="flex items-center justify-center h-full">
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center max-w-md">
                      <i class="bi bi-info-circle text-blue-600 text-2xl mb-3"></i>
                      <p class="text-blue-800">Aperçu non disponible pour ce type de fichier.</p>
                    </div>
                  </div>
                </div>

                <div [style.display]="!loadingPreview && !previewUrl ? 'flex' : 'none'" class="flex items-center justify-center h-full">
                  <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-md">
                    <i class="bi bi-exclamation-triangle text-red-600 text-2xl mb-3"></i>
                    <p class="text-red-800">Erreur lors du chargement de l'aperçu.</p>
                  </div>
                </div>
            </div>

              <!-- Footer -->
              <div class="flex justify-end space-x-3 px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                <button type="button"
                        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        (click)="onClosePreviewModal()">
                  Fermer
                </button>
                <button type="button"
                        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        (click)="onDownload(currentPreviewDocument!)">
                  <span class="inline-flex items-center">
                    <i class="bi bi-download mr-2"></i>
                    Télécharger
                  </span>
                </button>
              </div>
            </div>
        </div>
      }

      <!-- Edit Modal -->
      @if (showEditModal() && editingDocument) {
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center"
             (click)="onCloseEditModal()">
          <div class="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4"
               (click)="$event.stopPropagation()">

            <!-- Header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                <i class="bi bi-pencil mr-2 text-blue-600"></i>
                Modifier le document
              </h3>
              <button type="button"
                      class="text-gray-400 hover:text-gray-600 transition-colors"
                      (click)="onCloseEditModal()">
                <i class="bi bi-x text-xl"></i>
              </button>
            </div>

            <form [formGroup]="editForm" (ngSubmit)="onSubmitEdit()">
              <div class="p-6">
                  <div class="space-y-6">
                    <div>
                      <label for="editTitle" class="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <i class="bi bi-card-text mr-2"></i>
                        Titre du document *
                      </label>
                      <input
                        type="text"
                        id="editTitle"
                        formControlName="title"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        [class.border-red-500]="editForm.get('title')?.invalid && editForm.get('title')?.touched"
                        [class.focus:ring-red-500]="editForm.get('title')?.invalid && editForm.get('title')?.touched"
                        placeholder="Entrez le nom du document">
                      @if (editForm.get('title')?.invalid && editForm.get('title')?.touched) {
                        <div class="flex items-center mt-1 text-sm text-red-600">
                          <i class="bi bi-exclamation-circle mr-1"></i>
                          Le titre est obligatoire
                        </div>
                      }
                    </div>

                    <div>
                      <label for="editCategory" class="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <i class="bi bi-tag mr-2"></i>
                        Catégorie *
                      </label>
                      <select
                        id="editCategory"
                        formControlName="category"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        [class.border-red-500]="editForm.get('category')?.invalid && editForm.get('category')?.touched"
                        [class.focus:ring-red-500]="editForm.get('category')?.invalid && editForm.get('category')?.touched">
                        <option value="">Choisir une catégorie</option>
                        <option value="contrat">Contrat</option>
                        <option value="devis">Devis</option>
                        <option value="facture">Facture</option>
                        <option value="autre">Autre</option>
                      </select>
                      @if (editForm.get('category')?.invalid && editForm.get('category')?.touched) {
                        <div class="flex items-center mt-1 text-sm text-red-600">
                          <i class="bi bi-exclamation-circle mr-1"></i>
                          Veuillez sélectionner une catégorie
                        </div>
                      }
                    </div>

                    <div>
                      <label for="editDescription" class="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <i class="bi bi-file-text mr-2"></i>
                        Description <span class="text-gray-500">(optionnel)</span>
                      </label>
                      <textarea
                        id="editDescription"
                        formControlName="description"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows="3"
                        placeholder="Ajoutez une description..."></textarea>
                    </div>
                  </div>
                </div>

                <!-- Footer -->
                <div class="flex justify-end space-x-3 px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                  <button type="button"
                          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          (click)="onCloseEditModal()">
                    Annuler
                  </button>
                  <button type="submit"
                          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          [disabled]="editForm.invalid">
                    <span class="inline-flex items-center">
                      <i class="bi bi-check-circle mr-2"></i>
                      Enregistrer les modifications
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
      }
  `,
  styleUrl: './client-documents.component.scss'
})
export class ClientDocumentsComponent implements OnInit, OnDestroy {
  @Input() clientId!: number;

  private destroy$ = new Subject<void>();

  // State
  documentsState = signal<DocumentsState>({
    documents: [],
    statistics: {
      total_documents: 0,
      total_size: 0,
      formatted_total_size: '0 B',
      by_category: { contrat: 0, devis: 0, facture: 0, autre: 0 }
    },
    selectedDocument: null,
    isLoading: false,
    isUploading: false,
    uploadProgress: 0,
    error: null,
    filters: { latest_only: true },
    searchTerm: ''
  });

  // UI State
  searchTerm = '';
  selectedCategory = '';
  sortBy: DocumentSortField = 'date';
  viewMode: 'grid' | 'list' = 'grid';
  showUploadModal = signal(false);
  showEditModal = signal(false);
  showVersionsModal = signal(false);
  showPreviewModal = signal(false);
  showFilters = false;
  openDropdown: number | null = null;
  isDragOver = false;
  selectedFile: File | null = null;

  // Selection
  selectedDocuments: number[] = [];

  // Modal Data
  editingDocument: Document | null = null;
  currentPreviewDocument: Document | null = null;
  selectedDocumentVersions: DocumentVersion[] | null = null;
  loadingVersions = false;
  loadingPreview = false;
  previewUrl: string | null = null;

  // Filters
  filters = {
    dateFrom: '',
    dateTo: '',
    sizeRange: '',
    latestOnly: true
  };

  // Forms
  uploadForm: FormGroup;
  editForm: FormGroup;

  // Permission observables
  canCreateDocument$!: Observable<boolean>;
  canUpdateDocument$!: Observable<boolean>;
  canDeleteDocument$!: Observable<boolean>;
  canViewDocument$!: Observable<boolean>;

  private permissionService = inject(PermissionService);

  constructor(
    private documentFacade: ClientDocumentFacade,
    private messageService: MessageService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    // Explicitly initialize modal states to false
    this.showUploadModal.set(false);
    this.showEditModal.set(false);
    this.showVersionsModal.set(false);
    this.showPreviewModal.set(false);
    this.showFilters = false;

    this.uploadForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2)]],
      category: ['', Validators.required],
      description: ['']
    });

    this.editForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2)]],
      category: ['', Validators.required],
      description: ['']
    });
  }

  ngOnInit(): void {
    if (!this.clientId) {
      console.error('ClientDocumentsComponent: clientId is required');
      return;
    }

    // Initialize permission observables
    this.canCreateDocument$ = this.permissionService.hasPermission(PERMISSIONS.DOCUMENTS_CREATE);
    this.canUpdateDocument$ = this.permissionService.hasPermission(PERMISSIONS.DOCUMENTS_UPDATE);
    this.canDeleteDocument$ = this.permissionService.hasPermission(PERMISSIONS.DOCUMENTS_DELETE);
    this.canViewDocument$ = this.permissionService.hasPermission(PERMISSIONS.DOCUMENTS_READ);

    // Ensure all modals are closed on init
    this.showUploadModal.set(false);
    this.showEditModal.set(false);
    this.showVersionsModal.set(false);
    this.showPreviewModal.set(false);
    this.showFilters = false;

    // Subscribe to facade state
    this.documentFacade.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.documentsState.set(state);
        this.cdr.detectChanges();
      });

    // Close dropdown when clicking outside
    document.addEventListener('click', this.onDocumentClick.bind(this));

    this.loadDocuments();
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.onDocumentClick.bind(this));
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDocuments(): void {
    this.documentFacade.loadDocuments(this.clientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  retryLoading(): void {
    this.loadDocuments();
  }

  // Search and Filter
  onSearch(): void {
    if (this.searchTerm.trim()) {
      this.documentFacade.searchDocuments(this.clientId, this.searchTerm)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    } else {
      this.loadDocuments();
    }
  }

  onCategoryFilter(): void {
    const filters = this.selectedCategory
      ? { category: this.selectedCategory as DocumentCategory, latest_only: true }
      : { latest_only: true };

    this.documentFacade.applyFilters(this.clientId, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  // Document Actions
  onAddDocument(): void {
    this.showUploadModal.set(true);
    this.selectedFile = null;
    this.uploadForm.reset();
    this.cdr.detectChanges();
  }

  onPreview(document: Document): void {
    if (!document.canPreview) {
      this.messageService.showInfo('Aperçu non disponible pour ce type de document');
      return;
    }

    this.currentPreviewDocument = document;
    this.loadingPreview = true;
    this.previewUrl = null;
    this.showPreviewModal.set(true);

    // Force immediate change detection after modal opens
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);

    this.documentFacade.previewDocument(this.clientId, document.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (previewUrl) => {
          this.previewUrl = previewUrl;
          this.loadingPreview = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.messageService.showError('Erreur lors de l\'ouverture de l\'aperçu');
          this.loadingPreview = false;
          this.cdr.detectChanges();
        }
      });
  }

  onDownload(document: Document): void {
    this.documentFacade.downloadDocument(this.clientId, document.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.showSuccess('Téléchargement démarré');
        },
        error: () => {
          this.messageService.showError('Erreur lors du téléchargement');
        }
      });
  }

  downloadDocument(document: Document): void {
    this.onDownload(document);
  }


  editDocument(document: Document): void {
    this.onEdit(document);
  }

  showVersions(document: Document): void {
    this.onVersions(document);
  }

  deleteDocument(document: Document): void {
    this.onDelete(document);
  }

  onEdit(document: Document): void {
    this.editingDocument = document;
    this.editForm.patchValue({
      title: document.title,
      category: document.category,
      description: document.description || ''
    });
    this.showEditModal.set(true);
    this.closeDropdown();
  }

  onVersions(document: Document): void {
    this.editingDocument = document;
    this.loadingVersions = true;
    this.showVersionsModal.set(true);
    this.closeDropdown();

    this.documentFacade.getDocumentVersions(this.clientId, document.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (versions) => {
          this.selectedDocumentVersions = versions;
          this.loadingVersions = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.messageService.showError('Erreur lors du chargement des versions');
          this.loadingVersions = false;
          this.onCloseVersionsModal();
        }
      });
  }

  onDuplicate(_document: Document): void {
    // TODO: Implement document duplication
    this.messageService.showInfo('Fonctionnalité de duplication à venir');
    this.closeDropdown();
  }

  onDelete(document: Document): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${document.title}" ?`)) {
      this.documentFacade.deleteDocument(this.clientId, document.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.showSuccess('Document supprimé avec succès');
          },
          error: () => {
            this.messageService.showError('Erreur lors de la suppression');
          }
        });
    }
    this.closeDropdown();
  }

  // Upload Modal
  onCloseUploadModal(): void {
    if (this.documentsState().isUploading) {
      if (!confirm('Un téléchargement est en cours. Voulez-vous vraiment fermer ?')) {
        return;
      }
    }
    this.showUploadModal.set(false);
    this.selectedFile = null;
    this.uploadForm.reset();
  }

  onSubmitUpload(): void {
    if (this.uploadForm.invalid || !this.selectedFile) return;

    const formValue = this.uploadForm.value;
    const request = {
      file: this.selectedFile,
      title: formValue.title,
      category: formValue.category,
      description: formValue.description || undefined
    };

    this.documentFacade.uploadDocument(this.clientId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.showSuccess('Document ajouté avec succès');
          this.onCloseUploadModal();
        },
        error: () => {
          this.messageService.showError('Erreur lors de l\'ajout du document');
        }
      });
  }

  // File Upload
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.updateTitleFromFile();
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.selectedFile = event.dataTransfer.files[0];
      this.updateTitleFromFile();
    }
  }

  removeFile(): void {
    this.selectedFile = null;
  }

  private updateTitleFromFile(): void {
    if (this.selectedFile && !this.uploadForm.get('title')?.value) {
      const nameWithoutExtension = this.selectedFile.name.replace(/\.[^/.]+$/, '');
      this.uploadForm.patchValue({ title: nameWithoutExtension });
    }
  }

  // Dropdown
  toggleDropdown(documentId: number): void {
    this.openDropdown = this.openDropdown === documentId ? null : documentId;
  }

  closeDropdown(): void {
    this.openDropdown = null;
  }

  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown')) {
      this.closeDropdown();
    }
  }

  // Utility methods
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  formatDateString(dateString: string): string {
    return this.formatDate(new Date(dateString));
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(mimeType: string): string {
    if (mimeType.includes('pdf')) {
      return 'bi-file-earmark-pdf text-danger';
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return 'bi-file-earmark-word text-primary';
    } else if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return 'bi-file-earmark-spreadsheet text-success';
    } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      return 'bi-file-earmark-slides text-warning';
    } else if (mimeType.includes('image')) {
      return 'bi-file-earmark-image text-info';
    } else if (mimeType.includes('text')) {
      return 'bi-file-earmark-text text-secondary';
    } else {
      return 'bi-file-earmark text-muted';
    }
  }

  // View Mode
  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  // Filters
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  onSortChange(): void {
    const filters = {
      ...this.documentsState().filters,
      sort: this.sortBy as DocumentSortField
    };
    this.documentFacade.applyFilters(this.clientId, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  applyAdvancedFilters(): void {
    const filters: any = { latest_only: this.filters.latestOnly };

    if (this.selectedCategory) {
      filters.category = this.selectedCategory;
    }

    if (this.filters.dateFrom) {
      filters.date_from = this.filters.dateFrom;
    }

    if (this.filters.dateTo) {
      filters.date_to = this.filters.dateTo;
    }

    if (this.filters.sizeRange) {
      filters.size_range = this.filters.sizeRange;
    }

    this.documentFacade.applyFilters(this.clientId, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  clearFilters(): void {
    this.filters = {
      dateFrom: '',
      dateTo: '',
      sizeRange: '',
      latestOnly: true
    };
    this.selectedCategory = '';
    this.searchTerm = '';

    this.documentFacade.clearFilters(this.clientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  // Selection
  isSelected(documentId: number): boolean {
    return this.selectedDocuments.includes(documentId);
  }

  isDocumentSelected(document: Document): boolean {
    return this.selectedDocuments.includes(document.id);
  }

  toggleDocumentSelection(document: Document): void {
    this.toggleSelection(document.id);
  }

  areAllDocumentsSelected(): boolean {
    return this.isAllSelected();
  }

  toggleAllDocuments(): void {
    this.toggleSelectAll();
  }

  toggleSelection(documentId: number): void {
    const index = this.selectedDocuments.indexOf(documentId);
    if (index === -1) {
      this.selectedDocuments.push(documentId);
    } else {
      this.selectedDocuments.splice(index, 1);
    }
  }

  isAllSelected(): boolean {
    const documents = this.documentsState().documents;
    return documents.length > 0 && this.selectedDocuments.length === documents.length;
  }

  isPartiallySelected(): boolean {
    return this.selectedDocuments.length > 0 && !this.isAllSelected();
  }

  toggleSelectAll(): void {
    const documents = this.documentsState().documents;
    if (this.isAllSelected()) {
      this.selectedDocuments = [];
    } else {
      this.selectedDocuments = documents.map(doc => doc.id);
    }
  }

  clearSelection(): void {
    this.selectedDocuments = [];
  }

  // Bulk Operations
  onBulkDelete(): void {
    if (this.selectedDocuments.length === 0) return;

    const message = `Êtes-vous sûr de vouloir supprimer ${this.selectedDocuments.length} document(s) ?`;
    if (confirm(message)) {
      this.documentFacade.bulkDeleteDocuments(this.clientId, this.selectedDocuments)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.showSuccess(`${this.selectedDocuments.length} document(s) supprimé(s)`);
            this.clearSelection();
          },
          error: () => {
            this.messageService.showError('Erreur lors de la suppression');
          }
        });
    }
  }

  onBulkDownload(): void {
    if (this.selectedDocuments.length === 0) return;

    // Download each document individually
    this.selectedDocuments.forEach(documentId => {
      const doc = this.documentsState().documents.find(d => d.id === documentId);
      if (doc) {
        this.onDownload(doc);
      }
    });

    this.messageService.showSuccess('Téléchargements démarrés');
  }

  // Edit Modal
  onCloseEditModal(): void {
    this.showEditModal.set(false);
    this.editingDocument = null;
    this.editForm.reset();
  }

  onSubmitEdit(): void {
    if (this.editForm.invalid || !this.editingDocument) return;

    const formValue = this.editForm.value;
    const request: UpdateDocumentRequest = {
      title: formValue.title,
      category: formValue.category,
      description: formValue.description || undefined
    };

    this.documentFacade.updateDocument(this.clientId, this.editingDocument.id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.showSuccess('Document modifié avec succès');
          this.onCloseEditModal();
        },
        error: () => {
          this.messageService.showError('Erreur lors de la modification');
        }
      });
  }

  // Versions Modal
  onCloseVersionsModal(): void {
    this.showVersionsModal.set(false);
    this.selectedDocumentVersions = null;
    this.editingDocument = null;
    this.loadingVersions = false;
  }

  downloadVersion(_version: DocumentVersion): void {
    // TODO: Implement version-specific download
    this.messageService.showInfo('Téléchargement de version spécifique à venir');
  }

  restoreVersion(version: DocumentVersion): void {
    // TODO: Implement version restoration
    if (confirm(`Restaurer la version ${version.version} ? Cette action créera une nouvelle version.`)) {
      this.messageService.showInfo('Restauration de version à venir');
    }
  }

  // Preview Modal
  onClosePreviewModal(): void {
    this.showPreviewModal.set(false);
    this.currentPreviewDocument = null;
    this.previewUrl = null;
    this.loadingPreview = false;
  }

  // Add missing sort method
  changeSortBy(sortField: DocumentSortField): void {
    this.sortBy = sortField;
    this.onSortChange();
  }
}