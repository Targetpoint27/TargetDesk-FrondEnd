import { Observable } from 'rxjs';
import { AuthEntity } from '../entities/auth.entity';
import { UserEntity } from '../entities/user.entity';
import { LoginRequest, RegisterRequest, RefreshTokenRequest } from '../models/auth.models';

export abstract class AuthRepository {
  abstract login(credentials: LoginRequest): Observable<AuthEntity>;
  abstract register(userData: RegisterRequest): Observable<AuthEntity>;
  abstract logout(): Observable<void>;
  abstract refreshToken(refreshToken: string): Observable<AuthEntity>;
  abstract getCurrentUser(): Observable<UserEntity>;
  abstract validateToken(token: string): Observable<boolean>;
}