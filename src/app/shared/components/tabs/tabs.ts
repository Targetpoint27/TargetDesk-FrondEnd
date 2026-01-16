import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
  icon?: string;
}

@Component({
  selector: 'ui-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tabs.html',
  styleUrl: './tabs.scss'
})
export class Tabs {
  @Input() items: TabItem[] = [];
  @Input() activeTabId: string = '';
  @Input() variant: 'default' | 'pills' | 'underline' = 'default';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() fullWidth = false;

  @Output() tabChange = new EventEmitter<string>();

  ngOnInit() {
    if (!this.activeTabId && this.items.length > 0) {
      this.activeTabId = this.items[0].id;
    }
  }

  selectTab(tabId: string, disabled?: boolean) {
    if (disabled) return;

    if (this.activeTabId !== tabId) {
      this.activeTabId = tabId;
      this.tabChange.emit(tabId);
    }
  }

  isActive(tabId: string): boolean {
    return this.activeTabId === tabId;
  }

  trackByFn(index: number, item: TabItem): string {
    return item.id;
  }
}
