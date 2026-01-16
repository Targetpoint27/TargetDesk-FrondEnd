import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  url?: string;
  disabled?: boolean;
  divider?: boolean;
  children?: MenuItem[];
}

@Component({
  selector: 'ui-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './menu.html',
  styleUrl: './menu.scss'
})
export class Menu {
  @Input() items: MenuItem[] = [];
  @Input() isOpen = false;
  @Input() variant: 'dropdown' | 'context' | 'sidebar' = 'dropdown';
  @Input() position: 'left' | 'right' | 'center' = 'left';
  @Input() trigger?: HTMLElement;

  @Output() itemClick = new EventEmitter<MenuItem>();
  @Output() openChange = new EventEmitter<boolean>();

  openSubmenuId: string | null = null;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (this.isOpen && this.trigger && !this.trigger.contains(event.target as Node)) {
      this.close();
    }
  }

  onItemClick(item: MenuItem, event?: Event) {
    if (item.disabled) return;

    if (item.children && item.children.length > 0) {
      this.toggleSubmenu(item.id);
      event?.preventDefault();
      return;
    }

    this.itemClick.emit(item);

    if (this.variant === 'dropdown' || this.variant === 'context') {
      this.close();
    }
  }

  toggleSubmenu(itemId: string) {
    this.openSubmenuId = this.openSubmenuId === itemId ? null : itemId;
  }

  isSubmenuOpen(itemId: string): boolean {
    return this.openSubmenuId === itemId;
  }

  close() {
    this.isOpen = false;
    this.openSubmenuId = null;
    this.openChange.emit(false);
  }

  trackByFn(index: number, item: MenuItem): string {
    return item.id;
  }
}
