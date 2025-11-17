export interface User {
  email: string;
  id: string;
  role: string;
}

export interface AuthData {
  access_token: string;
  expires_in: number;
  token_type: string;
  user: User;
}

export interface SignInResponse {
  data: AuthData;
  message: string;
  success: boolean;
}

export interface SignInError {
  error: {
    code: string;
    details?: Record<string, unknown>;
    message: string;
  };
  message: string;
  success: false;
}

export interface SignInRequest {
  email: string;
  password: string;
}

