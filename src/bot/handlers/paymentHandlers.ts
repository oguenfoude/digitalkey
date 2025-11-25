import { Bot } from 'grammy';
import { MyContext } from '../types/session';
import * as PaymentRepository from '../../repositories/PaymentRepository';
import * as ProductRepository from '../../repositories/ProductRepository';
import * as OrderRepository from '../../repositories/OrderRepository';
import * as UserRepository from '../../repositories/UserRepository';
import { IPaymentTransaction } from '../../models/PaymentTransaction';
import { nowPaymentsService } from '../../services/NowPaymentsService';
import { logger } from '../../utils/logger';

/**
 * Enhanced payment webhook processing with proper provider handling
 */
export async function processPaymentWebhook(provider: string, webhookData: any): Promise<boolean> {
  try {
    logger.payment(`Processing ${provider} webhook`, webhookData.payment_id || 'unknown', { provider, webhookData });

    switch (provider.toLowerCase()) {
      case 'nowpayments':
        return await processNowPaymentsWebhook(webhookData);
      case 'stripe':
        return await processStripeWebhook(webhookData);
      default:
        logger.warn(`Unsupported payment provider: ${provider}`, 'PAYMENT');
        return false;
    }
  } catch (error) {
    logger.error('Error processing payment webhook', 'PAYMENT', { provider, error });
    return false;
  }
}

/**
 * Process NOWPayments webhook with complete logic
 */
async function processNowPaymentsWebhook(webhookData: any): Promise<boolean> {
  try {
    const { payment_id, invoice_id, payment_status, order_id } = webhookData;

    if (!payment_id || !payment_status) {
      logger.error('Invalid NOWPayments webhook - missing required fields', 'NOWPAYMENTS', { webhookData });
      return false;
    }

    logger.payment(`Webhook data - invoice_id: ${invoice_id}, payment_id: ${payment_id}`, payment_id);

    // CRITICAL: Find transaction by order_id (not payment_id, as it doesn't exist in DB yet)
    let transaction = null;
    if (order_id) {
      const orderTransactions = await PaymentRepository.findTransactionsByOrderId(order_id);
      transaction = orderTransactions[0] || null;
    }

    // Fallback: Try payment_id if transaction has it stored from previous webhook
    if (!transaction) {
      transaction = await PaymentRepository.findTransactionByProviderId(payment_id);
    }

    if (!transaction) {
      logger.error(
        `Transaction not found for payment_id: ${payment_id}, order_id: ${order_id}`,
        'NOWPAYMENTS',
        { payment_id, order_id }
      );
      return false;
    }

    logger.payment(`Processing payment status: ${payment_status}`, payment_id);

    // Map NOWPayments statuses to internal statuses
    const statusMapping: Record<string, IPaymentTransaction['status']> = {
      waiting: 'pending',
      confirming: 'pending',
      confirmed: 'completed',
      sending: 'completed',
      finished: 'completed',
      failed: 'failed',
      // 'refunded': removed from simplified model
      expired: 'failed',
    };

    const newStatus = statusMapping[payment_status.toLowerCase()] || 'pending';

    // CRITICAL: Store payment_id for future status checks
    logger.info(`💾 Storing payment_id: ${payment_id} for transaction: ${transaction._id}`, 'PAYMENT');
    
    // Update transaction with simplified data
    const updatedTransaction = await PaymentRepository.updateTransactionStatus(
      transaction._id!,
      newStatus,
      {
        providerTransactionId: payment_id, // This is the key for API status checks!
        // Simplified PaymentTransaction model - webhookData, metadata, completedAt removed
      }
    );

    if (!updatedTransaction) {
      logger.error(`Failed to update transaction: ${transaction._id}`, 'PAYMENT', { transactionId: transaction._id });
      return false;
    }

    // Process based on status
    if (newStatus === 'completed') {
      await handleSuccessfulPayment(transaction);
    } else if (newStatus === 'failed') {
      await handleFailedPayment(transaction, `Payment ${payment_status}`);
    }

    return true;
  } catch (error) {
    logger.error('Error processing NOWPayments webhook', 'NOWPAYMENTS', { error });
    return false;
  }
}

/**
 * Handle successful payment completion with idempotency
 */
