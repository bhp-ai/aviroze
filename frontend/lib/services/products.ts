import apiClient from '../api-client';

export interface Discount {
  enabled: boolean;
  type?: 'percentage' | 'fixed';
  value?: number;
}

export interface Voucher {
  enabled: boolean;
  code?: string;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  expiry_date?: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  image: string;
  colors?: string[];
  created_at: string;
  discount?: Discount;
  voucher?: Voucher;
}

export interface ProductCreate {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  image?: string;
  colors?: string[];
  discount?: Discount;
  voucher?: Voucher;
}

export interface ProductUpdate extends Partial<ProductCreate> {}

export const productsService = {
  async getAll(params?: { category?: string; search?: string }): Promise<Product[]> {
    const response = await apiClient.get<Product[]>('/api/products/', { params });
    return response.data;
  },

  async getById(id: number): Promise<Product> {
    const response = await apiClient.get<Product>(`/api/products/${id}`);
    return response.data;
  },

  async getBestsellers(limit: number = 6): Promise<Product[]> {
    const response = await apiClient.get<Product[]>('/api/products/bestsellers/', {
      params: { limit }
    });
    return response.data;
  },

  async getNewArrivals(limit: number = 6): Promise<Product[]> {
    const response = await apiClient.get<Product[]>('/api/products/new-arrivals/', {
      params: { limit }
    });
    return response.data;
  },

  async create(data: ProductCreate): Promise<Product> {
    const response = await apiClient.post<Product>('/api/products/', data);
    return response.data;
  },

  async update(id: number, data: ProductUpdate): Promise<Product> {
    const response = await apiClient.put<Product>(`/api/products/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/products/${id}`);
  },

  async getCategories(): Promise<string[]> {
    const response = await apiClient.get<string[]>('/api/products/categories/list');
    return response.data;
  },
};
