/**
 * Database Cleanup Script
 * Removes all data from all collections
 * Run with: npx ts-node scripts/cleanDatabase.ts
 */

import { config } from 'dotenv';
import { MongoClient } from 'mongodb';

config();

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'telegram-store';

async function cleanDatabase() {
  console.log('🧹 Starting database cleanup...\n');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    
    // List of all collections to clean
    const collections = [
      'users',
      'categories',
      'products',
      'orders',
      'payment_transactions',
      'notifications',
      'sessions', // Grammy session storage
    ];
    
    console.log('📋 Collections to clean:');
    for (const collectionName of collections) {
      console.log(`   - ${collectionName}`);
    }
    console.log();
    
    // Confirm before deletion
    console.log('⚠️  WARNING: This will delete ALL data from the database!');
    console.log('⚠️  Press Ctrl+C now to cancel, or wait 3 seconds to proceed...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Delete all documents from each collection
    let totalDeleted = 0;
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const result = await collection.deleteMany({});
        console.log(`🗑️  ${collectionName}: Deleted ${result.deletedCount} documents`);
        totalDeleted += result.deletedCount;
      } catch {
        console.log(`⚠️  ${collectionName}: Collection doesn't exist or error occurred`);
      }
    }
    
    console.log(`\n✅ Cleanup complete! Total documents deleted: ${totalDeleted}`);
    console.log('💡 Database is now empty and ready for fresh data\n');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanDatabase();
