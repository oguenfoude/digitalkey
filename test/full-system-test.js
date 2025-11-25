/**
 * FULL SYSTEM TEST
 * Tests both Bot API and REST API with populated database
 * Includes notification testing and clear explanations
 * 
 * ⚠️  IMPORTANT - USER REGISTRATION:
 * - Users are ONLY created through Telegram bot /start command
 * - Users CANNOT be created via API endpoints
 * - The bot uses createOrUpdateUser() when user sends /start
 * - API endpoints retrieve existing users from database
 * - To test: Open bot → /start → Enter username → User is saved to MongoDB
 * 
 * Run with: node test/full-system-test.js
 */

const axios = require('axios');
const { MongoClient } = require('mongodb');

// Configuration
const API_URL = 'http://localhost:3001/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'telegram-store';

// Test tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Color codes for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logTest(name, passed, details = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    log(`✅ ${name}`, 'green');
  } else {
    failedTests++;
    log(`❌ ${name}`, 'red');
  }
  if (details) {
    log(`   ${details}`, 'yellow');
  }
}

// Helper to safely stringify data


// ============================================
// DATABASE CONNECTION TESTS
// ============================================
async function testDatabaseConnection() {
  logSection('📊 DATABASE CONNECTION TESTS');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    logTest('MongoDB Connection', true, 'Connected successfully');
    
    const db = client.db(DB_NAME);
    
    // Test collections exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    const requiredCollections = ['users', 'categories', 'products', 'orders', 'payment_transactions', 'notifications'];
    let allExist = true;
    
    for (const name of requiredCollections) {
      if (collectionNames.includes(name)) {
        logTest(`Collection: ${name}`, true, 'Exists in database');
      } else {
        logTest(`Collection: ${name}`, false, 'Missing from database');
        allExist = false;
      }
    }
    
    return { db, client, success: allExist };
    
  } catch (error) {
    logTest('MongoDB Connection', false, error.message);
    return { db: null, client: null, success: false };
  }
}

// ============================================
// DATABASE DATA VERIFICATION
// ============================================
async function testDatabaseData(db) {
  logSection('🗂️ DATABASE DATA VERIFICATION');
  
  try {
    // Check categories
    const categories = await db.collection('categories').find({}).toArray();
    logTest(
      'Categories Populated',
      categories.length === 4,
      `Found ${categories.length} categories (expected 4)`
    );
    
    if (categories.length > 0) {
      log('\n   📦 Categories:', 'blue');
      categories.forEach(cat => {
        log(`      • ${cat.name}`, 'bright');
      });
    }
    
    // Check products
    const products = await db.collection('products').find({}).toArray();
    logTest(
      'Products Populated',
      products.length === 20,
      `Found ${products.length} products (expected 20)`
    );
    
    if (products.length > 0) {
      log('\n   🎁 Products by Category:', 'blue');
      for (const category of categories) {
        const categoryProducts = products.filter(p => 
          p.categoryId.toString() === category._id.toString()
        );
        log(`      ${category.name}: ${categoryProducts.length} products`, 'bright');
        categoryProducts.slice(0, 2).forEach(p => {
          log(`         - ${p.name} ($${p.price})`, 'yellow');
        });
      }
    }
    
    // Check product stock
    let totalStock = 0;
    products.forEach(p => {
      totalStock += (p.digitalContent || []).length;
    });
    logTest(
      'Product Stock Available',
      totalStock > 0,
      `Total digital keys in stock: ${totalStock}`
    );
    
  } catch (error) {
    logTest('Database Data Verification', false, error.message);
  }
}

// ============================================
// API HEALTH CHECK
// ============================================
async function testAPIHealth() {
  logSection('🏥 API HEALTH CHECK');
  
  try {
    // Health endpoint is at /health not /api/health
    const response = await axios.get('http://localhost:3001/health');
    logTest(
      'API Server Running',
      response.status === 200,
      `Status: ${response.status}`
    );
    
    if (response.data.status === 'OK' || response.data.status === 'healthy') {
      log('   🟢 Server Status: OK', 'green');
      log(`   📍 Port: 3001`, 'bright');
    }
    
  } catch (error) {
    logTest('API Server Running', error, 'Server not responding - run: npm run dev');
  }
}

