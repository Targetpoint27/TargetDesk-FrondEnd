/**
 * Get Folders Use Case
 * Handles business logic for retrieving folder structure for a client
 */

import { Injectable } from '@angular/core';
import { Observable, map, catchError } from 'rxjs';
import { FolderRepository } from '../../repositories/folder.repository';
import { FolderEntity, FolderUtils } from '../../entities/folder.entity';
import {
  FolderSearchParams,
  FolderUseCaseResult
} from '../../models/folder.models';

@Injectable({
  providedIn: 'root'
})
export class GetFoldersUseCase {
  constructor(private folderRepository: FolderRepository) {}

  execute(params: FolderSearchParams): Observable<FolderUseCaseResult<FolderEntity[]>> {
    return this.folderRepository.getByClient(params).pipe(
      map(folders => {
        // Sort folders by hierarchy (parents before children, then alphabetically)
        const sortedFolders = FolderUtils.sortFoldersByPath(folders);

        return {
          success: true,
          data: sortedFolders
        };
      }),
      catchError(error => {
        throw error;
      })
    );
  }

  /**
   * Get folders organized as a tree structure
   */
  getFoldersAsTree(params: FolderSearchParams): Observable<FolderUseCaseResult<any>> {
    return this.execute(params).pipe(
      map(result => {
        if (!result.success || !result.data) {
          return result;
        }

        const tree = FolderUtils.buildFolderTree(result.data);

        return {
          success: true,
          data: tree
        };
      })
    );
  }

  /**
   * Get folders for a select/dropdown component
   */
  getFoldersForSelection(clientId: number, maxLevel: number = 5): Observable<FolderUseCaseResult<any[]>> {
    const params: FolderSearchParams = {
      client_id: clientId,
      include_counts: true
    };

    return this.execute(params).pipe(
      map(result => {
        if (!result.success || !result.data) {
          return result;
        }

        const menuItems = result.data
          .filter(folder => folder.level <= maxLevel)
          .map(folder => ({
            path: folder.path,
            name: folder.name,
            level: folder.level,
            displayName: this.buildDisplayName(folder.name, folder.level),
            documentCount: folder.documentCount,
            isDisabled: false
          }));

        return {
          success: true,
          data: menuItems
        };
      })
    );
  }

  /**
   * Get breadcrumbs for a given folder path
   */
  getBreadcrumbs(folderPath: string): any[] {
    if (!folderPath) {
      return [{ name: 'Racine', path: '', isActive: true }];
    }

    const segments = folderPath.split('/').filter(s => s.length > 0);
    const breadcrumbs = [];

    // Add root
    breadcrumbs.push({
      name: 'Racine',
      path: '',
      isActive: segments.length === 0
    });

    // Add each segment
    for (let i = 0; i < segments.length; i++) {
      const segmentPath = segments.slice(0, i + 1).join('/');
      breadcrumbs.push({
        name: segments[i],
        path: segmentPath,
        isActive: i === segments.length - 1
      });
    }

    return breadcrumbs;
  }

  private buildDisplayName(name: string, level: number, indentChar: string = '  '): string {
    const indent = indentChar.repeat(level);
    return `${indent}📁 ${name}`;
  }
}