import { Directive, Input, TemplateRef, ViewContainerRef, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PermissionService } from '../../core/auth/permission.service';
import { Permission } from '../../domain/models/permission.models';

export interface HasPermissionContext {
  $implicit: boolean;
  hasPermission: boolean;
}

@Directive({
  selector: '[hasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private context: HasPermissionContext = {
    $implicit: false,
    hasPermission: false
  };

  private _permission: string | string[] = '';
  private _permissionMode: 'any' | 'all' = 'any';
  private _resourceOwnerId?: string;
  private _fallbackToScope: boolean = true;
  private _serverValidation: boolean = false;

  @Input()
  set hasPermission(permission: string | string[]) {
    this._permission = permission;
    this.updateView();
  }

  @Input()
  set hasPermissionMode(mode: 'any' | 'all') {
    this._permissionMode = mode;
    this.updateView();
  }

  @Input()
  set hasPermissionResourceOwner(resourceOwnerId: string | undefined) {
    this._resourceOwnerId = resourceOwnerId;
    this.updateView();
  }

  @Input()
  set hasPermissionFallback(fallback: boolean) {
    this._fallbackToScope = fallback;
    this.updateView();
  }

  @Input()
  set hasPermissionServerValidation(serverValidation: boolean) {
    this._serverValidation = serverValidation;
    this.updateView();
  }

  constructor(
    private templateRef: TemplateRef<HasPermissionContext>,
    private viewContainer: ViewContainerRef,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.permissionService.getUserPermissions()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });

    this.updateView();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    if (!this._permission) {
      this.renderView(false);
      return;
    }

    if (Array.isArray(this._permission)) {
      this.checkMultiplePermissions();
    } else {
      this.checkSinglePermission();
    }
  }

  private checkSinglePermission(): void {
    const permission = this._permission as string;

    if (this._serverValidation) {
      this.permissionService.checkPermissionOnServer(permission)
        .pipe(takeUntil(this.destroy$))
        .subscribe(hasPermission => {
          this.renderView(hasPermission);
        });
      return;
    }

    if (this._fallbackToScope && this.isModuleAction(permission)) {
      const [module, action] = permission.split('.');
      this.permissionService.canAccessWithFallback(module, action)
        .pipe(takeUntil(this.destroy$))
        .subscribe(hasPermission => {
          this.renderView(hasPermission);
        });
    } else {
      if (this._resourceOwnerId) {
        this.permissionService.hasResourcePermission(permission as Permission, this._resourceOwnerId)
          .pipe(takeUntil(this.destroy$))
          .subscribe(hasPermission => {
            this.renderView(hasPermission);
          });
      } else {
        this.permissionService.hasPermission(permission as Permission)
          .pipe(takeUntil(this.destroy$))
          .subscribe(hasPermission => {
            this.renderView(hasPermission);
          });
      }
    }
  }

  private checkMultiplePermissions(): void {
    const permissions = this._permission as string[];

    if (this._serverValidation) {
      this.permissionService.bulkCheckPermissionsOnServer(permissions)
        .pipe(takeUntil(this.destroy$))
        .subscribe(results => {
          const hasPermission = this._permissionMode === 'all'
            ? Object.values(results).every(result => result)
            : Object.values(results).some(result => result);
          this.renderView(hasPermission);
        });
      return;
    }

    if (this._permissionMode === 'all') {
      this.permissionService.hasAllPermissions(permissions as Permission[])
        .pipe(takeUntil(this.destroy$))
        .subscribe(hasPermission => {
          this.renderView(hasPermission);
        });
    } else {
      this.permissionService.hasAnyPermission(permissions as Permission[])
        .pipe(takeUntil(this.destroy$))
        .subscribe(hasPermission => {
          this.renderView(hasPermission);
        });
    }
  }

  private renderView(hasPermission: boolean): void {
    this.context.$implicit = hasPermission;
    this.context.hasPermission = hasPermission;

    this.viewContainer.clear();

    if (hasPermission) {
      this.viewContainer.createEmbeddedView(this.templateRef, this.context);
    }
  }

  private isModuleAction(permission: string): boolean {
    const parts = permission.split('.');
    return parts.length === 2;
  }

  static ngTemplateContextGuard(
    directive: HasPermissionDirective,
    context: unknown
  ): context is HasPermissionContext {
    return true;
  }
}