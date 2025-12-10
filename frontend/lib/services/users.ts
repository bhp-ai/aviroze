import apiClient from '../api-client';
import { User } from './auth';

export interface UserCreate {
  username: string;
  email: string;
  password: string;
  role: string;
}

export interface UserUpdate {
  username?: string;
  email?: string;
  role?: string;
  status?: string;
}

export const usersService = {
  async getAll(params?: { role?: string; status?: string; search?: string }): Promise<User[]> {
    const response = await apiClient.get<User[]>('/api/users/', { params });
    return response.data;
  },

  async getById(id: number): Promise<User> {
    const response = await apiClient.get<User>(`/api/users/${id}`);
    return response.data;
  },

  async create(data: UserCreate): Promise<User> {
    const response = await apiClient.post<User>('/api/users/', data);
    return response.data;
  },

  async update(id: number, data: UserUpdate): Promise<User> {
    const response = await apiClient.put<User>(`/api/users/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/users/${id}`);
  },
};
