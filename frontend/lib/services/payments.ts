import { authService } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface CheckoutItem {
  product_id: number;
  quantity: number;
  selected_size?: string;
  selected_color?: string;
}

export interface CheckoutResponse {
  checkout_url: string;
  session_id: string;
}

export const paymentService = {
  /**
   * Create a Stripe checkout session
   * This sends only product IDs and quantities to the backend
   * The backend fetches the actual prices from the database to prevent price manipulation
   */
  async createCheckoutSession(items: CheckoutItem[]): Promise<CheckoutResponse> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/payments/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create checkout session');
    }

    return response.json();
  },

  /**
   * Get the status of a checkout session
   */
  async getSessionStatus(sessionId: string): Promise<{ status: string; customer_email: string }> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/payments/session/${sessionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get session status');
    }

    return response.json();
  },
};
