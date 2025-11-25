import { bot } from '../../bot';
import { getNotificationRecipients } from '../../utils/adminUtils';
import { logger } from '../../utils/logger';

/**
 * Service to send notifications to admin about important events
 */
export class NotificationService {
  // Get all admin IDs for notifications
  private static get adminIds(): number[] {
    return getNotificationRecipients();
  }

  /**
   * Send a notification about a new order
   */
  public static async sendOrderNotification(orderData: {
    orderId: string;
    userId: string;
    username?: string;
    productName: string;
    quantity: number;
    price: number;
    totalAmount: number;
    paymentMethod?: string;
    digitalContent?: string[]; // Added digital content
    inventoryBefore?: number;
    inventoryAfter?: number;
  }): Promise<void> {
    if (this.adminIds.length === 0) return;

    try {
      let message = `
🛍️ *NEW ORDER RECEIVED*

*Order ID:* #${orderData.orderId.slice(-6)}
*User:* ${orderData.username || orderData.userId} (ID: ${orderData.userId})
*Product:* ${orderData.productName}
*Quantity:* ${orderData.quantity}
*Price:* $${orderData.price}
*Total:* $${orderData.totalAmount}
*Payment:* ${orderData.paymentMethod || 'Direct Purchase'}
*Time:* ${new Date().toLocaleString()}
`;

      // Add inventory information if available
      if (orderData.inventoryBefore !== undefined && orderData.inventoryAfter !== undefined) {
        message += `
📦 *Inventory Status:*
• Previous Stock: ${orderData.inventoryBefore}
• Current Stock: ${orderData.inventoryAfter}
• Remaining Items: ${orderData.inventoryAfter}
`;
      }

      // Add digital content details if available
      if (orderData.digitalContent && orderData.digitalContent.length > 0) {
        message += `\n*Delivered Digital Content:*\n`;

        orderData.digitalContent.forEach((item, index) => {
          try {
            // Format as email:password
            const [email, password] = item.split(':');
            message += `${index + 1}. \`${email}:${password}\`\n`;
          } catch {
            // Fallback if formatting fails
            message += `${index + 1}. \`${item}\`\n`;
          }
        });
      }

      // Send to all admins
      for (const adminId of this.adminIds) {
        try {
          await bot.api.sendMessage(adminId, message, {
            parse_mode: 'Markdown',
          });
        } catch (error) {
          logger.error(`Failed to send order notification to admin ${adminId}`, 'NOTIFICATION', { error, adminId });
        }
      }
    } catch (error) {
      logger.error('Failed to send order notification', 'NOTIFICATION', { error });
    }
  }

  // Preorder functionality removed - not supported anymore

  /**
   * Send a notification about payment confirmation
   */
  public static async sendPaymentConfirmationNotification(paymentData: {
    orderId: string;
    userId: string;
    username?: string;
    amount: number;
    paymentMethod: string;
  }): Promise<void> {
    if (this.adminIds.length === 0) return;

    try {
      const message = `
💰 *PAYMENT CONFIRMATION*

*Order ID:* #${paymentData.orderId.slice(-6)}
*User:* ${paymentData.username || paymentData.userId}
*Amount:* $${paymentData.amount}
*Method:* ${paymentData.paymentMethod}
*Time:* ${new Date().toLocaleString()}
`;

      // Send to all admins
      for (const adminId of this.adminIds) {
        try {
          await bot.api.sendMessage(adminId, message, {
            parse_mode: 'Markdown',
          });
        } catch (error) {
          logger.error(
            `Failed to send payment confirmation notification to admin ${adminId}`,
            'NOTIFICATION',
            { error, adminId }
          );
        }
      }
    } catch (error) {
      logger.error('Failed to send payment confirmation notification', 'NOTIFICATION', { error });
    }
  }

