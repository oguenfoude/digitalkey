import express, { Request, Response } from 'express';
import * as NotificationController from '../controllers/NotificationController';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * @swagger
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get user notifications
 *     description: |
 *       Retrieve list of notifications for users.
 *
 *       **Notification Types:**
 *       - `order` - Order status updates
 *       - `payment` - Payment confirmations
 *       - `system` - System announcements
 *     parameters:
 *       - name: userId
 *         in: query
 *         description: Filter by user ID
 *         schema:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *       - name: type
 *         in: query
 *         description: Filter by notification type
 *         schema:
 *           type: string
 *           enum: [order, payment, system]
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 *             example:
 *               - _id: "507f1f77bcf86cd799439020"
 *                 userId: "507f1f77bcf86cd799439011"
 *                 type: "order"
 *                 title: "Order Delivered"
 *                 message: "Your Steam Gift Card has been delivered!"
 *                 isRead: false
 *                 createdAt: "2025-10-02T12:30:00Z"
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const notifications = await NotificationController.getAllNotifications();
    res.json(notifications);
  } catch (error) {
    console.error('Error in GET /notifications:', error);
    res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
});

/**
 * @swagger
 * /notifications/{id}:
 *   get:
 *     tags: [Notifications]
 *     summary: Get notification by ID
 *     parameters:
 *       - $ref: '#/components/parameters/ObjectIdParam'
 *     responses:
 *       200:
 *         description: Notification found
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
// Get notification by ID
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id;
    const notification = await NotificationController.getNotificationById(id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error(`Error in GET /notifications/${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve notification' });
  }
});

/**
 * @swagger
 * /notifications:
 *   post:
 *     tags: [Notifications]
 *     summary: Create a notification (admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message, audience]
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               audience:
 *                 type: string
 *                 enum: [all_users, active_users, specific_users]
 *               targetUserIds:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       201:
 *         description: Notification created
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
// Create a new notification
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { title, message, audience, targetUserIds } = req.body;

    if (!title || !message || !audience) {
      return res.status(400).json({ error: 'Missing required notification data' });
    }

    if (
      audience === 'specific_users' &&
      (!targetUserIds || !Array.isArray(targetUserIds) || targetUserIds.length === 0)
    ) {
      return res.status(400).json({ error: 'Target user IDs are required for specific users' });
    }

    // Validate that targetUserIds are numbers (Telegram IDs, not MongoDB IDs)
    if (audience === 'specific_users' && targetUserIds) {
      const invalidIds = targetUserIds.filter((id: any) => typeof id !== 'number');
      if (invalidIds.length > 0) {
        return res.status(400).json({
          error: 'Target user IDs must be Telegram IDs (numbers), not MongoDB ObjectIDs',
          invalidIds: invalidIds.slice(0, 5), // Show first 5 invalid IDs
        });
      }
    }

    const newNotification = await NotificationController.createNotification({
      title,
      message,
      audience,
      targetUserIds: audience === 'specific_users' ? targetUserIds : undefined,
    });

    res.status(201).json(newNotification);
  } catch (error) {
    console.error('Error in POST /notifications:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

/**
 * @swagger
 * /notifications/{id}:
 *   put:
 *     tags: [Notifications]
 *     summary: Update a notification
 *     parameters:
 *       - $ref: '#/components/parameters/ObjectIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, sent, failed]
 *               audience:
 *                 type: string
 *                 enum: [all, specific_users]
 *               targetUserIds:
 *                 type: array
 *                 items:
 *                   type: number
 *     responses:
 *       200:
 *         description: Notification updated
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
// Update notification
router.put('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id;
    const updateData = req.body;

    const updatedNotification = await NotificationController.updateNotification(id, updateData);

    if (!updatedNotification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(updatedNotification);
  } catch (error) {
    logger.error(`Error in PUT /notifications/${req.params.id}`, 'API', { error, id: req.params.id });
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete a notification
 *     parameters:
 *       - $ref: '#/components/parameters/ObjectIdParam'
 *     responses:
 *       204:
 *         description: Notification deleted
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
// Delete notification
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id;
    const result = await NotificationController.deleteNotification(id);

    if (!result) {
      return res.status(404).json({ error: 'Notification not found or already deleted' });
    }

    res.status(204).send();
  } catch (error) {
    console.error(`Error in DELETE /notifications/${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

/**
 * @swagger
 * /notifications/{id}/resend:
 *   post:
 *     tags: [Notifications]
 *     summary: Resend an existing notification
 *     description: |
 *       Resends a notification to the same audience it was originally sent to.
 *       This is useful if the notification failed initially or needs to be re-sent.
 *       
 *       The endpoint will:
 *       - Retrieve the original notification by ID
 *       - Send it to the same users (all users or specific users based on original audience)
 *       - Update the notification status and sentAt timestamp
 *       - Return statistics about the send operation
 *     parameters:
 *       - $ref: '#/components/parameters/ObjectIdParam'
 *     responses:
 *       200:
 *         description: Notification resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Notification sent to 25 out of 30 users"
 *                 sentCount:
 *                   type: number
 *                   description: Number of users who successfully received the notification
 *                   example: 25
 *                 totalUsers:
 *                   type: number
 *                   description: Total number of users the notification was sent to
 *                   example: 30
 *       404:
 *         description: Notification not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Notification not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to resend notification"
 */
router.post('/:id/resend', async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id;
    
    logger.info(`Resending notification ${id}`, 'API', { notificationId: id });
    
    const result = await NotificationController.resendNotification(id);

    if (!result.success && result.totalUsers === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Notification not found or no users to send to' 
      });
    }

    res.json(result);
  } catch (error) {
    logger.error(`Error in POST /notifications/${req.params.id}/resend`, 'API', { 
      error, 
      id: req.params.id 
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to resend notification';
    
    if (errorMessage.includes('not found')) {
      return res.status(404).json({ 
        success: false, 
        error: errorMessage 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

export default router;
