# GameKey Store — Frontend Integration Guide

## 📋 Overview

This document provides **complete API documentation** for frontend developers building a client application (Next.js + Tailwind + Shadcn UI) to interact with the GameKey Store backend.

**Backend Base URL**: `http://localhost:3001/api` (Development)  
**API Documentation**: Available at `/api-docs` (Swagger UI)

---

## 🎯 Quick Start for Frontend Developers

### What You Need to Know

1. **All API endpoints return JSON**
2. **Base URL**: `http://localhost:3001/api`
3. **Standard Response Format**:
   ```json
   {
     "success": true,
     "data": { /* your data */ },
     "message": "Optional message"
   }
   ```
4. **Error Response Format**:
   ```json
   {
     "success": false,
     "error": "Error message",
     "code": "ERROR_CODE"
   }
   ```

---

## 🔐 Authentication

Currently, the API does not require authentication tokens for basic operations. User identification is done via Telegram ID (passed in requests).

**Future**: API key authentication may be added for admin operations.

---

## 📚 API Endpoints Reference

### 1. 👤 Users API

#### GET `/api/users`
Get all users with pagination.

**Query Parameters**:
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `search` (string, optional): Search by username or name

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "telegramId": 123456789,
      "username": "gamer123",
      "createdAt": "2025-10-01T08:00:00Z",
      "updatedAt": "2025-10-01T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50
  }
}
```

**Frontend Usage Example**:
```typescript
// Next.js API route or client component
async function getUsers(page = 1, limit = 20) {
  const response = await fetch(
    `http://localhost:3001/api/users?page=${page}&limit=${limit}`
  );
  const data = await response.json();
  return data;
}
```

---

#### GET `/api/users/:id`
Get a specific user by MongoDB Object ID.

**Parameters**:
- `id` (string, path): User MongoDB Object ID

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "telegramId": 123456789,
    "username": "gamer123",
    "createdAt": "2025-10-01T08:00:00Z"
  }
}
```

---

#### GET `/api/users/telegram/:telegramId`
Get a user by their Telegram ID (useful for bot integration).

**Parameters**:
- `telegramId` (number, path): User's Telegram ID

**Response**: Same as GET `/api/users/:id`

---

#### POST `/api/users`
Create a new user.

**Request Body**:
```json
{
  "telegramId": 123456789,
  "username": "gamer123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "telegramId": 123456789,
    "username": "gamer123",
    "createdAt": "2025-10-01T08:00:00Z"
  }
}
```

**Frontend Usage Example**:
```typescript
async function createUser(userData: {
  telegramId: number;
  username?: string;
}) {
  const response = await fetch('http://localhost:3001/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return await response.json();
}
```

---

#### PUT `/api/users/:id`
Update user profile.

**Parameters**:
- `id` (string, path): User MongoDB Object ID

**Request Body** (all fields optional):
```json
{
  "username": "newusername"
}
```

**Response**: Updated user object.

---

#### POST `/api/users/:userId/send-message`
Send a direct message to a user via Telegram bot.

**Parameters**:
- `userId` (string, path): User MongoDB Object ID

**Request Body**:
```json
{
  "message": "Hello! Your order has been processed."
}
```

**Response**:
```json
{
  "success": true,
  "data": { "sent": true }
}
```

---

### 2. 🎮 Products API

#### GET `/api/products`
Get all products with filtering and pagination.

**Query Parameters**:
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `categoryId` (string, optional): Filter by category ID
- `available` (boolean, optional): Filter by availability (`true` or `false`)
- `search` (string, optional): Search by product name
- `minPrice` (number, optional): Minimum price filter
- `maxPrice` (number, optional): Maximum price filter

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Steam Gift Card $50",
      "description": "Digital Steam gift card valid worldwide",
      "price": 47.99,
      "categoryId": "507f1f77bcf86cd799439014",
      "isAvailable": true,
      "digitalContent": ["STEAM-KEY-1", "STEAM-KEY-2"],
      "allowPreorder": false,
      "createdAt": "2025-10-01T08:00:00Z",
      "updatedAt": "2025-10-01T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

