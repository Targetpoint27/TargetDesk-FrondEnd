import { Component, Input, OnInit, OnDestroy, signal, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Subject, takeUntil, Observable } from 'rxjs';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { PermissionService } from '../../../core/auth/permission.service';
import { PERMISSIONS } from '../../../domain/models/permission.models';

import { ClientDocumentFacade, DocumentsState } from '../../../features/dashboard/clients/document.facade';
import { Document, DocumentCategory, DocumentVersion, UpdateDocumentRequest, DocumentSortField, DocumentFolder, CreateDocumentRequest } from '../../../domain/entities/document.entity';
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
    <div class="max-w-7xl mx-auto p-6 bg-gray-50 font-sans antialiased">
      <!-- Header Section -->
      <div class="mb-8">
        <div class="flex justify-between items-center mb-6">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center text-white text-xl shadow-md">
              <i class="bi bi-folder2-open"></i>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-gray-900 tracking-tight">Documents</h2>
              <p class="mt-1 text-base text-gray-600">Gérez les documents et dossiers de votre client</p>
            </div>
          </div>

          <div class="flex gap-3">
            @if (canCreateDocument$ | async) {
              <button
                class="inline-flex items-center space-x-2 px-5 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
                (click)="onCreateFolder()"
                [disabled]="documentsState().isUploading">
                <i class="bi bi-folder-plus"></i>
                <span>Nouveau dossier</span>
              </button>
            }

            @if (canCreateDocument$ | async) {
              <button
                class="inline-flex items-center space-x-2 px-5 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
                (click)="onAddDocument()"
                [disabled]="documentsState().isUploading">
                <i class="bi bi-cloud-upload"></i>
                <span>{{ documentsState().isUploading ? 'Upload...' : 'Ajouter document' }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Upload Progress -->
        @if (documentsState().isUploading) {
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm font-medium text-blue-700">Upload en cours...</span>
              <span class="text-sm font-semibold text-blue-600">{{ documentsState().uploadProgress }}%</span>
            </div>
            <div class="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" [style.width.%]="documentsState().uploadProgress"></div>
            </div>
          </div>
        }

        <!-- Error Message -->
        @if (documentsState().error) {
          <div class="bg-red-50 border border-red-300 rounded-lg p-4 mb-4 flex items-center justify-between">
            <div class="flex items-center space-x-3 text-red-700 text-sm font-medium">
              <i class="bi bi-exclamation-circle text-red-500 text-lg"></i>
              <span>{{ documentsState().error }}</span>
            </div>
            <button class="bg-transparent border-none text-red-500 cursor-pointer p-1 rounded-md transition-all duration-200 ease-in-out hover:bg-red-100 hover:text-red-600" (click)="this.documentFacade.clearError()">
              <i class="bi bi-x text-base"></i>
            </button>
          </div>
        }
      </div>

      <!-- Navigation Section -->
      @if (selectedFolderPath || getBreadcrumbs().length > 0) {
        <div class="mb-6">
          <nav class="flex items-center space-x-2 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <button class="inline-flex items-center space-x-2 bg-transparent border-none text-gray-600 text-sm font-medium px-3 py-1 rounded-md cursor-pointer transition-all duration-200 ease-in-out hover:bg-gray-50 hover:text-gray-700" (click)="navigateToRoot()">
              <i class="bi bi-house"></i>
              <span>Accueil</span>
            </button>
            @for (breadcrumb of getBreadcrumbs(); track breadcrumb.path) {
              <i class="bi bi-chevron-right text-gray-300 text-xs mx-1"></i>
              <button
                class="inline-flex items-center space-x-2 bg-transparent border-none text-gray-600 text-sm font-medium px-3 py-1 rounded-md cursor-pointer transition-all duration-200 ease-in-out hover:bg-gray-50 hover:text-gray-700"
                [class.bg-blue-50]="breadcrumb.path === selectedFolderPath"
                [class.text-blue-700]="breadcrumb.path === selectedFolderPath"
                (click)="navigateToBreadcrumb(breadcrumb.path)">
                <span>{{ breadcrumb.name }}</span>
              </button>
            }
          </nav>
        </div>
      }

      <!-- Quick Actions Bar -->
      <div class="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6 bg-white p-5 rounded-lg border border-gray-200 shadow-sm mb-6">
        <div class="flex-1 max-w-lg">
          <div class="relative w-full">
            <i class="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base z-10"></i>
            <input
              type="text"
              placeholder="Rechercher dans les documents..."
              [(ngModel)]="searchTerm"
              (input)="onSearch()"
              class="w-full pl-12 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 transition-all duration-200 ease-in-out focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-3 focus:ring-indigo-100 placeholder-gray-400">
          </div>
        </div>

        <div class="flex items-center gap-4">
          <select
            class="px-4 py-2 border border-gray-200 rounded-md text-sm bg-white text-gray-700 cursor-pointer transition-all duration-200 ease-in-out focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
            [(ngModel)]="selectedCategory"
            (change)="onCategoryFilter()">
            <option value="">Toutes catégories</option>
            <option value="contrat">Contrats</option>
            <option value="devis">Devis</option>
            <option value="facture">Factures</option>
            <option value="autre">Autres</option>
          </select>

          <select
            class="px-4 py-2 border border-gray-200 rounded-md text-sm bg-white text-gray-700 cursor-pointer transition-all duration-200 ease-in-out focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
            [(ngModel)]="sortBy"
            (change)="onSortChange()">
            <option value="date">Plus récents</option>
            <option value="name">Nom A-Z</option>
            <option value="size">Taille</option>
            <option value="type">Type</option>
          </select>

          <div class="flex bg-gray-100 p-1 rounded-md">
            <button
              class="px-3 py-2 bg-transparent border-none rounded-md text-gray-500 cursor-pointer transition-all duration-200 ease-in-out"
              [class.bg-white]="viewMode === 'grid'"
              [class.text-indigo-600]="viewMode === 'grid'"
              [class.shadow-sm]="viewMode === 'grid'"
              (click)="viewMode = 'grid'">
              <i class="bi bi-grid-3x3-gap"></i>
            </button>
            <button
              class="px-3 py-2 bg-transparent border-none rounded-md text-gray-500 cursor-pointer transition-all duration-200 ease-in-out"
              [class.bg-white]="viewMode === 'list'"
              [class.text-indigo-600]="viewMode === 'list'"
              [class.shadow-sm]="viewMode === 'list'"
              (click)="viewMode = 'list'">
              <i class="bi bi-list-ul"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="mb-8">
        @if (documentsState().isLoading || documentsState().isLoadingFolders) {
          <div class="flex flex-col items-center justify-center py-20 px-5 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p class="text-base font-medium text-gray-600">Chargement des documents...</p>
          </div>
        } @else {
          @if (fileSystemItems.length > 0) {
            @if (viewMode === 'grid') {
              <!-- Grid View -->
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                @for (item of fileSystemItems; track item.type + '-' + (item.id || item.path)) {
                  @if (item.type === 'folder') {
                    <!-- Folder Card -->
                    <div
                      class="relative bg-white rounded-xl p-5 transition-all duration-300 ease-in-out shadow-sm hover:border-yellow-600 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                      (dblclick)="onFolderDoubleClick(item)">

                      <div class="flex justify-between items-center mb-4">
                        <div class="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center text-white text-xl">
                          <i class="bi bi-folder-fill"></i>
                        </div>
                        <div class="flex gap-2">
                          <button class="w-8 h-8 bg-gray-100 border-none rounded-md flex items-center justify-center text-gray-600 cursor-pointer transition-all duration-200 ease-in-out hover:bg-indigo-100 hover:text-indigo-600 hover:scale-105" (click)="onFolderDoubleClick(item); $event.stopPropagation()">
                            <i class="bi bi-arrow-right text-sm"></i>
                          </button>
                        </div>
                      </div>

                      <div class="mb-4">
                        <h3 class="text-base font-semibold text-gray-900 mb-1 leading-tight line-clamp-2">{{ item.name }}</h3>
                        <p class="text-sm text-gray-500">{{ item.document_count }} document(s)</p>
                      </div>

                      <div>
                        <span class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md text-xs font-medium">Dossier</span>
                      </div>
                    </div>
                  } @else {
                    <!-- Document Card -->
                    <div class="relative bg-white rounded-xl p-5 transition-all duration-300 ease-in-out shadow-sm hover:border-indigo-600 hover:shadow-lg hover:-translate-y-1">
                      <div class="flex justify-between items-center mb-4">
                        <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl" [attr.data-extension]="item.fileExtension">
                          <i class="bi" [class]="getFileIcon(item.mimeType || item.mime_type)"></i>
                        </div>
                        <div class="flex gap-2">
                          @if (canViewDocument$ | async) {
                            <button class="w-8 h-8 bg-gray-100 border-none rounded-md flex items-center justify-center text-gray-600 cursor-pointer transition-all duration-200 ease-in-out hover:bg-indigo-100 hover:text-indigo-600" (click)="onDownload(item)" title="Télécharger">
                              <i class="bi bi-download text-sm"></i>
                            </button>
                          }
                          @if (canViewDocument$ | async) {
                            <button class="w-8 h-8 bg-gray-100 border-none rounded-md flex items-center justify-center text-gray-600 cursor-pointer transition-all duration-200 ease-in-out hover:bg-indigo-100 hover:text-indigo-600" (click)="onPreview(item)" title="Aperçu">
                              <i class="bi bi-eye text-sm"></i>
                            </button>
                          }
                          <div class="relative">
                            <button class="w-8 h-8 bg-gray-100 border-none rounded-md flex items-center justify-center text-gray-600 cursor-pointer transition-all duration-200 ease-in-out hover:bg-gray-200" [class.bg-gray-200]="openDropdown === item.id" [class.text-gray-800]="openDropdown === item.id" (click)="toggleDropdown(item.id); $event.stopPropagation()">
                              <i class="bi bi-three-dots text-sm"></i>
                            </button>
                            <ul class="absolute top-full right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[160px] z-20 opacity-0 invisible translate-y-[-8px] transition-all duration-200 ease-in-out" [class.opacity-100]="openDropdown === item.id" [class.visible]="openDropdown === item.id" [class.translate-y-0]="openDropdown === item.id" (click)="$event.stopPropagation()">
                              @if (canUpdateDocument$ | async) {
                                <li><a class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all duration-150 ease-in-out cursor-pointer" (click)="onEdit(item); closeDropdown()">
                                  <i class="bi bi-pencil"></i> Modifier
                                </a></li>
                              }
                              @if (canViewDocument$ | async) {
                                <li><a class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all duration-150 ease-in-out cursor-pointer" (click)="onVersions(item); closeDropdown()">
                                  <i class="bi bi-clock-history"></i> Historique
                                </a></li>
                              }
                              @if (canDeleteDocument$ | async) {
                                <li><hr class="my-1 border-t border-gray-200"></li>
                                <li><a class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-150 ease-in-out cursor-pointer" (click)="onDelete(item); closeDropdown()">
                                  <i class="bi bi-trash"></i> Supprimer
                                </a></li>
                              }
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div class="mb-4">
                        <h3 class="text-base font-semibold text-gray-900 mb-1 leading-tight line-clamp-2">{{ item.title }}</h3>
                        @if (item.description) {
                          <p class="text-sm text-gray-600 mb-3 leading-snug line-clamp-2">{{ item.description }}</p>
                        }
                        <div class="flex gap-4 text-xs text-gray-500">
                          <span class="flex items-center gap-1">
                            <i class="bi bi-calendar3 text-gray-400"></i>
                            {{ formatDate(item.updatedAt || item.updated_at) }}
                          </span>
                          <span class="flex items-center gap-1">
                            <i class="bi bi-hdd text-gray-400"></i>
                            {{ item.formattedSize || item.formatted_size }}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div class="flex gap-2">
                          <span class="px-2 py-1 rounded-md text-xs font-medium" [ngClass]="{'bg-indigo-100 text-indigo-700': (item.category === 'contrat'), 'bg-blue-100 text-blue-700': (item.category === 'devis'), 'bg-green-100 text-green-700': (item.category === 'facture'), 'bg-gray-100 text-gray-700': (item.category === 'autre')}">{{ item.categoryInfo?.label || item.category }}</span>
                          @if (item.version > 1) {
                            <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-medium">v{{ item.version }}</span>
                          }
                        </div>
                      </div>
                    </div>
                  }
                }
              </div>
            } @else {
              <!-- List View -->
              <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div class="grid grid-cols-[40px_1fr_120px_100px_140px_160px] gap-4 items-center px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div class="flex justify-center">
                    <input
                      type="checkbox"
                      [checked]="isAllSelected()"
                      [indeterminate]="isPartiallySelected()"
                      (change)="toggleSelectAll()"
                      class="form-checkbox h-4 w-4 text-indigo-600 rounded">
                  </div>
                  <div>Nom</div>
                  <div>Type</div>
                  <div>Taille</div>
                  <div>Modifié</div>
                  <div>Actions</div>
                </div>

                <div class="divide-y divide-gray-100">
                  @for (item of fileSystemItems; track item.type + '-' + (item.id || item.path)) {
                    @if (item.type === 'folder') {
                      <!-- Folder Row -->
                      <div class="grid grid-cols-[40px_1fr_120px_100px_140px_160px] gap-4 items-center px-5 py-3 transition-all duration-150 ease-in-out bg-yellow-50 cursor-pointer hover:bg-yellow-100" (dblclick)="onFolderDoubleClick(item)">
                        <div class="flex justify-center">
                          <i class="bi bi-folder-fill text-yellow-500 text-lg"></i>
                        </div>
                        <div>
                          <div class="flex items-center gap-3 min-w-0">
                            <i class="bi bi-folder-fill text-yellow-500 text-lg flex-shrink-0"></i>
                            <div class="min-w-0">
                              <div class="font-medium text-gray-900 truncate">{{ item.name }}</div>
                              <div class="text-xs text-gray-500 truncate">{{ item.document_count }} document(s)</div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <span class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md text-xs font-medium">Dossier</span>
                        </div>
                        <div class="text-gray-600">-</div>
                        <div class="text-gray-600">{{ formatDate(item.updated_at) }}</div>
                        <div>
                          <button class="w-7 h-7 bg-gray-100 border-none rounded-md flex items-center justify-center text-gray-600 cursor-pointer transition-all duration-200 ease-in-out hover:bg-indigo-100 hover:text-indigo-600" (click)="onFolderDoubleClick(item); $event.stopPropagation()" title="Ouvrir">
                            <i class="bi bi-folder-open text-sm"></i>
                          </button>
                        </div>
                      </div>
                    } @else {
                      <!-- Document Row -->
                      <div class="grid grid-cols-[40px_1fr_120px_100px_140px_160px] gap-4 items-center px-5 py-3 transition-all duration-150 ease-in-out hover:bg-gray-50" [class.bg-blue-50]="isSelected(item.id)">
                        <div class="flex justify-center">
                          <input
                            type="checkbox"
                            [checked]="isSelected(item.id)"
                            (change)="toggleSelection(item.id)"
                            class="form-checkbox h-4 w-4 text-indigo-600 rounded">
                        </div>
                        <div>
                          <div class="flex items-center gap-3 min-w-0">
                            <i class="text-lg flex-shrink-0" [class]="getFileIcon(item.mimeType || item.mime_type)"></i>
                            <div class="min-w-0">
                              <div class="font-medium text-gray-900 truncate">{{ item.title }}</div>
                              <div class="text-xs text-gray-500 truncate">{{ item.originalName || item.original_name }}</div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <span class="px-2 py-1 rounded-md text-xs font-medium" [ngClass]="{'bg-indigo-100 text-indigo-700': (item.category === 'contrat'), 'bg-blue-100 text-blue-700': (item.category === 'devis'), 'bg-green-100 text-green-700': (item.category === 'facture'), 'bg-gray-100 text-gray-700': (item.category === 'autre')}">{{ item.categoryInfo?.label || item.category }}</span>
                        </div>
                        <div class="text-gray-600">{{ item.formattedSize || item.formatted_size }}</div>
                        <div class="text-gray-600">{{ formatDate(item.updatedAt || item.updated_at) }}</div>
                        <div>
                          <div class="flex gap-1">
                            @if (canViewDocument$ | async) {
                              <button class="w-7 h-7 bg-gray-100 border-none rounded-md flex items-center justify-center text-gray-600 cursor-pointer transition-all duration-200 ease-in-out hover:bg-indigo-100 hover:text-indigo-600" (click)="onPreview(item)" title="Aperçu">
                                <i class="bi bi-eye text-sm"></i>
                              </button>
                            }
                            @if (canViewDocument$ | async) {
                              <button class="w-7 h-7 bg-gray-100 border-none rounded-md flex items-center justify-center text-gray-600 cursor-pointer transition-all duration-200 ease-in-out hover:bg-indigo-100 hover:text-indigo-600" (click)="onDownload(item)" title="Télécharger">
                                <i class="bi bi-download text-sm"></i>
                              </button>
                            }
                            @if (canUpdateDocument$ | async) {
                              <button class="w-7 h-7 bg-gray-100 border-none rounded-md flex items-center justify-center text-gray-600 cursor-pointer transition-all duration-200 ease-in-out hover:bg-indigo-100 hover:text-indigo-600" (click)="onEdit(item)" title="Modifier">
                                <i class="bi bi-pencil text-sm"></i>
                              </button>
                            }
                            @if (canDeleteDocument$ | async) {
                              <button class="w-7 h-7 bg-red-100 border-none rounded-md flex items-center justify-center text-red-600 cursor-pointer transition-all duration-200 ease-in-out hover:bg-red-200" (click)="onDelete(item)" title="Supprimer">
                                <i class="bi bi-trash text-sm"></i>
                              </button>
                            }
                          </div>
                        </div>
                      </div>
                    }
                  }
                </div>
              </div>
            }
          } @else {
            <!-- Empty State -->
            <div class="flex flex-col items-center justify-center py-20 px-5 bg-white rounded-xl border border-gray-200 shadow-sm text-center">
              <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                @if (selectedFolderPath) {
                  <i class="bi bi-folder-x text-gray-400 text-3xl"></i>
                } @else {
                  <i class="bi bi-file-earmark-plus text-gray-400 text-3xl"></i>
                }
              </div>

              <div>
                @if (selectedFolderPath) {
                  <h3 class="text-xl font-semibold text-gray-900 mb-2">Ce dossier est vide</h3>
                  <p class="text-base text-gray-600 mb-8 max-w-md">Aucun document n'a été trouvé dans ce dossier.</p>
                } @else {
                  <h3 class="text-xl font-semibold text-gray-900 mb-2">Aucun document</h3>
                  <p class="text-base text-gray-600 mb-8 max-w-md">Ce client n'a pas encore de documents. Commencez par ajouter le premier document.</p>
                }

                @if (canCreateDocument$ | async) {
                  <button
                    class="inline-flex items-center space-x-2 px-5 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
                    (click)="onAddDocument()">
                    <i class="bi bi-plus"></i>
                    <span>Ajouter un document</span>
                  </button>
                }
              </div>
            </div>
          }
        }
      </div>

      <!-- Statistics Section -->
      @if (documentsState().statistics) {
        <div class="mb-8">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 transition-all duration-200 ease-in-out hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5">
              <div class="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center text-white text-xl">
                <i class="bi bi-files"></i>
              </div>
              <div>
                <div class="text-2xl font-bold text-gray-900 leading-tight">{{ documentsState().statistics.total_documents }}</div>
                <div class="text-sm text-gray-600 font-medium">Documents</div>
              </div>
            </div>

            <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 transition-all duration-200 ease-in-out hover:border-green-200 hover:shadow-md hover:-translate-y-0.5">
              <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center text-white text-xl">
                <i class="bi bi-hdd"></i>
              </div>
              <div>
                <div class="text-2xl font-bold text-gray-900 leading-tight">{{ documentsState().statistics.formatted_total_size }}</div>
                <div class="text-sm text-gray-600 font-medium">Espace utilisé</div>
              </div>
            </div>

            <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 transition-all duration-200 ease-in-out hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5">
              <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-white text-xl">
                <i class="bi bi-file-text"></i>
              </div>
              <div>
                <div class="text-2xl font-bold text-gray-900 leading-tight">{{ documentsState().statistics.by_category.contrat }}</div>
                <div class="text-sm text-gray-600 font-medium">Contrats</div>
              </div>
            </div>

            <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 transition-all duration-200 ease-in-out hover:border-yellow-200 hover:shadow-md hover:-translate-y-0.5">
              <div class="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-lg flex items-center justify-center text-white text-xl">
                <i class="bi bi-receipt"></i>
              </div>
              <div>
                <div class="text-2xl font-bold text-gray-900 leading-tight">{{ documentsState().statistics.by_category.facture }}</div>
                <div class="text-sm text-gray-600 font-medium">Factures</div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Upload Modal -->
    @if (showUploadModal()) {
      <div class="fixed inset-0 bg-gray-900 bg-opacity-70 backdrop-blur-sm flex items-center justify-center p-5 z-50" (click)="onCloseUploadModal()">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center p-6 border-b border-gray-200">
            <h3 class="text-xl font-semibold text-gray-900">Ajouter un document</h3>
            <button class="w-8 h-8 bg-gray-100 border-none rounded-md flex items-center justify-center text-gray-600 cursor-pointer transition-all duration-200 ease-in-out hover:bg-gray-200 hover:text-gray-700" (click)="onCloseUploadModal()">
              <i class="bi bi-x text-base"></i>
            </button>
          </div>

          <div class="p-6 flex-1 overflow-y-auto">
            <form [formGroup]="uploadForm" (ngSubmit)="onSubmitUpload()">
              <!-- Upload Zone -->
              <div class="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ease-in-out bg-gray-50 mb-6"
                   [class.border-indigo-400]="isDragOver"
                   [class.bg-indigo-50]="isDragOver"
                   [class.scale-[1.02]]]="isDragOver"
                   [class.border-green-500]="selectedFile"
                   [class.bg-green-50]="selectedFile"
                   [class.border-solid]="selectedFile"
                   (dragover)="onDragOver($event)"
                   (dragleave)="onDragLeave($event)"
                   (drop)="onDrop($event)"
                   (click)="fileInput.click()">

                @if (!selectedFile) {
                  <div class="flex flex-col items-center">
                    <i class="bi bi-cloud-arrow-up text-gray-400 text-5xl mb-4"></i>
                    <h4 class="text-lg font-semibold text-gray-900 mb-2">Glissez votre fichier ici</h4>
                    <p class="text-sm text-gray-600 mb-4">ou cliquez pour parcourir</p>
                    <small class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">PDF, Word, Excel, PowerPoint, Images</small>
                  </div>
                } @else {
                  <div class="flex justify-between items-center bg-white p-4 rounded-lg border border-gray-200 text-left">
                    <div class="flex items-center gap-3">
                      <i class="text-2xl" [class]="getFileIcon(selectedFile.type || '')"></i>
                      <div>
                        <div class="text-sm font-medium text-gray-900 mb-0.5">{{ selectedFile.name }}</div>
                        <div class="text-xs text-gray-600">{{ formatFileSize(selectedFile.size || 0) }}</div>
                      </div>
                    </div>
                    <button type="button" class="w-7 h-7 bg-red-100 border-none rounded-full text-red-600 cursor-pointer transition-all duration-200 ease-in-out hover:bg-red-200 hover:scale-110" (click)="removeFile(); $event.stopPropagation()">
                      <i class="bi bi-x text-sm"></i>
                    </button>
                  </div>
                }
              </div>

              <input #fileInput type="file" class="hidden" (change)="onFileSelected($event)"
                     accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.bmp,.svg,.webp,.txt,.csv,.rtf">

              <!-- Form Fields -->
              <div class="flex flex-col gap-5">
                <div class="mb-0">
                  <label for="title" class="block text-sm font-medium text-gray-700 mb-1">Titre du document <span class="text-red-500">*</span></label>
                  <input
                    type="text"
                    id="title"
                    formControlName="title"
                    class="w-full px-4 py-2 border border-gray-300 rounded-md text-sm bg-white transition-all duration-200 ease-in-out focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
                    [class.border-red-500]="uploadForm.get('title')?.invalid && uploadForm.get('title')?.touched"
                    placeholder="Entrez le nom du document">
                  @if (uploadForm.get('title')?.invalid && uploadForm.get('title')?.touched) {
                    <div class="flex items-center gap-1 text-red-600 text-xs mt-1">
                      <i class="bi bi-exclamation-circle"></i>
                      Le titre est obligatoire
                    </div>
                  }
                </div>

                <div class="mb-0">
                  <label for="category" class="block text-sm font-medium text-gray-700 mb-1">Catégorie <span class="text-red-500">*</span></label>
                  <select
                    id="category"
                    formControlName="category"
                    class="w-full px-4 py-2 border border-gray-300 rounded-md text-sm bg-white transition-all duration-200 ease-in-out focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
                    [class.border-red-500]="uploadForm.get('category')?.invalid && uploadForm.get('category')?.touched">
                    <option value="">Choisir une catégorie</option>
                    <option value="contrat">Contrat</option>
                    <option value="devis">Devis</option>
                    <option value="facture">Facture</option>
                    <option value="autre">Autre</option>
                  </select>
                  @if (uploadForm.get('category')?.invalid && uploadForm.get('category')?.touched) {
                    <div class="flex items-center gap-1 text-red-600 text-xs mt-1">
                      <i class="bi bi-exclamation-circle"></i>
                      Veuillez sélectionner une catégorie
                    </div>
                  }
                </div>

                <div class="mb-0">
                  <label for="folder_path" class="block text-sm font-medium text-gray-700 mb-1">Dossier <span class="text-gray-500">(optionnel)</span></label>
                  <select
                    id="folder_path"
                    formControlName="folder_path"
                    class="w-full px-4 py-2 border border-gray-300 rounded-md text-sm bg-white transition-all duration-200 ease-in-out focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100">
                    <option value="">Racine</option>
                    @for (folder of documentsState().folders; track folder.path) {
                      <option [value]="folder.path">{{ folder.name }}</option>
                    }
                  </select>
                </div>

                <div class="mb-0">
                  <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Description <span class="text-gray-500">(optionnel)</span></label>
                  <textarea
                    id="description"
                    formControlName="description"
                    class="w-full px-4 py-2 border border-gray-300 rounded-md text-sm bg-white transition-all duration-200 ease-in-out focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
                    rows="3"
                    placeholder="Ajoutez une description du document..."></textarea>
                </div>
              </div>

              <!-- Upload Progress -->
              @if (documentsState().isUploading) {
                <div class="mt-5">
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-gray-700">Téléchargement en cours...</span>
                    <span class="text-sm font-medium text-gray-900">{{ documentsState().uploadProgress }}%</span>
                  </div>
                  <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full" [style.width.%]="documentsState().uploadProgress"></div>
                  </div>
                </div>
              }

              <div class="flex gap-3 justify-end mt-8">
                <button type="button" class="inline-flex items-center space-x-2 px-5 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ease-in-out" (click)="onCloseUploadModal()" [disabled]="documentsState().isUploading">
                  Annuler
                </button>
                <button type="submit" class="inline-flex items-center space-x-2 px-5 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ease-in-out" [disabled]="uploadForm.invalid || !selectedFile || documentsState().isUploading">
                  @if (documentsState().isUploading) {
                    <div class="w-5 h-5 border-2 border-white border-t-indigo-300 rounded-full animate-spin"></div>
                    <span>Téléchargement...</span>
                  } @else {
                    <i class="bi bi-cloud-check"></i>
                    <span>Ajouter le document</span>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }

    <!-- Create Folder Modal -->
    @if (showCreateFolderModal) {
      <div class="fixed inset-0 bg-gray-900 bg-opacity-70 backdrop-blur-sm flex items-center justify-center p-5 z-50" (click)="onCancelCreateFolder()">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center p-6 border-b border-gray-200">
            <h3 class="text-xl font-semibold text-gray-900">Créer un dossier</h3>
            <button class="w-8 h-8 bg-gray-100 border-none rounded-md flex items-center justify-center text-gray-600 cursor-pointer transition-all duration-200 ease-in-out hover:bg-gray-200 hover:text-gray-700" (click)="onCancelCreateFolder()">
              <i class="bi bi-x text-base"></i>
            </button>
          </div>

          <div class="p-6 flex-1 overflow-y-auto">
            <form (ngSubmit)="onCreateFolderSubmit()">
              <div class="mb-6">
                <label for="folderName" class="block text-sm font-medium text-gray-700 mb-1">Nom du dossier</label>
                <input
                  type="text"
                  id="folderName"
                  class="w-full px-4 py-2 border border-gray-300 rounded-md text-sm bg-white transition-all duration-200 ease-in-out focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
                  [(ngModel)]="newFolderName"
                  name="folderName"
                  required
                  placeholder="Entrer le nom du dossier">
              </div>

              @if (selectedFolderPath) {
                <div class="flex items-center gap-2 bg-blue-50 text-blue-700 p-3 rounded-md text-sm mb-6">
                  <i class="bi bi-info-circle text-blue-600 text-base"></i>
                  <span>Sera créé dans: <strong class="font-semibold">{{ getCurrentFolderName() }}</strong></span>
                </div>
              } @else {
                <div class="flex items-center gap-2 bg-blue-50 text-blue-700 p-3 rounded-md text-sm mb-6">
                  <i class="bi bi-info-circle text-blue-600 text-base"></i>
                  <span>Sera créé dans: <strong class="font-semibold">Racine</strong></span>
                </div>
              }

              <div class="flex gap-3 justify-end">
                <button type="button" class="inline-flex items-center space-x-2 px-5 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ease-in-out" (click)="onCancelCreateFolder()">
                  Annuler
                </button>
                <button type="submit" class="inline-flex items-center space-x-2 px-5 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ease-in-out" [disabled]="!newFolderName.trim()">
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }

    <!-- Document Preview Modal -->
    @if (showPreviewModal()) {
      <div class="fixed inset-0 bg-gray-900 bg-opacity-70 backdrop-blur-sm flex items-center justify-center p-5 z-50" (click)="onClosePreviewModal()">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center p-6 border-b border-gray-200">
            <h3 class="text-xl font-semibold text-gray-900">Aperçu - {{ currentPreviewDocument?.title }}</h3>
            <button class="w-8 h-8 bg-gray-100 border-none rounded-md flex items-center justify-center text-gray-600 cursor-pointer transition-all duration-200 ease-in-out hover:bg-gray-200 hover:text-gray-700" (click)="onClosePreviewModal()">
              <i class="bi bi-x text-base"></i>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto no-padding">
            @if (loadingPreview) {
              <div class="flex flex-col items-center justify-center h-96 text-center">
                <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <p class="text-base text-gray-600">Chargement de l'aperçu...</p>
              </div>
            } @else if (previewUrl) {
              @if (currentPreviewDocument?.mimeType?.includes('pdf')) {
                <pdf-viewer
                  [src]="previewUrl"
                  [render-text]="true"
                  [original-size]="false"
                  [fit-to-page]="true"
                  [zoom]="1"
                  [show-all]="true"
                  [page]="1"
                  class="w-full h-[70vh] border-none">
                </pdf-viewer>
              } @else if (currentPreviewDocument?.mimeType?.includes('image')) {
                <div class="flex items-center justify-center min-h-96">
                  <img [src]="previewUrl" alt="Aperçu du document" class="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg">
                </div>
              } @else {
                <div class="flex flex-col items-center justify-center h-96 text-center">
                  <i class="bi bi-info-circle text-gray-400 text-5xl mb-4"></i>
                  <p class="text-base text-gray-600">Aperçu non disponible pour ce type de fichier.</p>
                </div>
              }
            } @else {
              <div class="flex flex-col items-center justify-center h-96 text-center">
                <i class="bi bi-exclamation-triangle text-gray-400 text-5xl mb-4"></i>
                <p class="text-base text-gray-600">Erreur lors du chargement de l'aperçu.</p>
              </div>
            }

            <div class="flex justify-end gap-3 p-5 border-t border-gray-200 bg-gray-50">
              <button class="inline-flex items-center space-x-2 px-5 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ease-in-out" (click)="onClosePreviewModal()">
                Fermer
              </button>
              <button class="inline-flex items-center space-x-2 px-5 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ease-in-out" (click)="onDownload(currentPreviewDocument!)">
                <i class="bi bi-download"></i>
                <span>Télécharger</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Edit Modal -->
    @if (showEditModal() && editingDocument) {
      <div class="fixed inset-0 bg-gray-900 bg-opacity-70 backdrop-blur-sm flex items-center justify-center p-5 z-50" (click)="onCloseEditModal()">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center p-6 border-b border-gray-200">
            <h3 class="text-xl font-semibold text-gray-900">Modifier le document</h3>
            <button class="w-8 h-8 bg-gray-100 border-none rounded-md flex items-center justify-center text-gray-600 cursor-pointer transition-all duration-200 ease-in-out hover:bg-gray-200 hover:text-gray-700" (click)="onCloseEditModal()">
              <i class="bi bi-x text-base"></i>
            </button>
          </div>

          <div class="p-6 flex-1 overflow-y-auto">
            <form [formGroup]="editForm" (ngSubmit)="onSubmitEdit()">
              <div class="mb-5">
                <label for="editTitle" class="block text-sm font-medium text-gray-700 mb-1">Titre du document <span class="text-red-500">*</span></label>
                <input
                  type="text"
                  id="editTitle"
                  formControlName="title"
                  class="w-full px-4 py-2 border border-gray-300 rounded-md text-sm bg-white transition-all duration-200 ease-in-out focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
                  [class.border-red-500]="editForm.get('title')?.invalid && editForm.get('title')?.touched"
                  placeholder="Entrez le nom du document">
                @if (editForm.get('title')?.invalid && editForm.get('title')?.touched) {
                  <div class="flex items-center gap-1 text-red-600 text-xs mt-1">
                    <i class="bi bi-exclamation-circle"></i>
                    Le titre est obligatoire
                  </div>
                }
              </div>

              <div class="mb-5">
                <label for="editCategory" class="block text-sm font-medium text-gray-700 mb-1">Catégorie <span class="text-red-500">*</span></label>
                <select
                  id="editCategory"
                  formControlName="category"
                  class="w-full px-4 py-2 border border-gray-300 rounded-md text-sm bg-white transition-all duration-200 ease-in-out focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
                  [class.border-red-500]="editForm.get('category')?.invalid && editForm.get('category')?.touched">
                  <option value="">Choisir une catégorie</option>
                  <option value="contrat">Contrat</option>
                  <option value="devis">Devis</option>
                  <option value="facture">Facture</option>
                  <option value="autre">Autre</option>
                </select>
                @if (editForm.get('category')?.invalid && editForm.get('category')?.touched) {
                  <div class="flex items-center gap-1 text-red-600 text-xs mt-1">
                    <i class="bi bi-exclamation-circle"></i>
                    Veuillez sélectionner une catégorie
                  </div>
                }
              </div>

              <div class="mb-6">
                <label for="editDescription" class="block text-sm font-medium text-gray-700 mb-1">Description <span class="text-gray-500">(optionnel)</span></label>
                <textarea
                  id="editDescription"
                  formControlName="description"
                  class="w-full px-4 py-2 border border-gray-300 rounded-md text-sm bg-white transition-all duration-200 ease-in-out focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
                  rows="3"
                  placeholder="Ajoutez une description..."></textarea>
              </div>

              <div class="flex gap-3 justify-end">
                <button type="button" class="inline-flex items-center space-x-2 px-5 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ease-in-out" (click)="onCloseEditModal()">
                  Annuler
                </button>
                <button type="submit" class="inline-flex items-center space-x-2 px-5 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ease-in-out" [disabled]="editForm.invalid">
                  <i class="bi bi-check-circle"></i>
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
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
    isLoadingFolders: false,
    isUploading: false,
    uploadProgress: 0,
    error: null,
    filters: { latest_only: true },
    searchTerm: '',
    folders: []
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

  fileSystemItems: any[] = []; // New property

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

  // Folder navigation
  selectedFolderPath = '';
  currentFolderPath = '';

  onFolderSelected(folderPath: string): void {
    this.selectedFolderPath = folderPath;
    this.currentFolderPath = folderPath;

    this.updateFileSystemItems(); // Update items after folder selection

    const filters = { ...this.documentsState().filters, folder_path: folderPath };
    this.documentFacade.applyFilters(this.clientId, filters).subscribe();
  }

  onFolderCreated(folder: any): void {
    this.loadFolders();
  }

  loadFolders(): void {
    this.documentFacade.loadFolders(this.clientId).subscribe();
  }

  // Utility methods for hierarchical display
  getFileSystemItems(): any[] {
    const items: any[] = [];
    const state = this.documentsState();

    // If no specific folder is selected, show folder structure with files
    if (!this.selectedFolderPath) {
      // Add only top-level folders (level 0) as navigable items
      const topLevelFolders = (state.folders || []).filter(folder => folder.level === 0);
      topLevelFolders.forEach(folder => {
        items.push({
          type: 'folder',
          ...folder,
          isExpanded: false
        });
      });

      // Add documents at root level (no folder_path or empty folder_path)
      const rootDocuments = state.documents.filter(doc => doc.folderPath === null || doc.folderPath === undefined || doc.folderPath === '');
      rootDocuments.forEach(doc => {
        items.push({
          type: 'document',
          ...doc
        });
      });
    } else {
      // Add direct subfolders of the selected folder
      const subfolders = (state.folders || []).filter(folder => {
        const parentPath = this.selectedFolderPath;
        const folderPath = folder.path;
        // Check if the folder is a direct child of the current path
        const parentPathSegments = parentPath.split('/').filter(s => s.length > 0);
        const folderPathSegments = folderPath.split('/').filter(s => s.length > 0);
        return folderPath.startsWith(parentPath + '/') && folderPathSegments.length === parentPathSegments.length + 1;
      });
      subfolders.forEach(folder => {
        items.push({
          type: 'folder',
          ...folder,
          isExpanded: false
        });
      });

      // Add documents directly within the selected folder
      const documentsInCurrentFolder = state.documents.filter(doc =>
        doc.folderPath !== null && doc.folderPath !== undefined && doc.folderPath === this.selectedFolderPath
      );
      documentsInCurrentFolder.forEach(doc => {
        items.push({
          type: 'document',
          ...doc
        });
      });
    }

    return items.sort((a, b) => {
      // Folders first, then documents
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      // Then sort alphabetically
      const nameA = a.name || a.title || '';
      const nameB = b.name || b.title || '';
      return nameA.localeCompare(nameB);
    });
  }

  // Helper method to update fileSystemItems
  private updateFileSystemItems(): void {
    this.fileSystemItems = this.getFileSystemItems();
  }

  onFolderDoubleClick(folder: any): void {
    this.selectedFolderPath = folder.path;
    this.currentFolderPath = folder.path;
    const filters = { ...this.documentsState().filters, folder_path: folder.path };
    this.documentFacade.applyFilters(this.clientId, filters).subscribe();
  }

  getBreadcrumbs(): any[] {
    if (!this.currentFolderPath) return [];

    const parts = this.currentFolderPath.split('/');
    const breadcrumbs: any[] = [];

    let currentPath = '';
    parts.forEach((part, index) => {
      currentPath += (index > 0 ? '/' : '') + part;
      breadcrumbs.push({
        name: part,
        path: currentPath,
        isLast: index === parts.length - 1
      });
    });

    return breadcrumbs;
  }

  navigateToBreadcrumb(path: string): void {
    this.selectedFolderPath = path;
    this.currentFolderPath = path;
    this.updateFileSystemItems(); // Update items after breadcrumb navigation
    const filters = { ...this.documentsState().filters, folder_path: path };
    this.documentFacade.applyFilters(this.clientId, filters).subscribe();
  }

  navigateToRoot(): void {
    this.selectedFolderPath = '';
    this.currentFolderPath = '';
    this.updateFileSystemItems(); // Update items after navigating to root
    this.documentFacade.loadDocuments(this.clientId).subscribe();
  }

  // Folder creation
  showCreateFolderModal = false;
  newFolderName = '';

  onCreateFolder(): void {
    this.showCreateFolderModal = true;
    this.newFolderName = '';
  }

  onCreateFolderSubmit(): void {
    if (!this.newFolderName.trim()) return;

    const folderRequest = {
      folder_name: this.newFolderName.trim(),
      parent_path: this.selectedFolderPath || undefined
    };

    this.documentFacade.createFolder(this.clientId, folderRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showCreateFolderModal = false;
          this.newFolderName = '';
          this.messageService.showSuccess('Dossier créé avec succès');
          this.loadFolders();
          this.loadDocuments();
        },
        error: (error) => {
          this.messageService.showError('Erreur lors de la création du dossier: ' + error.message);
        }
      });
  }

  onCancelCreateFolder(): void {
    this.showCreateFolderModal = false;
    this.newFolderName = '';
  }

  getCurrentFolderName(): string {
    if (!this.selectedFolderPath) {
      return 'Racine';
    }

    const folders = this.documentsState().folders || [];
    const folder = folders.find(f => f.path === this.selectedFolderPath);
    return folder ? folder.name : this.selectedFolderPath;
  }

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
    public documentFacade: ClientDocumentFacade,
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
      description: [''],
      folder_path: ['']
    });

    this.editForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2)]],
      category: ['', Validators.required],
      description: ['']
    });
  }

  clearError(): void {
    this.documentFacade.clearError();
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
        this.updateFileSystemItems(); // Update items after state change
        this.cdr.detectChanges();
      });

    // Close dropdown when clicking outside
    document.addEventListener('click', this.onDocumentClick.bind(this));

    // Load folders first, then documents
    this.loadFolders();
    this.loadDocuments();

    this.updateFileSystemItems(); // Initial update
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

    // Load folders if not already loaded
    const folders = this.documentsState().folders;
    if (!folders || folders.length === 0) {
      this.loadFolders();
    }

    // Set folder_path to current selected folder if any
    if (this.selectedFolderPath) {
      this.uploadForm.patchValue({ folder_path: this.selectedFolderPath });
    }

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
      description: formValue.description || undefined,
      folder_path: formValue.folder_path || undefined
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

  // Tailwind CSS helper methods
  getDocumentTypeColor(document: any): string {
    const fileExtension = document.fileExtension?.toLowerCase() || '';

    if (fileExtension === 'pdf') return 'bg-red-500';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) return 'bg-green-500';
    if (['doc', 'docx'].includes(fileExtension)) return 'bg-blue-500';
    if (['xls', 'xlsx'].includes(fileExtension)) return 'bg-emerald-500';
    return 'bg-slate-500';
  }

  getDocumentTypeBadgeClass(document: any): string {
    const category = document.category?.toLowerCase() || '';

    if (category === 'contrat') return 'bg-purple-100 text-purple-700';
    if (category === 'devis') return 'bg-orange-100 text-orange-700';
    if (category === 'facture') return 'bg-green-100 text-green-700';
    return 'bg-slate-100 text-slate-700';
  }
}