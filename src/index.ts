import { startBot } from './bot';
import { startServer } from './server';
import { config } from 'dotenv';
import { connectToDatabase, closeDatabase } from './database/connection';
import { initializeDatabase } from './database/optimization';
import { logger } from './utils/logger';
import * as OrderRepository from './repositories/OrderRepository';
import * as PaymentRepository from './repositories/PaymentRepository';

// Load environment variables
config();

// Payment timeout checker interval
let timeoutCheckInterval: NodeJS.Timeout | null = null;

// Main application startup with proper sequence
async function main(): Promise<void> {
  try {
    // First connect to database
    logger.info('Connecting to MongoDB...', 'STARTUP');
    await connectToDatabase();
    logger.info('Database connected successfully', 'STARTUP');

    // Initialize database optimizations (indexes, etc.)
    logger.info('Optimizing database performance...', 'STARTUP');
    await initializeDatabase();
    logger.info('Database optimizations applied', 'STARTUP');

    // Then start the Express server
    logger.info('Starting Express server...', 'STARTUP');
    await startServer();
    logger.info('Express server started successfully', 'STARTUP');

    // Finally start the Telegram bot
    logger.info('Starting Telegram bot...', 'STARTUP');
    await startBot();
    logger.info('Telegram bot started successfully', 'STARTUP');

    logger.info('All systems are operational!', 'STARTUP');

    // Start payment timeout checker (runs every 5 minutes)
    startPaymentTimeoutChecker();

    // Setup graceful shutdown
    setupShutdownHandlers();
  } catch (error) {
    logger.error('Failed to start application', 'STARTUP', { error });
    await cleanup();
    process.exit(1);
  }
}

// Cleanup function to close resources
async function cleanup(): Promise<void> {
  logger.info('Cleaning up resources...', 'SHUTDOWN');
  try {
    // Stop timeout checker
    if (timeoutCheckInterval) {
      clearInterval(timeoutCheckInterval);
      timeoutCheckInterval = null;
      logger.info('Payment timeout checker stopped', 'SHUTDOWN');
    }

    await closeDatabase();
    logger.info('Database connection closed', 'SHUTDOWN');
  } catch (error) {
    logger.error('Error during cleanup', 'SHUTDOWN', { error });
  }
}

/**
 * Start payment timeout checker - runs every 5 minutes
 * Auto-cancels orders that have been pending for more than 30 minutes
 */
function startPaymentTimeoutChecker(): void {
  logger.info('Starting payment timeout checker...', 'STARTUP');

  // Run immediately on startup
  checkAndCancelTimedOutOrders();

  // Then run every 5 minutes
  timeoutCheckInterval = setInterval(
    () => {
      checkAndCancelTimedOutOrders();
    },
    5 * 60 * 1000
  ); // 5 minutes

  logger.info('Payment timeout checker started (runs every 5 minutes)', 'STARTUP');
}

/**
 * Check for timed out orders and cancel them
 */
async function checkAndCancelTimedOutOrders(): Promise<void> {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Find all pending orders older than 30 minutes
    const result = await OrderRepository.findOrders(
      {
        status: 'pending',
        createdAt: { $lt: thirtyMinutesAgo },
      },
      1,
      100 // Check up to 100 orders at a time
    );

    if (result.orders.length === 0) {
      logger.debug('No timed out orders found', 'TIMEOUT_CHECKER');
      return;
    }

    logger.info(`Found ${result.orders.length} timed out orders`, 'TIMEOUT_CHECKER');

    // Cancel each timed out order
    for (const order of result.orders) {
      try {
        // Update order status to cancelled
        await OrderRepository.updateOrderStatus(order._id!, 'cancelled');

        // Cancel associated payment transactions
        const transactions = await PaymentRepository.findTransactionsByOrderId(order._id!);
        for (const tx of transactions) {
          if (tx.status === 'pending') {
            await PaymentRepository.updateTransactionStatus(tx._id!, 'cancelled', {});
          }
        }

        logger.info(`Auto-cancelled timed out order`, 'TIMEOUT_CHECKER', {
          orderId: order._id,
          userId: order.userId,
          productId: order.productId,
          age: Math.floor((Date.now() - order.createdAt.getTime()) / 60000) + ' minutes',
        });
      } catch (error) {
        logger.error(`Failed to cancel timed out order ${order._id}`, 'TIMEOUT_CHECKER', {
          error,
          orderId: order._id,
        });
      }
    }

    logger.info(`Successfully cancelled ${result.orders.length} timed out orders`, 'TIMEOUT_CHECKER');
  } catch (error) {
    logger.error('Error in payment timeout checker', 'TIMEOUT_CHECKER', { error });
  }
}

// Handle graceful shutdown
function setupShutdownHandlers(): void {
  // Handle SIGTERM (Docker, Kubernetes, etc.)
  process.on('SIGTERM', async () => {
    logger.warn('SIGTERM signal received. Shutting down gracefully...', 'SHUTDOWN');
    await cleanup();
    process.exit(0);
  });

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    logger.warn('SIGINT signal received. Shutting down gracefully...', 'SHUTDOWN');
    await cleanup();
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async error => {
    logger.error('Uncaught exception', 'SHUTDOWN', { error });
    await cleanup();
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async reason => {
    logger.error('Unhandled promise rejection', 'SHUTDOWN', { reason });
    await cleanup();
    process.exit(1);
  });
}

// Run the application
main();
