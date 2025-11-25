import express, { Request, Response } from 'express';
import * as PaymentController from '../controllers/PaymentController';
import { successResponse, errorResponse } from '../utils/apiValidation';
import { processPaymentWebhook } from '../bot/handlers/paymentHandlers';
import { validateNowPaymentsSignature, checkWebhookRateLimit } from '../utils/webhookSecurity';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * @swagger
 * /payments:
 *   get:
 *     tags: [Payments]
 *     summary: Get all payment transactions
 *     description: Retrieve paginated list of payment transactions with filtering
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: status
 *         in: query
 *         description: Filter by payment status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, cancelled, refunded]
 *       - name: provider
 *         in: query
 *         description: Filter by payment provider
 *         schema:
 *           type: string
 *           enum: [nowpayments, paypal, stripe]
 *       - name: userId
 *         in: query
 *         description: Filter by user ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PaymentTransaction'
 *                 total:
 *                   type: number
 *                   description: Total number of transactions
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    // Build filter from query params
    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.provider) filter.paymentProvider = req.query.provider;

    const result = await PaymentController.getAllTransactions(filter, page, limit);
    res.json(result);
  } catch (error) {
    logger.error('Error in GET /payments', 'API', { error });
    res.status(500).json({ error: 'Failed to retrieve payment transactions' });
  }
});

// Get user's transactions
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const result = await PaymentController.getUserTransactions(userId, page, limit);
    res.json(result);
  } catch (error) {
    logger.error(`Error in GET /payments/user/${req.params.userId}`, 'API', { error, userId: req.params.userId });
    res.status(500).json({ error: 'Failed to retrieve user transactions' });
  }
});

// Get transaction by ID
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const transaction = await PaymentController.getTransactionById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    logger.error(`Error in GET /payments/${req.params.id}`, 'API', { error, id: req.params.id });
    res.status(500).json({ error: 'Failed to retrieve payment transaction' });
  }
});

// Get transactions for order
router.get('/order/:orderId', async (req: Request, res: Response) => {
  try {
    const transactions = await PaymentController.getOrderTransactions(req.params.orderId);
    res.json(transactions);
  } catch (error) {
    logger.error(`Error in GET /payments/order/${req.params.orderId}`, 'API', { error, orderId: req.params.orderId });
    res.status(500).json({ error: 'Failed to retrieve order transactions' });
  }
});

// Update transaction status
router.put('/:id/status', async (req: Request, res: Response): Promise<any> => {
  try {
    const { status, ...additionalData } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updatedTransaction = await PaymentController.updateTransactionStatus(
      req.params.id,
      status,
      additionalData
    );

    if (!updatedTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(updatedTransaction);
  } catch (error) {
    logger.error(`Error in PUT /payments/${req.params.id}/status`, 'API', { error, id: req.params.id });
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

// Check payment status
router.get('/:id/check', async (req: Request, res: Response): Promise<any> => {
  try {
    const transaction = await PaymentController.checkPaymentStatus(req.params.id);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    logger.error(`Error in GET /payments/${req.params.id}/check`, 'API', { error, id: req.params.id });
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

// Get payment statistics
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const stats = await PaymentController.getPaymentStatistics(startDate, endDate);
    res.json(stats);
  } catch (error) {
    logger.error('Error in GET /payments/stats/summary', 'API', { error });
    res.status(500).json({ error: 'Failed to retrieve payment statistics' });
  }
});

/**
 * @swagger
 * /payments/webhook/nowpayments:
 *   post:
 *     tags: [Payments]
 *     summary: NOWPayments webhook endpoint
 *     description: |
 *       Secure webhook endpoint for processing NOWPayments payment status updates.
 *
 *       **Security Features:**
 *       - HMAC SHA512 signature verification in production
 *       - Rate limiting (100 requests/minute per IP)
 *       - IP whitelist validation
 *       - Request sanitization
 *
 *       **Supported Payment Statuses:**
 *       - `waiting` → `pending`
 *       - `confirming` → `pending`
 *       - `confirmed` → `completed`
 *       - `finished` → `completed`
 *       - `failed` → `failed`
 *       - `expired` → `failed`
 *       - `refunded` → `refunded`
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               payment_id:
 *                 type: string
 *                 description: NOWPayments payment ID
 *               payment_status:
 *                 type: string
 *                 description: Payment status from NOWPayments
 *               order_id:
 *                 type: string
 *                 description: Your internal order ID
 *               price_amount:
 *                 type: number
 *                 description: Original payment amount
 *               actually_paid:
 *                 type: number
 *                 description: Amount actually paid by user
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     received:
 *                       type: boolean
 *                     processed:
 *                       type: boolean
 *       401:
 *         description: Invalid signature
 *       429:
 *         description: Rate limit exceeded
 *       400:
 *         description: Webhook processing failed
 */
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    logger.info('NOWPayments webhook received', 'PAYMENT', { body: req.body });

    // Rate limiting protection
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    if (!checkWebhookRateLimit(`webhook_${clientIP}`, 100, 60000)) {
      logger.warn('Webhook rate limit exceeded for IP', 'PAYMENT', { clientIP });
      return res.status(429).json(errorResponse('Rate limit exceeded', 'RATE_LIMIT'));
    }

    // Validate webhook signature in production
    if (process.env.NODE_ENV === 'production') {
      const isValidSignature = validateNowPaymentsSignature(req);
      if (!isValidSignature) {
        logger.error('Invalid webhook signature from IP', 'PAYMENT', { clientIP });
        return res.status(401).json(errorResponse('Invalid signature', 'INVALID_SIGNATURE'));
      }
      logger.info('Webhook signature validated successfully', 'PAYMENT');
    } else {
      logger.debug('Development mode: Skipping signature validation', 'PAYMENT');
    }

    // Respond immediately to prevent timeout
    res.json({ success: true, received: true });
    
    // Process webhook asynchronously
    processPaymentWebhook('nowpayments', req.body)
      .then((processed) => {
        if (processed) {
          logger.info('NOWPayments webhook processed successfully', 'PAYMENT');
        } else {
          logger.warn('Webhook processing returned false', 'PAYMENT');
        }
      })
      .catch((error) => {
        logger.error('Error processing webhook asynchronously', 'PAYMENT', { error });
      });

    return;
    res.json(successResponse({ received: true, processed: true }));
  } catch (error) {
    logger.error('Error processing NOWPayments webhook', 'PAYMENT', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