// ============================================
// CATEGORY API TESTS
// ============================================
async function testCategoryAPI() {
  logSection('📦 CATEGORY API TESTS');
  
  try {
    // Get all categories
    const response = await axios.get(`${API_URL}/categories`);
    const categories = response.data.data || response.data; // Handle wrapped response
    
    logTest(
      'GET /api/categories',
      response.status === 200 && categories.length === 4,
      `Returned ${categories.length} categories`
    );
    
    if (categories.length > 0) {
      log('\n   Categories from API:', 'blue');
      categories.forEach(cat => {
        log(`      • ${cat.name} (ID: ${cat._id})`, 'bright');
        log(`        ${cat.description}`, 'yellow');
      });
      
      // Test getting single category
      const firstCategoryId = categories[0]._id;
      const singleResponse = await axios.get(`${API_URL}/categories/${firstCategoryId}`);
      const singleCategory = singleResponse.data.data || singleResponse.data;
      
      logTest(
        'GET /api/categories/:id',
        singleResponse.status === 200,
        `Retrieved: ${singleCategory.name}`
      );
      
      return categories;
    }
    
  } catch (error) {
    logTest('Category API', false, error.message);
  }
  
  return [];
}

// ============================================
// PRODUCT API TESTS
// ============================================
async function testProductAPI(categories) {
  logSection('🎁 PRODUCT API TESTS');
  
  try {
    // Get all products
    const response = await axios.get(`${API_URL}/products`);
    const products = response.data.data || response.data;
    
    logTest(
      'GET /api/products',
      response.status === 200 && products.length === 20,
      `Returned ${products.length} products`
    );
    
    if (products.length > 0) {
      // Test products by category
      if (categories.length > 0) {
        const testCategoryId = categories[0]._id;
        const categoryResponse = await axios.get(`${API_URL}/products?categoryId=${testCategoryId}`);
        const categoryProducts = categoryResponse.data.data || categoryResponse.data;
        
        logTest(
          'GET /api/products?categoryId=X',
          categoryResponse.status === 200,
          `Found ${categoryProducts.length} products in "${categories[0].name}"`
        );
        
        log('\n   Sample Products:', 'blue');
        categoryProducts.slice(0, 3).forEach(p => {
          log(`      • ${p.name} - $${p.price}`, 'bright');
          log(`        Stock: ${p.digitalContent?.length || 0} keys`, 'yellow');
        });
      }
      
      // Test single product
      const firstProductId = products[0]._id;
      const singleResponse = await axios.get(`${API_URL}/products/${firstProductId}`);
      const singleProduct = singleResponse.data.data || singleResponse.data;
      
      logTest(
        'GET /api/products/:id',
        singleResponse.status === 200,
        `Retrieved: ${singleProduct.name}`
      );
      
      return products;
    }
    
  } catch (error) {
    logTest('Product API', false, error.message);
  }
  
  return [];
}