**Frontend Usage Example**:
```typescript
// Product listing page
async function getProducts(filters: {
  page?: number;
  limit?: number;
  categoryId?: string;
  available?: boolean;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.categoryId) params.append('categoryId', filters.categoryId);
  if (filters.available !== undefined) params.append('available', filters.available.toString());
  if (filters.search) params.append('search', filters.search);
  
  const response = await fetch(
    `http://localhost:3001/api/products?${params.toString()}`
  );
  return await response.json();
}
```

---

#### GET `/api/products/:id`
Get a specific product by ID.

**Parameters**:
- `id` (string, path): Product MongoDB Object ID

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "name": "Steam Gift Card $50",
    "description": "Digital Steam gift card valid worldwide",
    "price": 47.99,
    "categoryId": "507f1f77bcf86cd799439014",
    "isAvailable": true,
    "digitalContent": ["STEAM-KEY-1", "STEAM-KEY-2"],
    "createdAt": "2025-10-01T08:00:00Z"
  }
}
```

---

#### POST `/api/products` (Admin)
Create a new product.

**Request Body**:
```json
{
  "name": "Steam Gift Card $100",
  "description": "Digital Steam gift card code",
  "price": 94.99,
  "categoryId": "507f1f77bcf86cd799439014",
  "isAvailable": true,
  "digitalContent": ["CODE-123-ABC"],
  "allowPreorder": false
}
```

**Response**: Created product object.

---

#### PUT `/api/products/:id` (Admin)
Update a product.

**Parameters**:
- `id` (string, path): Product MongoDB Object ID

**Request Body** (all fields optional):
```json
{
  "name": "Steam Gift Card $100",
  "price": 94.99,
  "isAvailable": true,
  "digitalContent": ["NEW-CODE-456"]
}
```

**Response**: Updated product object.

---

#### DELETE `/api/products/:id` (Admin)
Delete a product.

**Parameters**:
- `id` (string, path): Product MongoDB Object ID

**Response**: 204 No Content (success) or 404 Not Found.

---

### 3. 🏷️ Categories API

#### GET `/api/categories`
Get all product categories.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Gaming Gift Cards",
      "description": "Steam, PlayStation, Xbox gift cards",
      "isActive": true,
      "sortOrder": 1,
      "createdAt": "2025-10-01T08:00:00Z"
    }
  ]
}
```

**Frontend Usage Example**:
```typescript
// Category selector component
async function getCategories() {
  const response = await fetch('http://localhost:3001/api/categories');
  const data = await response.json();
  return data.data; // Array of categories
}
```

---

#### GET `/api/categories/:id`
Get a specific category.

**Parameters**:
- `id` (string, path): Category MongoDB Object ID

**Response**: Single category object.

---

#### POST `/api/categories` (Admin)
Create a new category.

**Request Body**:
```json
{
  "name": "New Category",
  "description": "Category description",
  "isActive": true,
  "sortOrder": 2
}
```

---

#### PUT `/api/categories/:id` (Admin)
Update a category.

**Request Body**: Same as POST (all fields optional).

---

#### DELETE `/api/categories/:id` (Admin)
Delete a category.

**Response**: 204 No Content.

---

### 4. 🛒 Orders API

#### GET `/api/orders`
Get all orders with filtering.

**Query Parameters**:
- `page` (number, optional): Page number
- `limit` (number, optional): Items per page
- `status` (string, optional): Filter by status (`pending`, `paid`, `delivered`, `cancelled`)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439016",
      "userId": "507f1f77bcf86cd799439011",
      "productId": "507f1f77bcf86cd799439013",
      "quantity": 1,
      "totalAmount": 47.99,
      "unitPrice": 47.99,
      "status": "delivered",
      "deliveredContent": ["STEAM-KEY-ABC123"],
      "createdAt": "2025-10-01T10:00:00Z",
      "updatedAt": "2025-10-01T10:30:00Z"
    }
  ]
}
```

