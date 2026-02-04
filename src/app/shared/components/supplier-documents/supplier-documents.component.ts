import { Component, Input, OnInit, OnDestroy, signal, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Subject, takeUntil, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { PermissionService } from '../../../core/auth/permission.service';
import { PERMISSIONS } from '../../../domain/models/permission.models';

import { SupplierDocumentFacade, DocumentsState } from '../../../features/dashboard/suppliers/supplier-document.facade';
import { Document, DocumentCategory, DocumentStatistics, DocumentVersion, UpdateDocumentRequest, DocumentSortField } from '../../../domain/entities/document.entity';
import { MessageService } from '../../services/message.service';

@Component({
  selector: 'app-supplier-documents',
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
          <h2>Documents du fournisseur</h2>
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
      <div class="filter-bar">
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

        <div class="filter-chips">
          <select class="form-select" [(ngModel)]="selectedCategory" (change)="onCategoryFilter()">
            <option value="">Toutes catégories</option>
            <option value="contrat">Contrats</option>
            <option value="devis">Devis</option>
            <option value="facture">Factures</option>
            <option value="autre">Autres</option>
          </select>

          <select class="form-select" [(ngModel)]="sortBy" (change)="onSortChange()">
            <option value="date">Plus récents</option>
            <option value="name">Nom A-Z</option>
            <option value="size">Taille</option>
            <option value="type">Type</option>
          </select>

          <div class="view-toggles">
            <div class="btn-group">
              <button type="button"
                      class="btn btn-outline-secondary"
                      [class.active]="viewMode === 'grid'"
                      (click)="viewMode = 'grid'">
                <i class="bi bi-grid-3x3-gap"></i>
              </button>
              <button type="button"
                      class="btn btn-outline-secondary"
                      [class.active]="viewMode === 'list'"
                      (click)="viewMode = 'list'">
                <i class="bi bi-list-ul"></i>
              </button>
            </div>
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
          <div class="row">
            @for (document of documentsState().documents; track document.id) {
              <div class="col-md-4 col-lg-3 mb-3">
                <div class="card document-card">
                  <div class="dropdown">
                    <button class="btn btn-link" type="button" (click)="toggleDropdown(document.id)">
                      <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    @if (openDropdown === document.id) {
                      <ul class="dropdown-menu show">
                        @if (canViewDocument$ | async) {
                          <li><button type="button" class="dropdown-item" (click)="onPreview(document); $event.stopPropagation()">
                            <i class="bi bi-eye"></i> Aperçu
                          </button></li>
                          <li><button type="button" class="dropdown-item" (click)="onDownload(document); $event.stopPropagation()">
                            <i class="bi bi-download"></i> Télécharger
                          </button></li>
                        }
                        @if (canUpdateDocument$ | async) {
                          <li><button type="button" class="dropdown-item" (click)="onEdit(document); $event.stopPropagation()">
                            <i class="bi bi-pencil"></i> Modifier
                          </button></li>
                        }
                        @if ((canViewDocument$ | async) && (canDeleteDocument$ | async)) {
                          <li><hr class="dropdown-divider"></li>
                        }
                        @if (canDeleteDocument$ | async) {
                          <li><button type="button" class="dropdown-item text-danger" (click)="onDelete(document); $event.stopPropagation()">
                            <i class="bi bi-trash"></i> Supprimer
                          </button></li>
                        }
                      </ul>
                    }
                  </div>

                  <div class="file-icon">
                    <i class="{{ getFileIcon(document.mimeType) }}"></i>
                  </div>
                  <h6 class="card-title">{{ document.title }}</h6>
                  <p class="card-text">
                    {{ document.formattedSize }} • {{ formatDate(document.updatedAt) }}
                  </p>
                  <span class="badge">{{ document.categoryInfo.label }}</span>
                </div>
              </div>
            }
          </div>
        }

        <!-- List View -->
        @if (viewMode === 'list') {
          <div class="table-responsive">
            <table class="table table-hover">
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
      @if (showUploadModal) {
        <div class="modal show d-block" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">
                  <i class="bi bi-cloud-upload"></i>
                  Ajouter un document
                </h5>
                <button type="button" class="btn-close" (click)="onCloseUploadModal()"></button>
              </div>

              <form [formGroup]="uploadForm" (ngSubmit)="onSubmitUpload()">
                <div class="modal-body">
                  <!-- Upload Zone -->
                  <div class="upload-zone border rounded p-4 text-center"
                       [class.border-primary]="isDragOver"
                       (dragover)="onDragOver($event)"
                       (dragleave)="onDragLeave($event)"
                       (drop)="onDrop($event)"
                       (click)="fileInput.click()">

                    @if (!selectedFile) {
                      <i class="bi bi-cloud-arrow-up fs-1 text-muted"></i>
                      <h5>Glissez vos fichiers ici</h5>
                      <p class="text-muted">ou cliquez pour parcourir</p>
                    } @else {
                      <div class="d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center">
                          <i class="bi bi-file-earmark me-2"></i>
                          <div>
                            <div>{{ selectedFile.name }}</div>
                            <small class="text-muted">{{ formatFileSize(selectedFile.size || 0) }}</small>
                          </div>
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-danger" (click)="removeFile(); $event.stopPropagation()">
                          <i class="bi bi-x"></i>
                        </button>
                      </div>
                    }
                  </div>

                  <input #fileInput type="file" class="d-none" (change)="onFileSelected($event)"
                         accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.bmp,.svg,.webp,.txt,.csv,.rtf">

                  <!-- Form Fields -->
                  <div class="mt-3">
                    <div class="mb-3">
                      <label for="title" class="form-label">
                        <i class="bi bi-card-text"></i>
                        Titre du document *
                      </label>
                      <input
                        type="text"
                        id="title"
                        formControlName="title"
                        class="form-control"
                        placeholder="Entrez le nom du document">
                      @if (uploadForm.get('title')?.invalid && uploadForm.get('title')?.touched) {
                        <div class="text-danger small">
                          <i class="bi bi-exclamation-circle"></i>
                          Le titre est obligatoire
                        </div>
                      }
                    </div>

                    <div class="mb-3">
                      <label for="category" class="form-label">
                        <i class="bi bi-tag"></i>
                        Catégorie *
                      </label>
                      <select id="category" formControlName="category" class="form-select">
                        <option value="">Choisir une catégorie</option>
                        <option value="contrat">Contrat</option>
                        <option value="devis">Devis</option>
                        <option value="facture">Facture</option>
                        <option value="autre">Autre</option>
                      </select>
                      @if (uploadForm.get('category')?.invalid && uploadForm.get('category')?.touched) {
                        <div class="text-danger small">
                          <i class="bi bi-exclamation-circle"></i>
                          Veuillez sélectionner une catégorie
                        </div>
                      }
                    </div>

                    <div class="mb-3">
                      <label for="description" class="form-label">
                        <i class="bi bi-file-text"></i>
                        Description <span class="text-muted">(optionnel)</span>
                      </label>
                      <textarea
                        id="description"
                        formControlName="description"
                        class="form-control"
                        rows="3"
                        placeholder="Ajoutez une description..."></textarea>
                    </div>
                  </div>

                  <!-- Upload Progress -->
                  @if (documentsState().isUploading) {
                    <div class="mt-3">
                      <div class="d-flex justify-content-between mb-1">
                        <span>Téléchargement en cours...</span>
                        <span>{{ documentsState().uploadProgress }}%</span>
                      </div>
                      <div class="progress">
                        <div class="progress-bar" [style.width.%]="documentsState().uploadProgress"></div>
                      </div>
                    </div>
                  }
                </div>

                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" (click)="onCloseUploadModal()" [disabled]="documentsState().isUploading">
                    Annuler
                  </button>
                  <button type="submit" class="btn btn-primary" [disabled]="uploadForm.invalid || !selectedFile || documentsState().isUploading">
                    @if (documentsState().isUploading) {
                      <span class="spinner-border spinner-border-sm me-1"></span>
                      Téléchargement...
                    } @else {
                      <i class="bi bi-cloud-check"></i>
                      Ajouter le document
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }

      <!-- Preview Modal -->
      @if (showPreviewModal) {
        <div class="modal show d-block" tabindex="-1">
          <div class="modal-dialog modal-xl" style="max-width: 90vw;">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">
                  <i class="bi bi-eye"></i>
                  Aperçu - {{ currentPreviewDocument?.title }}
                </h5>
                <button type="button" class="btn-close" (click)="onClosePreviewModal()"></button>
              </div>

              <div class="modal-body p-2" style="max-height: 85vh; overflow-y: auto;">
                @if (loadingPreview) {
                  <div class="text-center">
                    <div class="spinner-border" role="status">
                      <span class="visually-hidden">Chargement de l'aperçu...</span>
                    </div>
                    <p class="mt-2">Chargement de l'aperçu...</p>
                  </div>
                } @else if (previewUrl) {
                  <div class="preview-container">
                    @if (currentPreviewDocument?.mimeType?.includes('pdf')) {
                      <pdf-viewer
                        [src]="previewUrl"
                        [render-text]="true"
                        [original-size]="false"
                        [fit-to-page]="true"
                        [zoom]="1"
                        [show-all]="true"
                        [page]="1"
                        style="display: block; width: 100%; height: 80vh; min-height: 600px;">
                      </pdf-viewer>
                    } @else if (currentPreviewDocument?.mimeType?.includes('image')) {
                      <img [src]="previewUrl" class="img-fluid mx-auto d-block" alt="Aperçu du document">
                    } @else {
                      <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i>
                        Aperçu non disponible pour ce type de fichier.
                      </div>
                    }
                  </div>
                } @else {
                  <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    Erreur lors du chargement de l'aperçu.
                  </div>
                }
              </div>

              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="onClosePreviewModal()">
                  Fermer
                </button>
                <button type="button" class="btn btn-primary" (click)="onDownload(currentPreviewDocument!)">
                  <i class="bi bi-download"></i>
                  Télécharger
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Edit Modal -->
      @if (showEditModal && editingDocument) {
        <div class="modal show d-block" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">
                  <i class="bi bi-pencil"></i>
                  Modifier le document
                </h5>
                <button type="button" class="btn-close" (click)="onCloseEditModal()"></button>
              </div>

              <form [formGroup]="editForm" (ngSubmit)="onSubmitEdit()">
                <div class="modal-body">
                  <div class="mb-3">
                    <label for="editTitle" class="form-label">
                      <i class="bi bi-card-text"></i>
                      Titre du document *
                    </label>
                    <input
                      type="text"
                      id="editTitle"
                      formControlName="title"
                      class="form-control"
                      placeholder="Entrez le nom du document">
                    @if (editForm.get('title')?.invalid && editForm.get('title')?.touched) {
                      <div class="text-danger small">
                        <i class="bi bi-exclamation-circle"></i>
                        Le titre est obligatoire
                      </div>
                    }
                  </div>

                  <div class="mb-3">
                    <label for="editCategory" class="form-label">
                      <i class="bi bi-tag"></i>
                      Catégorie *
                    </label>
                    <select id="editCategory" formControlName="category" class="form-select">
                      <option value="">Choisir une catégorie</option>
                      <option value="contrat">Contrat</option>
                      <option value="devis">Devis</option>
                      <option value="facture">Facture</option>
                      <option value="autre">Autre</option>
                    </select>
                    @if (editForm.get('category')?.invalid && editForm.get('category')?.touched) {
                      <div class="text-danger small">
                        <i class="bi bi-exclamation-circle"></i>
                        Veuillez sélectionner une catégorie
                      </div>
                    }
                  </div>

                  <div class="mb-3">
                    <label for="editDescription" class="form-label">
                      <i class="bi bi-file-text"></i>
                      Description <span class="text-muted">(optionnel)</span>
                    </label>
                    <textarea
                      id="editDescription"
                      formControlName="description"
                      class="form-control"
                      rows="3"
                      placeholder="Ajoutez une description..."></textarea>
                  </div>
                </div>

                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" (click)="onCloseEditModal()">
                    Annuler
                  </button>
                  <button type="submit" class="btn btn-primary" [disabled]="editForm.invalid">
                    <i class="bi bi-check-circle"></i>
                    Enregistrer les modifications
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './supplier-documents.component.scss'
})
export class SupplierDocumentsComponent implements OnInit, OnDestroy {
  @Input() supplierId!: number;

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
  showUploadModal = false;
  showEditModal = false;
  showVersionsModal = false;
  showPreviewModal = false;
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
    private documentFacade: SupplierDocumentFacade,
    private messageService: MessageService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
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
    if (!this.supplierId) {
      console.error('ClientDocumentsComponent: supplierId is required');
      return;
    }

    // Initialize permission observables
    this.canCreateDocument$ = this.permissionService.hasPermission(PERMISSIONS.DOCUMENTS_CREATE);
    this.canUpdateDocument$ = this.permissionService.hasPermission(PERMISSIONS.DOCUMENTS_UPDATE);
    this.canDeleteDocument$ = this.permissionService.hasPermission(PERMISSIONS.DOCUMENTS_DELETE);
    this.canViewDocument$ = this.permissionService.hasPermission(PERMISSIONS.DOCUMENTS_READ);

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
    this.documentFacade.loadDocuments(this.supplierId)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  retryLoading(): void {
    this.loadDocuments();
  }

  // Search and Filter
  onSearch(): void {
    if (this.searchTerm.trim()) {
      this.documentFacade.searchDocuments(this.supplierId, this.searchTerm)
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

    this.documentFacade.applyFilters(this.supplierId, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  // Document Actions
  onAddDocument(): void {
    this.showUploadModal = true;
    this.selectedFile = null;
    this.uploadForm.reset();
  }

  onPreview(document: Document): void {
    if (!document.canPreview) {
      this.messageService.showInfo('Aperçu non disponible pour ce type de document');
      return;
    }

    this.currentPreviewDocument = document;
    this.loadingPreview = true;
    this.showPreviewModal = true;
    this.previewUrl = null;

    this.documentFacade.previewDocument(this.supplierId, document.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (previewUrl) => {
          this.previewUrl = previewUrl;
          this.loadingPreview = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.messageService.showError('Erreur lors de l\'ouverture de l\'aperçu');
          this.loadingPreview = false;
          this.cdr.detectChanges();
        }
      });
  }

  onDownload(document: Document): void {
    this.documentFacade.downloadDocument(this.supplierId, document.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.showSuccess('Téléchargement démarré');
        },
        error: (error) => {
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
    this.showEditModal = true;
    this.closeDropdown();
  }

  onVersions(document: Document): void {
    this.editingDocument = document;
    this.loadingVersions = true;
    this.showVersionsModal = true;
    this.closeDropdown();

    this.documentFacade.getDocumentVersions(this.supplierId, document.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (versions) => {
          this.selectedDocumentVersions = versions;
          this.loadingVersions = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.messageService.showError('Erreur lors du chargement des versions');
          this.loadingVersions = false;
          this.onCloseVersionsModal();
        }
      });
  }

  onDuplicate(document: Document): void {
    // TODO: Implement document duplication
    this.messageService.showInfo('Fonctionnalité de duplication à venir');
    this.closeDropdown();
  }

  onDelete(document: Document): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${document.title}" ?`)) {
      this.documentFacade.deleteDocument(this.supplierId, document.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.showSuccess('Document supprimé avec succès');
          },
          error: (error) => {
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
    this.showUploadModal = false;
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

    this.documentFacade.uploadDocument(this.supplierId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (document) => {
          this.messageService.showSuccess('Document ajouté avec succès');
          this.onCloseUploadModal();
        },
        error: (error) => {
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
    this.documentFacade.applyFilters(this.supplierId, filters)
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

    this.documentFacade.applyFilters(this.supplierId, filters)
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

    this.documentFacade.clearFilters(this.supplierId)
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
      this.documentFacade.bulkDeleteDocuments(this.supplierId, this.selectedDocuments)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.showSuccess(`${this.selectedDocuments.length} document(s) supprimé(s)`);
            this.clearSelection();
          },
          error: (error) => {
            this.messageService.showError('Erreur lors de la suppression');
          }
        });
    }
  }

  onBulkDownload(): void {
    if (this.selectedDocuments.length === 0) return;

    // Download each document individually
    this.selectedDocuments.forEach(documentId => {
      const document = this.documentsState().documents.find(d => d.id === documentId);
      if (document) {
        this.onDownload(document);
      }
    });

    this.messageService.showSuccess('Téléchargements démarrés');
  }

  // Edit Modal
  onCloseEditModal(): void {
    this.showEditModal = false;
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

    this.documentFacade.updateDocument(this.supplierId, this.editingDocument.id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (document) => {
          this.messageService.showSuccess('Document modifié avec succès');
          this.onCloseEditModal();
        },
        error: (error) => {
          this.messageService.showError('Erreur lors de la modification');
        }
      });
  }

  // Versions Modal
  onCloseVersionsModal(): void {
    this.showVersionsModal = false;
    this.selectedDocumentVersions = null;
    this.editingDocument = null;
    this.loadingVersions = false;
  }

  downloadVersion(version: DocumentVersion): void {
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
    this.showPreviewModal = false;
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