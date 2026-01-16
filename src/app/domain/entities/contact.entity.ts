export type ContactCivility = 'M.' | 'Mme' | 'Dr.' | 'Prof.' | 'Maître';
export type ContactEmailType = 'professionnel' | 'personnel';
export type ContactPhoneType = 'bureau' | 'mobile' | 'fax' | 'autre';
export type ContactEntityType = 'client' | 'supplier';

export interface UserReference {
  id: number;
  name: string;
}

export interface ClientReference {
  id: number;
  client_id: string;
  name: string;
}

export interface SupplierReference {
  id: number;
  supplier_id: string;
  name: string;
}

export class ContactEmailEntity {
  constructor(
    public id: number,
    public contact_id: number,
    public email: string,
    public type: ContactEmailType,
    public is_primary: boolean,
    public created_at: string,
    public updated_at: string
  ) {}

  static createNew(
    email: string,
    type: ContactEmailType = 'professionnel',
    is_primary: boolean = false
  ): ContactEmailEntity {
    return new ContactEmailEntity(
      0, // temporary id
      0, // temporary contact_id
      email.toLowerCase().trim(),
      type,
      is_primary,
      new Date().toISOString(),
      new Date().toISOString()
    );
  }

  isValid(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email) && this.email.length > 0;
  }

  getDisplayLabel(): string {
    return this.type === 'professionnel' ? 'Professionnel' : 'Personnel';
  }
}

export class ContactPhoneEntity {
  constructor(
    public id: number,
    public contact_id: number,
    public phone: string,
    public type: ContactPhoneType,
    public is_primary: boolean,
    public created_at: string,
    public updated_at: string
  ) {}

  static createNew(
    phone: string,
    type: ContactPhoneType = 'bureau',
    is_primary: boolean = false
  ): ContactPhoneEntity {
    return new ContactPhoneEntity(
      0, // temporary id
      0, // temporary contact_id
      phone.trim(),
      type,
      is_primary,
      new Date().toISOString(),
      new Date().toISOString()
    );
  }

  isValid(): boolean {
    // Accepter n'importe quel format de numéro international
    const cleanPhone = this.phone.replace(/[\s.-]/g, '');
    return cleanPhone.length > 0;
  }

  getDisplayLabel(): string {
    const labels = {
      bureau: 'Bureau',
      mobile: 'Mobile',
      fax: 'Fax',
      autre: 'Autre'
    };
    return labels[this.type];
  }

  getFormattedPhone(): string {
    const cleaned = this.phone.replace(/[\s.-]/g, '');
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    return this.phone;
  }
}

export class ContactEntity {
  id: number;
  client_id: number | null;
  supplier_id: number | null;
  civility: ContactCivility | null;
  first_name: string;
  last_name: string;
  'function': string | null;
  department: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  emails: ContactEmailEntity[];
  phones: ContactPhoneEntity[];
  client: ClientReference | null;
  supplier: SupplierReference | null;
  creator: UserReference;

  constructor(
    id: number,
    client_id: number | null,
    supplier_id: number | null,
    civility: ContactCivility | null,
    first_name: string,
    last_name: string,
    functionValue: string | null,
    department: string | null,
    is_primary: boolean,
    is_active: boolean,
    created_by: number,
    created_at: string,
    updated_at: string,
    emails: ContactEmailEntity[],
    phones: ContactPhoneEntity[],
    client: ClientReference | null,
    supplier: SupplierReference | null,
    creator: UserReference
  ) {
    this.id = id;
    this.client_id = client_id;
    this.supplier_id = supplier_id;
    this.civility = civility;
    this.first_name = first_name;
    this.last_name = last_name;
    this['function'] = functionValue;
    this.department = department;
    this.is_primary = is_primary;
    this.is_active = is_active;
    this.created_by = created_by;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.emails = emails;
    this.phones = phones;
    this.client = client;
    this.supplier = supplier;
    this.creator = creator;
  }

  // Propriétés calculées
  get full_name(): string {
    const parts = [];
    if (this.civility) parts.push(this.civility);
    if (this.first_name) parts.push(this.first_name);
    if (this.last_name) parts.push(this.last_name);
    return parts.join(' ');
  }

  get primary_email(): string | null {
    const primaryEmail = this.emails.find(email => email.is_primary);
    return primaryEmail?.email || this.emails[0]?.email || null;
  }