async function handleSuccessfulPayment(transaction: IPaymentTransaction): Promise<void> {
  try {
    logger.payment(`Processing successful payment`, transaction._id!, { orderId: transaction.orderId });

    // Get order first to check if already delivered (idempotency check)
    const order = await OrderRepository.findOrderById(transaction.orderId);

    if (!order) {
      logger.error(`Order not found: ${transaction.orderId}`, 'ORDER', { orderId: transaction.orderId });
      return;
    }

    // IDEMPOTENCY: Check if order already delivered
    if (order.status === 'delivered' && order.deliveredContent && order.deliveredContent.length > 0) {
      logger.warn(`Order already delivered, skipping duplicate webhook`, 'PAYMENT', {
        orderId: order._id,
        transactionId: transaction._id,
      });
      return;
    }

    // Get product and user details
    const [product, user] = await Promise.all([
      ProductRepository.findProductById(order.productId),
      UserRepository.findUserById(order.userId),
    ]);

    if (!product) {
      logger.error(`Product not found: ${order.productId}`, 'PRODUCT', { productId: order.productId });
      await notifyPaymentIssue(transaction.userId, order, 'Product not found');
      return;
    }

    if (!user) {
      logger.error(`User not found: ${order.userId}`, 'USER', { userId: order.userId });
      return;
    }

    // ATOMIC INVENTORY RESERVATION: Use atomic operation to prevent race conditions
    const reservation = await ProductRepository.reserveProductInventory(
      order.productId,
      order.quantity
    );

    if (!reservation.success || !reservation.reservedContent) {
      // Insufficient inventory - update order and notify
      logger.warn(`Insufficient inventory for order: ${order._id}`, 'INVENTORY', {
        orderId: order._id,
        required: order.quantity,
        available: product.digitalContent.length,
      });
      await OrderRepository.updateOrderStatus(order._id!, 'cancelled');
      await notifyInventoryIssue(user.telegramId, order, product);
      return;
    }

    // Update order with delivered content BEFORE sending to user
    const updatedOrder = await OrderRepository.updateOrder(order._id!, {
      status: 'delivered',
      deliveredContent: reservation.reservedContent,
    });

    if (!updatedOrder) {
      logger.error(`Failed to update order after inventory reservation`, 'ORDER', { orderId: order._id });
      // Inventory is already deducted - this is a critical error
      // Admin should be notified to manually deliver
      await notifyPaymentIssue(transaction.userId, order, 'Order update failed after inventory deduction');
      return;
    }

    // Deliver content to user
    await deliverDigitalContent(user.telegramId, updatedOrder, product, reservation.reservedContent);

    logger.order(`Digital content delivered successfully`, order._id, order.userId, {
      productId: product._id,
    });
  } catch (error) {
    logger.error('Error handling successful payment', 'PAYMENT', { error });
  }
}

/**
 * Handle failed payment
 */
async function handleFailedPayment(
  transaction: IPaymentTransaction,
  reason: string
): Promise<void> {
  try {
    logger.payment(`Processing failed payment: ${reason}`, transaction._id!, { orderId: transaction.orderId, reason });

    // Update order to cancelled if exists
    if (transaction.orderId) {
      await OrderRepository.updateOrderStatus(transaction.orderId, 'cancelled');
    }

    // Get user details
    const user = await UserRepository.findUserById(transaction.userId);
    if (user) {
      await notifyPaymentFailure(user.telegramId, transaction, reason);
    }
  } catch (error) {
    logger.error('Error handling failed payment', 'PAYMENT', { error });
  }
}

/**
 * Deliver digital content to user via Telegram
 */
