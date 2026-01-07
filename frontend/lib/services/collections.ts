import apiClient from '../api-client';

export interface Collection {
  id: number;
  name: string;
  description?: string;
  image_url?: string;
  created_at: string;
}

export interface CollectionCreate {
  name: string;
  description?: string;
}

export const collectionsService = {
  async getAll(): Promise<Collection[]> {
    const response = await apiClient.get<Collection[]>('/api/collections/');
    return response.data;
  },

  async getById(id: number): Promise<Collection> {
    const response = await apiClient.get<Collection>(`/api/collections/${id}`);
    return response.data;
  },

  async create(data: CollectionCreate, image?: File): Promise<Collection> {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.description) {
      formData.append('description', data.description);
    }
    if (image) {
      formData.append('image', image);
    }

    const response = await apiClient.post<Collection>('/api/collections/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async update(id: number, data: Partial<CollectionCreate>, image?: File): Promise<Collection> {
    const formData = new FormData();
    if (data.name) formData.append('name', data.name);
    if (data.description !== undefined) formData.append('description', data.description);
    if (image) formData.append('image', image);

    const response = await apiClient.put<Collection>(`/api/collections/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/collections/${id}`);
  },
};
