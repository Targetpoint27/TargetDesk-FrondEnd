import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

// Routes
import { routes } from './app.routes';

// Domain Layer - Repository contracts
import { AuthRepository } from './domain/repositories/auth.repository';
import { UserRepository } from './domain/repositories/user.repository';
import { ClientRepository } from './domain/repositories/client.repository';
import { SupplierRepository } from './domain/repositories/supplier.repository';
import { ContactRepository } from './domain/repositories/contact.repository';
import { ImportExportRepository } from './domain/repositories/import-export.repository';

// Infrastructure Layer - Repository implementations
import { AuthApiRepository } from './infrastructure/repositories/auth-api.repository';
import { ClientApiRepository } from './infrastructure/repositories/client-api.repository';
import { SupplierApiRepository } from './infrastructure/repositories/supplier-api.repository';
import { ContactApiRepository } from './infrastructure/repositories/contact-api.repository';
import { ImportExportApiRepository } from './infrastructure/repositories/import-export-api.repository';

// Core Services
import { EnvironmentService } from './core/config/environment.service';
import { ApiService } from './core/api/api.service';
import { ErrorService } from './core/error/error.service';
import { LoggingService } from './core/logging/logging.service';

// Shared Services
import { MessageService } from './shared/services/message.service';

// Auth Feature (simplified architecture)
import { AuthFacade } from './features/auth/auth.facade';
import { ClientFacade } from './features/dashboard/clients/client.facade';
import { SupplierFacade } from './features/dashboard/suppliers/supplier.facade';
import { ContactFacade } from './features/dashboard/contacts/contact.facade';

// Mappers
import { AuthMapper } from './infrastructure/mappers/auth.mapper';
import { ClientMapper } from './infrastructure/mappers/client.mapper';
import { SupplierMapper } from './infrastructure/mappers/supplier.mapper';
import { ContactMapper } from './infrastructure/mappers/contact.mapper';

// Use Cases
import { LoginUseCase } from './domain/use-cases/auth/login.use-case';
import { RegisterUseCase } from './domain/use-cases/auth/register.use-case';
import { LogoutUseCase } from './domain/use-cases/auth/logout.use-case';
import { CreateClientUseCase, GetClientsUseCase, UpdateClientUseCase, DeleteClientUseCase } from './domain/use-cases/client';
import { CreateSupplierUseCase, GetSuppliersUseCase, UpdateSupplierUseCase, DeleteSupplierUseCase } from './domain/use-cases/supplier';
import { CreateContactUseCase, GetContactsUseCase, UpdateContactUseCase, DeleteContactUseCase, MakePrimaryContactUseCase, GetClientContactsUseCase, GetSupplierContactsUseCase, CreateClientContactUseCase, CreateSupplierContactUseCase } from './domain/use-cases/contact';
import { DownloadTemplateUseCase, PreviewImportUseCase, ImportClientsUseCase, ExportClientsUseCase } from './domain/use-cases/import-export';

export const appConfig: ApplicationConfig = {
  providers: [
    // Router
    provideRouter(routes),

    // HTTP Client
    provideHttpClient(
      withInterceptors([
        // TODO: Add interceptors here when needed (auth, error, loading, etc.)
      ])
    ),

    // Core Infrastructure
    EnvironmentService,
    ApiService,
    ErrorService,
    LoggingService,

    // Shared Services
    MessageService,

    // Mappers
    AuthMapper,
    ClientMapper,
    SupplierMapper,
    ContactMapper,

    // Repository Implementations
    {
      provide: AuthRepository,
      useClass: AuthApiRepository
    },
    {
      provide: ClientRepository,
      useClass: ClientApiRepository
    },
    {
      provide: SupplierRepository,
      useClass: SupplierApiRepository
    },
    {
      provide: ContactRepository,
      useClass: ContactApiRepository
    },
    {
      provide: ImportExportRepository,
      useClass: ImportExportApiRepository
    },
    // TODO: Add UserRepository implementation when needed
    // {
    //   provide: UserRepository,
    //   useClass: UserApiRepository
    // },

    // Use Cases
    LoginUseCase,
    RegisterUseCase,
    LogoutUseCase,
    CreateClientUseCase,
    GetClientsUseCase,
    UpdateClientUseCase,
    DeleteClientUseCase,
    CreateSupplierUseCase,
    GetSuppliersUseCase,
    UpdateSupplierUseCase,
    DeleteSupplierUseCase,
    CreateContactUseCase,
    GetContactsUseCase,
    UpdateContactUseCase,
    DeleteContactUseCase,
    MakePrimaryContactUseCase,
    GetClientContactsUseCase,
    GetSupplierContactsUseCase,
    CreateClientContactUseCase,
    CreateSupplierContactUseCase,
    DownloadTemplateUseCase,
    PreviewImportUseCase,
    ImportClientsUseCase,
    ExportClientsUseCase,

    // Facades
    AuthFacade,
    ClientFacade,
    SupplierFacade,
    ContactFacade,

    // TODO: Add other providers as needed
    // Guards, Interceptors, etc.
  ]
};
