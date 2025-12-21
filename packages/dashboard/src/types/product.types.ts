export interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number;
  description: string;
  soldCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductData {
  name: string;
  price: number;
  quantity: number;
  description?: string;
  soldCount?: number;
}

export interface ProductFormData {
  name: string;
  price: string;
  quantity: string;
  description: string;
  soldCount: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
