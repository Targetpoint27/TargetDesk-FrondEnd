import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Observable, combineLatest } from 'rxjs';
import { filter, map, switchMap, startWith } from 'rxjs/operators';
import { AuthFacade } from '../../auth/auth.facade';
import { UserEntity } from '../../../domain/entities/user.entity';
import { PermissionService } from '../../../core/auth/permission.service';
import { PERMISSIONS } from '../../../domain/models/permission.models';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationModalComponent } from '../../../shared/components/notification-modal/notification-modal.component';

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  requiredPermissions: string[];
  active?: boolean;
  visible?: boolean;
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationModalComponent],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class DashboardLayoutComponent implements OnInit {

  // Observable pour l'utilisateur connecté
  currentUser$!: Observable<UserEntity | null>;

  // Observable pour le rôle principal de l'utilisateur
  userRole$!: Observable<string>;

  // Observable pour les éléments de menu visibles
  visibleMenuItems$!: Observable<MenuItem[]>;

  // Observable pour les permissions d'interface
  canAccessSettings$!: Observable<boolean>;

  // Observable pour le nombre de notifications
  notificationCount$!: Observable<number>;

  // État du dropdown du menu utilisateur
  isUserMenuOpen = false;

  // État du dropdown des notifications
  isNotificationMenuOpen = false;

  // État de la modal de notifications
  isNotificationModalOpen = false;

  menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard/home',
      requiredPermissions: [PERMISSIONS.DASHBOARD_PERSONAL],
      active: false,
      visible: false
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: 'people',
      route: '/dashboard/clients',
      requiredPermissions: [PERMISSIONS.CLIENTS_READ],
      active: false,
      visible: false
    },
    {
      id: 'suppliers',
      label: 'Fournisseurs',
      icon: 'business',
      route: '/dashboard/suppliers',
      requiredPermissions: [PERMISSIONS.CLIENTS_READ],
      active: false,
      visible: false
    },
    {
      id: 'contacts',
      label: 'Contacts',
      icon: 'contacts',
      route: '/dashboard/contacts',
      requiredPermissions: [PERMISSIONS.CONTACTS_READ],
      active: false,
      visible: false
    },
    {
      id: 'categories',
      label: 'Catégories',
      icon: 'category',
      route: '/dashboard/categories',
      requiredPermissions: [PERMISSIONS.SYSTEM_VIEW],
      active: false,
      visible: false
    }
  ];

  constructor(
    private router: Router,
    private authFacade: AuthFacade,
    private permissionService: PermissionService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.currentUser$ = this.authFacade.user$;

    // Initialize user role observable
    this.userRole$ = this.permissionService.getUserPermissions().pipe(
      map(permissions => {
        if (!permissions?.roles?.length) {
          return 'Utilisateur';
        }

        // Get the first role's description or name
        const primaryRole = permissions.roles[0];
        return primaryRole.description || primaryRole.name || 'Utilisateur';
      })
    );

    // Initialize settings access permission
    this.canAccessSettings$ = this.permissionService.hasAnyPermission([
      PERMISSIONS.SYSTEM_VIEW,
      PERMISSIONS.SYSTEM_MANAGE,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.ROLES_READ,
      PERMISSIONS.PERMISSIONS_READ
    ]);

    // Initialize notification count
    this.notificationCount$ = this.notificationService.notificationCount$;

    this.setupMenuPermissions();
    this.updateActiveMenu();
    this.listenToRouteChanges();
    this.loadNotifications();
  }

  onMenuClick(menuItem: MenuItem): void {
    // Update active state
    this.menuItems.forEach(item => item.active = false);
    menuItem.active = true;

    // Navigate to route
    this.router.navigate([menuItem.route]);
  }

  // User actions
  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    if (this.isUserMenuOpen) {
      this.isNotificationMenuOpen = false;
    }
  }

  // Notification actions
  toggleNotificationMenu(): void {
    this.isNotificationMenuOpen = !this.isNotificationMenuOpen;
    if (this.isNotificationMenuOpen) {
      this.isUserMenuOpen = false;
    }
  }

  onProfileClick(): void {
    this.isUserMenuOpen = false;
    this.router.navigate(['/dashboard/profile']);
  }

  onSettingsClick(): void {
    this.isUserMenuOpen = false;
    // Allow all authenticated users to access settings (they can only see what they have permission for)
    this.router.navigate(['/settings']);
  }

  onLogout(): void {
    this.isUserMenuOpen = false;
    this.authFacade.logout$().subscribe({
      next: () => {
        // Logout réussi - rediriger vers la page de connexion
        this.router.navigate(['/login']);
      },
      error: (error) => {
        // Même en cas d'erreur, rediriger vers login car l'état local est nettoyé
        console.warn('Logout error handled, redirecting to login:', error);
        this.router.navigate(['/login']);
      }
    });
  }

  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }

  closeNotificationMenu(): void {
    this.isNotificationMenuOpen = false;
  }

  loadNotifications(): void {
    this.notificationService.refreshNotificationCount();
  }

  openNotificationModal(): void {
    this.isNotificationModalOpen = true;
    this.isNotificationMenuOpen = false;
  }

  closeNotificationModal(): void {
    this.isNotificationModalOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Gérer le menu utilisateur
    if (this.isUserMenuOpen) {
      const userMenuContainer = target.closest('.user-menu');
      if (!userMenuContainer) {
        this.isUserMenuOpen = false;
      }
    }

    // Gérer le menu de notifications
    if (this.isNotificationMenuOpen) {
      const notificationContainer = target.closest('.notification-menu');
      if (!notificationContainer) {
        this.isNotificationMenuOpen = false;
      }
    }
  }

  // Private methods for menu synchronization
  private setupMenuPermissions(): void {
    // Create an observable that filters menu items based on user permissions
    this.visibleMenuItems$ = this.permissionService.getUserPermissions().pipe(
      switchMap(userPermissions => {
        if (!userPermissions) {
          // No permissions loaded, return empty menu
          return [[]];
        }

        // Check permissions for each menu item
        const permissionChecks = this.menuItems.map(item =>
          this.permissionService.hasAnyPermission(item.requiredPermissions as any).pipe(
            map(hasPermission => ({ ...item, visible: hasPermission }))
          )
        );

        return combineLatest(permissionChecks);
      }),
      map(items => items.filter(item => item.visible)),
      startWith([]) // Start with empty array while permissions load
    );
  }

  private updateActiveMenu(): void {
    const currentUrl = this.router.url;

    // Update active state for visible menu items
    this.visibleMenuItems$.subscribe(visibleItems => {
      visibleItems.forEach(item => {
        item.active = this.isMenuActive(item.route, currentUrl);
      });
    });
  }

  private listenToRouteChanges(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(event => (event as NavigationEnd).url)
      )
      .subscribe(url => {
        // Update active state for visible menu items on route changes
        this.visibleMenuItems$.subscribe(visibleItems => {
          visibleItems.forEach(item => {
            item.active = this.isMenuActive(item.route, url);
          });
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
