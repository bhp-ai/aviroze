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

export interface ProductVariant {
  color?: string;
  size: string;
  quantity: number;
}

export interface SizeGuideMeasurement {
  size: string;
  [key: string]: string;  // Dynamic measurement fields like chest, waist, etc.
}

export interface ProductImage {
  id?: number;  // Image ID for updating colors
  url: string;
  color?: string;
  display_order: number;
  media_type: 'image' | 'video' | 'gif';
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  collection?: string;
  size_guide?: SizeGuideMeasurement[];
  stock: number;
  images: ProductImage[];  // Array of image objects with color info
  colors?: string[];
  sizes?: string[];
  variants?: ProductVariant[];
  created_at: string;
  discount?: Discount;
  voucher?: Voucher;
}

export interface ProductCreate {
  name: string;
  description: string;
  price: number;
  category: string;
  collection?: string;
  size_guide?: SizeGuideMeasurement[];
  stock: number;
  image?: string;
  colors?: string[];
  sizes?: string[];
  variants?: ProductVariant[];
  discount?: Discount;
  voucher?: Voucher;
}

export interface ProductUpdate extends Partial<ProductCreate> {}

export const productsService = {
  async getAll(params?: { category?: string; collection?: string; search?: string }): Promise<Product[]> {
    const response = await apiClient.get<Product[]>('/api/products/', { params });
    return response.data;
  },

  async getById(id: number, color?: string): Promise<Product> {
    const params = color ? { color } : undefined;
    const response = await apiClient.get<Product>(`/api/products/${id}`, { params });
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

  async create(data: ProductCreate, imageFiles?: File[], imageColors?: string[]): Promise<Product> {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description);
    formData.append('price', data.price.toString());
    formData.append('category', data.category);
    if (data.collection) {
      formData.append('collection', data.collection);
    }
    if (data.size_guide && data.size_guide.length > 0) {
      formData.append('size_guide', JSON.stringify(data.size_guide));
    }
    formData.append('stock', data.stock.toString());

    if (imageFiles && imageFiles.length > 0) {
      imageFiles.forEach((file) => {
        formData.append('images', file);
      });
    }

    if (imageColors && imageColors.length > 0) {
      formData.append('image_colors', JSON.stringify(imageColors));
    }

    if (data.colors && data.colors.length > 0) {
      formData.append('colors', JSON.stringify(data.colors));
    }

    if (data.sizes && data.sizes.length > 0) {
      formData.append('sizes', JSON.stringify(data.sizes));
    }

    if (data.variants && data.variants.length > 0) {
      formData.append('variants', JSON.stringify(data.variants));
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

  async update(id: number, data: ProductUpdate, imageFiles?: File[], replaceImages: boolean = false, imageColors?: string[], existingImageColors?: {[url: string]: string}): Promise<Product> {
    const formData = new FormData();

    if (data.name !== undefined) formData.append('name', data.name);
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.price !== undefined) formData.append('price', data.price.toString());
    if (data.category !== undefined) formData.append('category', data.category);
    if (data.collection !== undefined) formData.append('collection', data.collection);
    if (data.size_guide !== undefined) formData.append('size_guide', JSON.stringify(data.size_guide));
    if (data.stock !== undefined) formData.append('stock', data.stock.toString());

    if (imageFiles && imageFiles.length > 0) {
      imageFiles.forEach((file) => {
        formData.append('images', file);
      });
    }

    if (imageColors && imageColors.length > 0) {
      formData.append('image_colors', JSON.stringify(imageColors));
    }

    // Send existing image colors mapping
    if (existingImageColors && Object.keys(existingImageColors).length > 0) {
      formData.append('existing_image_colors', JSON.stringify(existingImageColors));
    }

    formData.append('replace_images', replaceImages.toString());

    if (data.colors) {
      formData.append('colors', JSON.stringify(data.colors));
    }

    if (data.sizes) {
      formData.append('sizes', JSON.stringify(data.sizes));
    }

    if (data.variants) {
      formData.append('variants', JSON.stringify(data.variants));
    }

    if (data.discount) {
      formData.append('discount', JSON.stringify(data.discount));
    }

    if (data.voucher) {
      formData.append('voucher', JSON.stringify(data.voucher));
    }

    try {
      const response = await apiClient.put<Product>(`/api/products/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          }
        },
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/products/${id}`);
  },

  async getCategories(): Promise<string[]> {
    const response = await apiClient.get<string[]>('/api/products/categories/list');
    return response.data;
  },

  async getCollections(): Promise<string[]> {
    const response = await apiClient.get<string[]>('/api/products/collections/list');
    return response.data;
  },
};
