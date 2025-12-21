import { useEffect, useState, useCallback } from 'react';
import { productService } from '../services/product.service';
import type { Product, CreateProductData } from '../types/product.types';

interface UseProductsReturn {
  items: Product[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  add: (product: CreateProductData) => Promise<Product>;
}

export function useProducts(): UseProductsReturn {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productService.getAll();
      setItems(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch products';
      setError(message);
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const add = useCallback(async (product: CreateProductData): Promise<Product> => {
    try {
      const created = await productService.create(product);
      setItems((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create product';
      throw new Error(message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading, error, refresh, add };
}