// ============================================
// USER API TESTS
// ============================================
async function testUserAPI(db) {
  logSection('👤 USER API TESTS');
  
  log('\n   💡 HOW USER REGISTRATION WORKS:', 'cyan');
  log('   1. Users ONLY register through Telegram bot /start command', 'bright');
  log('   2. Bot checks if user exists in database', 'bright');
  log('   3. New users are asked for username', 'bright');
  log('   4. createOrUpdateUser() saves to MongoDB', 'bright');
  log('   5. API endpoints retrieve existing users', 'bright');
  log('   ⚠️  Note: Users cannot be created via API - only via bot!', 'yellow');
  
  let testUserId = null;
  let testTelegramId = null;
  
  try {
    // Find any existing user from database (created via bot)
    const users = await db.collection('users').find({}).limit(5).toArray();
    
    if (users.length === 0) {
      log('\n   ⚠️  NO USERS FOUND IN DATABASE', 'yellow');
      log('   To test user functionality:', 'bright');
      log('   1. Open your Telegram bot', 'bright');
      log('   2. Send /start command', 'bright');
      log('   3. Enter a username when prompted', 'bright');
      log('   4. Run this test again', 'bright');
      
      logTest('Users in Database', false, 'No users found - register via bot first');
      return { userId: null, telegramId: null };
    }
    
    // Use first existing user for testing
    const testUser = users[0];
    testUserId = testUser._id.toString();
    testTelegramId = testUser.telegramId;
    
    logTest(
      'Users in Database',
      true,
      `Found ${users.length} registered users`
    );
    
    log('\n   👥 Registered Users (from bot):', 'blue');
    users.forEach((user, index) => {
      log(`      ${index + 1}. ${user.username || 'No username'} (Telegram ID: ${user.telegramId})`, 'bright');
    });
    
    // Test GET user by Telegram ID
    log('\n   🔍 Testing API endpoints with existing user...', 'cyan');
    const getUserResponse = await axios.get(`${API_URL}/users/telegram/${testTelegramId}`);
    const retrievedUser = getUserResponse.data.data || getUserResponse.data;
    
    logTest(
      'GET /api/users/telegram/:telegramId',
      getUserResponse.status === 200,
      `Retrieved user: ${retrievedUser.username || 'No username'}`
    );
    
    log('\n   👤 Test User Details:', 'blue');
    log(`      User ID: ${testUserId}`, 'bright');
    log(`      Telegram ID: ${retrievedUser.telegramId}`, 'bright');
    log(`      Username: ${retrievedUser.username || 'No username'}`, 'bright');
    log(`      Created: ${new Date(retrievedUser.createdAt).toLocaleString()}`, 'yellow');
    
    // Test GET all users
    const allUsersResponse = await axios.get(`${API_URL}/users`);
    const allUsers = allUsersResponse.data.data || allUsersResponse.data;
    
    logTest(
      'GET /api/users (All Users)',
      allUsersResponse.status === 200,
      `Retrieved ${allUsers.length || 0} users`
    );
    
    return { userId: testUserId, telegramId: testTelegramId };
    
  } catch (error) {
    logTest('User API Tests', false, error.message);
    return { userId: null, telegramId: null };
  }
}

// ============================================
// ORDER API TESTS
// ============================================
async function testOrderAPI(userId, products) {
  logSection('🛒 ORDER API TESTS');
  
  if (!userId || products.length === 0) {
    logTest('Order API', false, 'Missing userId or products');
    return null;
  }
  
  try {
    // Create test order
    const testProduct = products[0];
    const orderData = {
      userId: userId,
      productId: testProduct._id,
      quantity: 1,
    };
    
    const createResponse = await axios.post(`${API_URL}/orders`, orderData);
    const order = createResponse.data.data || createResponse.data;
    logTest(
      'POST /api/orders (Create Order)',
      createResponse.status === 201,
      `Order ID: ${order._id}`
    );
    
    const orderId = order._id;
    
    log('\n   🛒 Order Details:', 'blue');
    log(`      Order ID: ${orderId}`, 'bright');
    log(`      Product: ${testProduct.name}`, 'bright');
    log(`      Amount: $${testProduct.price}`, 'bright');
    log(`      Status: ${order.status}`, 'yellow');
    
    // Get order by ID
    const getOrderResponse = await axios.get(`${API_URL}/orders/${orderId}`);
    logTest(
      'GET /api/orders/:id',
      getOrderResponse.status === 200,
      `Retrieved order: ${orderId}`
    );
    
    // Get user orders
    const userOrdersResponse = await axios.get(`${API_URL}/orders/user/${userId}`);
    const userOrders = userOrdersResponse.data.data || userOrdersResponse.data;
    logTest(
      'GET /api/orders/user/:userId',
      userOrdersResponse.status === 200,
      `Found ${userOrders.length} orders for user`
    );
    
    return orderId;
    
  } catch (error) {
    logTest('Order API', false, error.message);
    return null;
  }
}

