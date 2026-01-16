export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    public readonly emailVerified: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  isEmailVerified(): boolean {
    return this.emailVerified;
  }

  getDisplayName(): string {
    return this.name;
  }

  getInitials(): string {
    const names = this.name.split(' ');
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }

  getFirstName(): string {
    return this.name.split(' ')[0];
  }

  getLastName(): string {
    const names = this.name.split(' ');
    return names.length > 1 ? names.slice(1).join(' ') : '';
  }

  isActive(): boolean {
    // A user is considered active if their email is verified
    return this.emailVerified;
  }

  equals(other: UserEntity): boolean {
    return this.id === other.id;
  }

  static create(data: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): UserEntity {
    return new UserEntity(
      data.id,
      data.name,
      data.email,
      data.emailVerified,
      data.createdAt,
      data.updatedAt
    );
  }

  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      emailVerified: this.emailVerified,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}