/**
 * Supplier Entity
 * Domain entity representing a supplier in the TargetDesk system
 */

export class SupplierEntity {
  constructor(
    public readonly id: number,
    public readonly supplierId: string,
    public readonly name: string,
    public readonly type: 'particulier' | 'entreprise',
    public readonly email: string,
    public readonly phone: string | null = null,
    public readonly address: string | null = null,
    public readonly siret: string | null = null,
    public readonly sector: string | null = null,
    public readonly website: string | null = null,
    public readonly notes: string | null = null,
    public readonly relationType: 'fournisseur' | 'client_et_fournisseur' = 'fournisseur',
    public readonly paymentTerms: string | null = null,
    public readonly deliveryDelay: number | null = null,
    public readonly currency: string = 'EUR',
    public readonly isActive: boolean = true,
    public readonly createdBy: number | null = null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  /**
   * Get display name for the supplier
   */
  getDisplayName(): string {
    return this.name;
  }

  /**
   * Check if supplier is a business
   */
  isBusiness(): boolean {
    return this.type === 'entreprise';
  }

  /**
   * Check if supplier is also a client
   */
  isClientAndSupplier(): boolean {
    return this.relationType === 'client_et_fournisseur';
  }

  /**
   * Get formatted delivery delay
   */
  getFormattedDeliveryDelay(): string {
    if (this.deliveryDelay === null) return '-';
    if (this.deliveryDelay === 0) return 'Immédiat';
    if (this.deliveryDelay === 1) return '1 jour';
    return `${this.deliveryDelay} jours`;
  }

  /**
   * Get formatted relation type
   */
  getFormattedRelationType(): string {
    return this.relationType === 'client_et_fournisseur'
      ? 'Client & Fournisseur'
      : 'Fournisseur';
  }

  /**
   * Get formatted payment terms
   */
  getFormattedPaymentTerms(): string {
    return this.paymentTerms || '-';
  }

  /**
   * Check if supplier has complete business information
   */
  hasCompleteBusinessInfo(): boolean {
    return this.type === 'entreprise' &&
           !!(this.siret && this.sector);
  }

  /**
   * Check if supplier is active
   */
  isActiveSupplier(): boolean {
    return this.isActive;
  }

  /**
   * Get summary for display
   */
  getSummary(): string {
    const parts = [this.name];
    if (this.sector) parts.push(this.sector);
    if (this.deliveryDelay !== null) {
      parts.push(this.getFormattedDeliveryDelay());
    }
    return parts.join(' • ');
  }
}