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

export interface SalesData {
  date: string;
  sales: number;
  revenue: number;
  orders: number;
}

export interface MonthlySales {
  month: string;
  sales: number;
  revenue: number;
  orders: number;
}

export interface CategorySales {
  category: string;
  sales: number;
  revenue: number;
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

  async getSalesData(period: 'week' | 'month' | 'year' = 'month'): Promise<SalesData[]> {
    const response = await apiClient.get<SalesData[]>(`/api/analytics/sales?period=${period}`);
    return response.data;
  },

  async getMonthlySales(year?: number): Promise<MonthlySales[]> {
    const currentYear = year || new Date().getFullYear();
    const response = await apiClient.get<MonthlySales[]>(`/api/analytics/sales/monthly?year=${currentYear}`);
    return response.data;
  },

  async getCategorySales(): Promise<CategorySales[]> {
    const response = await apiClient.get<CategorySales[]>('/api/analytics/sales/by-category');
    return response.data;
  },
};
