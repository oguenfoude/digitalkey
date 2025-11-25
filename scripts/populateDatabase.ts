/**
 * Database Population Script
 * Fills database with realistic test data:
 * - 4 Categories
 * - 20 Products (5 per category)
 * 
 * Run with: npx ts-node scripts/populateDatabase.ts
 */

import { config } from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

config();

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'telegram-store';

interface Category {
  _id?: ObjectId;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Product {
  _id?: ObjectId;
  name: string;
  description: string;
  price: number;
  categoryId: ObjectId;
  isAvailable: boolean;
  digitalContent: string[];
  createdAt: Date;
  updatedAt: Date;
}

async function populateDatabase() {
  console.log('🌱 Starting database population...\n');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    
    // ======================
    // 1. CREATE CATEGORIES
    // ======================
    console.log('📦 Creating categories...');
    
    const categories: Category[] = [
      {
        name: '🎮 Gaming Gift Cards',
        description: 'Steam, PlayStation, Xbox, Nintendo gift cards and game codes',
        sortOrder: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: '🎬 Streaming Services',
        description: 'Netflix, Spotify, Disney+, HBO Max subscriptions',
        sortOrder: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: '💻 Software & Tools',
        description: 'Microsoft Office, Adobe, VPN services, antivirus',
        sortOrder: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: '💰 Crypto & Digital Assets',
        description: 'Cryptocurrency vouchers and digital wallet top-ups',
        sortOrder: 4,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    const categoriesCollection = db.collection('categories');
    const categoryResult = await categoriesCollection.insertMany(categories);
    console.log(`   ✅ Created ${Object.keys(categoryResult.insertedIds).length} categories\n`);
    
    // Get inserted category IDs
    const insertedCategories = await categoriesCollection.find({}).toArray();
    
    // ======================
    // 2. CREATE PRODUCTS
    // ======================
    console.log('🎁 Creating products...');
    
    const products: Product[] = [];
    
    // Category 1: Gaming (5 products)
    const gamingCat = insertedCategories.find(c => c.name.includes('Gaming'))!;
    products.push(
      {
        name: 'Steam Gift Card $25',
        description: 'Add $25 to your Steam Wallet instantly. Works worldwide. Digital delivery within minutes.',
        price: 24.99,
        categoryId: gamingCat._id,
        isAvailable: true,
        digitalContent: [
          'STEAM-25USD-XKJH2-9P7MC-QW8N4',
          'STEAM-25USD-7PL5K-3M9VB-N2WX6',
          'STEAM-25USD-4R8JT-6KQMZ-5PNVC',
          'STEAM-25USD-9VW3H-2XBPL-7KRMJ',
          'STEAM-25USD-1MNVC-8QHJP-4XBKR',
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'PlayStation Plus 12 Months',
        description: 'Full year PS Plus membership. Monthly games, online multiplayer, exclusive discounts.',
        price: 59.99,
        categoryId: gamingCat._id,
        isAvailable: true,
        digitalContent: [
          'PSPLUS-12M-KHJP-2MNV-BC8X-WQ7R',
          'PSPLUS-12M-9PL3-VMKJ-4XBN-2RWQ',
          'PSPLUS-12M-7QW5-NPJK-8MXV-3HBR',
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Xbox Game Pass Ultimate 3 Months',
        description: 'Access to 100+ games, Xbox Live Gold, EA Play included. PC and console.',
        price: 44.99,
        categoryId: gamingCat._id,
        isAvailable: true,
        digitalContent: [
          'XGPU-3M-VW7K-PJHN-2MQX-9R4L',
          'XGPU-3M-3QJ8-MVBP-7WRN-K5HX',
          'XGPU-3M-2NPK-8MXV-QJBR-4WH7',
          'XGPU-3M-9BVK-4PQJ-XMNR-7W2H',
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Nintendo eShop $50',
        description: 'Nintendo Switch eShop gift card. Buy games, DLC, and more. Valid for all regions.',
        price: 49.99,
        categoryId: gamingCat._id,
        isAvailable: true,
        digitalContent: [
          'NINTENDO-50-PKJH-8VWN-2QMX-BR47',
          'NINTENDO-50-3MVN-PQKJ-9XBW-7R2H',
          'NINTENDO-50-7WQK-NMVB-4PJX-8R3H',
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Roblox Gift Card $25',
        description: 'Get Robux or premium membership. Perfect for Roblox players of all ages.',
        price: 24.99,
        categoryId: gamingCat._id,
        isAvailable: true,
        digitalContent: [
          'ROBLOX-25-WQMK-7PNV-3JXB-R8H2',
          'ROBLOX-25-4NPK-9MXV-QJBW-7R3H',
          'ROBLOX-25-8VWP-2KJN-MQXB-R4H7',
          'ROBLOX-25-3QJM-7PVN-KXBW-9R2H',
          'ROBLOX-25-9NVK-4PMX-QJBR-8W3H',
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );
    
    // Category 2: Streaming (5 products)
    const streamingCat = insertedCategories.find(c => c.name.includes('Streaming'))!;
    products.push(
      {
        name: 'Netflix Premium 1 Month',
        description: '4K + HDR streaming. 4 screens simultaneously. No ads. Cancel anytime.',
        price: 19.99,
        categoryId: streamingCat._id,
        isAvailable: true,
        digitalContent: [
          'NETFLIX-PREM-1M-KJHP-2VWN-MQX8',
          'NETFLIX-PREM-1M-9PVK-7MXN-BQW3',
          'NETFLIX-PREM-1M-4NMK-8PVX-QJW7',
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Spotify Premium 3 Months',
        description: 'Ad-free music, offline downloads, unlimited skips. 90 million songs.',
        price: 29.99,
        categoryId: streamingCat._id,
        isAvailable: true,
        digitalContent: [
          'SPOTIFY-3M-WPMK-7NVX-QJBR-3H8',
          'SPOTIFY-3M-2QNK-9MVX-PJBW-7R4',
          'SPOTIFY-3M-8VPK-3NMX-QJBR-9W2',
          'SPOTIFY-3M-4MNK-7PVX-QJBW-8R3',
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Disney+ Annual Subscription',
        description: 'Full year of Disney, Pixar, Marvel, Star Wars. All devices. Download offline.',
        price: 79.99,
        categoryId: streamingCat._id,
        isAvailable: true,
        digitalContent: [
          'DISNEY-12M-PKJH-8VWN-2MQX-BR7',
          'DISNEY-12M-3NVK-PMXJ-9QBW-7R2',
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'YouTube Premium 1 Month',
        description: 'Ad-free videos, background play, YouTube Music included. Works on all devices.',
        price: 11.99,
        categoryId: streamingCat._id,
        isAvailable: true,
        digitalContent: [
          'YTPREM-1M-WQMK-7PNV-3JXB-R8H',
          'YTPREM-1M-4NPK-9MXV-QJBW-7R3',
          'YTPREM-1M-8VWP-2KJN-MQXB-R4H',
          'YTPREM-1M-3QJM-7PVN-KXBW-9R2',
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'HBO Max 6 Months',
        description: 'Unlimited streaming of HBO originals, movies, series. 4K Ultra HD. Ad-free.',
        price: 69.99,
        categoryId: streamingCat._id,
        isAvailable: true,
        digitalContent: [
          'HBOMAX-6M-NVKP-8MXJ-QBWR-7H3',
          'HBOMAX-6M-2QJK-9PVX-MNBW-4R8',
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );
    
    // Category 3: Software (5 products)
    const softwareCat = insertedCategories.find(c => c.name.includes('Software'))!;
    products.push(
      {
        name: 'Microsoft Office 365 Personal 1 Year',
        description: 'Word, Excel, PowerPoint, Outlook, OneDrive 1TB. PC, Mac, tablet, phone support.',
        price: 69.99,
        categoryId: softwareCat._id,
        isAvailable: true,
        digitalContent: [
          'MSOFFICE-12M-PKJH-8VWN-2MQX-BR-YTGFR-4D3WS',
          'MSOFFICE-12M-3NVK-PMXJ-9QBW-7R-HBVGF-8K2JM',
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'NordVPN 1 Year Subscription',
        description: 'Secure VPN for 6 devices. 5000+ servers worldwide. No logs. 30-day guarantee.',
        price: 89.99,
        categoryId: softwareCat._id,
        isAvailable: true,
        digitalContent: [
          'NORDVPN-12M-WQMK-7PNV-3JXB-R8H-PLKJH-9M4N',
          'NORDVPN-12M-4NPK-9MXV-QJBW-7R3-VBNMK-2P8Q',
          'NORDVPN-12M-8VWP-2KJN-MQXB-R4H-ZXCVB-7K3M',
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Adobe Creative Cloud 1 Month',
        description: 'Photoshop, Illustrator, Premiere Pro, 20+ apps. 100GB cloud storage.',
        price: 54.99,
        categoryId: softwareCat._id,
        isAvailable: true,
        digitalContent: [
          'ADOBE-CC-1M-NVKP-8MXJ-QBWR-7H3-PLMK-9V4N',
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Bitdefender Total Security 1 Year',
        description: 'Complete antivirus protection. 5 devices. VPN included. Anti-ransomware.',
        price: 39.99,
        categoryId: softwareCat._id,
        isAvailable: true,
        digitalContent: [
          'BITDEF-12M-QJKP-9MVX-NBWR-8H3-ZXCV-4K2M',
          'BITDEF-12M-3PNK-8VXM-QJBR-7W2-LKJH-9M4N',
          'BITDEF-12M-7WQK-NMVB-4PJX-8R3-PLMN-3V7K',
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Canva Pro 3 Months',
        description: 'Professional design tools. 100M+ stock photos, templates. Remove backgrounds.',
        price: 35.99,
        categoryId: softwareCat._id,
        isAvailable: true,
        digitalContent: [
          'CANVA-3M-WPMK-7NVX-QJBR-3H8-MNBV-2K4P',
          'CANVA-3M-2QNK-9MVX-PJBW-7R4-VCXZ-8M3J',
          'CANVA-3M-8VPK-3NMX-QJBR-9W2-LKJH-4P7N',
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );
    
    // Category 4: Crypto (5 products)
    const cryptoCat = insertedCategories.find(c => c.name.includes('Crypto'))!;
    products.push(
      {
        name: 'Bitcoin Voucher $100',
        description: 'Redeem for BTC instantly. No KYC required. Secure and anonymous purchase.',
        price: 99.99,
        categoryId: cryptoCat._id,
        isAvailable: true,
        digitalContent: [
          'BTC-100-PKJH-8VWN-2MQX-BR7-YTGF-4D3W-QPLM-9K2J',
          'BTC-100-3NVK-PMXJ-9QBW-7R2-HBVG-8K2J-ZXCV-4M7N',
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Binance Gift Card $50',
        description: 'Add $50 to Binance account. Trade 350+ cryptocurrencies. Instant delivery.',
        price: 49.99,
        categoryId: cryptoCat._id,
        isAvailable: true,
        digitalContent: [
          'BINANCE-50-WQMK-7PNV-3JXB-R8H-PLKJ-9M4N-VBNM-2P8Q',
          'BINANCE-50-4NPK-9MXV-QJBW-7R3-VBNM-2P8Q-ZXCV-7K3M',
          'BINANCE-50-8VWP-2KJN-MQXB-R4H-ZXCV-7K3M-PLMK-9V4N',
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Ethereum Voucher $200',
        description: 'Redeem for ETH. Fast blockchain transfer. Perfect for DeFi and NFTs.',
        price: 199.99,
        categoryId: cryptoCat._id,
        isAvailable: true,
        digitalContent: [
          'ETH-200-NVKP-8MXJ-QBWR-7H3-PLMK-9V4N-QJKP-4K2M',
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'USDT Tether Voucher $100',
        description: 'Stablecoin voucher. 1:1 USD value. ERC-20 or TRC-20 networks available.',
        price: 100.00,
        categoryId: cryptoCat._id,
        isAvailable: true,
        digitalContent: [
          'USDT-100-QJKP-9MVX-NBWR-8H3-ZXCV-4K2M-LKJH-9M4N',
          'USDT-100-3PNK-8VXM-QJBR-7W2-LKJH-9M4N-PLMN-3V7K',
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Coinbase Gift Card $75',
        description: 'Add funds to Coinbase wallet. Buy, sell, send crypto. Beginner-friendly.',
        price: 74.99,
        categoryId: cryptoCat._id,
        isAvailable: true,
        digitalContent: [
          'COINBASE-75-WPMK-7NVX-QJBR-3H8-MNBV-2K4P-VCXZ-8M3J',
          'COINBASE-75-2QNK-9MVX-PJBW-7R4-VCXZ-8M3J-LKJH-4P7N',
          'COINBASE-75-8VPK-3NMX-QJBR-9W2-LKJH-4P7N-MNBV-2K4P',
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );
    
    const productsCollection = db.collection('products');
    const productResult = await productsCollection.insertMany(products);
    console.log(`   ✅ Created ${Object.keys(productResult.insertedIds).length} products\n`);
    
    // Display summary
    console.log('📊 Database Population Summary:');
    console.log(`   🎮 Gaming: 5 products`);
    console.log(`   🎬 Streaming: 5 products`);
    console.log(`   💻 Software: 5 products`);
    console.log(`   💰 Crypto: 5 products`);
    console.log(`   ━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   📦 Total: 4 categories, 20 products`);
    console.log();
    
    console.log('✅ Database population complete!');
    console.log('💡 You can now test the bot and API endpoints\n');
    
  } catch (error) {
    console.error('❌ Error during population:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the population
populateDatabase();
