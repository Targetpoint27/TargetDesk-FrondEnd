import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { DocumentFolder, CreateFolderRequest } from '../../../domain/entities/document.entity';
import { ClientDocumentFacade } from '../../../features/dashboard/clients/document.facade';

interface FolderTreeNode extends DocumentFolder {
  children: FolderTreeNode[];
  expanded: boolean;
  selected: boolean;
  parent?: FolderTreeNode;
}

@Component({
  selector: 'app-folder-tree',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="folder-tree-container">
      <div class="folder-tree-header">
        <h6 class="mb-2">Dossiers</h6>
        <button
          class="btn btn-sm btn-outline-primary"
          (click)="showCreateForm = !showCreateForm">
          <i class="bi bi-plus"></i>
          Nouveau dossier
        </button>
      </div>

      @if (showCreateForm) {
        <div class="create-folder-form mb-3 p-3 border rounded">
          <div class="mb-2">
            <label class="form-label">Nom du dossier</label>
            <input
              type="text"
              class="form-control form-control-sm"
              [(ngModel)]="newFolderName"
              placeholder="Entrer le nom du dossier"
              (keyup.enter)="createFolder()">
          </div>

          @if (selectedFolder && selectedFolder.path !== '') {
            <div class="mb-2">
              <small class="text-muted">
                Créer dans: {{ selectedFolder.name || 'Racine' }}
              </small>
            </div>
          }

          <div class="d-flex gap-2">
            <button
              class="btn btn-sm btn-success"
              (click)="createFolder()"
              [disabled]="!newFolderName.trim()">
              Créer
            </button>
            <button
              class="btn btn-sm btn-secondary"
              (click)="cancelCreateFolder()">
              Annuler
            </button>
          </div>
        </div>
      }

      <div class="folder-tree">
        <div
          class="folder-item root"
          [class.selected]="selectedFolderPath === ''"
          (click)="selectFolder(null)">
          <i class="bi bi-house-door"></i>
          <span>Racine</span>
          <span class="document-count">{{ getTotalDocuments() }}</span>
        </div>

        @for (node of folderTree; track node.path) {
          <div class="folder-node" [style.margin-left.px]="node.level * 20">
            <div
              class="folder-item"
              [class.selected]="node.selected"
              (click)="selectFolder(node)">

              <span class="folder-toggle" (click)="toggleFolder(node); $event.stopPropagation()">
                @if (node.children.length > 0) {
                  <i class="bi" [class.bi-chevron-right]="!node.expanded" [class.bi-chevron-down]="node.expanded"></i>
                } @else {
                  <span style="width: 16px; display: inline-block;"></span>
                }
              </span>

              <i class="bi bi-folder folder-icon"></i>
              <span class="folder-name">{{ node.name }}</span>
              <span class="document-count">{{ node.document_count }}</span>
            </div>

            @if (node.expanded && node.children.length > 0) {
              <div class="folder-children">
                @for (child of node.children; track child.path) {
                  <ng-container *ngTemplateOutlet="folderTemplate; context: { $implicit: child }"></ng-container>
                }
              </div>
            }
          </div>
        }
      </div>

      <ng-template #folderTemplate let-node>
        <div class="folder-node" [style.margin-left.px]="node.level * 20">
          <div
            class="folder-item"
            [class.selected]="node.selected"
            (click)="selectFolder(node)">

            <span class="folder-toggle" (click)="toggleFolder(node); $event.stopPropagation()">
              @if (node.children.length > 0) {
                <i class="bi" [class.bi-chevron-right]="!node.expanded" [class.bi-chevron-down]="node.expanded"></i>
              } @else {
                <span style="width: 16px; display: inline-block;"></span>
              }
            </span>

            <i class="bi bi-folder folder-icon"></i>
            <span class="folder-name">{{ node.name }}</span>
            <span class="document-count">{{ node.document_count }}</span>
          </div>

          @if (node.expanded && node.children.length > 0) {
            <div class="folder-children">
              @for (child of node.children; track child.path) {
                <ng-container *ngTemplateOutlet="folderTemplate; context: { $implicit: child }"></ng-container>
              }
            </div>
          }
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .folder-tree-container {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      max-height: 500px;
      overflow-y: auto;
    }

    .folder-tree-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      border-bottom: 1px solid #e9ecef;
      padding-bottom: 12px;
    }

    .folder-tree-header h6 {
      margin: 0;
      color: #495057;
      font-weight: 600;
    }

    .create-folder-form {
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .folder-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.2s ease;
      margin-bottom: 2px;
      background: white;
      border: 1px solid #e9ecef;
    }

    .folder-item:hover {
      background: #e3f2fd;
      border-color: #2196f3;
    }

    .folder-item.selected {
      background: #2196f3;
      color: white;
      border-color: #1976d2;
    }

    .folder-item.root {
      font-weight: 600;
      background: #fff3e0;
      border-color: #ff9800;
    }

    .folder-item.root:hover {
      background: #ffe0b2;
    }

    .folder-item.root.selected {
      background: #ff9800;
      color: white;
    }

    .folder-toggle {
      width: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 4px;
      cursor: pointer;
    }

    .folder-toggle:hover {
      background: rgba(0,0,0,0.1);
      border-radius: 3px;
    }

    .folder-icon {
      margin-right: 8px;
      color: #ffa726;
    }

    .folder-name {
      flex: 1;
      font-weight: 500;
    }

    .document-count {
      background: #6c757d;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      margin-left: auto;
    }

    .folder-item.selected .document-count {
      background: rgba(255,255,255,0.3);
    }

    .folder-children {
      margin-left: 20px;
    }

    .folder-node {
      margin-bottom: 2px;
    }
  `]
})
export class FolderTreeComponent implements OnInit, OnDestroy, OnChanges {
  @Input() clientId!: number;
  @Input() folders: DocumentFolder[] = [];
  @Output() folderSelected = new EventEmitter<string>();
  @Output() folderCreated = new EventEmitter<DocumentFolder>();

  folderTree: FolderTreeNode[] = [];
  selectedFolderPath = '';
  selectedFolder: FolderTreeNode | null = null;
  showCreateForm = false;
  newFolderName = '';

  private destroy$ = new Subject<void>();

  constructor(private documentFacade: ClientDocumentFacade) {}

  ngOnInit(): void {
    this.buildFolderTree();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['folders'] && changes['folders'].currentValue) {
      this.buildFolderTree();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  buildFolderTree(): void {
    const nodeMap = new Map<string, FolderTreeNode>();
    const rootNodes: FolderTreeNode[] = [];

    // Create all nodes
    this.folders.forEach(folder => {
      const node: FolderTreeNode = {
        ...folder,
        children: [],
        expanded: false,
        selected: false
      };
      nodeMap.set(folder.path, node);
    });

    // Build hierarchy
    this.folders.forEach(folder => {
      const node = nodeMap.get(folder.path)!;
      const pathParts = folder.path.split('/');

      if (pathParts.length === 1) {
        // Root level folder
        rootNodes.push(node);
      } else {
        // Find parent
        const parentPath = pathParts.slice(0, -1).join('/');
        const parent = nodeMap.get(parentPath);
        if (parent) {
          parent.children.push(node);
          node.parent = parent;
        }
      }
    });

    // Sort children by name
    this.sortFolderTree(rootNodes);
    this.folderTree = rootNodes;
  }

  private sortFolderTree(nodes: FolderTreeNode[]): void {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach(node => {
      if (node.children.length > 0) {
        this.sortFolderTree(node.children);
      }
    });
  }

  selectFolder(node: FolderTreeNode | null): void {
    // Deselect all
    this.deselectAllFolders(this.folderTree);

    if (node) {
      node.selected = true;
      this.selectedFolderPath = node.path;
      this.selectedFolder = node;
    } else {
      this.selectedFolderPath = '';
      this.selectedFolder = null;
    }

    this.folderSelected.emit(this.selectedFolderPath);
  }

  private deselectAllFolders(nodes: FolderTreeNode[]): void {
    nodes.forEach(node => {
      node.selected = false;
      this.deselectAllFolders(node.children);
    });
  }

  toggleFolder(node: FolderTreeNode): void {
    node.expanded = !node.expanded;
  }

  createFolder(): void {
    if (!this.newFolderName.trim()) return;

    const folderRequest: CreateFolderRequest = {
      folder_name: this.newFolderName.trim(),
      parent_path: this.selectedFolder?.path || undefined
    };

    this.documentFacade.createFolder(this.clientId, folderRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (folder) => {
          this.folderCreated.emit(folder);
          this.cancelCreateFolder();
          // Refresh folder tree
          this.documentFacade.loadFolders(this.clientId);
        },
        error: (error) => {
          console.error('Error creating folder:', error);
        }
      });
  }

  cancelCreateFolder(): void {
    this.showCreateForm = false;
    this.newFolderName = '';
  }

  getTotalDocuments(): number {
    return this.folders.reduce((total, folder) => total + folder.document_count, 0);
  }
}