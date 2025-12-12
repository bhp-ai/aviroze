import apiClient from '../api-client';

// Order/Transaction Logs
export interface OrderLog {
  id: number;
  order_id: number;
  user_id: number | null;
  action: string;
  order_status: string | null;
  payment_status: string | null;
  payment_method: string | null;
  total_amount: number | null;
  previous_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  description: string | null;
  meta_data: Record<string, any> | null;
  created_at: string;
  user_email: string | null;
  user_username: string | null;
}

export interface OrderLogStats {
  total_logs: number;
  logs_by_action: Record<string, number>;
  recent_activity_count: number;
  total_orders_tracked: number;
}

export interface OrderLogFilters {
  order_id?: number;
  action?: string;
  payment_status?: string;
  order_status?: string;
  start_date?: string;
  end_date?: string;
  skip?: number;
  limit?: number;
}

// User Activity Logs
export interface UserActivityLog {
  id: number;
  user_id: number | null;
  activity_type: string;
  resource_type: string | null;
  resource_id: number | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, any> | null;
  description: string | null;
  created_at: string;
  user_email: string | null;
  user_username: string | null;
}

export interface UserActivityLogStats {
  total_activities: number;
  activities_by_type: Record<string, number>;
  unique_users: number;
  recent_activity_count: number;
}

export interface UserActivityLogFilters {
  user_id?: number;
  activity_type?: string;
  resource_type?: string;
  ip_address?: string;
  start_date?: string;
  end_date?: string;
  skip?: number;
  limit?: number;
}

export const logsService = {
  orders: {
    async getAll(filters?: OrderLogFilters): Promise<OrderLog[]> {
      const response = await apiClient.get<OrderLog[]>('/api/logs/orders', { params: filters });
      return response.data;
    },

    async getStats(days: number = 30): Promise<OrderLogStats> {
      const response = await apiClient.get<OrderLogStats>('/api/logs/orders/stats', { params: { days } });
      return response.data;
    },
  },

  activities: {
    async getAll(filters?: UserActivityLogFilters): Promise<UserActivityLog[]> {
      const response = await apiClient.get<UserActivityLog[]>('/api/logs/activities', { params: filters });
      return response.data;
    },

    async getStats(days: number = 30): Promise<UserActivityLogStats> {
      const response = await apiClient.get<UserActivityLogStats>('/api/logs/activities/stats', { params: { days } });
      return response.data;
    },
  },
};
