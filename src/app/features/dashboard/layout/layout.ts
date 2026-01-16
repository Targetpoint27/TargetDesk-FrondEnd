import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { AuthFacade } from '../../auth/auth.facade';
import { UserEntity } from '../../../domain/entities/user.entity';

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  active?: boolean;
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class DashboardLayoutComponent implements OnInit {

  // Observable pour l'utilisateur connecté
  currentUser$!: Observable<UserEntity | null>;

  // User dropdown state
  isUserDropdownOpen = false;

  menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard/home',
      active: false
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: 'people',
      route: '/dashboard/clients',
      active: false
    },
    {
      id: 'suppliers',
      label: 'Fournisseurs',
      icon: 'business',
      route: '/dashboard/suppliers',
      active: false
    },
    {
      id: 'contacts',
      label: 'Contacts',
      icon: 'contacts',
      route: '/dashboard/contacts',
      active: false
    },
    {
      id: 'categories',
      label: 'Catégories',
      icon: 'category',
      route: '/dashboard/categories',
      active: false
    }
  ];

  constructor(
    private router: Router,
    private authFacade: AuthFacade,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.currentUser$ = this.authFacade.user$;
    this.updateActiveMenu();
    this.listenToRouteChanges();
  }

  onMenuClick(menuItem: MenuItem): void {
    // Update active state
    this.menuItems.forEach(item => item.active = false);
    menuItem.active = true;

    // Navigate to route
    this.router.navigate([menuItem.route]);
  }

  // User dropdown methods
  toggleUserDropdown(): void {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
  }

  closeUserDropdown(): void {
    this.isUserDropdownOpen = false;
  }

  onProfileClick(): void {
    this.closeUserDropdown();
    this.router.navigate(['/dashboard/profile']);
  }

  onLogout(): void {
    this.closeUserDropdown();
    this.authFacade.logout$().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeUserDropdown();
    }
  }

  // Private methods for menu synchronization
  private updateActiveMenu(): void {
    const currentUrl = this.router.url;
    this.menuItems.forEach(item => {
      item.active = this.isMenuActive(item.route, currentUrl);
    });
  }

  private listenToRouteChanges(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(event => (event as NavigationEnd).url)
      )
      .subscribe(url => {
        this.menuItems.forEach(item => {
          item.active = this.isMenuActive(item.route, url);
        });
      });
  }

  private isMenuActive(menuRoute: string, currentUrl: string): boolean {
    // Handle exact matches and parent routes
    if (currentUrl === menuRoute) {
      return true;
    }

    // Handle dashboard home as default
    if (menuRoute === '/dashboard/home' && currentUrl === '/dashboard') {
      return true;
    }

    // Handle sub-routes
    if (currentUrl.startsWith(menuRoute) && menuRoute !== '/dashboard/home') {
      return true;
    }

    return false;
  }
}
