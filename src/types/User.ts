export interface User {
  id: string;
  google_id?: string;
  email: string;
  name: string;
  picture?: string;
  username?: string;
  password_hash?: string;
  auth_type: 'google' | 'local';
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

export interface CreateUserInput {
  google_id?: string;
  email: string;
  name: string;
  picture?: string;
  username?: string;
  password_hash?: string;
  auth_type: 'google' | 'local';
}

export interface CreateLocalUserInput {
  username: string;
  email: string;
  name: string;
  password: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}
