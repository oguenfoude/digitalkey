import { INotification } from '../models/Notification';
import { logger } from '../utils/logger';
import * as NotificationRepository from '../repositories/NotificationRepository';
import * as UserRepository from '../repositories/UserRepository';
import { bot } from '../bot';

/**
 * Get all notifications
 */
export async function getAllNotifications(): Promise<INotification[]> {
  try {
    return await NotificationRepository.findAllNotifications();
  } catch (error) {
    logger.error('Error getting notifications', 'NOTIFICATION', { error });
    throw error;
  }
}

/**
 * Get notification by ID
 */
export async function getNotificationById(id: string): Promise<INotification | null> {
  try {
    return await NotificationRepository.findNotificationById(id);
  } catch (error) {
    logger.error(`Error getting notification with ID ${id}`, 'NOTIFICATION', { error, id });
    throw error;
  }
}

/**
 * Create a new notification and send it to Telegram users
 */
export async function createNotification(data: {
  title: string;
  message: string;
  audience: 'all' | 'specific_users';
  targetUserIds?: number[];
}): Promise<INotification> {
  try {
    // Validate data
    if (
      data.audience === 'specific_users' &&
      (!data.targetUserIds || data.targetUserIds.length === 0)
    ) {
      throw new Error('Target user IDs are required for specific_users audience');
    }

    // Create notification in database with pending status
    const notification = await NotificationRepository.createNotification({
      ...data,
      status: 'pending',
    });

    // Send notification to Telegram users and update status
    const sendSuccess = await sendTelegramNotification(data);

    // Update notification status based on send result
    await NotificationRepository.updateNotification(notification._id!, {
      status: sendSuccess ? 'sent' : 'failed',
    });

    return notification;
  } catch (error) {
    logger.error('Error creating notification', 'NOTIFICATION', { error });
    throw error;
  }
}

/**
 * Send notification to Telegram users
 */
async function sendTelegramNotification(notificationData: {
  title: string;
  message: string;
  audience: 'all' | 'specific_users';
  targetUserIds?: number[];
}): Promise<boolean> {
  try {
    const { title, message, audience, targetUserIds } = notificationData;

    // Format notification message
    const formattedMessage = `
📢 *${title}*

${message}
`;

    // Determine which users should receive the notification
    let userIds: number[] = [];

    if (audience === 'all') {
      // Get all accepted users
      const users = await UserRepository.findAllAcceptedUsers();
      userIds = users.map(user => user.telegramId);
    } else if (audience === 'specific_users' && targetUserIds) {
      userIds = targetUserIds;
    }

    // Send notification to each user
    const sendPromises = userIds.map(async userId => {
      try {
        await bot.api.sendMessage(userId, formattedMessage, {
          parse_mode: 'Markdown',
        });
        return true;
      } catch (error) {
        logger.error(`Failed to send notification to user ${userId}`, 'NOTIFICATION', { error, userId });
        return false;
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r).length;

    logger.info(`Sent notification to ${successCount}/${userIds.length} users`, 'NOTIFICATION');
    return successCount > 0; // Return true if at least one succeeded
  } catch (error) {
    logger.error('Error sending Telegram notifications', 'NOTIFICATION', { error });
    return false;
  }
}

/**
 * Update notification
 */
export async function updateNotification(
  id: string,
  updateData: Partial<Omit<INotification, '_id' | 'createdAt' | 'updatedAt'>>
): Promise<INotification | null> {
  try {
    return await NotificationRepository.updateNotification(id, updateData);
  } catch (error) {
    logger.error(`Error updating notification ${id}`, 'NOTIFICATION', { error, id });
    throw error;
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(id: string): Promise<boolean> {
  try {
    return await NotificationRepository.deleteNotification(id);
  } catch (error) {
    logger.error(`Error deleting notification ${id}`, 'NOTIFICATION', { error, id });
    throw error;
  }
}

/**
 * Resend an existing notification to users
 */
export async function resendNotification(id: string): Promise<{
  success: boolean;
  message: string;
  sentCount: number;
  totalUsers: number;
}> {
  try {
    // Get the notification from database
    const notification = await NotificationRepository.findNotificationById(id);

    if (!notification) {
      throw new Error('Notification not found');
    }

    // Format notification message
    const formattedMessage = `
📢 *${notification.title}*

${notification.message}
`;

    // Determine which users should receive the notification
    let userIds: number[] = [];

    if (notification.audience === 'all') {
      // Get all accepted users
      const users = await UserRepository.findAllAcceptedUsers();
      userIds = users.map(user => user.telegramId);
    } else if (notification.audience === 'specific_users' && notification.targetUserIds) {
      userIds = notification.targetUserIds;
    }

    if (userIds.length === 0) {
      logger.warn('No users found to resend notification', 'NOTIFICATION', { notificationId: id });
      return {
        success: false,
        message: 'No users found to send notification',
        sentCount: 0,
        totalUsers: 0,
      };
    }

    // Send notification to each user
    const sendPromises = userIds.map(async userId => {
      try {
        await bot.api.sendMessage(userId, formattedMessage, {
          parse_mode: 'Markdown',
        });
        return true;
      } catch (error) {
        logger.error(`Failed to resend notification to user ${userId}`, 'NOTIFICATION', { 
          error, 
          userId, 
          notificationId: id 
        });
        return false;
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r).length;

    logger.info(`Resent notification ${id} to ${successCount}/${userIds.length} users`, 'NOTIFICATION');

    // Update notification status and sentAt timestamp
    await NotificationRepository.updateNotification(id, {
      status: successCount > 0 ? 'sent' : 'failed',
      sentAt: new Date(),
    });

    return {
      success: successCount > 0,
      message: `Notification sent to ${successCount} out of ${userIds.length} users`,
      sentCount: successCount,
      totalUsers: userIds.length,
    };
  } catch (error) {
    logger.error(`Error resending notification ${id}`, 'NOTIFICATION', { error, id });
    throw error;
  }
}