**Order Status Flow**:
1. `pending` → Order created, awaiting payment
2. `paid` → Payment confirmed, processing order
3. `delivered` → Digital content delivered to user
4. `cancelled` → Order cancelled

---

#### GET `/api/orders/user/:userId`
Get orders for a specific user.

**Parameters**:
- `userId` (string, path): User MongoDB Object ID

**Query Parameters**:
- `page` (number, optional)
- `limit` (number, optional)

**Response**: Array of orders for the user.

**Frontend Usage Example**:
```typescript
// User's order history page
async function getUserOrders(userId: string, page = 1) {
  const response = await fetch(
    `http://localhost:3001/api/orders/user/${userId}?page=${page}&limit=10`
  );
  return await response.json();
}
```

---

#### GET `/api/orders/:id`
Get a specific order.

**Parameters**:
- `id` (string, path): Order MongoDB Object ID

**Response**: Single order object.

---

#### POST `/api/orders`
Create a new order.

**Request Body**:
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "productId": "507f1f77bcf86cd799439013",
  "quantity": 1
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439016",
    "userId": "507f1f77bcf86cd799439011",
    "productId": "507f1f77bcf86cd799439013",
    "quantity": 1,
    "totalAmount": 47.99,
    "unitPrice": 47.99,
    "status": "pending",
    "createdAt": "2025-10-01T10:00:00Z"
  }
}
```

**Frontend Usage Example**:
```typescript
// Checkout flow
async function createOrder(userId: string, productId: string, quantity: number) {
  const response = await fetch('http://localhost:3001/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, productId, quantity })
  });
  return await response.json();
}
```

---

#### PUT `/api/orders/:id/status` (Admin)
Update order status.

**Parameters**:
- `id` (string, path): Order MongoDB Object ID

**Request Body**:
```json
{
  "status": "delivered"
}
```

**Valid Statuses**: `pending`, `paid`, `delivered`, `cancelled`

---

#### POST `/api/orders/:id/fulfill` (Admin/System)
Fulfill order with digital content.

**Parameters**:
- `id` (string, path): Order MongoDB Object ID

**Request Body**:
```json
{
  "content": ["STEAM-KEY-ABC123", "STEAM-KEY-XYZ987"]
}
```

**Response**: Updated order with `deliveredContent` and status set to `delivered`.

---

#### GET `/api/orders/stats/sales`
Get sales statistics.

**Query Parameters**:
- `startDate` (string, optional): ISO 8601 date
- `endDate` (string, optional): ISO 8601 date

**Response**:
```json
{
  "totalOrders": 150,
  "totalRevenue": 7499.50,
  "averageOrderValue": 49.99,
  "ordersByStatus": {
    "pending": 10,
    "paid": 5,
    "delivered": 130,
    "cancelled": 5
  }
}
```

---

### 5. 💳 Payments API

#### GET `/api/payments`
Get all payment transactions.

**Query Parameters**:
- `page` (number, optional)
- `limit` (number, optional)
- `status` (string, optional): Filter by status (`pending`, `completed`, `failed`, `cancelled`, `refunded`)
- `provider` (string, optional): Filter by provider (`nowpayments`)

**Response**:
```json
{
  "transactions": [
    {
      "_id": "507f1f77bcf86cd799439017",
      "orderId": "507f1f77bcf86cd799439016",
      "userId": "507f1f77bcf86cd799439011",
      "amount": 47.99,
      "currency": "usd",
      "cryptoType": "usdterc20",
      "cryptoNetwork": "Ethereum",
      "status": "completed",
      "paymentProvider": "nowpayments",
      "providerTransactionId": "12345678",
      "paymentUrl": "https://nowpayments.io/payment/...",
      "cryptoAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "cryptoTxHash": "0xabc123...",
      "createdAt": "2025-10-01T10:00:00Z",
      "completedAt": "2025-10-01T10:15:00Z"
    }
  ],
  "total": 50
}
```

