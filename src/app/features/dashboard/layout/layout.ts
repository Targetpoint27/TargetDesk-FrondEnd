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
  subMenus?: SubMenuItem[];
  isExpanded?: boolean;
}

export interface SubMenuItem {
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

  // État du collapse de la sidebar
  isSidebarCollapsed = false;

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
    },
    {
      id: 'projects',
      label: 'Projets',
      icon: 'work',
      route: '/dashboard/projects',
      requiredPermissions: [PERMISSIONS.SYSTEM_VIEW],
      active: false,
      visible: false,
      isExpanded: false,
      subMenus: [
        {
          id: 'projects-dashboard',
          label: 'Tableau de bord',
          icon: 'dashboard',
          route: '/dashboard/projects/dashboard',
          requiredPermissions: [PERMISSIONS.SYSTEM_VIEW],
          active: false,
          visible: false
        },
        {
          id: 'projects-list',
          label: 'Liste des projets',
          icon: 'list',
          route: '/dashboard/projects/list',
          requiredPermissions: [PERMISSIONS.SYSTEM_VIEW],
          active: false,
          visible: false
        },
        {
          id: 'projects-create',
          label: 'Nouveau projet',
          icon: 'add',
          route: '/dashboard/projects/create',
          requiredPermissions: [PERMISSIONS.SYSTEM_VIEW],
          active: false,
          visible: false
        },
        {
          id: 'projects-statistics',
          label: 'Statistiques',
          icon: 'analytics',
          route: '/dashboard/projects/statistics',
          requiredPermissions: [PERMISSIONS.SYSTEM_VIEW],
          active: false,
          visible: false
        },
        {
          id: 'my-projects',
          label: 'Mes projets',
          icon: 'person',
          route: '/dashboard/projects/my-projects',
          requiredPermissions: [PERMISSIONS.SYSTEM_VIEW],
          active: false,
          visible: false
        }
      ]
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
    // Si le menu a des sous-menus, on toggle l'expansion
    if (menuItem.subMenus && menuItem.subMenus.length > 0) {
      // Reset all active states first
      this.resetAllActiveStates();
      // Then toggle expansion and set as active
      menuItem.isExpanded = !menuItem.isExpanded;
      menuItem.active = true;
      // Ne pas naviguer si c'est un menu parent avec sous-menus
      return;
    }

    // Reset all active states first
    this.resetAllActiveStates();
    // Set this menu as active
    menuItem.active = true;

    // Navigate to route
    this.router.navigate([menuItem.route]);
  }

  private resetAllActiveStates(): void {
    // Reset in the original array
    this.menuItems.forEach(item => {
      item.active = false;
      if (item.subMenus) {
        item.subMenus.forEach(sub => sub.active = false);
      }
    });
  }

  onSubMenuClick(parentMenu: MenuItem, subMenuItem: SubMenuItem): void {
    // Reset all active states first
    this.resetAllActiveStates();

    // Set parent and submenu as active
    parentMenu.active = true;
    subMenuItem.active = true;

    // Navigate to submenu route
    this.router.navigate([subMenuItem.route]);
  }

  toggleSubMenu(menuItem: MenuItem): void {
    if (menuItem.subMenus && menuItem.subMenus.length > 0) {
      menuItem.isExpanded = !menuItem.isExpanded;
    }
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

  // Sidebar collapse actions
  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  collapseSidebar(): void {
    this.isSidebarCollapsed = true;
  }

  expandSidebar(): void {
    this.isSidebarCollapsed = false;
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
            map(hasPermission => {
              // Use reference to the original item to maintain active states
              const menuItem = item;
              menuItem.visible = hasPermission;

              // Check permissions for subMenus if they exist
              if (menuItem.subMenus && hasPermission) {
                menuItem.subMenus = menuItem.subMenus.map(subMenu => {
                  subMenu.visible = hasPermission; // Same permissions for now, can be customized later
                  return subMenu;
                });
              }

              return menuItem;
            })
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

    // Update active state directly on menuItems array
    this.menuItems.forEach(item => {
      item.active = this.isMenuActive(item.route, currentUrl);

      // Check subMenus for active state
      if (item.subMenus) {
        let hasActiveSubMenu = false;
        item.subMenus.forEach(subMenu => {
          subMenu.active = this.isMenuActive(subMenu.route, currentUrl);
          if (subMenu.active) {
            hasActiveSubMenu = true;
            item.isExpanded = true; // Auto-expand if submenu is active
          }
        });
        // Set parent as active if any submenu is active
        if (hasActiveSubMenu) {
          item.active = true;
        }
      }
    });
  }

  private listenToRouteChanges(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(event => (event as NavigationEnd).url)
      )
      .subscribe(url => {
        // Update active state directly on menuItems array on route changes
        this.menuItems.forEach(item => {
          item.active = this.isMenuActive(item.route, url);

          // Check subMenus for active state
          if (item.subMenus) {
            let hasActiveSubMenu = false;
            item.subMenus.forEach(subMenu => {
              subMenu.active = this.isMenuActive(subMenu.route, url);
              if (subMenu.active) {
                hasActiveSubMenu = true;
                item.isExpanded = true; // Auto-expand if submenu is active
              }
            });
            // Set parent as active if any submenu is active
            if (hasActiveSubMenu) {
              item.active = true;
            }
          }
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

  // Helper methods for CSS class binding
  getMenuButtonClasses(menuItem: MenuItem): string {
    const baseClasses = 'text-gray-700 hover:bg-gray-50 bg-transparent';

    if (!menuItem.active) {
      return baseClasses;
    }

    // Active menu with submenus
    if (menuItem.subMenus && menuItem.subMenus.length > 0) {
      return 'bg-blue-50 text-blue-800 border-l-4 border-blue-600';
    }

    // Active menu without submenus
    return 'bg-blue-100 text-blue-900 border-l-4 border-blue-600';
  }

  getArrowClasses(menuItem: MenuItem): string {
    const baseClasses = 'text-gray-400';

    if (menuItem.active) {
      return 'text-blue-600';
    }

    return baseClasses;
  }
}
