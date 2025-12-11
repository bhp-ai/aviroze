import apiClient from '../api-client';

export interface DashboardStats {
  total_users: number;
  total_admins: number;
  total_products: number;
  total_comments: number;
  avg_rating: number;
  low_stock_products: number;
  products_by_category: Record<string, number>;
  recent_comments_count: number;
  top_rated_products: Array<{
    id: number;
    name: string;
    avg_rating: number;
    review_count: number;
  }>;
  total_orders: number;
  pending_orders: number;
  processing_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  recent_orders_count: number;
}

export interface TrendingProduct {
  id: number;
  name: string;
  category: string;
  price: number;
  comment_count: number;
  avg_rating: number;
}

export const analyticsService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>('/api/analytics/dashboard');
    return response.data;
  },

  async getTrendingProducts(): Promise<TrendingProduct[]> {
    const response = await apiClient.get<TrendingProduct[]>('/api/analytics/products/trending');
    return response.data;
  },
};
