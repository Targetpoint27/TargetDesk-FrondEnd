/**
 * Contact Mapper
 * Transforme les données entre l'API et les entités du domaine
 */

import { Injectable } from '@angular/core';

import { ContactEntity, ContactEmailEntity, ContactPhoneEntity } from '../../domain/entities/contact.entity';
import {
  ApiContact,
  ApiContactEmail,
  ApiContactPhone,
  ApiContactsResponse,
  ApiClientContactsResponse,
  ApiSupplierContactsResponse,
  ApiCreateContactRequest,
  ApiUpdateContactRequest
} from '../models/contact-api.models';

@Injectable({
  providedIn: 'root'
})
export class ContactMapper {

  /**
   * Transforme une réponse API contact en entité domaine
   */
  mapFromApi(apiContact: ApiContact): ContactEntity {
    return new ContactEntity(
      apiContact.id,
      apiContact.client_id || null,
      apiContact.supplier_id || null,
      apiContact.civility || null,
      apiContact.first_name,
      apiContact.last_name,
      apiContact.function || null,
      apiContact.department || null,
      apiContact.is_primary,
      apiContact.is_active,
      apiContact.created_by || 0,
      apiContact.created_at,
      apiContact.updated_at,
      this.mapEmailsFromApi(apiContact.emails || []),
      this.mapPhonesFromApi(apiContact.phones || []),
      apiContact.client || null,
      apiContact.supplier || null,
      apiContact.creator
    );
  }

  /**
   * Transforme une liste d'emails API en entités domaine
   */
  private mapEmailsFromApi(apiEmails: ApiContactEmail[]): ContactEmailEntity[] {
    return apiEmails.map(email => new ContactEmailEntity(
      email.id,
      email.contact_id,
      email.email,
      email.type,
      email.is_primary,
      email.created_at,
      email.updated_at
    ));
  }

  /**
   * Transforme une liste de téléphones API en entités domaine
   */
  private mapPhonesFromApi(apiPhones: ApiContactPhone[]): ContactPhoneEntity[] {
    return apiPhones.map(phone => new ContactPhoneEntity(
      phone.id,
      phone.contact_id,
      phone.phone,
      phone.type,
      phone.is_primary,
      phone.created_at,
      phone.updated_at
    ));
  }

  /**
   * Transforme une réponse de liste globale de contacts
   */
  mapContactsListFromApi(apiResponse: ApiContactsResponse) {
    return {
      contacts: apiResponse.data.contacts.map(contact => this.mapFromApi(contact)),
      pagination: {
        currentPage: apiResponse.data.pagination.current_page,
        totalPages: apiResponse.data.pagination.total_pages,
        totalItems: apiResponse.data.pagination.total_items,
        perPage: apiResponse.data.pagination.per_page
      },
      filters: apiResponse.data.filters || {}
    };
  }

  /**
   * Transforme une réponse de contacts client
   */
  mapClientContactsFromApi(apiResponse: ApiClientContactsResponse) {
    return {
      contacts: apiResponse.data.contacts.map(contact => this.mapFromApi(contact)),
      pagination: {
        currentPage: apiResponse.data.pagination.current_page,
        totalPages: apiResponse.data.pagination.total_pages,
        totalItems: apiResponse.data.pagination.total_items,
        perPage: apiResponse.data.pagination.per_page
      },
      client: apiResponse.data.client ? {
        id: apiResponse.data.client.id,
        clientId: apiResponse.data.client.client_id,
        name: apiResponse.data.client.name
      } : null
    };
  }

  /**
   * Transforme une réponse de contacts fournisseur
   */
  mapSupplierContactsFromApi(apiResponse: ApiSupplierContactsResponse) {
    return {
      contacts: apiResponse.data.contacts.map(contact => this.mapFromApi(contact)),
      pagination: {
        currentPage: apiResponse.data.pagination.current_page,
        totalPages: apiResponse.data.pagination.total_pages,
        totalItems: apiResponse.data.pagination.total_items,
        perPage: apiResponse.data.pagination.per_page
      },
      supplier: apiResponse.data.supplier ? {
        id: apiResponse.data.supplier.id,
        supplierId: apiResponse.data.supplier.supplier_id,
        name: apiResponse.data.supplier.name
      } : null
    };
  }

  /**
   * Transforme une entité contact en objet pour l'API (création)
   */
  mapToApiForCreate(contact: {
    civility?: string;
    firstName: string;
    lastName: string;
    functionValue?: string;
    department?: string;
    emails: Array<{
      email: string;
      type: string;
      isPrimary: boolean;
    }>;
    phones?: Array<{
      phone: string;
      type: string;
      isPrimary: boolean;
    }>;
  }) {
    return {
      civility: contact.civility || null,
      first_name: contact.firstName,
      last_name: contact.lastName,
      function: contact.functionValue || null,
      department: contact.department || null,
      emails: contact.emails.map(email => ({
        email: email.email,
        type: email.type,
        is_primary: email.isPrimary
      })),
      phones: contact.phones ? contact.phones.map(phone => ({
        phone: phone.phone,
        type: phone.type,
        is_primary: phone.isPrimary
      })) : []
    };
  }

  /**
   * Transforme une entité contact en objet pour l'API (mise à jour)
   */
  mapToApiForUpdate(updates: Partial<{
    civility: string;
    firstName: string;
    lastName: string;
    functionValue: string;
    department: string;
    emails: Array<{
      email: string;
      type: string;
      isPrimary: boolean;
    }>;
    phones: Array<{
      phone: string;
      type: string;
      isPrimary: boolean;
    }>;
  }>) {
    const apiUpdates: any = {};

    if (updates.civility !== undefined) apiUpdates.civility = updates.civility;
    if (updates.firstName !== undefined) apiUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) apiUpdates.last_name = updates.lastName;
    if (updates.functionValue !== undefined) apiUpdates.function = updates.functionValue;
    if (updates.department !== undefined) apiUpdates.department = updates.department;

    if (updates.emails !== undefined) {
      apiUpdates.emails = updates.emails.map(email => ({
        email: email.email,
        type: email.type,
        is_primary: email.isPrimary
      }));
    }

    if (updates.phones !== undefined) {
      apiUpdates.phones = updates.phones.map(phone => ({
        phone: phone.phone,
        type: phone.type,
        is_primary: phone.isPrimary
      }));
    }

    return apiUpdates;
  }
}