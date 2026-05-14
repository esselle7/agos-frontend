export interface UserInfo {
  id: string;
  email: string;
  nome: string;
  ruolo: 'ADMIN' | 'DIPENDENTE';
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: UserInfo;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshRequest {
  refreshToken: string;
}
