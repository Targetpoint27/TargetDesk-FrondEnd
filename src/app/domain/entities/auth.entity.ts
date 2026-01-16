import { UserEntity } from './user.entity';

export class AuthEntity {
  constructor(
    public readonly user: UserEntity,
    public readonly token: string,
    public readonly refreshToken: string,
    public readonly expiresAt: Date
  ) {}

  isExpired(): boolean {
    return new Date() >= this.expiresAt;
  }

  needsRefresh(bufferMinutes: number = 5): boolean {
    const bufferTime = new Date(Date.now() + (bufferMinutes * 60 * 1000));
    return bufferTime >= this.expiresAt;
  }

  getTimeToExpiry(): number {
    return this.expiresAt.getTime() - Date.now();
  }

  isValid(): boolean {
    return !this.isExpired() && this.token.length > 0;
  }

  getUser(): UserEntity {
    return this.user;
  }

  withNewToken(token: string, expiresAt: Date): AuthEntity {
    return new AuthEntity(
      this.user,
      token,
      this.refreshToken,
      expiresAt
    );
  }

  withNewRefreshToken(refreshToken: string): AuthEntity {
    return new AuthEntity(
      this.user,
      this.token,
      refreshToken,
      this.expiresAt
    );
  }

  withUpdatedUser(user: UserEntity): AuthEntity {
    return new AuthEntity(
      user,
      this.token,
      this.refreshToken,
      this.expiresAt
    );
  }

  equals(other: AuthEntity): boolean {
    return this.token === other.token &&
           this.user.equals(other.user);
  }

  static create(data: {
    user: UserEntity;
    token: string;
    refreshToken: string;
    expiresAt: Date;
  }): AuthEntity {
    return new AuthEntity(
      data.user,
      data.token,
      data.refreshToken,
      data.expiresAt
    );
  }

  toJSON(): any {
    return {
      user: this.user.toJSON(),
      token: this.token,
      refreshToken: this.refreshToken,
      expiresAt: this.expiresAt
    };
  }
}