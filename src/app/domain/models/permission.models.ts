import { RoleEntity } from '../entities/role.entity';

export interface UserPermissions {
  userId: string;
  roles: RoleEntity[];
  permissions: string[];
  lastUpdated: Date;
}

export interface GetUserPermissionsResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      name: string;
      email: string;
    };
    roles: {
      name: string;
      display_name: string;
    }[];
    permissions: string[];
    total_permissions: number;
  };
  message?: string;
}

export interface PermissionCheckRequest {
  permission: string;
  resource?: string;
  resourceId?: string;
}

export interface PermissionCheckResponse {
  success: boolean;
  data: {
    hasPermission: boolean;
    reason?: string;
  };
  message?: string;
}

export interface BulkPermissionCheckRequest {
  permissions: string[];
  resource?: string;
  resourceId?: string;
}

export interface BulkPermissionCheckResponse {
  success: boolean;
  data: {
    permissions: Record<string, boolean>;
  };
  message?: string;
}

// Permission scopes from backend
export type PermissionScope = 'global' | 'team' | 'own';

// Complete permissions structure based on backend guide
export const PERMISSIONS = {
  // 🏢 Clients Module
  CLIENTS_CREATE: 'clients.create',
  CLIENTS_READ: 'clients.read',
  CLIENTS_READ_TEAM: 'clients.read.team',
  CLIENTS_READ_OWN: 'clients.read.own',
  CLIENTS_UPDATE: 'clients.update',
  CLIENTS_UPDATE_TEAM: 'clients.update.team',
  CLIENTS_UPDATE_OWN: 'clients.update.own',
  CLIENTS_DELETE: 'clients.delete',
  CLIENTS_EXPORT: 'clients.export',
  CLIENTS_EXPORT_TEAM: 'clients.export.team',
  CLIENTS_EXPORT_OWN: 'clients.export.own',

  // 👥 Contacts Module
  CONTACTS_CREATE: 'contacts.create',
  CONTACTS_READ: 'contacts.read',
  CONTACTS_READ_OWN: 'contacts.read.own',
  CONTACTS_UPDATE: 'contacts.update',
  CONTACTS_UPDATE_OWN: 'contacts.update.own',
  CONTACTS_DELETE: 'contacts.delete',

  // 📄 Documents Module
  DOCUMENTS_CREATE: 'documents.create',
  DOCUMENTS_READ: 'documents.read',
  DOCUMENTS_READ_OWN: 'documents.read.own',
  DOCUMENTS_UPDATE: 'documents.update',
  DOCUMENTS_UPDATE_OWN: 'documents.update.own',
  DOCUMENTS_DELETE: 'documents.delete',

  // 👤 Users Module
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_READ_OWN: 'users.read.own',
  USERS_UPDATE: 'users.update',
  USERS_UPDATE_OWN: 'users.update.own',
  USERS_DELETE: 'users.delete',

  // 🎭 Roles Module
  ROLES_CREATE: 'roles.create',
  ROLES_READ: 'roles.read',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  ROLES_ASSIGN: 'roles.assign',

  // 📊 Dashboard Module
  DASHBOARD_COMMERCIAL: 'dashboard.commercial',
  DASHBOARD_PERSONAL: 'dashboard.personal',

  // 📈 Reports Module
  REPORTS_GENERATE: 'reports.generate',
  REPORTS_VIEW: 'reports.view',
  REPORTS_VIEW_OWN: 'reports.view.own',

  // 🔐 Access Module
  ACCESS_RULES_CREATE: 'access.rules.create',
  ACCESS_RULES_READ: 'access.rules.read',
  ACCESS_RULES_UPDATE: 'access.rules.update',
  ACCESS_RULES_DELETE: 'access.rules.delete',

  // 👥 Team Module
  TEAM_VIEW_ENABLE: 'team.view.enable',
  TEAM_VIEW_LOGS: 'team.view.logs',

  // 🔧 System Module
  SYSTEM_VIEW: 'system.view',
  SYSTEM_MANAGE: 'system.manage',

  // ✅ Permissions Module
  PERMISSIONS_READ: 'permissions.read',
  PERMISSIONS_CHECK: 'permissions.check',

  // Legacy permissions for backward compatibility
  DASHBOARD_VIEW: 'dashboard.personal', // Alias for personal dashboard
  SETTINGS_VIEW: 'system.view',
  SETTINGS_EDIT: 'system.manage',
  PERMISSIONS_VIEW: 'permissions.read',
  PERMISSIONS_ASSIGN: 'roles.assign',

  // 🏢 Suppliers Module (separate from clients)
  SUPPLIERS_CREATE: 'suppliers.create',
  SUPPLIERS_READ_ALL: 'suppliers.read.all',
  SUPPLIERS_READ_TEAM: 'suppliers.read.team',
  SUPPLIERS_READ_OWN: 'suppliers.read.own',
  SUPPLIERS_UPDATE_ALL: 'suppliers.update.all',
  SUPPLIERS_UPDATE_TEAM: 'suppliers.update.team',
  SUPPLIERS_UPDATE_OWN: 'suppliers.update.own',
  SUPPLIERS_DELETE_ALL: 'suppliers.delete.all',
  SUPPLIERS_DELETE_TEAM: 'suppliers.delete.team',
  SUPPLIERS_DELETE_OWN: 'suppliers.delete.own',
  SUPPLIERS_EXPORT_ALL: 'suppliers.export.all',
  SUPPLIERS_EXPORT_TEAM: 'suppliers.export.team',
  SUPPLIERS_EXPORT_OWN: 'suppliers.export.own',
  SUPPLIERS_IMPORT: 'suppliers.import',

  // Legacy aliases for backward compatibility
  SUPPLIERS_VIEW_LEGACY: 'suppliers.view', // Legacy permission from backend
  SUPPLIERS_VIEW: 'suppliers.read.all', // Alias for suppliers read
  SUPPLIERS_EDIT: 'suppliers.update.all', // Alias for suppliers update
  SUPPLIERS_DELETE: 'suppliers.delete.all', // Alias for suppliers delete

  CATEGORIES_VIEW: 'system.view',
  CATEGORIES_CREATE: 'system.manage',
  CATEGORIES_EDIT: 'system.manage',
  CATEGORIES_DELETE: 'system.manage',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Permission utility functions
export const PermissionUtils = {
  // Build permission string with scope
  buildPermission(module: string, action: string, scope?: PermissionScope): string {
    return scope ? `${module}.${action}.${scope}` : `${module}.${action}`;
  },

  // Extract components from permission string
  parsePermission(permission: string): { module: string; action: string; scope?: PermissionScope } {
    const parts = permission.split('.');
    return {
      module: parts[0],
      action: parts[1],
      scope: parts[2] as PermissionScope || undefined
    };
  },

  // Get all scope variations of a permission
  getPermissionVariations(module: string, action: string): string[] {
    return [
      `${module}.${action}`,
      `${module}.${action}.global`,
      `${module}.${action}.team`,
      `${module}.${action}.own`
    ];
  },

  // Check if permission has specific scope
  hasScope(permission: string, scope: PermissionScope): boolean {
    return permission.endsWith(`.${scope}`);
  },

  // Get permission without scope
  getBasePermission(permission: string): string {
    const parts = permission.split('.');
    return parts.length > 2 ? `${parts[0]}.${parts[1]}` : permission;
  }
};

// Permission groups organized by functionality
export const PERMISSION_GROUPS = {
  // Client management permissions
  CLIENTS: [
    PERMISSIONS.CLIENTS_CREATE,
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_READ_TEAM,
    PERMISSIONS.CLIENTS_READ_OWN,
    PERMISSIONS.CLIENTS_UPDATE,
    PERMISSIONS.CLIENTS_UPDATE_TEAM,
    PERMISSIONS.CLIENTS_UPDATE_OWN,
    PERMISSIONS.CLIENTS_DELETE,
    PERMISSIONS.CLIENTS_EXPORT,
    PERMISSIONS.CLIENTS_EXPORT_TEAM,
    PERMISSIONS.CLIENTS_EXPORT_OWN,
  ],

  // Contact management permissions
  CONTACTS: [
    PERMISSIONS.CONTACTS_CREATE,
    PERMISSIONS.CONTACTS_READ,
    PERMISSIONS.CONTACTS_READ_OWN,
    PERMISSIONS.CONTACTS_UPDATE,
    PERMISSIONS.CONTACTS_UPDATE_OWN,
    PERMISSIONS.CONTACTS_DELETE,
  ],

  // Document management permissions
  DOCUMENTS: [
    PERMISSIONS.DOCUMENTS_CREATE,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.DOCUMENTS_READ_OWN,
    PERMISSIONS.DOCUMENTS_UPDATE,
    PERMISSIONS.DOCUMENTS_UPDATE_OWN,
    PERMISSIONS.DOCUMENTS_DELETE,
  ],

  // User management permissions
  USERS: [
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_READ_OWN,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_UPDATE_OWN,
    PERMISSIONS.USERS_DELETE,
  ],

  // Role management permissions
  ROLES: [
    PERMISSIONS.ROLES_CREATE,
    PERMISSIONS.ROLES_READ,
    PERMISSIONS.ROLES_UPDATE,
    PERMISSIONS.ROLES_DELETE,
    PERMISSIONS.ROLES_ASSIGN,
  ],

  // Dashboard access permissions
  DASHBOARD: [
    PERMISSIONS.DASHBOARD_COMMERCIAL,
    PERMISSIONS.DASHBOARD_PERSONAL,
  ],

  // Reporting permissions
  REPORTS: [
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_VIEW_OWN,
  ],

  // System administration permissions
  SYSTEM: [
    PERMISSIONS.SYSTEM_VIEW,
    PERMISSIONS.SYSTEM_MANAGE,
    PERMISSIONS.ACCESS_RULES_CREATE,
    PERMISSIONS.ACCESS_RULES_READ,
    PERMISSIONS.ACCESS_RULES_UPDATE,
    PERMISSIONS.ACCESS_RULES_DELETE,
  ],

  // Team management permissions
  TEAM: [
    PERMISSIONS.TEAM_VIEW_ENABLE,
    PERMISSIONS.TEAM_VIEW_LOGS,
  ],

  // Supplier management permissions
  SUPPLIERS: [
    PERMISSIONS.SUPPLIERS_CREATE,
    PERMISSIONS.SUPPLIERS_READ_ALL,
    PERMISSIONS.SUPPLIERS_READ_TEAM,
    PERMISSIONS.SUPPLIERS_READ_OWN,
    PERMISSIONS.SUPPLIERS_UPDATE_ALL,
    PERMISSIONS.SUPPLIERS_UPDATE_TEAM,
    PERMISSIONS.SUPPLIERS_UPDATE_OWN,
    PERMISSIONS.SUPPLIERS_DELETE_ALL,
    PERMISSIONS.SUPPLIERS_DELETE_TEAM,
    PERMISSIONS.SUPPLIERS_DELETE_OWN,
    PERMISSIONS.SUPPLIERS_EXPORT_ALL,
    PERMISSIONS.SUPPLIERS_EXPORT_TEAM,
    PERMISSIONS.SUPPLIERS_EXPORT_OWN,
    PERMISSIONS.SUPPLIERS_IMPORT,
  ],

  // Permission management
  PERMISSIONS_MGMT: [
    PERMISSIONS.PERMISSIONS_READ,
    PERMISSIONS.PERMISSIONS_CHECK,
  ],
} as const;

// Predefined role permissions matching backend
export const PREDEFINED_ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  COMMERCIAL: 'Commercial',
  CONSULTANT: 'Consultant'
} as const;

// Helper function to get permissions for common actions
export const getModulePermissions = (module: 'clients' | 'contacts' | 'documents' | 'users' | 'roles') => {
  switch (module) {
    case 'clients':
      return PERMISSION_GROUPS.CLIENTS;
    case 'contacts':
      return PERMISSION_GROUPS.CONTACTS;
    case 'documents':
      return PERMISSION_GROUPS.DOCUMENTS;
    case 'users':
      return PERMISSION_GROUPS.USERS;
    case 'roles':
      return PERMISSION_GROUPS.ROLES;
    default:
      return [];
  }
};