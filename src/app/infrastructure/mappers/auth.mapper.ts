import { Injectable } from '@angular/core';
import { AuthEntity } from '../../domain/entities/auth.entity';
import { UserEntity } from '../../domain/entities/user.entity';
import { AuthApiResponse, UserApiResponse } from '../api/auth-api.models';
import { LoggingService } from '../../core/logging/logging.service';

@Injectable({
  providedIn: 'root'
})
export class AuthMapper {
  constructor(private loggingService: LoggingService) {}

  toDomain(apiResponse: AuthApiResponse): AuthEntity {
    try {
      const userEntity = this.mapUserToDomain(apiResponse.user);
      // Laravel Sanctum tokens don't have expiration by default, set to 1 year
      const expiresAt = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000));

      const authEntity = AuthEntity.create({
        user: userEntity,
        token: apiResponse.token,
        refreshToken: apiResponse.token, // Use same token as refresh for Sanctum
        expiresAt
      });

      this.loggingService.debug('Auth API response mapped to domain', {
        component: 'AuthMapper',
        action: 'toDomain',
        data: {
          userId: userEntity.id,
          expiresAt: expiresAt.toISOString(),
          tokenLength: apiResponse.token.length
        }
      });

      return authEntity;
    } catch (error) {
      this.loggingService.error('Failed to map auth API response to domain', {
        component: 'AuthMapper',
        action: 'toDomain',
        data: {
          error: error instanceof Error ? error.message : error,
          apiResponse
        }
      });
      throw new Error('Failed to map authentication data');
    }
  }

  mapUserToDomain(apiUser: UserApiResponse): UserEntity {
    try {
      const userEntity = UserEntity.create({
        id: apiUser.id.toString(), // Ensure it's a string
        name: apiUser.name,
        email: apiUser.email,
        emailVerified: !!apiUser.email_verified_at,
        createdAt: apiUser.created_at ? new Date(apiUser.created_at) : new Date(),
        updatedAt: apiUser.updated_at ? new Date(apiUser.updated_at) : new Date()
      });

      this.loggingService.debug('User API response mapped to domain', {
        component: 'AuthMapper',
        action: 'mapUserToDomain',
        data: {
          userId: userEntity.id,
          email: userEntity.email,
          emailVerified: userEntity.emailVerified
        }
      });

      return userEntity;
    } catch (error) {
      this.loggingService.error('Failed to map user API response to domain', {
        component: 'AuthMapper',
        action: 'mapUserToDomain',
        data: {
          error: error instanceof Error ? error.message : error,
          apiUser
        }
      });
      throw new Error('Failed to map user data');
    }
  }

  // Helper method to validate API response structure
  validateAuthApiResponse(response: any): response is AuthApiResponse {
    const isValid = response &&
      typeof response.token === 'string' &&
      response.user &&
      this.validateUserApiResponse(response.user);

    if (!isValid) {
      this.loggingService.warn('Invalid auth API response structure', {
        component: 'AuthMapper',
        action: 'validateAuthApiResponse',
        data: { response }
      });
    }

    return isValid;
  }

  validateUserApiResponse(response: any): response is UserApiResponse {
    const basicUserFields = response &&
      typeof response.id !== 'undefined' &&
      typeof response.name === 'string' &&
      typeof response.email === 'string';

    // created_at and updated_at are optional in login response but required in user info response
    if (!basicUserFields) {
      this.loggingService.warn('Basic user validation failed', {
        component: 'AuthMapper',
        action: 'validateUserApiResponse',
        data: {
          response,
          checks: {
            hasId: typeof response?.id !== 'undefined',
            hasName: typeof response?.name === 'string',
            hasEmail: typeof response?.email === 'string'
          }
        }
      });
      return false;
    }

    return true;
  }
}