  get primary_phone(): string | null {
    const primaryPhone = this.phones.find(phone => phone.is_primary);
    return primaryPhone?.phone || this.phones[0]?.phone || null;
  }

  get entity_type(): ContactEntityType {
    return this.client_id ? 'client' : 'supplier';
  }

  get entity_name(): string {
    return this.client?.name || this.supplier?.name || 'Entité inconnue';
  }

  get entity_id(): string {
    return this.client?.client_id || this.supplier?.supplier_id || '';
  }

  get entity_reference(): ClientReference | SupplierReference | null {
    return this.client || this.supplier;
  }

  // Méthodes utilitaires
  isClientContact(): boolean {
    return this.client_id !== null;
  }

  isSupplierContact(): boolean {
    return this.supplier_id !== null;
  }

  hasValidEmails(): boolean {
    return this.emails.length > 0 && this.emails.every(email => email.isValid());
  }

  hasValidPhones(): boolean {
    return this.phones.every(phone => phone.isValid());
  }

  getPrimaryEmail(): ContactEmailEntity | null {
    return this.emails.find(email => email.is_primary) || this.emails[0] || null;
  }

  getPrimaryPhone(): ContactPhoneEntity | null {
    return this.phones.find(phone => phone.is_primary) || this.phones[0] || null;
  }

  getSecondaryEmails(): ContactEmailEntity[] {
    return this.emails.filter(email => !email.is_primary);
  }

  getSecondaryPhones(): ContactPhoneEntity[] {
    return this.phones.filter(phone => !phone.is_primary);
  }

  getCivilityDisplay(): string {
    return this.civility || '';
  }

  getFunctionDisplay(): string {
    return this.function || '';
  }

  getDepartmentDisplay(): string {
    return this.department || '';
  }

  getInitials(): string {
    const firstInitial = this.first_name?.charAt(0)?.toUpperCase() || '';
    const lastInitial = this.last_name?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial;
  }

  getEntityBadgeColor(): string {
    return this.entity_type === 'client' ? '#4f46e5' : '#059669';
  }

  getEntityBadgeLabel(): string {
    return this.entity_type === 'client' ? 'Client' : 'Fournisseur';
  }

  isValid(): boolean {
    return (
      this.first_name.trim().length > 0 &&
      this.last_name.trim().length > 0 &&
      this.hasValidEmails() &&
      this.hasValidPhones() &&
      (this.client_id !== null || this.supplier_id !== null)
    );
  }

  // Factory methods
  static createForClient(
    clientId: number,
    data: CreateContactData
  ): Partial<ContactEntity> {
    return {
      client_id: clientId,
      supplier_id: null,
      civility: data.civility || null,
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      function: data.function?.trim() || null,
      department: data.department?.trim() || null,
      is_primary: data.is_primary ?? false,
      is_active: true,
      emails: data.emails.map(e => ContactEmailEntity.createNew(e.email, e.type, e.is_primary)),
      phones: (data.phones || []).map(p => ContactPhoneEntity.createNew(p.phone, p.type, p.is_primary))
    };
  }

  static createForSupplier(
    supplierId: number,
    data: CreateContactData
  ): Partial<ContactEntity> {
    return {
      client_id: null,
      supplier_id: supplierId,
      civility: data.civility || null,
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      function: data.function?.trim() || null,
      department: data.department?.trim() || null,
      is_primary: data.is_primary ?? false,
      is_active: true,
      emails: data.emails.map(e => ContactEmailEntity.createNew(e.email, e.type, e.is_primary)),
      phones: (data.phones || []).map(p => ContactPhoneEntity.createNew(p.phone, p.type, p.is_primary))
    };
  }
}

// Types utilitaires pour les formulaires
export interface CreateContactData {
  civility?: ContactCivility;
  first_name: string;
  last_name: string;
  function?: string;
  department?: string;
  is_primary?: boolean;
  emails: {
    email: string;
    type: ContactEmailType;
    is_primary: boolean;
  }[];
  phones?: {
    phone: string;
    type: ContactPhoneType;
    is_primary: boolean;
  }[];
}

export interface UpdateContactData extends Partial<CreateContactData> {
  id: number;
}

export interface ContactFilters {
  search?: string;
  entity_type?: ContactEntityType;
  page?: number;
  per_page?: number;
}

export interface ContactPagination {
  current_page: number;
  total_pages: number;
  total_items: number;
  per_page: number;
}