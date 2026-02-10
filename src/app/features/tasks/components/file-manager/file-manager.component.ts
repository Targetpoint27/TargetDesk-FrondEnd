// ========================================
// COMPOSANT DE GESTION DES FICHIERS
// Upload, téléchargement et gestion des fichiers de tâches
// ========================================

import { Component, Input, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { TasksApiService } from '../../services/tasks-api.service';
import {
  Task,
  TaskFile,
  getFileIcon,
  formatFileSize
} from '../../models/task.models';

interface FileUploadState {
  file: File;
  progress: number;
  uploading: boolean;
  error: string | null;
  description?: string;
}

@Component({
  selector: 'app-file-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="file-manager">
      <!-- En-tête avec actions -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 flex items-center">
          <i class="bi bi-paperclip mr-2 text-blue-500"></i>
          Fichiers attachés ({{ files().length }})
        </h3>

        <div class="flex items-center gap-2">
          <!-- Zone de drop pour upload -->
          <div
            class="relative"
            [class.drag-over]="dragOver()"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)">

            <input
              #fileInput
              type="file"
              multiple
              class="hidden"
              [accept]="allowedFileTypes"
              (change)="onFileSelected($event)"
            />

            <button
              (click)="fileInput.click()"
              [disabled]="isUploading()"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
              <i class="bi bi-plus-circle mr-2"></i>
              Ajouter fichier
            </button>
          </div>

          <button
            (click)="refreshFiles()"
            [disabled]="loading()"
            class="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
            title="Actualiser">
            <i class="bi bi-arrow-clockwise" [class.animate-spin]="loading()"></i>
          </button>
        </div>
      </div>

      <!-- Zone de drop globale -->
      @if (dragOver()) {
        <div class="fixed inset-0 bg-blue-600 bg-opacity-10 border-2 border-blue-500 border-dashed z-50 flex items-center justify-center">
          <div class="bg-white rounded-lg p-8 text-center shadow-lg">
            <i class="bi bi-cloud-upload text-blue-500 text-4xl mb-4"></i>
            <p class="text-lg font-medium text-gray-900">Déposez vos fichiers ici</p>
            <p class="text-sm text-gray-600 mt-2">{{ maxFilesText() }}</p>
          </div>
        </div>
      }

      <!-- File d'attente d'upload -->
      @if (uploadQueue().length > 0) {
        <div class="mb-6 space-y-3">
          <h4 class="font-medium text-gray-900">Fichiers en cours d'upload</h4>
          @for (upload of uploadQueue(); track upload.file.name) {
            <div class="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-3">
                  <i [class]="getFileIcon(upload.file.type)" class="text-xl text-blue-600"></i>
                  <div>
                    <p class="font-medium text-gray-900">{{ upload.file.name }}</p>
                    <p class="text-sm text-gray-600">{{ formatFileSize(upload.file.size) }}</p>
                  </div>
                </div>
                <button
                  (click)="cancelUpload(upload)"
                  [disabled]="upload.uploading"
                  class="text-red-600 hover:text-red-800 disabled:opacity-50">
                  <i class="bi bi-x-circle"></i>
                </button>
              </div>

              @if (upload.uploading) {
                <div class="mb-2">
                  <div class="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Upload en cours...</span>
                    <span>{{ upload.progress }}%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      [style.width.%]="upload.progress">
                    </div>
                  </div>
                </div>
              } @else if (upload.error) {
                <div class="text-sm text-red-600 mb-2">
                  <i class="bi bi-exclamation-triangle mr-1"></i>
                  {{ upload.error }}
                </div>
                <button
                  (click)="retryUpload(upload)"
                  class="text-sm text-blue-600 hover:text-blue-800">
                  Réessayer
                </button>
              } @else {
                <div class="mb-2">
                  <input
                    type="text"
                    [(ngModel)]="upload.description"
                    placeholder="Description du fichier (optionnelle)"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    maxlength="255"
                  />
                </div>
                <button
                  (click)="startUpload(upload)"
                  class="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                  Démarrer l'upload
                </button>
              }
            </div>
          }
        </div>
      }

      <!-- Liste des fichiers -->
      @if (loading()) {
        <div class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-600">Chargement des fichiers...</span>
        </div>
      } @else if (error()) {
        <div class="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
          <i class="bi bi-exclamation-triangle text-red-500 text-2xl mb-2"></i>
          <p class="text-red-800">{{ error() }}</p>
          <button
            (click)="refreshFiles()"
            class="mt-2 text-sm text-blue-600 hover:text-blue-800">
            Réessayer
          </button>
        </div>
      } @else if (files().length === 0) {
        <div class="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <i class="bi bi-paperclip text-gray-400 text-4xl mb-4"></i>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Aucun fichier attaché</h3>
          <p class="text-gray-600 mb-4">
            Ajoutez des fichiers pour partager des documents, images ou autres ressources.
          </p>
          <button
            (click)="fileInput.click()"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <i class="bi bi-plus-circle mr-2"></i>
            Ajouter votre premier fichier
          </button>
        </div>
      } @else {
        <!-- Vue grille des fichiers -->
        @if (viewMode() === 'grid') {
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            @for (file of sortedFiles(); track file.id) {
              <div class="file-card bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <!-- Prévisualisation -->
                <div class="text-center mb-3">
                  @if (isImageFile(file)) {
                    <div class="relative">
                      <img
                        [src]="getImagePreviewUrl(file)"
                        [alt]="file.name"
                        class="w-full h-24 object-cover rounded-md cursor-pointer"
                        (click)="viewFile(file)"
                        (error)="onImageError($event)"
                      />
                      <div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 rounded-md transition-colors flex items-center justify-center">
                        <i class="bi bi-eye text-white opacity-0 hover:opacity-100 transition-opacity"></i>
                      </div>
                    </div>
                  } @else {
                    <div class="w-full h-24 bg-gray-100 rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-200"
                         (click)="downloadFile(file)">
                      <i [class]="getFileIcon(file.mime_type)" class="text-3xl text-gray-500"></i>
                    </div>
                  }
                </div>

                <!-- Informations du fichier -->
                <div class="space-y-2">
                  <h4 class="font-medium text-gray-900 text-sm truncate" [title]="file.name">
                    {{ file.name }}
                  </h4>

                  @if (file.description) {
                    <p class="text-xs text-gray-600 line-clamp-2" [title]="file.description">
                      {{ file.description }}
                    </p>
                  }

                  <div class="flex items-center justify-between text-xs text-gray-500">
                    <span>{{ file.file_size_human || formatFileSize(file.file_size) }}</span>
                    <span>{{ formatDate(file.created_at) }}</span>
                  </div>

                  <div class="text-xs text-gray-500">
                    <i class="bi bi-person mr-1"></i>
                    {{ file.user?.name }}
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-200">
                  <button
                    (click)="downloadFile(file)"
                    class="p-1 text-gray-500 hover:text-blue-600"
                    title="Télécharger">
                    <i class="bi bi-download"></i>
                  </button>
                  @if (isImageFile(file)) {
                    <button
                      (click)="viewFile(file)"
                      class="p-1 text-gray-500 hover:text-green-600"
                      title="Visualiser">
                      <i class="bi bi-eye"></i>
                    </button>
                  }
                  <button
                    (click)="shareFile(file)"
                    class="p-1 text-gray-500 hover:text-purple-600"
                    title="Partager">
                    <i class="bi bi-share"></i>
                  </button>
                  @if (canDeleteFile(file)) {
                    <button
                      (click)="deleteFile(file)"
                      class="p-1 text-gray-500 hover:text-red-600"
                      title="Supprimer">
                      <i class="bi bi-trash"></i>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- Vue liste des fichiers -->
        @if (viewMode() === 'list') {
          <div class="space-y-2">
            @for (file of sortedFiles(); track file.id) {
              <div class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm">
                <div class="flex items-center gap-3">
                  <i [class]="getFileIcon(file.mime_type)" class="text-xl text-gray-500"></i>
                  <div class="flex-1">
                    <h4 class="font-medium text-gray-900">{{ file.name }}</h4>
                    @if (file.description) {
                      <p class="text-sm text-gray-600 mt-1">{{ file.description }}</p>
                    }
                    <div class="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <span>{{ file.file_size_human || formatFileSize(file.file_size) }}</span>
                      <span>{{ formatDate(file.created_at) }}</span>
                      <span>
                        <i class="bi bi-person mr-1"></i>
                        {{ file.user?.name }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    (click)="downloadFile(file)"
                    class="p-2 text-gray-500 hover:text-blue-600"
                    title="Télécharger">
                    <i class="bi bi-download"></i>
                  </button>
                  @if (isImageFile(file)) {
                    <button
                      (click)="viewFile(file)"
                      class="p-2 text-gray-500 hover:text-green-600"
                      title="Visualiser">
                      <i class="bi bi-eye"></i>
                    </button>
                  }
                  <button
                    (click)="shareFile(file)"
                    class="p-2 text-gray-500 hover:text-purple-600"
                    title="Partager">
                    <i class="bi bi-share"></i>
                  </button>
                  @if (canDeleteFile(file)) {
                    <button
                      (click)="deleteFile(file)"
                      class="p-2 text-gray-500 hover:text-red-600"
                      title="Supprimer">
                      <i class="bi bi-trash"></i>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- Contrôles de vue -->
        <div class="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <div class="text-sm text-gray-600">
            {{ files().length }} fichier(s) • {{ totalSize() }}
          </div>

          <div class="flex items-center gap-2">
            <!-- Tri -->
            <select
              [(ngModel)]="sortBy"
              (change)="updateSort()"
              class="text-sm border border-gray-300 rounded-md px-2 py-1">
              <option value="created_at">Date d'ajout</option>
              <option value="name">Nom</option>
              <option value="file_size">Taille</option>
            </select>

            <!-- Vue -->
            <div class="flex border border-gray-300 rounded-md overflow-hidden">
              <button
                (click)="setViewMode('list')"
                [class]="viewMode() === 'list' ? 'bg-gray-100' : ''"
                class="px-3 py-1 text-sm hover:bg-gray-50">
                <i class="bi bi-list"></i>
              </button>
              <button
                (click)="setViewMode('grid')"
                [class]="viewMode() === 'grid' ? 'bg-gray-100' : ''"
                class="px-3 py-1 text-sm hover:bg-gray-50">
                <i class="bi bi-grid"></i>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .drag-over {
      background-color: rgba(59, 130, 246, 0.05);
      border-color: #3b82f6;
    }

    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .file-card {
      transition: all 0.2s ease;
    }

    .file-card:hover {
      transform: translateY(-2px);
    }
  `]
})
export class FileManagerComponent implements OnInit, OnDestroy {
  @Input({ required: true }) task!: Task;

  private destroy$ = new Subject<void>();
  private tasksApiService = inject(TasksApiService);

  // État des fichiers
  files = signal<TaskFile[]>([]);
  loading = signal(false);
  error = signal('');

  // Upload
  uploadQueue = signal<FileUploadState[]>([]);
  dragOver = signal(false);

  // Interface utilisateur
  viewMode = signal<'list' | 'grid'>('grid');
  sortBy = 'created_at';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Configuration
  allowedFileTypes = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.svg,.zip,.rar,.mp4,.avi,.mov';
  maxFileSize = 10 * 1024 * 1024; // 10MB
  maxFiles = 10;

  // Constantes pour le template
  getFileIcon = getFileIcon;
  formatFileSize = formatFileSize;

  // Computed
  sortedFiles = computed(() => {
    const filesArray = [...this.files()];
    filesArray.sort((a, b) => {
      let aValue: any = a[this.sortBy as keyof TaskFile];
      let bValue: any = b[this.sortBy as keyof TaskFile];

      if (this.sortBy === 'created_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
    return filesArray;
  });

  totalSize = computed(() => {
    const total = this.files().reduce((sum, file) => sum + file.file_size, 0);
    return formatFileSize(total);
  });

  isUploading = computed(() => {
    return this.uploadQueue().some(upload => upload.uploading);
  });

  maxFilesText = computed(() => {
    return `Maximum ${this.maxFiles} fichiers, ${formatFileSize(this.maxFileSize)} chacun`;
  });

  ngOnInit(): void {
    this.loadFiles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFiles(): void {
    this.loading.set(true);
    this.error.set('');

    this.tasksApiService.getTaskFiles(this.task.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.files.set(response.data || []);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Erreur lors du chargement des fichiers');
          this.loading.set(false);
        }
      });
  }

  // Gestion du drag & drop
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    if (!event.relatedTarget) {
      this.dragOver.set(false);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFileSelection(files);
    }
  }

  // Sélection de fichiers
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFileSelection(input.files);
    }
    input.value = ''; // Reset pour permettre de sélectionner le même fichier
  }

  private handleFileSelection(fileList: FileList): void {
    const files = Array.from(fileList);

    // Vérifier le nombre de fichiers
    if (this.files().length + files.length > this.maxFiles) {
      alert(`Maximum ${this.maxFiles} fichiers autorisés`);
      return;
    }

    files.forEach(file => {
      // Vérifier la taille
      if (file.size > this.maxFileSize) {
        alert(`Le fichier "${file.name}" est trop volumineux (max ${formatFileSize(this.maxFileSize)})`);
        return;
      }

      // Vérifier le type
      if (!this.isFileTypeAllowed(file)) {
        alert(`Type de fichier non autorisé: ${file.name}`);
        return;
      }

      // Ajouter à la file d'attente
      const uploadState: FileUploadState = {
        file,
        progress: 0,
        uploading: false,
        error: null,
        description: ''
      };

      this.uploadQueue.update(queue => [...queue, uploadState]);
    });
  }

  private isFileTypeAllowed(file: File): boolean {
    const allowedExtensions = this.allowedFileTypes.split(',').map(ext => ext.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    return allowedExtensions.includes(fileExtension);
  }

  // Gestion des uploads
  startUpload(upload: FileUploadState): void {
    upload.uploading = true;
    upload.error = null;
    upload.progress = 0;

    this.tasksApiService.uploadFile(this.task.id, upload.file, upload.description)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.data) {
            // Ajouter le fichier à la liste
            this.files.update(files => [...files, response.data!]);
          }

          // Retirer de la file d'attente
          this.uploadQueue.update(queue => queue.filter(u => u !== upload));
        },
        error: (error) => {
          upload.uploading = false;
          upload.error = error.message || 'Erreur lors de l\'upload';
        }
      });

    // Simulation du progrès (à remplacer par un vrai système de progrès)
    const progressInterval = setInterval(() => {
      upload.progress += 10;
      if (upload.progress >= 100) {
        clearInterval(progressInterval);
      }
    }, 100);
  }

  retryUpload(upload: FileUploadState): void {
    upload.error = null;
    this.startUpload(upload);
  }

  cancelUpload(upload: FileUploadState): void {
    this.uploadQueue.update(queue => queue.filter(u => u !== upload));
  }

  // Actions sur les fichiers
  downloadFile(file: TaskFile): void {
    const url = this.tasksApiService.getFileDownloadUrl(file.id);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  viewFile(file: TaskFile): void {
    if (this.isImageFile(file)) {
      // Ouvrir dans une modal ou nouvelle fenêtre
      const url = this.tasksApiService.getFileDownloadUrl(file.id);
      window.open(url, '_blank');
    } else {
      this.downloadFile(file);
    }
  }

  shareFile(file: TaskFile): void {
    // Copier le lien dans le presse-papier
    const url = this.tasksApiService.getFileDownloadUrl(file.id);
    navigator.clipboard.writeText(url).then(() => {
      // TODO: Afficher toast de confirmation
    });
  }

  deleteFile(file: TaskFile): void {
    if (confirm(`Supprimer le fichier "${file.name}" ?`)) {
      this.tasksApiService.deleteFile(file.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.files.update(files => files.filter(f => f.id !== file.id));
          },
          error: () => {
            this.error.set('Erreur lors de la suppression');
          }
        });
    }
  }

  // Actions d'interface
  refreshFiles(): void {
    this.loadFiles();
  }

  setViewMode(mode: 'list' | 'grid'): void {
    this.viewMode.set(mode);
  }

  updateSort(): void {
    // Le tri se met à jour automatiquement via le computed
  }

  // Méthodes utilitaires
  isImageFile(file: TaskFile): boolean {
    return file.mime_type.startsWith('image/');
  }

  getImagePreviewUrl(file: TaskFile): string {
    return this.tasksApiService.getFileDownloadUrl(file.id);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';

    // Afficher l'icône de fichier à la place
    const container = img.parentElement;
    if (container) {
      container.innerHTML = `<div class="w-full h-24 bg-gray-100 rounded-md flex items-center justify-center">
        <i class="bi bi-file-image text-3xl text-gray-500"></i>
      </div>`;
    }
  }

  canDeleteFile(file: TaskFile): boolean {
    // TODO: Vérifier les permissions
    return true;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }
}