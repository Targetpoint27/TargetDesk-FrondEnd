/**
 * Folder Entity - Domain Model
 * Represents a hierarchical folder structure for client documents
 */

export interface FolderEntityData {
  readonly path: string;
  readonly name: string;
  readonly level: number;
  readonly parent_path?: string | null;
  readonly description?: string | null;
  readonly document_count?: number;
  readonly created_at?: Date | null;
  readonly updated_at?: Date | null;
}

export class FolderEntity {
  private constructor(private readonly data: Required<FolderEntityData>) {}

  // Factory method for creating new instances
  static create(data: FolderEntityData): FolderEntity {
    const now = new Date();
    return new FolderEntity({
      path: data.path,
      name: data.name,
      level: data.level,
      parent_path: data.parent_path ?? null,
      description: data.description ?? null,
      document_count: data.document_count ?? 0,
      created_at: data.created_at ?? now,
      updated_at: data.updated_at ?? now,
    });
  }

  // Getters for accessing data
  get path(): string { return this.data.path; }
  get name(): string { return this.data.name; }
  get level(): number { return this.data.level; }
  get parentPath(): string | null { return this.data.parent_path; }
  get description(): string | null { return this.data.description; }
  get documentCount(): number { return this.data.document_count; }
  get createdAt(): Date | null { return this.data.created_at; }
  get updatedAt(): Date | null { return this.data.updated_at; }

  // Business logic methods
  isRootFolder(): boolean {
    return this.level === 0 && !this.parentPath;
  }

  hasSubfolders(): boolean {
    return this.level >= 0; // Can potentially have subfolders
  }

  hasDocuments(): boolean {
    return this.documentCount > 0;
  }

  getPathSegments(): string[] {
    return this.path.split('/').filter(segment => segment.length > 0);
  }

  getParentPathSegments(): string[] {
    if (!this.parentPath) return [];
    return this.parentPath.split('/').filter(segment => segment.length > 0);
  }

  buildChildPath(childName: string): string {
    return `${this.path}/${childName}`;
  }

  getDisplayName(): string {
    return this.name;
  }

  getFullDisplayPath(): string {
    const segments = this.getPathSegments();
    return segments.join(' > ');
  }

  getIndentedName(indentChar: string = '  '): string {
    const indent = indentChar.repeat(this.level);
    return `${indent}📁 ${this.name}`;
  }

  // Validation methods
  isValidPath(): boolean {
    return this.path.length > 0 &&
           this.path.length <= 500 &&
           !this.path.includes('..') &&
           !this.path.startsWith('/') &&
           !this.path.endsWith('/');
  }

  isValidName(): boolean {
    const invalidChars = /[<>:"/\\|?*]/;
    return this.name.length > 0 &&
           this.name.length <= 200 &&
           !invalidChars.test(this.name);
  }

  // Immutable update methods
  withUpdatedDocumentCount(count: number): FolderEntity {
    return FolderEntity.create({
      ...this.data,
      document_count: count,
      updated_at: new Date()
    });
  }

  withUpdatedDescription(description: string): FolderEntity {
    return FolderEntity.create({
      ...this.data,
      description,
      updated_at: new Date()
    });
  }

  // Serialization
  toData(): FolderEntityData {
    return { ...this.data };
  }

  // For debugging and logging
  toString(): string {
    return `Folder(${this.path}: ${this.name} - ${this.documentCount} docs)`;
  }
}

/**
 * Helper functions for folder operations
 */
export class FolderUtils {
  static validateFolderName(name: string): { isValid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { isValid: false, error: 'Le nom du dossier est obligatoire' };
    }

    if (name.length > 200) {
      return { isValid: false, error: 'Le nom du dossier ne peut pas dépasser 200 caractères' };
    }

    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(name)) {
      return { isValid: false, error: 'Le nom du dossier contient des caractères invalides' };
    }

    return { isValid: true };
  }

  static buildFolderPath(parentPath: string | null, folderName: string): string {
    if (!parentPath) {
      return folderName;
    }
    return `${parentPath}/${folderName}`;
  }

  static calculateLevel(path: string): number {
    return path.split('/').filter(segment => segment.length > 0).length - 1;
  }

  static sortFoldersByPath(folders: FolderEntity[]): FolderEntity[] {
    return folders.sort((a, b) => {
      // First sort by level (parents before children)
      if (a.level !== b.level) {
        return a.level - b.level;
      }
      // Then sort alphabetically by path
      return a.path.localeCompare(b.path);
    });
  }

  static buildFolderTree(folders: FolderEntity[]): FolderTreeNode[] {
    const tree: FolderTreeNode[] = [];
    const nodeMap = new Map<string, FolderTreeNode>();

    // Create nodes for all folders
    folders.forEach(folder => {
      const node: FolderTreeNode = {
        folder,
        children: [],
        parent: null
      };
      nodeMap.set(folder.path, node);
    });

    // Build tree structure
    folders.forEach(folder => {
      const node = nodeMap.get(folder.path)!;

      if (folder.parentPath) {
        const parentNode = nodeMap.get(folder.parentPath);
        if (parentNode) {
          node.parent = parentNode;
          parentNode.children.push(node);
        } else {
          // Parent not found, treat as root
          tree.push(node);
        }
      } else {
        // Root folder
        tree.push(node);
      }
    });

    return tree;
  }
}

export interface FolderTreeNode {
  folder: FolderEntity;
  children: FolderTreeNode[];
  parent: FolderTreeNode | null;
}