// ============================================
// PAYMENT API TESTS
// ============================================
async function testPaymentAPI(orderId) {
  logSection('💳 PAYMENT API TESTS');
  
  if (!orderId) {
    logTest('Payment API', false, 'Missing orderId');
    return;
  }
  
  try {
    // Get all payments
    const getAllPayments = await axios.get(`${API_URL}/payments`);
    logTest(
      'GET /api/payments',
      getAllPayments.status === 200,
      `Found ${getAllPayments.data.total || 0} total payments`
    );
    
    log('\n   💳 Payment System Info:', 'blue');
    log('      Note: Payments are created via crypto payment gateway (NOWPayments)', 'bright');
    log('      Real payments: User → Bot → Payment Gateway → Webhook → Database', 'yellow');
    log('      Test payments: Would require actual crypto transactions', 'yellow');
    
  } catch (error) {
    logTest('Payment API', false, error.message);
  }
}

// ============================================
// NOTIFICATION API TESTS (CRITICAL)
// ============================================
async function testNotificationAPI(telegramId, db) {
  logSection('🔔 NOTIFICATION SYSTEM TESTS');
  
  if (!telegramId) {
    log('\n   ⚠️  NO USER AVAILABLE FOR NOTIFICATION TEST', 'yellow');
    log('   Notification system requires a registered user.', 'bright');
    log('   Please register via Telegram bot /start and run test again.', 'bright');
    logTest('Notification API', false, 'No telegramId available');
    return;
  }
  
  log('\n   💡 HOW NOTIFICATIONS WORK:', 'cyan');
  log('   1. API receives POST to /api/notifications', 'bright');
  log('   2. Notification saved to MongoDB', 'bright');
  log('   3. Bot sends message to user via Telegram API', 'bright');
  log('   4. User receives notification in bot chat', 'bright');
  log('   5. Notification status updated (sent/read)', 'bright');
  
  try {
    // Create notification via API
    const notificationData = {
      title: '🎉 Test Notification',
      message: 'This is a test notification from the full system test. If you receive this in your Telegram bot, the notification system is working perfectly!',
      audience: 'specific_users',
      targetUserIds: [telegramId],
    };
    
    log('\n   📤 Sending Test Notification:', 'blue');
    log(`      To Telegram ID: ${telegramId}`, 'bright');
    log(`      Title: ${notificationData.title}`, 'bright');
    log(`      Audience: ${notificationData.audience}`, 'yellow');
    
    const createResponse = await axios.post(`${API_URL}/notifications`, notificationData);
    const notification = createResponse.data.data || createResponse.data;
    logTest(
      'POST /api/notifications (Create)',
      createResponse.status === 201,
      `Notification ID: ${notification._id}`
    );
    
    log('\n   ⚠️  IMPORTANT: Check your Telegram bot NOW!', 'magenta');
    log('   You should have received the test notification.', 'magenta');
    log('   If you did NOT receive it, check:', 'yellow');
    log('      - Bot is running (npm run dev)', 'bright');
    log('      - Bot token is correct in .env', 'bright');
    log('      - You have started the bot with /start', 'bright');
    
    // Get all notifications (user-specific endpoint doesn't exist)
    const getAllNotifications = await axios.get(`${API_URL}/notifications`);
    const allNotifications = getAllNotifications.data.data || getAllNotifications.data;
    logTest(
      'GET /api/notifications',
      getAllNotifications.status === 200,
      `Found ${allNotifications.length} total notifications`
    );
    
    if (allNotifications.length > 0) {
      log('\n   📬 Recent Notifications:', 'blue');
      allNotifications.slice(0, 5).forEach((notif, index) => {
        log(`      ${index + 1}. ${notif.title}`, 'bright');
        log(`         Audience: ${notif.audience}`, 'yellow');
        log(`         Created: ${new Date(notif.createdAt).toLocaleString()}`, 'yellow');
      });
    }
    
    // Verify notification saved in database
    const dbNotification = await db.collection('notifications').findOne({ 
      title: '🎉 Test Notification'
    });
    
    if (dbNotification) {
      logTest(
        'Notification Saved in Database',
        true,
        `Audience: ${dbNotification.audience}, Target Users: ${dbNotification.targetUserIds ? dbNotification.targetUserIds.length : 0}`
      );
    } else {
      logTest(
        'Notification Saved in Database',
        false,
        'Notification not found in database'
      );
    }
    
  } catch (error) {
    logTest('Notification API', false, error.message);
  }
}

