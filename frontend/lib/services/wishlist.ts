import apiClient from '../api-client';

export interface WishlistItem {
  id: number;
  user_id: number;
  product_id: number;
  created_at: string;
}

export const wishlistService = {
  async getAll(): Promise<WishlistItem[]> {
    const response = await apiClient.get('/api/wishlist/');
    return response.data;
  },

  async add(productId: number): Promise<WishlistItem> {
    const response = await apiClient.post('/api/wishlist/', {
      product_id: productId,
    });
    return response.data;
  },

  async remove(productId: number): Promise<void> {
    await apiClient.delete(`/api/wishlist/${productId}`);
  },

  async check(productId: number): Promise<boolean> {
    const response = await apiClient.get(`/api/wishlist/check/${productId}`);
    return response.data.in_wishlist;
  },
};