**Payment Status Flow**:
1. `pending` → Payment initiated, awaiting confirmation
2. `completed` → Payment confirmed and processed
3. `failed` → Payment failed
4. `cancelled` → Payment cancelled by user
5. `refunded` → Payment refunded

---

#### GET `/api/payments/user/:userId`
Get payment transactions for a specific user.

**Parameters**:
- `userId` (string, path): User MongoDB Object ID

**Response**: Array of payment transactions.

---

#### GET `/api/payments/:id`
Get a specific payment transaction.

**Parameters**:
- `id` (string, path): Payment MongoDB Object ID

**Response**: Single payment transaction object.

---

#### GET `/api/payments/order/:orderId`
Get payment transactions for a specific order.

**Parameters**:
- `orderId` (string, path): Order MongoDB Object ID

**Response**: Array of payment transactions.

---

#### GET `/api/payments/:id/check`
Check payment status (refresh from provider).

**Parameters**:
- `id` (string, path): Payment MongoDB Object ID

**Response**: Updated payment transaction object.

---

#### GET `/api/payments/stats/summary`
Get payment statistics.

**Query Parameters**:
- `startDate` (string, optional): ISO 8601 date
- `endDate` (string, optional): ISO 8601 date

**Response**:
```json
{
  "totalTransactions": 150,
  "totalAmount": 7499.50,
  "completedTransactions": 130,
  "failedTransactions": 10,
  "transactionsByStatus": {
    "pending": 5,
    "completed": 130,
    "failed": 10,
    "cancelled": 3,
    "refunded": 2
  }
}
```

---

### 6. 🔔 Notifications API

#### GET `/api/notifications`
Get all notifications.

**Query Parameters**:
- `userId` (string, optional): Filter by user ID
- `type` (string, optional): Filter by type (`order`, `payment`, `system`, `promo`)

**Response**:
```json
[
  {
    "_id": "507f1f77bcf86cd799439020",
    "userId": "507f1f77bcf86cd799439011",
    "type": "order",
    "title": "Order Delivered",
    "message": "Your Steam Gift Card has been delivered!",
    "isRead": false,
    "data": { "orderId": "507f1f77bcf86cd799439016" },
    "createdAt": "2025-10-02T12:30:00Z"
  }
]
```

**Notification Types**:
- `order` → Order status updates
- `payment` → Payment confirmations
- `system` → System announcements
- `promo` → Promotional messages

---

#### GET `/api/notifications/:id`
Get a specific notification.

**Parameters**:
- `id` (string, path): Notification MongoDB Object ID

**Response**: Single notification object.

---

#### POST `/api/notifications` (Admin)
Create a new notification.

**Request Body**:
```json
{
  "title": "New Products Available!",
  "message": "Check out our new Steam gift cards.",
  "audience": "all_users",
  "targetUserIds": []
}
```

**Audience Options**:
- `all_users` → Send to all users
- `active_users` → Send to active users only
- `specific_users` → Send to specific users (requires `targetUserIds`)

---

#### PUT `/api/notifications/:id` (Admin)
Update a notification.

**Request Body** (all fields optional):
```json
{
  "title": "Updated title",
  "message": "Updated message",
  "status": "sent"
}
```

---

#### DELETE `/api/notifications/:id` (Admin)
Delete a notification.

**Response**: 204 No Content.

---

#### POST `/api/notifications/:id/resend` (Admin)
Resend an existing notification to the same audience.

**Parameters**:
- `id` (string, path): Notification MongoDB Object ID

**Description**:
This endpoint resends a notification that was previously created. It will send the notification to the same audience (all users or specific users) as the original notification. Useful for:
- Retrying failed notifications
- Re-sending important announcements
- Testing notification delivery

