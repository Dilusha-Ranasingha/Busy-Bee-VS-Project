import { useState} from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useProducts } from '../../hooks/useProducts';
import type { ProductFormData } from '../../types/product.types';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, Input, Textarea, Button } from '../../components/ui';

export default function AddProductPage() {
  const { add } = useProducts();
  const [form, setForm] = useState<ProductFormData>({
    name: '',
    price: '',
    quantity: '',
    description: '',
    soldCount: '0',
  });
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      await add({
        name: form.name.trim(),
        price: Number(form.price),
        quantity: Number(form.quantity),
        description: form.description.trim() || '',
        soldCount: Number(form.soldCount || 0),
      });

      setStatus('Product added successfully!');
      setForm({ name: '', price: '', quantity: '', description: '', soldCount: '0' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add product';
      setStatus(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Add a new product</CardTitle>
          <CardDescription>Fill in the details below.</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <Input
              label="Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. USB-C Cable"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Price"
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="0.00"
                type="number"
                min="0"
                step="0.01"
                required
              />
              <Input
                label="Quantity"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                placeholder="0"
                type="number"
                min="0"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Sold Count"
                name="soldCount"
                value={form.soldCount}
                onChange={handleChange}
                placeholder="0"
                type="number"
                min="0"
              />
            </div>

            <Textarea
              label="Description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Optional"
            />

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Product'}
              </Button>
              {status && (
                <span
                  className={`text-sm ${
                    status.includes('success') ? 'text-green-600' : 'text-red-600'
                  }`}
                  role="status"
                >
                  {status}
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
