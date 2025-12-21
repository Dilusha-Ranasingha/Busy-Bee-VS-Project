import { apiClient } from './api.client';
import type { Product, CreateProductData } from '../types/product.types';

export const productService = {
  async getAll(): Promise<Product[]> {
    return apiClient.get<Product[]>('/api/products');
  },

  async getById(id: number): Promise<Product> {
    return apiClient.get<Product>(`/api/products/${id}`);
  },

  async create(data: CreateProductData): Promise<Product> {
    return apiClient.post<Product>('/api/products', data);
  },

  async update(id: number, data: Partial<CreateProductData>): Promise<Product> {
    return apiClient.patch<Product>(`/api/products/${id}`, data);
  },

  async delete(id: number): Promise<{ ok: boolean }> {
    return apiClient.delete<{ ok: boolean }>(`/api/products/${id}`);
  },
};