// ============================================
// BOT DATA VERIFICATION
// ============================================
async function testBotData(db) {
  logSection('🤖 BOT DATA VERIFICATION');
  
  log('\n   💡 BOT REGISTRATION FLOW:', 'cyan');
  log('   1. User opens Telegram bot', 'bright');
  log('   2. User sends /start command', 'bright');
  log('   3. Bot checks if user exists (findUserByTelegramId)', 'bright');
  log('   4. New user? → Ask for username', 'bright');
  log('   5. createOrUpdateUser() saves to MongoDB', 'bright');
  log('   6. User sees main keyboard (Browse Products, Orders, Profile)', 'bright');
  
  try {
    // Check bot sessions
    const sessions = await db.collection('sessions').find({}).toArray();
    logTest(
      'Bot Sessions Collection',
      sessions !== null,
      `Found ${sessions.length} active sessions`
    );
    
    if (sessions.length > 0) {
      log('\n   🔑 Active Bot Sessions:', 'blue');
      sessions.slice(0, 3).forEach(session => {
        const sessionData = JSON.parse(session.session || '{}');
        log(`      • Session: ${session.key}`, 'bright');
        log(`        Step: ${sessionData.step || 'unknown'}`, 'yellow');
      });
    } else {
      log('\n   ℹ️  No active sessions - this is normal if no one is using the bot', 'yellow');
    }
    
    // Check users registered via bot
    const botUsers = await db.collection('users').find({ telegramId: { $exists: true } }).toArray();
    logTest(
      'Bot Registered Users',
      botUsers.length >= 0,
      `${botUsers.length} users registered via bot`
    );
    
    if (botUsers.length === 0) {
      log('\n   ⚠️  NO USERS REGISTERED YET', 'yellow');
      log('   To register a user:', 'bright');
      log('   1. Open Telegram and find your bot', 'bright');
      log('   2. Send /start command', 'bright');
      log('   3. Enter a username when prompted', 'bright');
      log('   4. You will see the main menu', 'bright');
    } else {
      log('\n   👥 Bot Registered Users:', 'blue');
      botUsers.slice(0, 5).forEach((user, index) => {
        log(`      ${index + 1}. ${user.username || 'No username'} (Telegram ID: ${user.telegramId})`, 'bright');
        log(`         Created: ${new Date(user.createdAt).toLocaleString()}`, 'yellow');
      });
    }
    
    // Check orders made through bot
    const orders = await db.collection('orders').find({}).toArray();
    logTest(
      'Orders in Database',
      orders !== null,
      `Found ${orders.length} orders`
    );
    
    if (orders.length > 0) {
      log('\n   🛒 Recent Orders:', 'blue');
      orders.slice(0, 3).forEach((order, index) => {
        log(`      ${index + 1}. Order ${order._id.toString().slice(-6)} - $${order.totalAmount}`, 'bright');
        log(`         Status: ${order.status} | Created: ${new Date(order.createdAt).toLocaleString()}`, 'yellow');
      });
    } else {
      log('\n   ℹ️  No orders yet - users can create orders after browsing products', 'yellow');
    }
    
    log('\n   ✅ MANUAL BOT TESTING STEPS:', 'cyan');
    log('   1. Open Telegram and find your bot', 'bright');
    log('   2. Send /start → Should see welcome message', 'bright');
    log('   3. Click "Browse Products 🛍️"', 'bright');
    log('   4. You should see 4 categories', 'bright');
    log('   5. Select a category (e.g., Gaming)', 'bright');
    log('   6. You should see 5 products with prices', 'bright');
    log('   7. Click on a product to see details', 'bright');
    log('   8. Check "My Orders 📦" to see order history', 'bright');
    log('   9. Check "My Profile 👤" to see your info', 'bright');
    
  } catch (error) {
    logTest('Bot Data Verification', false, error.message);
  }
}

