// in this db/models.ts file, we defined product model class with methods to interact with PostgreSQL database
import { query } from '../../config/db.js';
import {
  Product,
  CreateProductData,
  UpdateProductData,
  ProductQueryResult,
} from '../../features/products/products.types.js';

class ProductModel {
  // Create a new product
  static async create(productData: CreateProductData): Promise<Product> {
    const { name, price, quantity, description = '', soldCount = 0 } = productData;

    const result = await query<ProductQueryResult>(
      `INSERT INTO products (name, price, quantity, description, sold_count)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, price, quantity, description, sold_count as "soldCount", 
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [name, price, quantity, description, soldCount]
    );

    return result.rows[0];
  }

  // Find all products, sorted by createdAt descending
  static async find(): Promise<Product[]> {
    const result = await query<ProductQueryResult>(
      `SELECT id, name, price, quantity, description, sold_count as "soldCount",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM products
       ORDER BY created_at DESC`
    );

    return result.rows;
  }

  // Find product by ID
  static async findById(id: number): Promise<Product | null> {
    const result = await query<ProductQueryResult>(
      `SELECT id, name, price, quantity, description, sold_count as "soldCount",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM products
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  // Update product by ID
  static async findByIdAndUpdate(
    id: number,
    updateData: UpdateProductData,
    _options: { new?: boolean; runValidators?: boolean } = {}
  ): Promise<Product | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query
    if (updateData.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updateData.name);
    }
    if (updateData.price !== undefined) {
      fields.push(`price = $${paramIndex++}`);
      values.push(updateData.price);
    }
    if (updateData.quantity !== undefined) {
      fields.push(`quantity = $${paramIndex++}`);
      values.push(updateData.quantity);
    }
    if (updateData.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updateData.description);
    }
    if (updateData.soldCount !== undefined) {
      fields.push(`sold_count = $${paramIndex++}`);
      values.push(updateData.soldCount);
    }

    if (fields.length === 0) {
      // No fields to update, just return the existing product
      return this.findById(id);
    }

    values.push(id);
    const result = await query<ProductQueryResult>(
      `UPDATE products
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING id, name, price, quantity, description, sold_count as "soldCount",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      values
    );

    return result.rows[0] || null;
  }

  // Delete product by ID
  static async findByIdAndDelete(id: number): Promise<Product | null> {
    const result = await query<ProductQueryResult>(
      `DELETE FROM products
       WHERE id = $1
       RETURNING id, name, price, quantity, description, sold_count as "soldCount",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [id]
    );

    return result.rows[0] || null;
  }
}

export default ProductModel;
