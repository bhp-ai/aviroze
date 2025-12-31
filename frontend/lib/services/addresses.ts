import apiClient from '../api-client';

export interface Address {
  id: number;
  user_id: number;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AddressCreate {
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
  is_default?: boolean;
}

export interface AddressUpdate extends Partial<AddressCreate> {}

export const addressService = {
  async getAll(): Promise<Address[]> {
    const response = await apiClient.get('/api/addresses/');
    return response.data;
  },

  async getById(id: number): Promise<Address> {
    const response = await apiClient.get(`/api/addresses/${id}`);
    return response.data;
  },

  async create(data: AddressCreate): Promise<Address> {
    const response = await apiClient.post('/api/addresses/', data);
    return response.data;
  },

  async update(id: number, data: AddressUpdate): Promise<Address> {
    const response = await apiClient.put(`/api/addresses/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/addresses/${id}`);
  },

  async setDefault(id: number): Promise<Address> {
    const response = await apiClient.post(`/api/addresses/${id}/set-default`);
    return response.data;
  },
};
