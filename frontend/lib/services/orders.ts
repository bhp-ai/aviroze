import { authService } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  product_image?: string;
}

export interface Order {
  id: number;
  user_id: number;
  status: string;
  total_amount: number;
  payment_method?: string;
  payment_status: string;
  shipping_address?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  items: OrderItem[];
}

export const ordersService = {
  /**
   * Get all orders for the current user
   */
  async getMyOrders(): Promise<Order[]> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/orders/my-orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch orders');
    }

    return response.json();
  },

  /**
   * Get a single order by ID
   */
  async getOrder(orderId: number): Promise<Order> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch order');
    }

    return response.json();
  },

  /**
   * Get all orders (Admin only)
   */
  async getAllOrders(statusFilter?: string): Promise<Order[]> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const url = new URL(`${API_URL}/api/orders/admin/all`);
    if (statusFilter) {
      url.searchParams.append('status_filter', statusFilter);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch orders');
    }

    return response.json();
  },

  /**
   * Update order status (Admin only)
   */
  async updateOrderStatus(orderId: number, status: string): Promise<void> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update order status');
    }
  },
};
