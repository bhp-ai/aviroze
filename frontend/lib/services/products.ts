import apiClient from '../api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  images: string[];  // Array of base64 image data URLs
  colors?: string[];
  sizes?: string[];
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
  sizes?: string[];
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

  async getImage(id: number): Promise<string> {
    const response = await apiClient.get(`/api/products/${id}/image`, {
      responseType: 'blob'
    });
    return URL.createObjectURL(response.data);
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

  async create(data: ProductCreate, imageFiles?: File[]): Promise<Product> {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description);
    formData.append('price', data.price.toString());
    formData.append('category', data.category);
    formData.append('stock', data.stock.toString());

    if (imageFiles && imageFiles.length > 0) {
      imageFiles.forEach((file) => {
        formData.append('images', file);
      });
    }

    if (data.colors && data.colors.length > 0) {
      formData.append('colors', JSON.stringify(data.colors));
    }

    if (data.discount) {
      formData.append('discount', JSON.stringify(data.discount));
    }

    if (data.voucher) {
      formData.append('voucher', JSON.stringify(data.voucher));
    }

    const response = await apiClient.post<Product>('/api/products/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async update(id: number, data: ProductUpdate, imageFiles?: File[], replaceImages: boolean = false): Promise<Product> {
    const formData = new FormData();

    if (data.name !== undefined) formData.append('name', data.name);
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.price !== undefined) formData.append('price', data.price.toString());
    if (data.category !== undefined) formData.append('category', data.category);
    if (data.stock !== undefined) formData.append('stock', data.stock.toString());

    if (imageFiles && imageFiles.length > 0) {
      imageFiles.forEach((file) => {
        formData.append('images', file);
      });
    }

    formData.append('replace_images', replaceImages.toString());

    if (data.colors) {
      formData.append('colors', JSON.stringify(data.colors));
    }

    if (data.discount) {
      formData.append('discount', JSON.stringify(data.discount));
    }

    if (data.voucher) {
      formData.append('voucher', JSON.stringify(data.voucher));
    }

    const response = await apiClient.put<Product>(`/api/products/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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
