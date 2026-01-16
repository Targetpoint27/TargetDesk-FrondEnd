import { Component, Input, Output, EventEmitter, HostBinding, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ModalSize = 'small' | 'medium' | 'large' | 'fullscreen';
export type ModalVariant = 'default' | 'centered' | 'drawer';

@Component({
  selector: 'ui-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.html',
  styleUrl: './modal.scss'
})
export class ModalComponent implements AfterViewInit, OnDestroy {
  @ViewChild('modalDialog') modalDialog!: ElementRef<HTMLDivElement>;

  @Input() isOpen: boolean = false;
  @Input() size: ModalSize = 'medium';
  @Input() variant: ModalVariant = 'default';
  @Input() title?: string;
  @Input() closable: boolean = true;
  @Input() closeOnEscape: boolean = true;
  @Input() closeOnBackdrop: boolean = true;
  @Input() showHeader: boolean = true;
  @Input() showFooter: boolean = false;
  @Input() loading: boolean = false;
  @Input() fullHeight: boolean = false;

  @Output() openChange = new EventEmitter<boolean>();
  @Output() closed = new EventEmitter<void>();
  @Output() opened = new EventEmitter<void>();
  @Output() backdropClicked = new EventEmitter<void>();

  @HostBinding('class') get cssClasses(): string {
    return [
      'ui-modal',
      `ui-modal--${this.size}`,
      `ui-modal--${this.variant}`,
      this.isOpen ? 'ui-modal--open' : '',
      this.loading ? 'ui-modal--loading' : '',
      this.fullHeight ? 'ui-modal--full-height' : ''
    ].filter(Boolean).join(' ');
  }

  @HostBinding('style.display') get display(): string {
    return this.isOpen ? 'flex' : 'none';
  }

  @HostBinding('attr.role') role = 'dialog';
  @HostBinding('attr.aria-modal') ariaModal = 'true';
  @HostBinding('attr.aria-hidden') get ariaHidden(): boolean {
    return !this.isOpen;
  }
  @HostBinding('attr.aria-labelledby') get ariaLabelledBy(): string | null {
    return this.title ? 'modal-title' : null;
  }

  private previousActiveElement: Element | null = null;

  ngAfterViewInit(): void {
    if (this.isOpen) {
      this.handleOpen();
    }
  }

  ngOnDestroy(): void {
    this.restoreFocus();
  }

  open(): void {
    if (!this.isOpen) {
      this.isOpen = true;
      this.openChange.emit(true);
      this.handleOpen();
      this.opened.emit();
    }
  }

  close(): void {
    if (this.isOpen && !this.loading) {
      this.isOpen = false;
      this.openChange.emit(false);
      this.handleClose();
      this.closed.emit();
    }
  }

  private handleOpen(): void {
    // Store the currently focused element
    this.previousActiveElement = document.activeElement;

    // Focus the modal
    setTimeout(() => {
      if (this.modalDialog) {
        this.modalDialog.nativeElement.focus();
      }
    }, 100);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  private handleClose(): void {
    this.restoreFocus();
    document.body.style.overflow = '';
  }

  private restoreFocus(): void {
    if (this.previousActiveElement && 'focus' in this.previousActiveElement) {
      (this.previousActiveElement as HTMLElement).focus();
    }
  }

  onBackdropClick(): void {
    this.backdropClicked.emit();
    if (this.closeOnBackdrop && this.closable) {
      this.close();
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.closeOnEscape && this.closable) {
      this.close();
    }
  }

  onDialogClick(event: Event): void {
    event.stopPropagation();
  }

  trackBySlot(index: number, item: any): any {
    return index;
  }
}

export { ModalComponent as Modal };