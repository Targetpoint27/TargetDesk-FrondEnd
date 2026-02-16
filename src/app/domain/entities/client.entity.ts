/**
 * Client Entity - Domain Model
 * Represents a client with business logic and validation rules
 */

import { CategoryEntity, CategorySummary, getCategoryTypeInfo } from './category.entity';

export type ClientType = 'particulier' | 'entreprise';

export interface CustomField {
  readonly id?: number; // Added 'id' property
  readonly field_key: string;
  readonly field_value: string;
  readonly field_label?: string;
  readonly field_type?: string;
  readonly field_description?: string;
  readonly is_required?: boolean;
  readonly display_order?: number;
  readonly formatted_value?: string;
}

export interface ClientEntityData {
  readonly id?: number;
  readonly clientId?: string;
  readonly name: string;
  readonly type: ClientType;
  readonly email: string;
  readonly phone?: string | null;
  readonly address?: string | null;
  readonly siret?: string | null;
  readonly sector?: string | null;
  readonly website?: string | null;
  readonly notes?: string | null;
  readonly isActive?: boolean;
  readonly createdBy?: number | null;
  readonly createdAt?: Date | null;
  readonly updatedAt?: Date | null;
  readonly creator?: {
    id: number;
    name: string;
  } | null;

  // Category-related properties
  readonly categories_count?: number;
  readonly categories_summary?: CategorySummary[];
  readonly categories?: CategoryEntity[];

  // Custom fields
  readonly custom_fields?: CustomField[];
}

export class ClientEntity {
  private constructor(private readonly data: Required<ClientEntityData>) {}

  // Factory method for creating new instances
  static create(data: ClientEntityData): ClientEntity {
    const now = new Date();
    return new ClientEntity({
      id: data.id ?? 0,
      clientId: data.clientId ?? '',
      name: data.name,
      type: data.type,
      email: data.email,
      phone: data.phone ?? null,
      address: data.address ?? null,
      siret: data.siret ?? null,
      sector: data.sector ?? null,
      website: data.website ?? null,
      notes: data.notes ?? null,
      isActive: data.isActive ?? true,
      createdBy: data.createdBy ?? null,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
      creator: data.creator ?? null,
      categories_count: data.categories_count ?? 0,
      categories_summary: data.categories_summary ?? [],
      categories: data.categories ?? [],
      custom_fields: data.custom_fields ?? [],
    });
  }

  // Getters for accessing data
  get id(): number { return this.data.id; }
  get clientId(): string { return this.data.clientId; }
  get name(): string { return this.data.name; }
  get type(): ClientType { return this.data.type; }
  get email(): string { return this.data.email; }
  get phone(): string | null { return this.data.phone; }
  get address(): string | null { return this.data.address; }
  get siret(): string | null { return this.data.siret; }
  get sector(): string | null { return this.data.sector; }
  get website(): string | null { return this.data.website; }
  get notes(): string | null { return this.data.notes; }
  get isActive(): boolean { return this.data.isActive; }
  get createdBy(): number | null { return this.data.createdBy; }
  get createdAt(): Date | null { return this.data.createdAt; }
  get updatedAt(): Date | null { return this.data.updatedAt; }
  get creator(): { id: number; name: string; } | null { return this.data.creator; }

  // Category-related getters
  get categoriesCount(): number { return this.data.categories_count; }
  get categoriesSummary(): CategorySummary[] { return this.data.categories_summary; }
  get categories(): CategoryEntity[] { return this.data.categories; }

  // Custom fields getters
  get customFields(): CustomField[] { return this.data.custom_fields; }

  // Business logic methods
  isCompany(): boolean {
    return this.type === 'entreprise';
  }

  isIndividual(): boolean {
    return this.type === 'particulier';
  }

  hasValidSiret(): boolean {
    return this.siret !== null && this.siret.length === 14 && /^\d{14}$/.test(this.siret);
  }

  hasWebsite(): boolean {
    return this.website !== null && this.website.length > 0;
  }

  getDisplayName(): string {
    return this.name;
  }

  getTypeLabel(): string {
    return this.type === 'entreprise' ? 'Entreprise' : 'Particulier';
  }

  getContactInfo(): string {
    const parts: string[] = [];
    if (this.email) parts.push(this.email);
    if (this.phone) parts.push(this.phone);
    return parts.join(' • ');
  }

  getFormattedAddress(): string | null {
    return this.address ? this.address.replace(/\n/g, ', ') : null;
  }

  getCreatorName(): string {
    return this.creator?.name || 'Système';
  }

  // Category-related business methods
  hasCategories(): boolean {
    return this.categoriesCount > 0;
  }

  getCategoriesByType(type: string): CategoryEntity[] {
    return this.categories.filter(cat => cat.type === type);
  }

  getCategoryNamesForType(type: string): string[] {
    return this.getCategoriesByType(type).map(cat => cat.name);
  }

  getFormattedCategorySummary(): string {
    if (!this.hasCategories()) {
      return 'Aucune catégorie';
    }

    const summaryParts = this.categoriesSummary.map(summary => {
      const typeInfo = getCategoryTypeInfo(summary.type);
      return `${typeInfo.label}: ${summary.count}`;
    });

    return summaryParts.join(' • ');
  }

  getCategoryColors(): string[] {
    return this.categories.map(cat => cat.color);
  }

  // Custom fields business methods
  hasCustomFields(): boolean {
    return this.customFields && this.customFields.length > 0;
  }

  getCustomFieldValue(fieldKey: string): string | null {
    const field = this.customFields?.find(f => f.field_key === fieldKey);
    return field?.field_value || null;
  }

  getCustomFieldByKey(fieldKey: string): CustomField | null {
    return this.customFields?.find(f => f.field_key === fieldKey) || null;
  }

  getCustomFieldsSortedByOrder(): CustomField[] {
    if (!this.customFields) return [];
    return [...this.customFields].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }

  getRequiredCustomFields(): CustomField[] {
    return this.customFields?.filter(f => f.is_required) || [];
  }

  hasRequiredCustomFieldsEmpty(): boolean {
    return this.getRequiredCustomFields().some(f => !f.field_value || f.field_value.trim().length === 0);
  }

  // Validation methods
  isValidForCreation(): boolean {
    return this.name.length > 0 &&
           this.email.length > 0 &&
           this.isValidEmail() &&
           (this.type === 'particulier' || this.type === 'entreprise');
  }

  isValidEmail(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email);
  }

  // Immutable update methods
  withUpdatedData(updates: Partial<ClientEntityData>): ClientEntity {
    return ClientEntity.create({
      ...this.data,
      ...updates,
      updatedAt: new Date()
    });
  }

  withDeactivated(): ClientEntity {
    return this.withUpdatedData({ isActive: false });
  }

  withActivated(): ClientEntity {
    return this.withUpdatedData({ isActive: true });
  }

  // Serialization
  toData(): ClientEntityData {
    return { ...this.data };
  }

  // For debugging and logging
  toString(): string {
    return `Client(${this.clientId}: ${this.name} - ${this.email})`;
  }
}