**Response**:
```json
{
  "success": true,
  "message": "Notification sent to 25 out of 30 users",
  "sentCount": 25,
  "totalUsers": 30
}
```

**Error Responses**:
- `404`: Notification not found
- `500`: Failed to resend notification

**Frontend Usage Example**:
```typescript
async function resendNotification(notificationId: string) {
  const response = await fetch(
    `http://localhost:3001/api/notifications/${notificationId}/resend`,
    { method: 'POST' }
  );
  return await response.json();
}

// Usage in component
const handleResend = async (id: string) => {
  const result = await resendNotification(id);
  if (result.success) {
    console.log(`Sent to ${result.sentCount} users`);
  }
};
```

---

## 🎨 Frontend Integration Examples

### Next.js 14+ with TypeScript

#### API Client Setup

```typescript
// lib/api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}
```

---

#### Product Listing Component

```typescript
// app/products/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api-client';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const data = await apiRequest<{ success: boolean; data: Product[] }>(
          '/products?available=true'
        );
        setProducts(data.data);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {products.map((product) => (
        <div key={product._id} className="border p-4 rounded-lg">
          <h3 className="text-xl font-bold">{product.name}</h3>
          <p className="text-gray-600">{product.description}</p>
          <p className="text-lg font-semibold mt-2">${product.price}</p>
          <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
            Buy Now
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

#### Checkout Flow

```typescript
// lib/checkout.ts
import { apiRequest } from './api-client';

export async function createOrder(
  userId: string,
  productId: string,
  quantity: number
) {
  return apiRequest('/orders', {
    method: 'POST',
    body: JSON.stringify({ userId, productId, quantity }),
  });
}

export async function initiatePayment(orderId: string) {
  // This would typically call a payment initiation endpoint
  // For now, payments are initiated through the Telegram bot
  return { orderId, status: 'pending' };
}
```

---

#### Order History Component

```typescript
// components/OrderHistory.tsx
'use client';

import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api-client';

interface Order {
  _id: string;
  productId: string;
  quantity: number;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export function OrderHistory({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    async function fetchOrders() {
      const data = await apiRequest<{ orders: Order[] }>(
        `/orders/user/${userId}`
      );
      setOrders(data.orders);
    }

    fetchOrders();
  }, [userId]);

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order._id} className="border p-4 rounded-lg">
          <div className="flex justify-between">
            <span>Order #{order._id}</span>
            <span className={`badge ${getStatusColor(order.status)}`}>
              {order.status}
            </span>
          </div>
          <p className="mt-2">Quantity: {order.quantity}</p>
          <p>Total: ${order.totalAmount.toFixed(2)}</p>
          <p className="text-sm text-gray-500">
            {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'delivered': return 'bg-green-500 text-white';
    case 'paid': return 'bg-blue-500 text-white';
    case 'pending': return 'bg-yellow-500 text-white';
    case 'cancelled': return 'bg-red-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
}
```

---

## 🎨 Shadcn UI Components Examples

### Product Card

```typescript
// components/product-card.tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProductCardProps {
  product: {
    _id: string;
    name: string;
    description: string;
    price: number;
    isAvailable: boolean;
  };
  onBuy: (productId: string) => void;
}

export function ProductCard({ product, onBuy }: ProductCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle>{product.name}</CardTitle>
          {product.isAvailable ? (
            <Badge variant="success">Available</Badge>
          ) : (
            <Badge variant="destructive">Out of Stock</Badge>
          )}
        </div>
        <CardDescription>{product.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">${product.price.toFixed(2)}</p>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => onBuy(product._id)}
          disabled={!product.isAvailable}
          className="w-full"
        >
          {product.isAvailable ? 'Buy Now' : 'Out of Stock'}
        </Button>
      </CardFooter>
    </Card>
  );
}
```

---

### Order Status Badge

```typescript
// components/order-status-badge.tsx
import { Badge } from '@/components/ui/badge';

interface OrderStatusBadgeProps {
  status: 'pending' | 'paid' | 'delivered' | 'cancelled';
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const variants = {
    pending: { variant: 'secondary' as const, label: 'Pending' },
    paid: { variant: 'default' as const, label: 'Paid' },
    delivered: { variant: 'success' as const, label: 'Delivered' },
    cancelled: { variant: 'destructive' as const, label: 'Cancelled' },
  };

  const { variant, label } = variants[status];

  return <Badge variant={variant}>{label}</Badge>;
}
```

---

### Checkout Dialog

```typescript
// components/checkout-dialog.tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    _id: string;
    name: string;
    price: number;
  };
  onConfirm: (quantity: number) => void;
}

export function CheckoutDialog({ open, onOpenChange, product, onConfirm }: CheckoutDialogProps) {
  const [quantity, setQuantity] = useState(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Your Purchase</DialogTitle>
          <DialogDescription>
            You're buying: {product.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
            />
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>${(product.price * quantity).toFixed(2)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(quantity)}>
            Proceed to Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🔄 Real-time Updates (Optional)

For real-time order/payment status updates, you can implement polling or WebSocket connections:

### Polling Example

```typescript
// hooks/useOrderStatus.ts
import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api-client';

export function useOrderStatus(orderId: string, intervalMs = 5000) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const data = await apiRequest(`/orders/${orderId}`);
        setOrder(data);
      } catch (error) {
        console.error('Failed to fetch order:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
    const interval = setInterval(fetchOrder, intervalMs);

    return () => clearInterval(interval);
  }, [orderId, intervalMs]);

  return { order, loading };
}
```

---

## 📊 Data Models (TypeScript Interfaces)

```typescript
// types/api.ts

export interface User {
  _id: string;
  telegramId: number;
  username?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  isAvailable: boolean;
  digitalContent: string[];
  allowPreorder: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Order {
  _id: string;
  userId: string;
  productId: string;
  quantity: number;
  totalAmount: number;
  unitPrice: number;
  status: 'pending' | 'paid' | 'delivered' | 'cancelled';
  deliveredContent?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransaction {
  _id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  cryptoType?: string;
  cryptoNetwork?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  paymentProvider: string;
  providerTransactionId?: string;
  paymentUrl?: string;
  cryptoAddress?: string;
  cryptoTxHash?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Notification {
  _id: string;
  userId: string;
  type: 'order' | 'payment' | 'system' | 'promo';
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

---

## 🚀 Complete Next.js Integration Example

### Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

### API Client with Error Handling

```typescript
// lib/api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error || 'API request failed',
        data.code,
        response.status
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error or server unavailable');
  }
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  
  post: <T>(endpoint: string, body: any) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  
  put: <T>(endpoint: string, body: any) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  
  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
};
```

---

### Service Layer

```typescript
// services/product-service.ts
import { api } from '@/lib/api-client';
import type { Product, PaginatedResponse } from '@/types/api';

export const productService = {
  async getAll(filters?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    available?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.available !== undefined) {
      params.append('available', filters.available.toString());
    }
    
    const query = params.toString();
    return api.get<PaginatedResponse<Product>>(
      `/products${query ? `?${query}` : ''}`
    );
  },

  async getById(id: string) {
    return api.get<{ success: boolean; data: Product }>(`/products/${id}`);
  },

  async create(productData: Partial<Product>) {
    return api.post<{ success: boolean; data: Product }>(
      '/products',
      productData
    );
  },

  async update(id: string, productData: Partial<Product>) {
    return api.put<{ success: boolean; data: Product }>(
      `/products/${id}`,
      productData
    );
  },

  async delete(id: string) {
    return api.delete(`/products/${id}`);
  },
};
```

```typescript
// services/order-service.ts
import { api } from '@/lib/api-client';
import type { Order } from '@/types/api';

export const orderService = {
  async create(userId: string, productId: string, quantity: number) {
    return api.post<{ success: boolean; data: Order }>('/orders', {
      userId,
      productId,
      quantity,
    });
  },

  async getUserOrders(userId: string, page = 1, limit = 20) {
    return api.get<{ orders: Order[]; total: number }>(
      `/orders/user/${userId}?page=${page}&limit=${limit}`
    );
  },

  async getById(orderId: string) {
    return api.get<Order>(`/orders/${orderId}`);
  },
};
```

---

### React Query Integration (Recommended)

```typescript
// hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query';
import { productService } from '@/services/product-service';

export function useProducts(filters?: {
  page?: number;
  categoryId?: string;
  available?: boolean;
}) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => productService.getAll(filters),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => productService.getById(id),
    enabled: !!id,
  });
}
```

```typescript
// hooks/useOrders.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/services/order-service';

export function useUserOrders(userId: string, page = 1) {
  return useQuery({
    queryKey: ['orders', userId, page],
    queryFn: () => orderService.getUserOrders(userId, page),
    enabled: !!userId,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      productId,
      quantity,
    }: {
      userId: string;
      productId: string;
      quantity: number;
    }) => orderService.create(userId, productId, quantity),
    onSuccess: () => {
      // Invalidate orders cache
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
```

---

## 🎯 Key Points for Frontend Development

### 1. **API Base URL**
Always use environment variables for the API base URL:
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
```

### 2. **Error Handling**
All endpoints return a consistent error format:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

Handle errors gracefully in your UI with toast notifications or error states.

### 3. **Pagination**
Most list endpoints support pagination with `page` and `limit` query parameters. Default: `page=1`, `limit=20`.

### 4. **Status Enums**
Use TypeScript enums or union types for statuses:
```typescript
type OrderStatus = 'pending' | 'paid' | 'delivered' | 'cancelled';
type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
```

### 5. **Real-time Updates**
For order/payment status, implement polling (check every 5-10 seconds) or use WebSockets if available.

### 6. **Payment Flow**
Currently, payments are initiated through the Telegram bot. The frontend can:
- Display order status
- Show payment links (if provided)
- Poll for payment completion
- Show delivered content once order is fulfilled

### 7. **Admin Operations**
Mark admin-only endpoints clearly in your UI. Future versions may require admin authentication.

---

## 🛠️ Recommended Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **Components**: Shadcn UI
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Native `fetch` with custom wrapper
- **TypeScript**: Strict mode enabled

---

## 📝 Additional Notes

### Current Payment Flow
1. User creates an order via the frontend or Telegram bot
2. Payment is initiated through NowPayments (currently via Telegram bot)
3. User pays with crypto
4. Webhook updates order status
5. Product is delivered automatically

### Future Enhancements
- Direct payment initiation from frontend
- WebSocket for real-time updates
- Admin dashboard
- API authentication tokens
- Rate limiting

---

## 🆘 Support & Documentation

- **API Documentation**: `http://localhost:3001/api-docs` (Swagger UI)
- **Backend Repository**: Contact your backend team
- **Issues**: Report bugs to the development team

---

## ✅ Checklist for Frontend Developers

- [ ] Set up environment variables
- [ ] Create API client with error handling
- [ ] Define TypeScript interfaces for all models
- [ ] Implement service layer for each resource
- [ ] Set up React Query for data fetching
- [ ] Create reusable UI components (Shadcn)
- [ ] Implement product listing page
- [ ] Implement product detail page
- [ ] Implement checkout flow
- [ ] Implement order history page
- [ ] Implement order status polling
- [ ] Add loading and error states
- [ ] Test all API endpoints
- [ ] Add toast notifications for user feedback
- [ ] Implement responsive design
- [ ] Add accessibility features

---

**Happy Coding! 🚀**

This guide covers everything you need to build a complete frontend for the GameKey Store. If you have questions or need clarification, refer to the Swagger documentation or contact the backend team.
