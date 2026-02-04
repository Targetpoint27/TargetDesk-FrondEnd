export class RoleEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly permissions: string[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  static create(data: {
    id: string;
    name: string;
    description: string;
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
  }): RoleEntity {
    return new RoleEntity(
      data.id,
      data.name,
      data.description,
      data.permissions,
      data.createdAt,
      data.updatedAt
    );
  }

  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      permissions: this.permissions,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}