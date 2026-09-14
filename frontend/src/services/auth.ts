import { request } from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  email_verified: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export const authService = {
  async register(data: { email: string; password: string; name: string }): Promise<User> {
    return request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(data: { email: string; password: string }): Promise<TokenResponse> {
    const res = await request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    localStorage.setItem('access_token', res.access_token);
    localStorage.setItem('refresh_token', res.refresh_token);
    return res;
  },

  async logout(): Promise<void> {
    const refresh_token = localStorage.getItem('refresh_token');
    if (refresh_token) {
      try {
        await request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token }),
        });
      } catch {
        // ignore error during logout
      }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  async getMe(): Promise<User> {
    return request<User>('/auth/me');
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  },
};
