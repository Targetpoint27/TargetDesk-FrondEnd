import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, map, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../../core/api/api.service';

import { ContactRepository, ContactsListResponse, ClientContactsResponse, SupplierContactsResponse } from '../../domain/repositories/contact.repository';
import { ContactEntity, ContactEmailEntity, ContactPhoneEntity, ContactFilters, CreateContactData, UpdateContactData, UserReference, ClientReference, SupplierReference } from '../../domain/entities/contact.entity';
import {
  ApiContactsResponse,
  ApiClientContactsResponse,
  ApiSupplierContactsResponse,
  ApiContactDetailsResponse,
  ApiContactCreatedResponse,
  ApiContactUpdatedResponse,
  ApiMakePrimaryResponse,
  ApiDeleteContactResponse,
  ApiContact,
  ApiContactEmail,
  ApiContactPhone,
  ApiCreateContactRequest,
  ApiUpdateContactRequest,
  GetContactsParams,
  GetClientContactsParams,
  GetSupplierContactsParams,
  ApiContactError
} from '../models/contact-api.models';

@Injectable({
  providedIn: 'root'
})
export class ContactApiRepository extends ContactRepository {
  private readonly endpoint = 'contacts';

  constructor(private apiService: ApiService) {
    super();
  }

  getContacts(filters?: ContactFilters): Observable<ContactsListResponse> {
    let params = new HttpParams();

    if (filters) {
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.per_page) params = params.set('per_page', filters.per_page.toString());
      if (filters.search) params = params.set('search', filters.search);
      if (filters.entity_type) params = params.set('entity_type', filters.entity_type);
    }

