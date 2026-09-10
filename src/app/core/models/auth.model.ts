export interface LoginRequest {
  email: string;
  senha: string;
  username?: string;
  password?: string;
}

export interface LoginResponse {
  token?: string;
  accessToken?: string;
  access_token?: string;
  jwt?: string;
  type?: string;
  user?: AuthUser;
  [key: string]: any;
}

export interface AuthUser {
  id?: number;
  email?: string;
  nome?: string;
  name?: string;
  role?: string;
  roles?: string[];
  [key: string]: any;
}
