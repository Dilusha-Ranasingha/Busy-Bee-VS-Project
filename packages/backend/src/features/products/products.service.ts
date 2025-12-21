// in this products.service.ts file, we implemented business logic for related to products feature
import ProductModel from '../../db/models/Product.model.js';
import { Product, CreateProductData, UpdateProductData } from './products.types.js';

/**
 * Product Service
 * Handles business logic for product operations
 */

export async function createProduct(productData: CreateProductData): Promise<Product> {
  const { name, price, quantity, soldCount } = productData;

  // Validation
  if (!name || price === undefined || quantity === undefined) {
    throw new Error('Name, price, and quantity are required');
  }

  if (price < 0 || quantity < 0 || (soldCount !== undefined && soldCount < 0)) {
    throw new Error('Price, quantity, and soldCount must be non-negative');
  }

  const product = await ProductModel.create(productData);

  return product;
}

export async function getAllProducts(): Promise<Product[]> {
  const products = await ProductModel.find();
  return products;
}

export async function getProductById(id: string): Promise<Product> {
  const parsedId = parseInt(id);

  if (isNaN(parsedId)) {
    throw new Error('Invalid product ID');
  }

  const product = await ProductModel.findById(parsedId);

  if (!product) {
    throw new Error('Product not found');
  }

  return product;
}

export async function updateProduct(
  id: string,
  updateData: UpdateProductData
): Promise<Product> {
  const parsedId = parseInt(id);

  if (isNaN(parsedId)) {
    throw new Error('Invalid product ID');
  }

  // Validate numeric fields if provided
  const { price, quantity, soldCount } = updateData;
  if (
    (price !== undefined && price < 0) ||
    (quantity !== undefined && quantity < 0) ||
    (soldCount !== undefined && soldCount < 0)
  ) {
    throw new Error('Price, quantity, and soldCount must be non-negative');
  }

  const product = await ProductModel.findByIdAndUpdate(parsedId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    throw new Error('Product not found');
  }

  return product;
}

export async function deleteProduct(id: string): Promise<{ ok: boolean }> {
  const parsedId = parseInt(id);

  if (isNaN(parsedId)) {
    throw new Error('Invalid product ID');
  }

  const product = await ProductModel.findByIdAndDelete(parsedId);

  if (!product) {
    throw new Error('Product not found');
  }

  return { ok: true };
}
