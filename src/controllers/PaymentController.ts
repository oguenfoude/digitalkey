import { IPaymentTransaction } from '../models/PaymentTransaction';
import * as PaymentRepository from '../repositories/PaymentRepository';
import * as OrderRepository from '../repositories/OrderRepository';
import * as ProductRepository from '../repositories/ProductRepository';
import { logger } from '../utils/logger';
// Note: handlePaymentSuccess will be imported when needed to avoid circular dependency

/**
 * Get all payment transactions with optional filtering
 */
export async function getAllTransactions(
  filter: any = {},
  page = 1,
  limit = 20
): Promise<{ transactions: IPaymentTransaction[]; total: number }> {
  try {
    const skip = (page - 1) * limit;
    // Execute both queries in parallel for better performance
    const [transactions, total] = await Promise.all([
      PaymentRepository.findAllTransactions(filter, skip, limit),
      PaymentRepository.countTransactions(filter),
    ]);

    return { transactions, total };
  } catch (error) {
    logger.error('Error getting transactions', 'PAYMENT', { error });
    throw error;
  }
}

/**
 * Get transaction by ID
 */
export async function getTransactionById(id: string): Promise<IPaymentTransaction | null> {
  try {
    return await PaymentRepository.findTransactionById(id);
  } catch (error) {
    logger.error(`Error getting transaction with ID ${id}`, 'PAYMENT', { error, id });
    throw error;
  }
}

/**
 * Get transactions for a specific user
 */
export async function getUserTransactions(
  userId: string,
  page = 1,
  limit = 20
): Promise<{ transactions: IPaymentTransaction[]; total: number }> {
  try {
    const filter = { userId };
    const skip = (page - 1) * limit;
    // Execute both queries in parallel for better performance
    const [transactions, total] = await Promise.all([
      PaymentRepository.findAllTransactions(filter, skip, limit),
      PaymentRepository.countTransactions(filter),
    ]);

    return { transactions, total };
  } catch (error) {
    logger.error(`Error getting transactions for user ${userId}`, 'PAYMENT', { error, userId });
    throw error;
  }
}

/**
 * Get transactions for a specific order
 */
export async function getOrderTransactions(orderId: string): Promise<IPaymentTransaction[]> {
  try {
    return await PaymentRepository.findTransactionsByOrderId(orderId);
  } catch (error) {
    logger.error(`Error getting transactions for order ${orderId}`, 'PAYMENT', { error, orderId });
    throw error;
  }
}

/**
 * Update transaction status with notification to user
 */
export async function updateTransactionStatus(
  id: string,
  status: IPaymentTransaction['status'],
  additionalData: Partial<IPaymentTransaction> = {}
): Promise<IPaymentTransaction | null> {
  try {
    const originalTransaction = await PaymentRepository.findTransactionById(id);
    if (!originalTransaction) {
      return null;
    }

    // Only proceed with update if status is actually changing
    if (originalTransaction.status === status) {
      return originalTransaction;
    }

    const transaction = await PaymentRepository.updateTransactionStatus(id, status, additionalData);

    // If transaction was updated successfully
    if (transaction) {
      // Get order information
      const order = await OrderRepository.findOrderById(transaction.orderId);

      // Update order status based on payment status
      if (status === 'completed' && transaction.orderId) {
        // Execute order update and product fetch in parallel
        const [, product] = await Promise.all([
          OrderRepository.updateOrderStatus(transaction.orderId, 'delivered'),
          order ? ProductRepository.findProductById(order.productId) : null,
        ]);

        // Notify user about successful payment
        if (order) {
          await notifyUserAboutPayment(transaction.userId, 'completed', {
            productName: product?.name || 'your order',
            orderId: order._id!,
            amount: transaction.amount,
            paymentMethod: transaction.paymentProvider,
          });
        }
      } else if (status === 'failed' && transaction.orderId) {
        // Execute order update and notification in parallel
        const [,] = await Promise.all([
          OrderRepository.updateOrderStatus(transaction.orderId, 'cancelled'),
          order
            ? notifyUserAboutPayment(transaction.userId, 'failed', {
                orderId: order._id!,
                amount: transaction.amount,
                paymentMethod: transaction.paymentProvider,
              })
            : Promise.resolve(),
        ]);
      }
    }

    return transaction;
  } catch (error) {
    logger.error(`Error updating transaction status ${id}`, 'PAYMENT', { error, id });
    throw error;
  }
}

/**
 * Notify user about payment status changes
 */
async function notifyUserAboutPayment(
  userId: string,
  status: 'completed' | 'failed' | 'pending',
  paymentInfo: {
    productName?: string;
    orderId: string;
    amount: number;
    paymentMethod: string;
  }
): Promise<void> {
  try {
    // Import bot here to avoid circular dependency
    const { bot } = require('../bot');

    // Create appropriate message based on status
    let message = '';
    if (status === 'completed') {
      message =
        `✅ *Payment Successful!*\n\n` +
        `Your payment of $${paymentInfo.amount} for ${paymentInfo.productName} has been received.\n\n` +
        `Order #${paymentInfo.orderId.slice(-6)} is now being processed.`;
    } else if (status === 'failed') {
      message =
        `❌ *Payment Failed*\n\n` +
        `We couldn't process your payment of $${paymentInfo.amount}.\n\n` +
        `Order #${paymentInfo.orderId.slice(-6)} has been cancelled. ` +
        `Please try again or contact support.`;
    } else {
      message =
        `⏳ *Payment Pending*\n\n` +
        `Your payment of $${paymentInfo.amount} is being processed.\n\n` +
        `We'll notify you once it's confirmed.`;
    }

    // Send notification to user
    await bot.api.sendMessage(parseInt(userId), message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error(`Failed to send payment notification to user ${userId}`, 'PAYMENT', { error, userId });
  }
}

/**
 * Check payment status (useful for API endpoints)
 */
export async function checkPaymentStatus(id: string): Promise<IPaymentTransaction | null> {
  try {
    // Get the transaction
    const transaction = await PaymentRepository.findTransactionById(id);
    if (!transaction) {
      return null;
    }

    // Placeholder for future payment provider status checks

    return transaction;
  } catch (error) {
    logger.error(`Error checking payment status for transaction ${id}`, 'PAYMENT', { error, id });
    throw error;
  }
}

/**
 * Get payment statistics
 */
export async function getPaymentStatistics(
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalPayments: number;
  totalAmount: number;
  completedPayments: number;
  completedAmount: number;
  pendingPayments: number;
  pendingAmount: number;
  failedPayments: number;
  paymentsByMethod: { [key: string]: { count: number; amount: number } };
}> {
  try {
    return await PaymentRepository.getPaymentStatistics(startDate, endDate);
  } catch (error) {
    logger.error('Error getting payment statistics', 'PAYMENT', { error });
    throw error;
  }
}

/**
 * Create a new payment transaction - Simplified
 */
export async function createTransaction(data: {
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentProvider: string;
  externalId: string;
  cryptoType?: string;
  cryptoAddress?: string;
  paymentUrl?: string;
}): Promise<IPaymentTransaction> {
  try {
    return await PaymentRepository.createTransaction({
      ...data,
      status: 'pending',
    });
  } catch (error) {
    logger.error('Error creating payment transaction', 'PAYMENT', { error });
    throw error;
  }
}

// Placeholder for future payment provider success handlers