    return this.apiService.get<ApiContactsResponse>(`${this.endpoint}`, { params })
      .pipe(
        map(response => ({
          contacts: response.data.contacts.map(contact => this.mapApiContactToEntity(contact)),
          pagination: response.data.pagination,
          filters: response.data.filters
        })),
        catchError(this.handleError)
      );
  }

  getClientContacts(clientId: number, page: number = 1, perPage: number = 10): Observable<ClientContactsResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString());

    return this.apiService.get<ApiClientContactsResponse>(`clients/${clientId}/contacts`, { params })
      .pipe(
        map(response => ({
          contacts: response.data.contacts.map(contact => this.mapApiContactToEntity(contact)),
          pagination: response.data.pagination,
          client: response.data.client
        })),
        catchError(this.handleError)
      );
  }

  getSupplierContacts(supplierId: number, page: number = 1, perPage: number = 10): Observable<SupplierContactsResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString());

    return this.apiService.get<ApiSupplierContactsResponse>(`suppliers/${supplierId}/contacts`, { params })
      .pipe(
        map(response => ({
          contacts: response.data.contacts.map(contact => this.mapApiContactToEntity(contact)),
          pagination: response.data.pagination,
          supplier: response.data.supplier
        })),
        catchError(this.handleError)
      );
  }

  getContactDetails(contactId: number): Observable<ContactEntity> {
    return this.apiService.get<ApiContactDetailsResponse>(`${this.endpoint}/${contactId}`)
      .pipe(
        map(response => this.mapApiContactToEntity(response.data)),
        catchError(this.handleError)
      );
  }

  createClientContact(clientId: number, contactData: CreateContactData): Observable<ContactEntity> {
    const apiContactData: ApiCreateContactRequest = this.mapCreateContactDataToApiRequest(contactData);

    return this.apiService.post<ApiContactCreatedResponse>(`clients/${clientId}/contacts`, apiContactData)
      .pipe(
        map(response => this.mapApiContactToEntity(response.data)),
        catchError(this.handleError)
      );
  }

  createSupplierContact(supplierId: number, contactData: CreateContactData): Observable<ContactEntity> {
    const apiContactData: ApiCreateContactRequest = this.mapCreateContactDataToApiRequest(contactData);

    return this.apiService.post<ApiContactCreatedResponse>(`suppliers/${supplierId}/contacts`, apiContactData)
      .pipe(
        map(response => this.mapApiContactToEntity(response.data)),
        catchError(this.handleError)
      );
  }

  updateContact(contactId: number, updateData: any): Observable<ContactEntity> {
    // Handle both UpdateContactData (with id) and UpdateContactRequest (with contactId)
    const { id, contactId: dataContactId, ...dataWithoutId } = updateData;
    const apiUpdateData: ApiUpdateContactRequest = this.mapUpdateContactDataToApiRequest(dataWithoutId);

    return this.apiService.put<ApiContactUpdatedResponse>(`${this.endpoint}/${contactId}`, apiUpdateData)
      .pipe(
        map(response => {
          // If the update response doesn't include emails/phones, fetch the full contact details
          if (!response.data.emails || !response.data.phones) {
            // Return a basic entity for now, the use case will handle the refresh
            return new ContactEntity(
              response.data.id,
              response.data.client_id,
              response.data.supplier_id,
              response.data.civility,
              response.data.first_name,
              response.data.last_name,
              response.data.function,
              response.data.department,
              response.data.is_primary,
              response.data.is_active,
              response.data.created_by,
              response.data.created_at,
              response.data.updated_at,
              [], // Empty emails array
              [], // Empty phones array
              response.data.client,
              response.data.supplier,
              response.data.creator
            );
          }
          return this.mapApiContactToEntity(response.data);
        }),
        catchError(this.handleError)
      );
  }

  makePrimaryContact(contactId: number): Observable<ContactEntity> {
    return this.apiService.put<ApiMakePrimaryResponse>(`${this.endpoint}/${contactId}/make-primary`, {})
      .pipe(
        map(response => this.mapApiContactToEntity(response.data)),
        catchError(this.handleError)
      );
  }

  deleteContact(contactId: number): Observable<boolean> {
    return this.apiService.delete<ApiDeleteContactResponse>(`${this.endpoint}/${contactId}`)
      .pipe(
        map(response => response.success),
        catchError(this.handleError)
      );
  }

  // Nouvelles méthodes compatibles avec les use cases modernes
  createForClient(clientId: number, contactData: any): Observable<ContactEntity> {
    return this.createClientContact(clientId, contactData);
  }

  createForSupplier(supplierId: number, contactData: any): Observable<ContactEntity> {
    return this.createSupplierContact(supplierId, contactData);
  }

  update(contactId: number, updateData: any): Observable<ContactEntity> {
    return this.updateContact(contactId, updateData);
  }

  makePrimary(contactId: number): Observable<ContactEntity> {
    return this.makePrimaryContact(contactId);
  }

  delete(contactId: number): Observable<boolean> {
    return this.deleteContact(contactId);
  }

  // Mappers privés
  private mapApiContactToEntity(apiContact: ApiContact): ContactEntity {
    const emails = (apiContact.emails || []).map(email => this.mapApiEmailToEntity(email));
    const phones = (apiContact.phones || []).map(phone => this.mapApiPhoneToEntity(phone));

    return new ContactEntity(
      apiContact.id,
      apiContact.client_id,
      apiContact.supplier_id,
      apiContact.civility,
      apiContact.first_name,
      apiContact.last_name,
      apiContact.function,
      apiContact.department,
      apiContact.is_primary,
      apiContact.is_active,
      apiContact.created_by,
      apiContact.created_at,
      apiContact.updated_at,
      emails,
      phones,
      apiContact.client,
      apiContact.supplier,
      apiContact.creator
    );
  }

  private mapApiEmailToEntity(apiEmail: ApiContactEmail): ContactEmailEntity {
    return new ContactEmailEntity(
      apiEmail.id,
      apiEmail.contact_id,
      apiEmail.email,
      apiEmail.type,
      apiEmail.is_primary,
      apiEmail.created_at,
      apiEmail.updated_at
    );
  }

  private mapApiPhoneToEntity(apiPhone: ApiContactPhone): ContactPhoneEntity {
    return new ContactPhoneEntity(
      apiPhone.id,
      apiPhone.contact_id,
      apiPhone.phone,
      apiPhone.type,
      apiPhone.is_primary,
      apiPhone.created_at,
      apiPhone.updated_at
    );
  }

  private mapCreateContactDataToApiRequest(contactData: any): ApiCreateContactRequest {
    return {
      civility: contactData.civility,
      first_name: contactData.firstName || contactData.first_name,
      last_name: contactData.lastName || contactData.last_name,
      function: contactData.functionValue || contactData.function,
      department: contactData.department,
      is_primary: contactData.is_primary || contactData.isPrimary,
      emails: contactData.emails.map((email: any) => ({
        email: email.email,
        type: email.type,
        is_primary: email.is_primary || email.isPrimary
      })),
      phones: contactData.phones?.map((phone: any) => ({
        phone: phone.phone,
        type: phone.type,
        is_primary: phone.is_primary || phone.isPrimary
      }))
    };
  }

  private mapUpdateContactDataToApiRequest(updateData: any): ApiUpdateContactRequest {
    const apiData: ApiUpdateContactRequest = {};

    // Only include fields that are not undefined/null and not empty strings
    if (updateData.civility !== undefined && updateData.civility !== null) {
      apiData.civility = updateData.civility;
    }

    // Handle both camelCase (Use Case) and snake_case (legacy) formats
    if (updateData.firstName !== undefined && updateData.firstName !== null) {
      apiData.first_name = updateData.firstName;
    } else if (updateData.first_name !== undefined && updateData.first_name !== null) {
      apiData.first_name = updateData.first_name;
    }

    if (updateData.lastName !== undefined && updateData.lastName !== null) {
      apiData.last_name = updateData.lastName;
    } else if (updateData.last_name !== undefined && updateData.last_name !== null) {
      apiData.last_name = updateData.last_name;
    }

    if (updateData.functionValue !== undefined && updateData.functionValue !== null) {
      apiData.function = updateData.functionValue;
    } else if (updateData.function !== undefined && updateData.function !== null) {
      apiData.function = updateData.function;
    }

    if (updateData.department !== undefined && updateData.department !== null) {
      apiData.department = updateData.department;
    }

    if (updateData.is_primary !== undefined && updateData.is_primary !== null) {
      apiData.is_primary = updateData.is_primary;
    }

    // Always include emails and phones if provided (as per API doc example)
    if (updateData.emails && updateData.emails.length > 0) {
      apiData.emails = updateData.emails.map((email: any) => ({
        email: email.email,
        type: email.type,
        is_primary: email.isPrimary || email.is_primary
      }));
    }

    if (updateData.phones && updateData.phones.length > 0) {
      apiData.phones = updateData.phones.map((phone: any) => ({
        phone: phone.phone,
        type: phone.type,
        is_primary: phone.isPrimary || phone.is_primary
      }));
    }

    return apiData;
  }

  private handleError = (error: any): Observable<never> => {
    console.error('Contact API Error:', error);

    if (error.error && !error.error.success) {
      const apiError = error.error as ApiContactError;

      // Gestion spécifique des erreurs métier
      if (apiError.message.includes('email est déjà utilisé')) {
        throw new Error(`Email déjà utilisé : ${apiError.message}`);
      }

      if (apiError.message.includes('contact principal')) {
        throw new Error('Impossible de supprimer le contact principal. Définissez d\'abord un autre contact comme principal.');
      }

      if (apiError.errors) {
        const errorMessages = Object.entries(apiError.errors)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('; ');
        throw new Error(`Erreurs de validation : ${errorMessages}`);
      }

      throw new Error(apiError.message || 'Erreur lors de l\'opération sur le contact');
    }

    throw new Error('Erreur de connexion au serveur');
  };
}