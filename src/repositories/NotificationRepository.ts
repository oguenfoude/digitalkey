import { ObjectId } from 'mongodb';
import { connectToDatabase, getDb } from '../database/connection';
import { INotification } from '../models/Notification';
import { logger } from '../utils/logger';

// Helper function to convert MongoDB _id to string
function mapNotification(notification: any): INotification | null {
  if (!notification) return null;
  return {
    ...notification,
    _id: notification._id?.toString(),
  };
}

export async function findNotificationById(id: string): Promise<INotification | null> {
  try {
    await connectToDatabase();
    const collection = getDb().collection('notifications');
    const objectId = new ObjectId(id);
    const notification = await collection.findOne({ _id: objectId });
    return mapNotification(notification);
  } catch (error) {
    logger.error('Error finding notification by ID', 'NOTIFICATION', { error, id });
    return null;
  }
}

export async function findAllNotifications(): Promise<INotification[]> {
  await connectToDatabase();
  const collection = getDb().collection('notifications');
  const notifications = await collection.find().toArray();
  return notifications
    .map(notification => mapNotification(notification))
    .filter((n): n is INotification => n !== null);
}

export async function createNotification(
  notificationData: Omit<INotification, '_id' | 'createdAt' | 'updatedAt'>
): Promise<INotification> {
  await connectToDatabase();
  const collection = getDb().collection('notifications');

  const now = new Date();
  const newNotification = {
    ...notificationData,
    status: notificationData.status || 'pending',
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(newNotification);
  return { ...newNotification, _id: result.insertedId.toString() };
}

export async function updateNotification(
  id: string,
  updateData: Partial<Omit<INotification, '_id' | 'createdAt'>>
): Promise<INotification | null> {
  try {
    await connectToDatabase();
    const collection = getDb().collection('notifications');
    const objectId = new ObjectId(id);

    // Always update the updatedAt timestamp
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date(),
    };

    // If status is being set to 'sent', set sentAt
    if (dataToUpdate.status === 'sent' && !dataToUpdate.sentAt) {
      dataToUpdate.sentAt = new Date();
    }

    const result = await collection.findOneAndUpdate(
      { _id: objectId },
      { $set: dataToUpdate },
      { returnDocument: 'after' }
    );

    return mapNotification(result);
  } catch (error) {
    logger.error('Error updating notification', 'NOTIFICATION', { error, id });
    return null;
  }
}

export async function findNotifications(
  filter: any = {},
  page: number = 1,
  limit: number = 20
): Promise<{ notifications: INotification[]; total: number }> {
  try {
    await connectToDatabase();
    const collection = getDb().collection('notifications');

    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);

    return {
      notifications: notifications
        .map(n => mapNotification(n))
        .filter((n): n is INotification => n !== null),
      total,
    };
  } catch (error) {
    logger.error('Error finding notifications with pagination', 'NOTIFICATION', { error });
    return { notifications: [], total: 0 };
  }
}

export async function deleteNotification(id: string): Promise<boolean> {
  try {
    await connectToDatabase();
    const collection = getDb().collection('notifications');
    const objectId = new ObjectId(id);
    const result = await collection.deleteOne({ _id: objectId });
    return result.deletedCount === 1;
  } catch (error) {
    logger.error('Error deleting notification', 'NOTIFICATION', { error, id });
    return false;
  }
}
