import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  url?: string;
  icon?: string;
}

@Component({
  selector: 'ui-breadcrumbs',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './breadcrumbs.html',
  styleUrl: './breadcrumbs.scss'
})
export class Breadcrumbs {
  @Input() items: BreadcrumbItem[] = [];
  @Input() separator = '/';
  @Input() showHome = true;
  @Input() homeLabel = 'Accueil';
  @Input() homeUrl = '/';

  get breadcrumbItems(): BreadcrumbItem[] {
    const allItems: BreadcrumbItem[] = [];

    if (this.showHome) {
      allItems.push({ label: this.homeLabel, url: this.homeUrl });
    }

    allItems.push(...this.items);
    return allItems;
  }

  isLastItem(index: number): boolean {
    return index === this.breadcrumbItems.length - 1;
  }
}