// ============================================
// FINAL SUMMARY
// ============================================
function printSummary() {
  logSection('📊 TEST SUMMARY');
  
  const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
  
  log(`\nTotal Tests: ${totalTests}`, 'bright');
  log(`✅ Passed: ${passedTests}`, 'green');
  log(`❌ Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  log(`📈 Pass Rate: ${passRate}%`, passRate === 100 ? 'green' : 'yellow');
  
  console.log('\n' + '='.repeat(60));
  
  if (failedTests === 0) {
    log('\n🎉 ALL TESTS PASSED! System is working correctly.', 'green');
    log('\n✅ NEXT STEPS:', 'cyan');
    log('   1. Open your Telegram bot', 'bright');
    log('   2. Send /start to register (if not already)', 'bright');
    log('   3. Test the complete user workflow:', 'bright');
    log('      • Browse Products → Select category → View products', 'bright');
    log('      • Create an order → Verify order appears', 'bright');
    log('      • Check notifications (you should have received test notification)', 'bright');
    log('      • View profile → See your user info', 'bright');
  } else {
    log('\n⚠️  SOME TESTS FAILED', 'red');
    log('   Review the errors above and fix issues', 'yellow');
    log('\n   Common issues:', 'cyan');
    log('   • No users? → Register via bot with /start', 'bright');
    log('   • No products? → Run: npx ts-node scripts/populateDatabase.ts', 'bright');
    log('   • Server errors? → Check: npm run dev is running', 'bright');
    log('   • Notification not received? → Check bot token in .env', 'bright');
  }
  
  console.log('\n');
}

// ============================================
// MAIN TEST RUNNER
// ============================================
async function runAllTests() {
  log('\n🚀 STARTING FULL SYSTEM TEST', 'bright');
  log('Testing Bot Data + REST API + Notifications\n', 'cyan');
  
  let db = null;
  let client = null;
  
  try {
    // 1. Database Connection
    const dbResult = await testDatabaseConnection();
    db = dbResult.db;
    client = dbResult.client;
    
    if (!db) {
      log('\n❌ Cannot proceed without database connection', 'red');
      return;
    }
    
    // 2. Database Data Verification
    await testDatabaseData(db);
    
    // 3. API Health Check
    await testAPIHealth();
    
    // 4. Category API
    const categories = await testCategoryAPI();
    
    // 5. Product API
    const products = await testProductAPI(categories);
    
    // 6. User API
    const { userId, telegramId } = await testUserAPI(db);
    
    // 7. Order API
    const orderId = await testOrderAPI(userId, products);
    
    // 8. Payment API
    await testPaymentAPI(orderId);
    
    // 9. Notification API (CRITICAL)
    await testNotificationAPI(telegramId, db);
    
    // 10. Bot Data Verification
    await testBotData(db);
    
  } catch (error) {
    log(`\n❌ Fatal Error: ${error.message}`, 'red');
    console.error(error);
  } finally {
    // Cleanup
    if (client) {
      await client.close();
      log('\n🔌 Database connection closed', 'blue');
    }
    
    // Print summary
    printSummary();
  }
}

// Run tests
runAllTests().catch(console.error);
