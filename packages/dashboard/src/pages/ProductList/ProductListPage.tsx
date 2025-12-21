import { useEffect, useState } from 'react';
import { productService } from '../../services/product.service';
import type { Product } from '../../types/product.types';
import { LoadingSpinner } from '../../components/ui';

export default function ProductListPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      setError(null);
      try {
        const data = await productService.getAll();
        setItems(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch products';
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-red-600">
        Error: {error}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="text-gray-600">No products yet.</div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((product) => (
        <li
          key={product.id}
          className="bg-white rounded-xl shadow ring-1 ring-gray-200 p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold leading-6">{product.name}</h3>
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
              ${product.price}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600 mb-2">
            <div className="flex items-center gap-2">
              <dt className="font-medium text-gray-700">Qty</dt>
              <dd>{product.quantity}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="font-medium text-gray-700">Sold</dt>
              <dd>{product.soldCount}</dd>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <dt className="font-medium text-gray-700">Created</dt>
              <dd>{new Date(product.createdAt).toLocaleString()}</dd>
            </div>
          </dl>

          {product.description && (
            <p className="text-sm text-gray-600">{product.description}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
