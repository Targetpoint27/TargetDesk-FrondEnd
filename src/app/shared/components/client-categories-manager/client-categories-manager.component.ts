/**
 * Client Categories Manager Component
 * Manages category assignment and display for a specific client
 */

import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CategoryEntity } from '../../../domain/entities/category.entity';
import { ClientEntity } from '../../../domain/entities/client.entity';
import { CategoryBadgeComponent } from '../category-badge/category-badge.component';
import { GetClientCategoriesUseCase } from '../../../domain/use-cases/client-category/get-client-categories.use-case';
import { AssignCategoriesUseCase } from '../../../domain/use-cases/client-category/assign-categories.use-case';
import { RemoveCategoryUseCase } from '../../../domain/use-cases/client-category/remove-category.use-case';
import { CategoryFacade } from '../../../features/dashboard/categories/category.facade';
import { MessageService } from '../../services/message.service';
import { ClientCategoryResponse } from '../../../infrastructure/repositories/client-category-api.repository';

@Component({
  selector: 'app-client-categories-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, CategoryBadgeComponent],
  template: `
    <div class="categories-manager-container">
      @if (!isLoading) {
        <!-- Bouton d'action flottant -->
        <div class="floating-action">
          <button
            type="button"
            class="btn btn-small"
            [class.active]="showAssignMode"
            (click)="toggleAssignMode()"
            [disabled]="isLoading">
            @if (showAssignMode) {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                <span>Fermer</span>
              } @else {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                <span>Ajouter</span>
              }
            </button>
        </div>
      }

      <!-- Contenu principal -->
      <div class="content-area" [class.assign-mode-active]="showAssignMode">

        <!-- État de chargement -->
        @if (isLoading) {
          <div class="loading-card">
            <div class="loading-content">
              <div class="pulse-loader">
                <div class="pulse-dot"></div>
                <div class="pulse-dot"></div>
                <div class="pulse-dot"></div>
              </div>
              <p>Chargement des catégories...</p>
            </div>
          </div>
        }

        <!-- Affichage des catégories -->
        @if (!isLoading && !showAssignMode) {
          @if (clientCategories.length > 0) {
            <div class="categories-showcase">
              <div class="categories-grid">
                @for (category of clientCategories; track category.id; let i = $index) {
                  <div class="category-card"
                       [style.animation-delay.ms]="i * 50">
                    <div class="card-content">
                      <app-category-badge
                        [category]="category"
                        [size]="'medium'"
                        [showIcon]="true"
                        [maxNameLength]="30">
                      </app-category-badge>

                      @if (category.description) {
                        <div class="category-description">
                          {{ category.description }}
                        </div>
                      }
                    </div>

                    <svg
                      class="delete-icon-only"
                      (click)="onDeleteCategory(category)"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      title="Supprimer cette catégorie">
                      <polyline points="3,6 5,6 21,6" stroke="black" stroke-width="2"/>
                      <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6" stroke="black" stroke-width="2"/>
                    </svg>
                  </div>
                }
              </div>

              <div class="summary-bar">
                <div class="stats">
                  <span class="count-badge">{{ clientCategories.length }}</span>
                  <span class="label">catégorie{{ clientCategories.length > 1 ? 's' : '' }} assignée{{ clientCategories.length > 1 ? 's' : '' }}</span>
                </div>
              </div>
            </div>
          } @else {
            <div class="empty-showcase">
              <div class="empty-illustration">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z"/>
                  <circle cx="12" cy="14" r="3" stroke-dasharray="2,2"/>
                </svg>
              </div>
              <div class="empty-content">
                <h4>Aucune catégorie assignée</h4>
                <p>Ce client n'appartient à aucune catégorie pour le moment</p>
                <button
                  type="button"
                  class="cta-button"
                  (click)="toggleAssignMode()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Ajouter
                </button>
              </div>
            </div>
          }
        }

        <!-- Mode d'assignation -->
        @if (showAssignMode && !isLoading) {
          <div class="assignment-panel">
            @if (availableCategories.length > 0) {
              <div class="panel-header">
                <h4>Assigner des catégories</h4>
                <p class="subtitle">Sélectionnez une ou plusieurs catégories à assigner au client</p>
              </div>

              <div class="selection-area">
                <div class="categories-selector">
                  @for (category of availableCategories; track category.id; let i = $index) {
                    <div class="selector-item"
                         [class.selected]="isSelected(category.id)"
                         [class.already-assigned]="isCategoryAssigned(category.id)"
                         [style.animation-delay.ms]="i * 30">
                      <label class="selector-label">
                        <input
                          type="checkbox"
                          class="hidden-input"
                          [value]="category.id"
                          [checked]="isSelected(category.id)"
                          (change)="toggleSelection(category.id, ($any($event.target)).checked)"
                          [disabled]="isAssigning || isCategoryAssigned(category.id)">

                        <div class="selector-content">
                          <div class="checkbox-indicator">
                            @if (isCategoryAssigned(category.id)) {
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="m9 12 2 2 4-4"/>
                              </svg>
                            } @else if (isSelected(category.id)) {
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20,6 9,17 4,12"/>
                              </svg>
                            }
                          </div>

                          <div class="category-info">
                            <app-category-badge
                              [category]="category"
                              [size]="'small'"
                              [showIcon]="true"
                              [maxNameLength]="25">
                            </app-category-badge>

                            @if (category.description) {
                              <div class="category-desc">{{ category.description }}</div>
                            }

                            @if (isCategoryAssigned(category.id)) {
                              <div class="status-label assigned">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="m9 12 2 2 4-4"/>
                                </svg>
                                Déjà assignée
                              </div>
                            }
                          </div>
                        </div>
                      </label>
                    </div>
                  }
                </div>
              </div>

              <div class="action-bar">
                <div class="selection-info">
                  @if (selectedCategoryIds.length > 0) {
                    <span class="selection-count">{{ selectedCategoryIds.length }} catégorie{{ selectedCategoryIds.length > 1 ? 's' : '' }} sélectionnée{{ selectedCategoryIds.length > 1 ? 's' : '' }}</span>
                  }
                </div>

                <div class="action-buttons">
                  <button
                    type="button"
                    class="btn btn-ghost"
                    (click)="cancelAssign()"
                    [disabled]="isAssigning">
                    Annuler
                  </button>
                  <button
                    type="button"
                    class="btn btn-primary"
                    (click)="assignSelectedCategories()"
                    [disabled]="selectedCategoryIds.length === 0 || isAssigning">
                    @if (isAssigning) {
                      <div class="loading-spinner"></div>
                    } @else {
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m9 12 2 2 4-4"/>
                      </svg>
                    }
                    <span>Ajouter {{ selectedCategoryIds.length > 0 ? '(' + selectedCategoryIds.length + ')' : '' }}</span>
                  </button>
                </div>
              </div>
            } @else {
              <div class="no-categories-panel">
                <div class="panel-content">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <h4>Aucune catégorie disponible</h4>
                  <p>Ajoutez d'abord des catégories pour pouvoir les assigner aux clients</p>
                  <button
                    type="button"
                    class="btn btn-ghost"
                    (click)="cancelAssign()">
                    Fermer
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- Modal Supprimer Catégorie -->
    <div class="modal-overlay" *ngIf="showDeleteCategoryModal" (click)="onCloseDeleteCategoryModal()">
      <div class="modal-container category-delete-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="icon-container icon-danger">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.258c-.77-.833-2.694-.833-3.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
          </div>
        </div>

        <div class="modal-body" *ngIf="categoryToDelete">
          <h3 class="modal-title">Retirer la catégorie</h3>
          <p class="modal-message">Êtes-vous sûr de vouloir retirer la catégorie "{{ categoryToDelete.name }}" de ce client ?</p>
        </div>

        <div class="modal-actions">
          <button type="button"
                  class="btn btn-ghost"
                  (click)="onCloseDeleteCategoryModal()"
                  [disabled]="isRemoving">
            Annuler
          </button>
          <button type="button"
                  class="btn btn-danger"
                  (click)="onConfirmDeleteCategory()"
                  [disabled]="isRemoving">
            <span *ngIf="isRemoving" class="loading-spinner"></span>
            {{ isRemoving ? 'Suppression...' : 'Retirer' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .categories-manager-container {
      border-radius: 8px;
      background: #fafbfc;
      border: 1px solid #e5e7eb;
      overflow: hidden;
    }

    /* Bouton flottant positionné à droite */
    .floating-action {
      display: flex;
      justify-content: flex-end;
      padding: 12px 16px;
      margin-bottom: 8px;
    }

    /* Header compact */
    .header-section {
      background: #374151;
      padding: 12px 16px;

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .title-area {
          display: flex;
          align-items: center;
          gap: 8px;

          .icon-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            background: #4b5563;
            border-radius: 6px;

            svg {
              color: white;
              width: 16px;
              height: 16px;
            }
          }

          h3 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            color: white;
          }
        }

        .action-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #6b7280;
          border: 1px solid #6b7280;
          border-radius: 6px;
          color: white;
          font-weight: 500;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover:not(:disabled) {
            background: #9ca3af;
            border-color: #9ca3af;
          }

          &.active {
            background: white;
            color: #374151;
            border-color: white;
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          svg {
            width: 14px;
            height: 14px;
          }
        }
      }
    }

    /* Contenu principal */
    .content-area {
      padding: 12px;
      min-height: 120px;

      &.assign-mode-active {
        background: #f9fafb;
      }
    }

    /* État de chargement compact */
    .loading-card {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;

      .loading-content {
        text-align: center;

        .pulse-loader {
          display: flex;
          gap: 4px;
          justify-content: center;
          margin-bottom: 8px;

          .pulse-dot {
            width: 8px;
            height: 8px;
            background: #6b7280;
            border-radius: 50%;
            animation: pulse 1.5s ease-in-out infinite;

            &:nth-child(2) {
              animation-delay: 0.2s;
            }

            &:nth-child(3) {
              animation-delay: 0.4s;
            }
          }
        }

        p {
          color: #6b7280;
          font-size: 12px;
          margin: 0;
        }
      }
    }

    /* Showcase des catégories - compact */
    .categories-showcase {
      .categories-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 8px;
        margin-bottom: 12px;

        .category-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s ease;

          &:hover {
            border-color: #d1d5db;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

            .remove-action {
              opacity: 1;
            }
          }

          .card-content {
            flex: 1;
            min-width: 0;

            .category-description {
              margin-top: 4px;
              font-size: 11px;
              color: #6b7280;
              line-height: 1.3;
            }
          }

          .delete-icon-only {
            cursor: pointer;
            margin-left: 8px;
            transition: opacity 0.2s ease;

            &:hover {
              opacity: 0.7;
            }
          }
        }
      }

      .summary-bar {
        display: flex;
        justify-content: center;
        padding: 8px 0;
        border-top: 1px solid #e5e7eb;

        .stats {
          display: flex;
          align-items: center;
          gap: 6px;

          .count-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            background: #374151;
            color: white;
            border-radius: 50%;
            font-weight: 600;
            font-size: 12px;
          }

          .label {
            color: #6b7280;
            font-size: 12px;
            font-weight: 500;
          }
        }
      }
    }

    /* État vide compact */
    .empty-showcase {
      text-align: center;
      padding: 24px 16px;

      .empty-illustration {
        margin-bottom: 12px;
        opacity: 0.6;

        svg {
          color: #9ca3af;
        }
      }

      .empty-content {
        h4 {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 6px 0;
        }

        p {
          color: #6b7280;
          font-size: 12px;
          margin: 0 0 16px 0;
          line-height: 1.4;
        }

        .cta-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #374151;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            background: #4b5563;
          }

          svg {
            width: 14px;
            height: 14px;
          }
        }
      }
    }

    /* Panel d'assignation compact */
    .assignment-panel {
      background: white;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
      overflow: hidden;

      .panel-header {
        padding: 12px 16px;
        background: #f9fafb;
        border-bottom: 1px solid #e5e7eb;

        h4 {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 4px 0;
        }

        .subtitle {
          color: #6b7280;
          font-size: 12px;
          margin: 0;
          line-height: 1.3;
        }
      }

      .selection-area {
        padding: 12px;
        max-height: 300px;
        overflow-y: auto;

        .categories-selector {
          display: grid;
          gap: 8px;

          .selector-item {
            border-radius: 6px;
            border: 1px solid #e5e7eb;
            background: white;
            transition: all 0.2s ease;

            &:hover {
              border-color: #d1d5db;
              background: #fafbfc;
            }

            &.selected {
              border-color: #3b82f6;
              background: #f0f9ff;
            }

            &.already-assigned {
              border-color: #d1fae5;
              background: #f0fdf4;
              opacity: 0.8;
            }

            .selector-label {
              display: block;
              padding: 10px;
              cursor: pointer;
              margin: 0;

              .hidden-input {
                position: absolute;
                opacity: 0;
                pointer-events: none;
              }

              .selector-content {
                display: flex;
                align-items: center;
                gap: 8px;

                .checkbox-indicator {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 18px;
                  height: 18px;
                  border: 2px solid #d1d5db;
                  border-radius: 4px;
                  background: white;
                  transition: all 0.2s ease;
                  flex-shrink: 0;

                  svg {
                    opacity: 0;
                    transform: scale(0.7);
                    transition: all 0.2s ease;
                    color: white;
                    width: 12px;
                    height: 12px;
                  }
                }

                .category-info {
                  flex: 1;
                  min-width: 0;

                  .category-desc {
                    margin-top: 2px;
                    font-size: 11px;
                    color: #6b7280;
                    line-height: 1.2;
                  }

                  .status-label.assigned {
                    display: inline-flex;
                    align-items: center;
                    gap: 3px;
                    margin-top: 3px;
                    padding: 1px 6px;
                    background: #d1fae5;
                    color: #065f46;
                    border-radius: 8px;
                    font-size: 10px;
                    font-weight: 500;

                    svg {
                      width: 10px;
                      height: 10px;
                    }
                  }
                }
              }
            }

            &.selected .selector-content .checkbox-indicator {
              background: #3b82f6;
              border-color: #3b82f6;

              svg {
                opacity: 1;
                transform: scale(1);
              }
            }

            &.already-assigned .selector-content .checkbox-indicator {
              background: #10b981;
              border-color: #10b981;

              svg {
                opacity: 1;
                transform: scale(1);
              }
            }
          }
        }
      }

      .action-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: #f9fafb;
        border-top: 1px solid #e5e7eb;

        .selection-info {
          .selection-count {
            color: #3b82f6;
            font-size: 12px;
            font-weight: 500;
          }
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }
      }
    }

    .no-categories-panel {
      text-align: center;
      padding: 24px 16px;

      .panel-content {
        h4 {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin: 12px 0 6px 0;
        }

        p {
          color: #6b7280;
          font-size: 12px;
          margin: 0 0 16px 0;
          line-height: 1.4;
        }

        svg {
          color: #9ca3af;
          margin-bottom: 6px;
        }
      }
    }

    /* Styles des boutons compacts */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;

      &.btn-primary {
        background: #3b82f6;
        color: white;

        &:hover:not(:disabled) {
          background: #2563eb;
        }
      }

      &.btn-ghost {
        background: transparent;
        color: #6b7280;
        border: 1px solid #e5e7eb;

        &:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #d1d5db;
        }
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .loading-spinner {
        width: 14px;
        height: 14px;
        border: 2px solid currentColor;
        border-top: 2px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      svg {
        width: 14px;
        height: 14px;
      }
    }

    /* Animations */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes pulse {
      0%, 80%, 100% {
        transform: scale(1);
        opacity: 0.6;
      }
      40% {
        transform: scale(1.2);
        opacity: 1;
      }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Modal de suppression catégorie */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }

    .modal-container.category-delete-modal {
      background: white;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      max-width: 400px;
      width: calc(100vw - 32px);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .icon-container {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;

      &.icon-danger {
        background: #fee2e2;
        color: #dc2626;
      }

      .icon {
        width: 24px;
        height: 24px;
      }
    }

    .modal-header {
      padding: 20px 24px 0 24px;
    }

    .modal-body {
      padding: 16px 24px;
      text-align: center;
    }

    .modal-title {
      font-size: 16px;
      font-weight: 600;
      color: #111827;
      margin: 12px 0 8px 0;
    }

    .modal-message {
      color: #6b7280;
      font-size: 13px;
      line-height: 1.5;
      margin: 0;
    }

    .modal-actions {
      padding: 16px 24px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      background: #f9fafb;
    }

    .loading-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid currentColor;
      border-top: 2px solid transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Responsive compact */
    @media (max-width: 768px) {
      .categories-manager-container {
        border-radius: 6px;
      }

      .header-section {
        padding: 10px 12px;

        .header-content {
          .title-area {
            h3 {
              font-size: 13px;
            }

            .icon-wrapper {
              width: 24px;
              height: 24px;
            }
          }

          .action-button {
            padding: 5px 8px;
            font-size: 11px;
          }
        }
      }

      .content-area {
        padding: 10px;
      }

      .categories-showcase .categories-grid {
        grid-template-columns: 1fr;
        gap: 6px;
      }

      .assignment-panel {
        .panel-header {
          padding: 10px 12px;
        }

        .selection-area {
          padding: 10px;
        }

        .action-bar {
          flex-direction: column;
          gap: 8px;
          align-items: stretch;
          padding: 10px 12px;

          .action-buttons {
            width: 100%;
            justify-content: space-between;
          }
        }
      }
    }
  `]
})
export class ClientCategoriesManagerComponent implements OnInit, OnDestroy, OnChanges {
  @Input() client: ClientEntity | null = null;

