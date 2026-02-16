/**
 * Folder Mapper
 * Maps between API models and domain entities for folders
 */

import { FolderEntity, FolderEntityData } from '../../domain/entities/folder.entity';
import { FolderApiResponse } from '../api/folder-api.models';

export class FolderMapper {
  /**
   * Convert API response to domain entity
   */
  static fromApiResponse(apiData: FolderApiResponse): FolderEntity {
    const entityData: FolderEntityData = {
      path: apiData.path,
      name: apiData.name,
      level: apiData.level,
      parent_path: apiData.parent_path,
      description: apiData.description || null,
      document_count: apiData.document_count || 0,
      created_at: new Date(apiData.created_at),
      updated_at: new Date(apiData.updated_at)
    };

    return FolderEntity.create(entityData);
  }

  /**
   * Convert array of API responses to domain entities
   */
  static fromApiResponseArray(apiDataArray: FolderApiResponse[]): FolderEntity[] {
    return apiDataArray.map(apiData => FolderMapper.fromApiResponse(apiData));
  }

  /**
   * Convert domain entity to API request format
   * (Currently not needed but may be useful for future updates)
   */
  static toApiRequest(entity: FolderEntity): Partial<FolderApiResponse> {
    return {
      name: entity.name,
      path: entity.path,
      parent_path: entity.parentPath,
      description: entity.description || undefined
    };
  }
}