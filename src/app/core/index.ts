// Core module exports

// Configuration
export * from './config/app.config';
export * from './config/environment.service';

// API
export * from './api/api.service';

// Error handling
export * from './error/error.service';

// Logging
export * from './logging/logging.service';

// Domain Layer exports
export * from '../domain/entities/user.entity';
export * from '../domain/entities/auth.entity';
export * from '../domain/entities/client.entity';
export * from '../domain/models/auth.models';
export * from '../domain/models/client.models';
export * from '../domain/repositories/auth.repository';
export * from '../domain/repositories/user.repository';
export * from '../domain/repositories/client.repository';
export * from '../domain/use-cases/auth/login.use-case';
export * from '../domain/use-cases/auth/logout.use-case';
export * from '../domain/use-cases/client';

// Infrastructure Layer exports
export * from '../infrastructure/api/auth-api.models';
export * from '../infrastructure/api/client-api.models';
export * from '../infrastructure/mappers/auth.mapper';
export * from '../infrastructure/mappers/client.mapper';
export * from '../infrastructure/repositories/auth-api.repository';
export * from '../infrastructure/repositories/client-api.repository';

// Auth Feature exports (simplified architecture)
export * from '../features/auth/auth.facade';

// Shared Services exports
export * from '../shared/services/message.service';

// Interceptors (when they exist)
// export * from '../interceptors';

// Legacy compatibility exports (to be removed gradually)
export type { LoginApiResponse } from '../infrastructure/api/auth-api.models';