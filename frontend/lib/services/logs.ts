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
  search?: string;
  start_date?: string;
  end_date?: string;
  skip?: number;
  limit?: number;
}

// API Request Logs
export interface APIRequestLog {
  id: number;
  user_id: number | null;
  method: string;
  path: string;
  endpoint: string | null;
  status_code: number | null;
  response_time: number | null;
  ip_address: string | null;
  user_agent: string | null;
  query_params: Record<string, any> | null;
  created_at: string;
  user_email: string | null;
  user_username: string | null;
}

export interface APIRequestLogStats {
  total_requests: number;
  requests_by_method: Record<string, number>;
  requests_by_status: Record<string, number>;
  avg_response_time: number;
  recent_requests_count: number;
}

export interface APIRequestLogFilters {
  user_id?: number;
  method?: string;
  path?: string;
  status_code?: number;
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

  apiRequests: {
    async getAll(filters?: APIRequestLogFilters): Promise<APIRequestLog[]> {
      const response = await apiClient.get<APIRequestLog[]>('/api/logs/api-requests', { params: filters });
      return response.data;
    },

    async getStats(days: number = 30): Promise<APIRequestLogStats> {
      const response = await apiClient.get<APIRequestLogStats>('/api/logs/api-requests/stats', { params: { days } });
      return response.data;
    },
  },
};