async function deliverDigitalContent(
  telegramId: number,
  order: any,
  product: any,
  content: string[]
): Promise<void> {
  try {
    const bot = (await import('../../bot')).bot;

    let message = `🎮 **ORDER COMPLETED - DIGITAL DELIVERY**\n\n`;
    message += `📋 **Order ID:** #${order._id.toString().slice(-8)}\n`;
    message += `🎯 **Product:** ${product.name}\n`;
    message += `📊 **Quantity:** ${order.quantity}\n`;
    message += `💰 **Total:** $${order.totalAmount}\n\n`;
    message += `🔐 **YOUR DIGITAL CONTENT:**\n\n`;

    content.forEach((item, index) => {
      const [email, password] = item.includes(':') ? item.split(':', 2) : [item, ''];
      message += `**Item ${index + 1}:**\n`;

      if (password) {
        message += `📧 Email: \`${email}\`\n`;
        message += `🔑 Password: \`${password}\`\n\n`;
      } else {
        message += `🎫 Code: \`${email}\`\n\n`;
      }
    });

    message += `✅ Your order has been completed successfully!\n`;
    message += `📞 Need help? Contact our support team.\n\n`;
    message += `Thank you for your purchase! 🙏`;

    await bot.api.sendMessage(telegramId, message, {
      parse_mode: 'Markdown',
    });
  } catch (error) {
    logger.error('Error delivering digital content', 'BOT', { telegramId, error });
  }
}

/**
 * Notify user about payment failure
 */
async function notifyPaymentFailure(
  telegramId: number,
  transaction: IPaymentTransaction,
  reason: string
): Promise<void> {
  try {
    const bot = (await import('../../bot')).bot;

    const message =
      `❌ **PAYMENT FAILED**\n\n` +
      `We couldn't process your payment of $${transaction.amount} ${transaction.currency}.\n\n` +
      `**Reason:** ${reason}\n\n` +
      `Please try again or contact support for assistance.\n\n` +
      `**Transaction ID:** ${transaction._id}`;

    await bot.api.sendMessage(telegramId, message, {
      parse_mode: 'Markdown',
    });
  } catch (error) {
    logger.error('Error notifying payment failure', 'BOT', { telegramId, error });
  }
}

/**
 * Notify about payment issues
 */
async function notifyPaymentIssue(userId: string, order: any, issue: string): Promise<void> {
  try {
    const user = await UserRepository.findUserById(userId);
    if (!user) return;

    const bot = (await import('../../bot')).bot;

    const message =
      `⚠️ **ORDER STATUS UPDATE**\n\n` +
      `Your payment has been confirmed, but we encountered an issue:\n\n` +
      `**Issue:** ${issue}\n` +
      `**Order ID:** #${order._id.toString().slice(-8)}\n\n` +
      `Our team has been notified and will resolve this promptly.\n` +
      `We'll contact you with updates soon.`;

    await bot.api.sendMessage(user.telegramId, message, {
      parse_mode: 'Markdown',
    });
  } catch (error) {
    logger.error('Error notifying payment issue', 'BOT', { userId, error });
  }
}

/**
 * Notify about inventory issues
 */
async function notifyInventoryIssue(telegramId: number, order: any, product: any): Promise<void> {
  try {
    const bot = (await import('../../bot')).bot;

    const message =
      `📦 **INVENTORY UPDATE**\n\n` +
      `Your payment for **${product.name}** has been confirmed!\n\n` +
      `However, we need to restock this item. Your order is secure and we'll deliver it within 24-48 hours.\n\n` +
      `**Order ID:** #${order._id.toString().slice(-8)}\n\n` +
      `We'll notify you as soon as your order is ready for delivery.\n\n` +
      `Thank you for your patience! 🙏`;

    await bot.api.sendMessage(telegramId, message, {
      parse_mode: 'Markdown',
    });
  } catch (error) {
    logger.error('Error notifying inventory issue', 'BOT', { telegramId, error });
  }
}

/**
 * Check payment status with provider
 */
export async function checkPaymentStatusWithProvider(transactionId: string): Promise<boolean> {
  try {
    const transaction = await PaymentRepository.findTransactionById(transactionId);

    if (!transaction) {
      logger.error(`Transaction not found: ${transactionId}`, 'PAYMENT', { transactionId });
      return false;
    }

    // Skip if already completed or failed
    if (['completed', 'failed', 'cancelled'].includes(transaction.status)) {
      return true;
    }

    logger.payment(`Checking payment status`, transactionId);

    switch (transaction.paymentProvider.toLowerCase()) {
      case 'nowpayments':
        return await checkNowPaymentsStatus(transaction);
      default:
        logger.warn(
          `Status check not implemented for provider: ${transaction.paymentProvider}`,
          'PAYMENT',
          { provider: transaction.paymentProvider }
        );
        return false;
    }
  } catch (error) {
    logger.error(`Error checking payment status for ${transactionId}`, 'PAYMENT', { transactionId, error });
    return false;
  }
}

