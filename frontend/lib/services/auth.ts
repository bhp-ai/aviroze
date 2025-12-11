import apiClient from '../api-client';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_role: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export const authService = {
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/auth/login', data);
    return response.data;
  },

  async register(data: RegisterData): Promise<User> {
    const response = await apiClient.post<User>('/api/auth/register', data);
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/api/auth/me');
    return response.data;
  },

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_timestamp');
    localStorage.removeItem('cart'); // Clear cart on logout
    window.location.href = '/login';
  },

  getToken(): string | null {
    return localStorage.getItem('access_token');
  },

  setToken(token: string) {
    localStorage.setItem('access_token', token);
  },

  getUser(): User | null {
    const userStr = localStorage.getItem('user');
    const timestampStr = localStorage.getItem('user_timestamp');

    if (!userStr || !timestampStr) {
      return null;
    }

    // Check if user session is older than 2 hours (2 hours = 7200000 milliseconds)
    const timestamp = parseInt(timestampStr);
    const twoHoursInMs = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    const now = Date.now();

    if (now - timestamp > twoHoursInMs) {
      // Session expired, remove user and token
      localStorage.removeItem('user');
      localStorage.removeItem('user_timestamp');
      localStorage.removeItem('access_token');
      localStorage.removeItem('cart'); // Clear cart on session expiration
      return null;
    }

    return JSON.parse(userStr);
  },

  setUser(user: User) {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('user_timestamp', Date.now().toString());
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'admin';
  },
};
