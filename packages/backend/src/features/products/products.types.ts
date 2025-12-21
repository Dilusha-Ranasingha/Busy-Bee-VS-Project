// in this products.types.ts file, we definded all common types related to products feature
export interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number;
  description: string;
  soldCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductData {
  name: string;
  price: number;
  quantity: number;
  description?: string;
  soldCount?: number;
}

export interface UpdateProductData {
  name?: string;
  price?: number;
  quantity?: number;
  description?: string;
  soldCount?: number;
}

export interface ProductQueryResult {
  id: number;
  name: string;
  price: number;
  quantity: number;
  description: string;
  soldCount: number;
  createdAt: Date;
  updatedAt: Date;
}
