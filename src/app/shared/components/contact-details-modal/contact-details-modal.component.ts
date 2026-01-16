import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ContactEntity, ContactEmailEntity, ContactPhoneEntity } from '../../../domain/entities/contact.entity';
import { ContactFacade, ContactDetailsState } from '../../../application/facades/contact.facade';

@Component({
  selector: 'app-contact-details-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact-details-modal.component.html',
  styleUrls: ['./contact-details-modal.component.scss']
})
export class ContactDetailsModalComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Input() contactId: number | null = null;

  @Output() close = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  // États observables
  contactDetailsState$: Observable<ContactDetailsState>;
  contact$: Observable<ContactEntity | null>;
  isLoading$: Observable<boolean>;
  error$: Observable<string | null>;

  constructor(private contactFacade: ContactFacade) {
    // Initialisation des observables
    this.contactDetailsState$ = this.contactFacade.contactDetailsState$;
    this.contact$ = this.contactFacade.contactDetails$;
    this.isLoading$ = this.contactFacade.contactDetailsLoading$;
    this.error$ = this.contactFacade.contactDetailsError$;
  }

  ngOnInit(): void {
    if (this.contactId) {
      this.contactFacade.loadContactDetails(this.contactId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  onRefresh(): void {
    if (this.contactId) {
      this.contactFacade.loadContactDetails(this.contactId);
    }
  }

  // Méthodes utilitaires pour l'affichage
  getContactInitials(contact: ContactEntity): string {
    return contact.getInitials();
  }

  getEntityBadgeClass(entityType: string): string {
    return entityType === 'client' ? 'badge-client' : 'badge-supplier';
  }

  getEntityDisplayName(entityType: string): string {
    return entityType === 'client' ? 'Client' : 'Fournisseur';
  }

  formatPhone(phone: string): string {
    // Format français : 01 23 45 67 89
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    return phone;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getEmailTypeLabel(type: string): string {
    const labels = {
      professionnel: 'Professionnel',
      personnel: 'Personnel'
    };
    return labels[type as keyof typeof labels] || type;
  }

  getPhoneTypeLabel(type: string): string {
    const labels = {
      bureau: 'Bureau',
      mobile: 'Mobile',
      fax: 'Fax',
      autre: 'Autre'
    };
    return labels[type as keyof typeof labels] || type;
  }

  getPrimaryEmails(contact: ContactEntity): ContactEmailEntity[] {
    return contact.emails.filter(email => email.is_primary);
  }

  getSecondaryEmails(contact: ContactEntity): ContactEmailEntity[] {
    return contact.emails.filter(email => !email.is_primary);
  }

  getPrimaryPhones(contact: ContactEntity): ContactPhoneEntity[] {
    return contact.phones.filter(phone => phone.is_primary);
  }

  getSecondaryPhones(contact: ContactEntity): ContactPhoneEntity[] {
    return contact.phones.filter(phone => !phone.is_primary);
  }

  hasSecondaryEmails(contact: ContactEntity): boolean {
    return this.getSecondaryEmails(contact).length > 0;
  }

  hasSecondaryPhones(contact: ContactEntity): boolean {
    return this.getSecondaryPhones(contact).length > 0;
  }

  hasPhones(contact: ContactEntity): boolean {
    return contact.phones && contact.phones.length > 0;
  }

  // Actions de contact (email/téléphone)
  callPhone(phone: string): void {
    window.open(`tel:${phone}`, '_self');
  }

  sendEmail(email: string): void {
    window.open(`mailto:${email}`, '_self');
  }

  copyToClipboard(text: string, type: 'email' | 'phone'): void {
    navigator.clipboard.writeText(text).then(() => {
      // Vous pouvez ajouter une notification toast ici
      console.log(`${type} copié: ${text}`);
    }).catch(err => {
      console.error('Erreur lors de la copie:', err);
    });
  }

  // Gestion de la modal
  onClose(): void {
    this.contactFacade.clearContactDetails();
    this.close.emit();
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  preventDefault(event: Event): void {
    event.stopPropagation();
  }

  // Méthodes d'état pour les templates
  canMakePrimary(contact: ContactEntity | null): boolean {
    return contact ? !contact.is_primary : false;
  }

  getStatusBadgeClass(isPrimary: boolean): string {
    return isPrimary ? 'status-primary' : 'status-secondary';
  }

  getStatusBadgeText(isPrimary: boolean): string {
    return isPrimary ? 'Principal' : 'Secondaire';
  }

  // Navigation vers entité parente
  viewParentEntity(contact: ContactEntity): void {
    const entityType = contact.entity_type;
    const entityId = contact.client_id || contact.supplier_id;

    if (entityId) {
      // Vous pouvez implémenter la navigation vers la page de l'entité
      console.log(`Navigation vers ${entityType} ${entityId}`);
      // Exemple: this.router.navigate([`/${entityType}s`, entityId]);
    }
  }


  // Méthodes pour obtenir les icônes
  getEntityIcon(entityType: string): string {
    return entityType === 'client' ? 'users' : 'business';
  }
}