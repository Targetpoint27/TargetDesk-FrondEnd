import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../../core/api/api.service';

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
}

export interface User {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  status: 'active' | 'inactive';
  phone?: string;
  department?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
  roles: Role[];
}

export interface CreateUserRequest {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirmation: string;
  role_id: number;
  status?: 'active' | 'inactive';
  phone?: string;
  department?: string;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  role_id?: number;
  status?: 'active' | 'inactive';
  phone?: string;
  department?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  total: number;
  per_page: number;
  last_page: number;
  from: number;
  to: number;
}

export interface UserStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  users_by_role: { [role: string]: number };
  recent_registrations: number;
}

export interface EmailValidationResponse {
  email: string;
  is_unique: boolean;
  is_available: boolean;
}

export interface ResetPasswordResponse {
  new_password: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiService = inject(ApiService);
  private readonly endpoint = '/users';


  /**
   * Get all users with pagination and filters
   */
  getUsers(filters?: {
    page?: number;
    per_page?: number;
    role?: string;
    status?: string;
    q?: string;
  }): Observable<PaginatedResponse<User>> {
    const params: { [key: string]: string | number | boolean } = {};
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] !== undefined) {
          params[key] = filters[key as keyof typeof filters]!;
        }
      });
    }

    return this.apiService.get<any>(this.endpoint, { params })
      .pipe(
        map(response => {
          // Handle Laravel API response format
          if (response && response.data) {
            return response.data;
          }
          return response;
        }),
        catchError(error => {
          console.error('Error fetching users:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get all users (simple list for compatibility)
   */
  getAllUsers(): Observable<User[]> {
    return this.getUsers({ per_page: 1000 }).pipe(
      map(response => response.data)
    );
  }

  /**
   * Get user by ID
   */
  getUserById(id: number): Observable<User> {
    return this.apiService.get<any>(`${this.endpoint}/${id}`)
      .pipe(
        map(response => {
          // Handle Laravel API response format
          if (response && response.data) {
            return response.data;
          }
          return response;
        }),
        catchError(error => {
          console.error('Error fetching user:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Create a new user
   */
  createUser(userData: CreateUserRequest): Observable<User> {
    return this.apiService.post<any>(this.endpoint, userData)
      .pipe(
        map(response => {
          // Handle Laravel API response format
          if (response && response.data) {
            return response.data;
          }
          return response;
        }),
        catchError(error => {
          console.error('Error creating user:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Update user
   */
  updateUser(id: number, userData: UpdateUserRequest): Observable<User> {
    return this.apiService.put<any>(`${this.endpoint}/${id}`, userData)
      .pipe(
        map(response => {
          // Handle Laravel API response format
          if (response && response.data) {
            return response.data;
          }
          return response;
        }),
        catchError(error => {
          console.error('Error updating user:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Toggle user status (activate/deactivate)
   */
  toggleUserStatus(id: number): Observable<User> {
    return this.apiService.patch<any>(`${this.endpoint}/${id}/toggle-status`, {})
      .pipe(
        map(response => {
          // Handle Laravel API response format
          if (response && response.data) {
            return response.data;
          }
          return response;
        }),
        catchError(error => {
          console.error('Error toggling user status:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete user
   */
  deleteUser(id: number): Observable<void> {
    return this.apiService.delete<void>(`${this.endpoint}/${id}`)
      .pipe(
        catchError(error => {
          console.error('Error deleting user:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Reset user password
   */
  resetPassword(id: number): Observable<ResetPasswordResponse> {
    return this.apiService.post<any>(`${this.endpoint}/${id}/reset-password`, {})
      .pipe(
        map(response => {
          // Handle Laravel API response format
          if (response && response.data) {
            return response.data;
          }
          return response;
        }),
        catchError(error => {
          console.error('Error resetting password:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Search users by term
   */
  searchUsers(term: string): Observable<User[]> {
    const params = { q: term };
    return this.apiService.get<any>(`${this.endpoint}/search`, { params })
      .pipe(
        map(response => {
          // Handle Laravel API response format
          if (response && response.data) {
            return response.data;
          }
          return response;
        }),
        catchError(error => {
          console.error('Error searching users:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get users by role
   */
  getUsersByRole(role: string): Observable<User[]> {
    return this.getUsers({ role }).pipe(
      map(response => response.data)
    );
  }

  /**
   * Get users by status
   */
  getUsersByStatus(status: 'active' | 'inactive'): Observable<User[]> {
    return this.getUsers({ status }).pipe(
      map(response => response.data)
    );
  }

  /**
   * Validate email uniqueness
   */
  validateEmailUniqueness(email: string, excludeUserId?: number): Observable<EmailValidationResponse> {
    const params: { [key: string]: string | number } = { email };
    if (excludeUserId) {
      params['exclude'] = excludeUserId;
    }

    return this.apiService.get<any>(`${this.endpoint}/validate-email`, { params })
      .pipe(
        map(response => {
          // Handle Laravel API response format
          if (response && response.data) {
            return response.data;
          }
          return response;
        }),
        catchError(error => {
          console.error('Error validating email:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get user statistics
   */
  getUserStats(): Observable<UserStats> {
    return this.apiService.get<any>(`${this.endpoint}/stats`)
      .pipe(
        map(response => {
          // Handle Laravel API response format
          if (response && response.data) {
            return response.data;
          }
          return response;
        }),
        catchError(error => {
          console.error('Error fetching user stats:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get all available roles
   */
  getRoles(): Observable<Role[]> {
    return this.apiService.get<any>('/roles')
      .pipe(
        map(response => {
          // Handle Laravel API response format
          if (response && response.data && response.data.roles) {
            return response.data.roles;
          } else if (response && response.data) {
            return response.data;
          }
          return response;
        }),
        catchError(error => {
          console.error('Error fetching roles:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Assign role to user
   */
  assignUserRole(userId: number, roleId: number): Observable<any> {
    return this.apiService.post<any>(`${this.endpoint}/${userId}/roles`, { role_id: roleId })
      .pipe(
        catchError(error => {
          console.error('Error assigning role to user:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Remove role from user
   */
  removeUserRole(userId: number, roleId: number): Observable<any> {
    return this.apiService.delete<any>(`${this.endpoint}/${userId}/roles/${roleId}`)
      .pipe(
        catchError(error => {
          console.error('Error removing role from user:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get user roles
   */
  getUserRoles(userId: number): Observable<Role[]> {
    return this.apiService.get<any>(`${this.endpoint}/${userId}/roles`)
      .pipe(
        map(response => {
          if (response && response.data) {
            return response.data;
          }
          return response;
        }),
        catchError(error => {
          console.error('Error fetching user roles:', error);
          return throwError(() => error);
        })
      );
  }

  // Helper methods for backward compatibility
  /**
   * Convert backend user format to frontend format
   */
  private mapUserToFrontend(user: User): any {
    return {
      ...user,
      firstName: user.first_name,
      lastName: user.last_name,
      createdAt: user.created_at,
      role: user.roles?.[0]?.name || 'user'
    };
  }

  /**
   * Convert frontend user format to backend format
   */
  private mapUserToBackend(userData: any): any {
    const mapped: any = { ...userData };

    if (userData.firstName) {
      mapped.first_name = userData.firstName;
      delete mapped.firstName;
    }

    if (userData.lastName) {
      mapped.last_name = userData.lastName;
      delete mapped.lastName;
    }

    if (userData.role && typeof userData.role === 'string') {
      // For now, we'll need a role mapping or assume role_id = 1 for basic users
      mapped.role_id = 1; // This should be properly mapped based on role names
      delete mapped.role;
    }

    return mapped;
  }
}