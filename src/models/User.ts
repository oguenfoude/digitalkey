/**
 * User model for MongoDB - Simplified Basic Data
 */
interface IUser {
  _id?: string; // MongoDB document ID
  telegramId: number; // Telegram user ID
  username?: string; // Optional Telegram username
  createdAt: Date; // Account creation timestamp
  updatedAt: Date; // Last update timestamp
}

export { IUser };
