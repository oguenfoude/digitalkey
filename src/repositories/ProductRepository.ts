import { ObjectId } from 'mongodb';
import { connectToDatabase, getDb } from '../database/connection';
import { IProduct } from '../models/Product';
import { logger } from '../utils/logger';

// Helper to convert MongoDB _id to string
function mapProduct(product: any): IProduct | null {
  if (!product) return null;
  return {
    ...product,
    _id: product._id?.toString(),
  };
}

// Find product by MongoDB ID
export async function findProductById(id: string): Promise<IProduct | null> {
  try {
    // Clean and validate product ID securely
    const cleanId = id.trim().split('_')[0]; // Remove quantity suffix if present

    // Strict ObjectId validation
    if (!cleanId || !ObjectId.isValid(cleanId)) {
      return null;
    }

    await connectToDatabase();
    const collection = getDb().collection('products');

    const product = await collection.findOne({ _id: new ObjectId(cleanId) });
    return mapProduct(product);
  } catch {
    // Silent fail for security - don't expose internal errors
    logger.error('Product lookup failed', 'PRODUCT');
    return null;
  }
}

// Get products with filter
export async function findProducts(filter: any = {}): Promise<IProduct[]> {
  await connectToDatabase();
  const collection = getDb().collection('products');
  const products = await collection.find(filter).toArray();
  return products.map(p => mapProduct(p)).filter((p): p is IProduct => p !== null);
}

// For backward compatibility - accepts general filters
export async function findAllProducts(filter: any = {}): Promise<IProduct[]> {
  return findProducts(filter);
}

// Create a new product
export async function createProduct(
  productData: Omit<IProduct, '_id' | 'createdAt' | 'updatedAt'>
): Promise<IProduct> {
  await connectToDatabase();
  const collection = getDb().collection('products');
  const now = new Date();

  const newProduct = {
    ...productData,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(newProduct);
  return { ...newProduct, _id: result.insertedId.toString() };
}

// Update product by ID
export async function updateProduct(
  id: string,
  productData: Partial<IProduct>
): Promise<IProduct | null> {
  try {
    await connectToDatabase();
    const collection = getDb().collection('products');
    const objectId = new ObjectId(id);

    const updateData = {
      ...productData,
      updatedAt: new Date(),
    };

    // Prevent updating critical fields
    delete updateData._id;
    delete updateData.createdAt;

    const result = await collection.findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    return mapProduct(result);
  } catch (error) {
    logger.error('Error updating product', 'PRODUCT', { error, id });
    return null;
  }
}

// Delete product by ID
export async function deleteProduct(id: string): Promise<boolean> {
  try {
    await connectToDatabase();
    const collection = getDb().collection('products');
    const objectId = new ObjectId(id);
    const result = await collection.deleteOne({ _id: objectId });
    return result.deletedCount === 1;
  } catch (error) {
    logger.error('Error deleting product', 'PRODUCT', { error, id });
    return false;
  }
}

// Find products by category ID
export async function findProductsByCategoryId(categoryId: string): Promise<IProduct[]> {
  try {
    // Validate categoryId
    if (!categoryId || !ObjectId.isValid(categoryId)) {
      logger.error('Invalid categoryId provided', 'PRODUCT', { categoryId });
      return [];
    }

    await connectToDatabase();
    const collection = getDb().collection('products');
    
    // Convert string to ObjectId for proper MongoDB query
    const categoryObjectId = new ObjectId(categoryId);
    const products = await collection.find({ categoryId: categoryObjectId }).toArray();
    
    logger.info(`Found ${products.length} products for category ${categoryId}`, 'PRODUCT');
    
    return products.map(p => mapProduct(p)).filter((p): p is IProduct => p !== null);
  } catch (error) {
    logger.error('Error finding products by category', 'PRODUCT', { error, categoryId });
    return [];
  }
}

/**
 * Atomically reserve product inventory for purchase
 * Prevents race conditions by using findOneAndUpdate with array operators
 * Returns the reserved content or null if insufficient inventory
 */
export async function reserveProductInventory(
  productId: string,
  quantity: number
): Promise<{ success: boolean; reservedContent?: string[]; product?: IProduct }> {
  try {
    await connectToDatabase();
    const collection = getDb().collection('products');
    const objectId = new ObjectId(productId);

    // First check if enough inventory exists
    const product = await collection.findOne({ _id: objectId });
    if (!product || !product.digitalContent || product.digitalContent.length < quantity) {
      return { success: false };
    }

    // Extract the content to reserve
    const reservedContent = product.digitalContent.slice(0, quantity);
    const remainingContent = product.digitalContent.slice(quantity);

    // Atomically update the product with remaining content
    const result = await collection.findOneAndUpdate(
      {
        _id: objectId,
        // Ensure the product still has enough inventory at the moment of update
        [`digitalContent.${quantity - 1}`]: { $exists: true },
      },
      {
        $set: {
          digitalContent: remainingContent,
          isAvailable: remainingContent.length > 0,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      // Someone else got the inventory first
      return { success: false };
    }

    return {
      success: true,
      reservedContent,
      product: mapProduct(result) || undefined,
    };
  } catch (error) {
    logger.error('Error reserving product inventory', 'PRODUCT', { error, productId, quantity });
    return { success: false };
  }
}
