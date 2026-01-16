// API Response interfaces - These represent the exact structure from the backend API

export interface UserApiResponse {
  id: number | string; // API can return number, but we convert to string
  name: string;
  email: string;
  email_verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthApiResponse {
  token: string;
  user: UserApiResponse;
}

export interface LoginApiResponse {
  success: boolean;
  message: string;
  data: AuthApiResponse;
}

export interface RegisterApiResponse {
  success: boolean;
  message: string;
  data: AuthApiResponse;
}

export interface LogoutApiResponse {
  success: boolean;
  message: string;
}

export interface RefreshTokenApiResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    expires_in: number;
    token_type: string;
  };
}

export interface CurrentUserApiResponse {
  success: boolean;
  message: string;
  data: UserApiResponse;
}

export interface ValidationErrorResponse {
  success: false;
  message: string;
  errors: {
    [field: string]: string[];
  };
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error_code?: string;
  details?: any;
}