  /**
   * Send a notification about new user registration with approval buttons
   */
  public static async sendUserRegistrationNotification(userData: {
    userId: number;
    username?: string;
  }): Promise<void> {
    if (this.adminIds.length === 0) return;

    try {
      const message = `
👤 *NEW USER REGISTRATION*

*User ID:* ${userData.userId}
*Username:* ${userData.username || 'Not set'}
*Time:* ${new Date().toLocaleString()}

This user is pending approval. Use the buttons below to approve or decline.
`;

      // Create inline keyboard with approve/decline buttons
      const inlineKeyboard = {
        inline_keyboard: [
          [
            {
              text: '✅ Approve',
              callback_data: `approve_user_${userData.userId}`,
            },
            {
              text: '❌ Decline',
              callback_data: `decline_user_${userData.userId}`,
            },
          ],
        ],
      };

      // Send to all admins
      for (const adminId of this.adminIds) {
        try {
          await bot.api.sendMessage(adminId, message, {
            parse_mode: 'Markdown',
            reply_markup: inlineKeyboard,
          });
        } catch (error) {
          logger.error(
            `Failed to send user registration notification to admin ${adminId}`,
            'NOTIFICATION',
            { error, adminId }
          );
        }
      }
    } catch (error) {
      logger.error('Failed to send user registration notification', 'NOTIFICATION', { error });
    }
  }

  /**
   * Send a general notification to admin
   */
  public static async sendAdminNotification(message: string): Promise<void> {
    if (this.adminIds.length === 0) return;

    // Send to all admins
    for (const adminId of this.adminIds) {
      try {
        await bot.api.sendMessage(adminId, message, {
          parse_mode: 'Markdown',
        });
      } catch (error) {
        logger.error(`Failed to send admin notification to ${adminId}`, 'NOTIFICATION', { error, adminId });
      }
    }
  }

  /**
   * Send a notification to a user when their preorder is fulfilled
   */
  public static async sendPreorderCompletionNotification(
    userId: number,
    data: {
      orderId: string;
      productName: string;
      digitalContent: string[];
      inventoryBefore?: number;
      inventoryAfter?: number;
    }
  ): Promise<void> {
    try {
      // إرسال رسالة واحدة
      let message = `
🎮 *YOUR PRE-ORDER IS READY!*

*Order ID:* #${data.orderId.slice(-6)}
*Product:* ${data.productName}

`;

      message += `
🔐 *YOUR DIGITAL PRODUCT DETAILS*

Here are your login details for ${data.productName}:

`;

      // إضافة كل عنصر من عناصر المحتوى الرقمي
      data.digitalContent.forEach((item, index) => {
        try {
          // محاولة تقسيم البيانات إلى صيغة بريد إلكتروني:كلمة مرور
          const [email, password] = item.split(':');
          message += `*Item ${index + 1}:*\n`;
          message += `Email: \`${email}\`\n`;
          message += `Password: \`${password}\`\n\n`;
        } catch {
          // Use fallback format if split fails
          message += `*Item ${index + 1}:* \`${item}\`\n\n`;
        }
      });

      await bot.api.sendMessage(userId, message, {
        parse_mode: 'Markdown',
      });
    } catch (error) {
      logger.error(`Failed to send preorder completion notification to user ${userId}`, 'NOTIFICATION', { error, userId });
    }

    // Notify admin about preorder completion with details
    try {
      if (this.adminIds.length > 0) {
        let adminMessage = `
✅ *PREORDER FULFILLED*

*Order ID:* #${data.orderId.slice(-6)}
*User:* ${userId}
*Product:* ${data.productName}
*Time:* ${new Date().toLocaleString()}
`;

        // Add inventory information if available
        if (data.inventoryBefore !== undefined && data.inventoryAfter !== undefined) {
          adminMessage += `
📦 *Inventory Status:*
• Previous Stock: ${data.inventoryBefore}
• Current Stock: ${data.inventoryAfter}
• Remaining Items: ${data.inventoryAfter}
`;
        }

        adminMessage += `\n*Digital Content Delivered:*\n`;

        data.digitalContent.forEach((item, index) => {
          try {
            const [email, password] = item.split(':');
            adminMessage += `${index + 1}. \`${email}:${password}\`\n`;
          } catch {
            adminMessage += `${index + 1}. \`${item}\`\n`;
          }
        });

        // Send to all admins
        for (const adminId of this.adminIds) {
          try {
            await bot.api.sendMessage(adminId, adminMessage, {
              parse_mode: 'Markdown',
            });
          } catch (error) {
            logger.error(
              `Failed to send admin notification about preorder completion to ${adminId}`,
              'NOTIFICATION',
              { error, adminId }
            );
          }
        }
      }
    } catch (error) {
      logger.error('Failed to send admin notification about preorder completion', 'NOTIFICATION', { error });
    }
  }
}
