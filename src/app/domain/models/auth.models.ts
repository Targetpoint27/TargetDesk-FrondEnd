// Request models
export interface LoginRequest {
  email: string;
  password: string;
}


export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  token?: string;
}

// Value objects
export interface Credentials {
  email: string;
  password: string;
}

export interface UserRegistration {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

// Domain events
export interface AuthEvent {
  type: 'LOGIN' | 'LOGOUT' | 'TOKEN_REFRESH' | 'SESSION_EXPIRED';
  timestamp: Date;
  userId?: string;
  context?: any;
}

export class LoginEvent implements AuthEvent {
  readonly type = 'LOGIN' as const;
  readonly timestamp = new Date();

  constructor(
    public readonly userId: string,
    public readonly context?: any
  ) {}
}

export class LogoutEvent implements AuthEvent {
  readonly type = 'LOGOUT' as const;
  readonly timestamp = new Date();

  constructor(
    public readonly userId?: string,
    public readonly context?: any
  ) {}
}


export class TokenRefreshEvent implements AuthEvent {
  readonly type = 'TOKEN_REFRESH' as const;
  readonly timestamp = new Date();

  constructor(
    public readonly userId: string,
    public readonly context?: any
  ) {}
}

export class SessionExpiredEvent implements AuthEvent {
  readonly type = 'SESSION_EXPIRED' as const;
  readonly timestamp = new Date();

  constructor(
    public readonly userId?: string,
    public readonly context?: any
  ) {}
}