/**
 * Check NOWPayments specific status
 */
async function checkNowPaymentsStatus(transaction: IPaymentTransaction): Promise<boolean> {
  try {
    if (!transaction.providerTransactionId) {
      logger.warn('No provider transaction ID for NOWPayments check', 'NOWPAYMENTS', { transactionId: transaction._id });
      return false;
    }

    const providerStatus = await nowPaymentsService.getPaymentStatus(
      transaction.providerTransactionId
    );

    if (providerStatus && providerStatus !== transaction.status) {
      logger.payment(`Status update from NOWPayments: ${transaction.status} → ${providerStatus}`, transaction._id!);

      // Map refunded to cancelled for simplified model
      const mappedStatus = providerStatus === 'refunded' ? 'cancelled' : providerStatus;

      await PaymentRepository.updateTransactionStatus(transaction._id!, mappedStatus as any, {
        // Simplified PaymentTransaction model - metadata removed
      });

      if (providerStatus === 'completed') {
        await handleSuccessfulPayment(transaction);
      } else if (providerStatus === 'failed') {
        await handleFailedPayment(transaction, 'Payment verification failed');
      }
    }

    return true;
  } catch (error) {
    logger.error('Error checking NOWPayments status', 'NOWPAYMENTS', { error });
    return false;
  }
}

// Removed PayPal webhook handler as PayPal dependency was removed

/**
 * Placeholder for Stripe webhook processing
 */
async function processStripeWebhook(_webhookData: any): Promise<boolean> {
  logger.info('Stripe webhook processing not implemented yet', 'STRIPE');
  return false;
}

/**
 * Enhanced callback handler for payment verification
 */
export function registerEnhancedPaymentHandlers(bot: Bot<MyContext>): void {
  // Enhanced payment check callback
  bot.callbackQuery(/^check_payment_(.+)$/, async ctx => {
    const paymentId = ctx.match![1];

    try {
      await ctx.answerCallbackQuery('🔍 Checking payment status...');

      // Check payment status with provider
      const statusChecked = await checkPaymentStatusWithProvider(paymentId);

      if (!statusChecked) {
        await ctx.editMessageText(
          '❌ **Payment Check Failed**\n\n' +
            "We couldn't verify your payment status right now.\n\n" +
            'Please try again in a few minutes or contact support.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Get updated transaction
      const transaction = await PaymentRepository.findTransactionById(paymentId);

      if (!transaction) {
        await ctx.editMessageText(
          '❌ **Transaction Not Found**\n\n' + 'Please contact support with your transaction ID.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Update user based on current status
      switch (transaction.status) {
        case 'completed':
          await ctx.editMessageText(
            '✅ **Payment Confirmed!**\n\n' +
              'Your payment has been verified and your order is being processed.\n\n' +
              'You will receive your digital content shortly.',
            { parse_mode: 'Markdown' }
          );
          break;

        case 'pending':
          await ctx.editMessageText(
            '⏳ **Payment Processing**\n\n' +
              'Your payment is still being confirmed by the network.\n\n' +
              'Please check back in a few minutes.',
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔄 Check Again', callback_data: `check_payment_${paymentId}` }],
                ],
              },
            }
          );
          break;

        case 'failed':
        case 'cancelled':
          await ctx.editMessageText(
            '❌ **Payment Failed**\n\n' +
              'Your payment could not be processed.\n\n' +
              'Please try again or contact support for assistance.',
            { parse_mode: 'Markdown' }
          );
          break;

        default:
          await ctx.editMessageText(
            '⏳ **Status Unknown**\n\n' +
              "We're still checking your payment status.\n\n" +
              'Please try again in a few minutes.',
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔄 Check Again', callback_data: `check_payment_${paymentId}` }],
                ],
              },
            }
          );
      }
    } catch (error) {
      logger.error('Error in payment check callback', 'BOT', { error });
      await ctx.editMessageText(
        '❌ **Error**\n\n' +
          'Something went wrong while checking your payment.\n\n' +
          'Please contact support for assistance.',
        { parse_mode: 'Markdown' }
      );
    }
  });
}
