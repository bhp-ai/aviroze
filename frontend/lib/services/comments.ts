import apiClient from '../api-client';

export interface Comment {
  id: number;
  product_id: number;
  user_id: number;
  order_id?: number;
  username: string;
  user_email: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at?: string;
  purchase_date?: string;
}

export interface CommentWithProduct extends Comment {
  product_name: string;
  product_category: string;
}

export interface CommentCreate {
  product_id: number;
  rating: number;
  comment: string;
  order_id?: number;
}

export interface EligiblePurchase {
  order_id: number;
  purchase_date: string;
  has_reviewed: boolean;
}

export interface CommentUpdate {
  rating?: number;
  comment?: string;
}

export const commentsService = {
  async getAll(productId?: number): Promise<Comment[]> {
    const params = productId ? { product_id: productId } : {};
    const response = await apiClient.get<Comment[]>('/api/comments/', { params });
    return response.data;
  },

  async getAllAdmin(): Promise<CommentWithProduct[]> {
    const response = await apiClient.get<CommentWithProduct[]>('/api/comments/admin/all');
    return response.data;
  },

  async getById(id: number): Promise<Comment> {
    const response = await apiClient.get<Comment>(`/api/comments/${id}`);
    return response.data;
  },

  async getEligiblePurchases(productId: number): Promise<EligiblePurchase[]> {
    const response = await apiClient.get<EligiblePurchase[]>(`/api/comments/eligible-purchases/${productId}`);
    return response.data;
  },

  async create(data: CommentCreate): Promise<Comment> {
    const response = await apiClient.post<Comment>('/api/comments/', data);
    return response.data;
  },

  async update(id: number, data: CommentUpdate): Promise<Comment> {
    const response = await apiClient.put<Comment>(`/api/comments/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/comments/${id}`);
  },
};
