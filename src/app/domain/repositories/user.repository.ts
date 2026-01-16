import { Observable } from 'rxjs';
import { UserEntity } from '../entities/user.entity';

export abstract class UserRepository {
  abstract getById(id: string): Observable<UserEntity>;
  abstract updateProfile(id: string, data: Partial<Pick<UserEntity, 'name' | 'email'>>): Observable<UserEntity>;
  abstract changePassword(oldPassword: string, newPassword: string): Observable<void>;
  abstract deleteAccount(id: string): Observable<void>;
  abstract verifyEmail(token: string): Observable<UserEntity>;
}