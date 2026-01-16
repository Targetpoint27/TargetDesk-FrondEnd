/**
 * Category Entity
 * Represents a client categorization entity
 */

export interface CategoryEntity {
  id: number;
  name: string;
  description: string | null;
  parent_id: number | null;
  color: string;
  type: CategoryType;
  is_active: boolean;
  created_by: number;
  created_at: string | Date;
  updated_at: string | Date;

  // Computed properties
  clients_count?: number;
  children_count?: number;
  depth_level?: number;
  full_path?: string;
  formatted_type?: string;

  // Relations
  creator?: {
    id: number;
    name: string;
  };
  parent?: {
    id: number;
    name: string;
  } | null;
  children?: CategoryEntity[];

  // Pivot data for client-category relationship
  pivot?: {
    client_id: number;
    category_id: number;
    assigned_by: number;
    assigned_at: string;
  };
}

export type CategoryType = 'secteur' | 'taille' | 'priorite' | 'origine' | 'personnalisee';

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  parent_id?: number;
  color?: string;
  type: CategoryType;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  parent_id?: number;
  color?: string;
  type?: CategoryType;
}

export interface CategorySummary {
  type: CategoryType;
  count: number;
  categories: {
    id: number;
    name: string;
    color: string;
  }[];
}

export interface AssignCategoriesRequest {
  category_ids: number[];
}

// Constants for category types with SVG icons
export const CATEGORY_TYPES: { value: CategoryType; label: string; icon: string }[] = [
  {
    value: 'secteur',
    label: 'Secteur',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
             <polyline points="9,22 9,12 15,12 15,22"/>
           </svg>`
  },
  {
    value: 'taille',
    label: 'Taille',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <line x1="18" y1="20" x2="18" y2="10"/>
             <line x1="12" y1="20" x2="12" y2="4"/>
             <line x1="6" y1="20" x2="6" y2="14"/>
           </svg>`
  },
  {
    value: 'priorite',
    label: 'Priorité',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
           </svg>`
  },
  {
    value: 'origine',
    label: 'Origine',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
             <circle cx="12" cy="10" r="3"/>
           </svg>`
  },
  {
    value: 'personnalisee',
    label: 'Personnalisée',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
             <line x1="7" y1="7" x2="7.01" y2="7"/>
           </svg>`
  }
];

// Default colors for category types
export const CATEGORY_TYPE_COLORS: Record<CategoryType, string> = {
  secteur: '#FF6B6B',
  taille: '#4ECDC4',
  priorite: '#FFD93D',
  origine: '#6A4C93',
  personnalisee: '#007bff'
};

// Utility functions
export function getCategoryTypeInfo(type: CategoryType) {
  return CATEGORY_TYPES.find(t => t.value === type) || CATEGORY_TYPES[4];
}

export function getDefaultColorForType(type: CategoryType): string {
  return CATEGORY_TYPE_COLORS[type];
}