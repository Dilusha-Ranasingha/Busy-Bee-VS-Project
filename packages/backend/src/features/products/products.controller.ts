// in this products.controller.ts file, we handle HTTP requests and responses for related to products feature by using product service

import { Request, Response, NextFunction } from 'express';
import * as productService from './products.service.js';

export async function createProduct(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json(product);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('required') || err.message.includes('non-negative')) {
        res.status(400).json({ message: err.message });
        return;
      }
    }
    next(err);
  }
}

export async function listProducts(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const products = await productService.getAllProducts();
    res.json(products);
  } catch (err) {
    next(err);
  }
}

export async function getProduct(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const product = await productService.getProductById(req.params.id);
    res.json(product);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Invalid product ID') {
        res.status(400).json({ message: err.message });
        return;
      }
      if (err.message === 'Product not found') {
        res.status(404).json({ message: 'Not found' });
        return;
      }
    }
    next(err);
  }
}

export async function updateProduct(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    res.json(product);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Invalid product ID' || err.message.includes('non-negative')) {
        res.status(400).json({ message: err.message });
        return;
      }
      if (err.message === 'Product not found') {
        res.status(404).json({ message: 'Not found' });
        return;
      }
    }
    next(err);
  }
}

export async function deleteProduct(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await productService.deleteProduct(req.params.id);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Invalid product ID') {
        res.status(400).json({ message: err.message });
        return;
      }
      if (err.message === 'Product not found') {
        res.status(404).json({ message: 'Not found' });
        return;
      }
    }
    next(err);
  }
}