  clientCategories: CategoryEntity[] = [];
  availableCategories: CategoryEntity[] = [];
  selectedCategoryIds: number[] = [];

  isLoading = false;
  isAssigning = false;
  isRemoving = false;
  showAssignMode = false;

  // États pour les modales
  showDeleteCategoryModal = false;
  categoryToDelete: CategoryEntity | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private getClientCategoriesUseCase: GetClientCategoriesUseCase,
    private assignCategoriesUseCase: AssignCategoriesUseCase,
    private removeCategoryUseCase: RemoveCategoryUseCase,
    private categoryFacade: CategoryFacade,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAvailableCategories();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['client'] && this.client) {
      this.loadClientCategories();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadClientCategories(): void {
    if (!this.client) return;

    this.isLoading = true;
    this.cdr.detectChanges();

    this.getClientCategoriesUseCase.execute(this.client.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ClientCategoryResponse) => {
          this.clientCategories = response.categories;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Erreur lors du chargement des catégories client:', error);
          this.clientCategories = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private loadAvailableCategories(): void {
    this.categoryFacade.categories$
      .pipe(takeUntil(this.destroy$))
      .subscribe(categories => {
        this.availableCategories = categories;
        this.cdr.detectChanges();
      });

    // Load categories if not already loaded
    this.categoryFacade.loadCategories().subscribe();
  }

  toggleAssignMode(): void {
    this.showAssignMode = !this.showAssignMode;
    if (!this.showAssignMode) {
      this.selectedCategoryIds = [];
    }
  }

  cancelAssign(): void {
    this.showAssignMode = false;
    this.selectedCategoryIds = [];
  }

  isSelected(categoryId: number): boolean {
    return this.selectedCategoryIds.includes(categoryId);
  }

  isCategoryAssigned(categoryId: number): boolean {
    return this.clientCategories.some(cat => cat.id === categoryId);
  }

  toggleSelection(categoryId: number, checked: boolean): void {
    if (checked && !this.isSelected(categoryId)) {
      this.selectedCategoryIds.push(categoryId);
    } else if (!checked) {
      this.selectedCategoryIds = this.selectedCategoryIds.filter(id => id !== categoryId);
    }
  }

  assignSelectedCategories(): void {
    if (!this.client || this.selectedCategoryIds.length === 0) return;

    this.isAssigning = true;
    this.cdr.detectChanges();

    this.assignCategoriesUseCase.execute(this.client.id, this.selectedCategoryIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.messageService.showSuccess(
            `${this.selectedCategoryIds.length} catégorie${this.selectedCategoryIds.length > 1 ? 's' : ''} assignée${this.selectedCategoryIds.length > 1 ? 's' : ''} avec succès`
          );
          this.clientCategories = response.categories;
          this.isAssigning = false;
          this.showAssignMode = false;
          this.selectedCategoryIds = [];
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Erreur lors de l\'assignation des catégories:', error);
          this.messageService.showError('Erreur lors de l\'assignation des catégories');
          this.isAssigning = false;
          this.cdr.detectChanges();
        }
      });
  }

  onDeleteCategory(category: CategoryEntity): void {
    if (this.isRemoving) return;
    this.categoryToDelete = category;
    this.showDeleteCategoryModal = true;
  }

  onCloseDeleteCategoryModal(): void {
    this.showDeleteCategoryModal = false;
    this.categoryToDelete = null;
  }

  onConfirmDeleteCategory(): void {
    if (!this.categoryToDelete || !this.client || this.isRemoving) return;

    this.isRemoving = true;
    this.cdr.detectChanges();

    this.removeCategoryUseCase.execute(this.client.id, this.categoryToDelete.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            this.messageService.showSuccess(`Catégorie "${this.categoryToDelete!.name}" retirée avec succès`);
            this.clientCategories = this.clientCategories.filter(cat => cat.id !== this.categoryToDelete!.id);
          }
          this.isRemoving = false;
          this.onCloseDeleteCategoryModal();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Erreur lors de la suppression de la catégorie:', error);
          this.messageService.showError('Erreur lors de la suppression de la catégorie');
          this.isRemoving = false;
          this.cdr.detectChanges();
        }
      });
  }
}