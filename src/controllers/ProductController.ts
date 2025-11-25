import { IProduct } from '../models/Product';
import * as ProductRepository from '../repositories/ProductRepository';
import { logger } from '../utils/logger';

/**
 * Get all products with optional filtering
 * @param categoryId - Optional category ID to filter by
 * @param isAvailable - Optional availability filter
 */
export async function getAllProducts(categoryId?: string, isAvailable?: boolean): Promise<IProduct[]> {
  try {
    // If categoryId is provided, use the category-specific function
    if (categoryId) {
      logger.info(`Fetching products for category: ${categoryId}`, 'PRODUCT');
      const products = await ProductRepository.findProductsByCategoryId(categoryId);
      
      // Apply availability filter if specified
      if (isAvailable !== undefined) {
        return products.filter(p => p.isAvailable === isAvailable);
      }
      return products;
    }
    
    // Otherwise get all products
    logger.info('Fetching all products', 'PRODUCT');
    const allProducts = await ProductRepository.findAllProducts();
    
    // Apply availability filter if specified
    if (isAvailable !== undefined) {
      return allProducts.filter(p => p.isAvailable === isAvailable);
    }
    
    return allProducts;
  } catch (error) {
    logger.error('Error getting products', 'PRODUCT', { error, categoryId, isAvailable });
    throw error;
  }
}

/**
 * Get product by ID
 */
export async function getProductById(id: string): Promise<IProduct | null> {
  try {
    return await ProductRepository.findProductById(id);
  } catch (error) {
    console.error(`Error getting product with ID ${id}:`, error);
    throw error;
  }
}

/**
 * Create a new product - Simplified
 */
export async function createProduct(data: {
  name: string;
  categoryId: string;
  price: number;
  description?: string;
  isAvailable: boolean;
  digitalContent: string[];
}): Promise<IProduct> {
  try {
    return await ProductRepository.createProduct(data);
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

/**
 * Update product
 */
export async function updateProduct(
  id: string,
  productData: Partial<IProduct>
): Promise<IProduct | null> {
  try {
    return await ProductRepository.updateProduct(id, productData);
  } catch (error) {
    console.error(`Error updating product ${id}:`, error);
    throw error;
  }
}

/**
 * Delete product
 */
export async function deleteProduct(id: string): Promise<boolean> {
  try {
    return await ProductRepository.deleteProduct(id);
  } catch (error) {
    console.error(`Error deleting product ${id}:`, error);
    throw error;
  }
}
