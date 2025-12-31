import apiClient from '../api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Banner {
  id: number;
  title: string;
  subtitle?: string;
  description?: string;
  banner_type: 'hero' | 'promotional' | 'announcement' | 'category';
  status: 'active' | 'inactive' | 'scheduled';
  display_order: number;
  image?: string;
  mobile_image?: string;
  link_url?: string;
  link_text?: string;
  link_target: string;
  start_date?: string;
  end_date?: string;
  text_color?: string;
  background_color?: string;
  button_color?: string;
  view_count: number;
  click_count: number;
  created_at: string;
  updated_at?: string;
}

export interface BannerCreate {
  title: string;
  subtitle?: string;
  description?: string;
  banner_type: string;
  status: string;
  display_order: number;
  link_url?: string;
  link_text?: string;
  link_target: string;
  start_date?: string;
  end_date?: string;
  text_color?: string;
  background_color?: string;
  button_color?: string;
  image?: File;
  mobile_image?: File;
}

export interface BannerUpdate extends Partial<BannerCreate> {}

export const bannerService = {
  async getAllBanners(status?: string, bannerType?: string): Promise<Banner[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (bannerType) params.append('banner_type', bannerType);

    const queryString = params.toString();
    const url = `/api/banners${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get(url);
    return response.data;
  },

  async getActiveBanners(bannerType?: string): Promise<Banner[]> {
    const params = new URLSearchParams();
    if (bannerType) params.append('banner_type', bannerType);

    const queryString = params.toString();
    const url = `/api/banners/active${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get(url);
    return response.data;
  },

  async getBanner(id: number): Promise<Banner> {
    const response = await apiClient.get(`/api/banners/${id}`);
    return response.data;
  },

  async createBanner(data: BannerCreate): Promise<Banner> {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.subtitle) formData.append('subtitle', data.subtitle);
    if (data.description) formData.append('description', data.description);
    formData.append('banner_type', data.banner_type);
    formData.append('status', data.status);
    formData.append('display_order', data.display_order.toString());
    if (data.link_url) formData.append('link_url', data.link_url);
    if (data.link_text) formData.append('link_text', data.link_text);
    formData.append('link_target', data.link_target);
    if (data.start_date) formData.append('start_date', data.start_date);
    if (data.end_date) formData.append('end_date', data.end_date);
    if (data.text_color) formData.append('text_color', data.text_color);
    if (data.background_color) formData.append('background_color', data.background_color);
    if (data.button_color) formData.append('button_color', data.button_color);
    if (data.image) formData.append('image', data.image);
    if (data.mobile_image) formData.append('mobile_image', data.mobile_image);

    const response = await apiClient.post('/api/banners/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async updateBanner(id: number, data: BannerUpdate): Promise<Banner> {
    const formData = new FormData();
    if (data.title) formData.append('title', data.title);
    if (data.subtitle !== undefined) formData.append('subtitle', data.subtitle);
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.banner_type) formData.append('banner_type', data.banner_type);
    if (data.status) formData.append('status', data.status);
    if (data.display_order !== undefined) formData.append('display_order', data.display_order.toString());
    if (data.link_url !== undefined) formData.append('link_url', data.link_url);
    if (data.link_text !== undefined) formData.append('link_text', data.link_text);
    if (data.link_target) formData.append('link_target', data.link_target);
    if (data.start_date !== undefined) formData.append('start_date', data.start_date || '');
    if (data.end_date !== undefined) formData.append('end_date', data.end_date || '');
    if (data.text_color !== undefined) formData.append('text_color', data.text_color);
    if (data.background_color !== undefined) formData.append('background_color', data.background_color);
    if (data.button_color !== undefined) formData.append('button_color', data.button_color);
    if (data.image) formData.append('image', data.image);
    if (data.mobile_image) formData.append('mobile_image', data.mobile_image);

    const response = await apiClient.put(`/api/banners/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async deleteBanner(id: number): Promise<void> {
    await apiClient.delete(`/api/banners/${id}`);
  },

  async trackBannerView(id: number): Promise<void> {
    await apiClient.post(`/api/banners/${id}/view`);
  },

  async trackBannerClick(id: number): Promise<void> {
    await apiClient.post(`/api/banners/${id}/click`);
  },
};
