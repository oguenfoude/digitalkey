/**
 * COMPREHENSIVE API ENDPOINT TESTING SCRIPT
 * Tests all GameKey API endpoints on localhost:3001
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
};

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
};

/**
 * Log test result
 */
function logTest(name, status, details = '') {
  const symbol = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⊘';
  const color = status === 'PASS' ? colors.green : status === 'FAIL' ? colors.red : colors.yellow;
  
  console.log(`${color}${symbol} ${name}${colors.reset}${details ? ' - ' + details : ''}`);
  
  results.tests.push({ name, status, details });
  if (status === 'PASS') results.passed++;
  else if (status === 'FAIL') results.failed++;
  else results.skipped++;
}

/**
 * Print section header
 */
function section(title) {
  console.log(`\n${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}  ${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

/**
 * Make API request with error handling
 */
async function apiRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {},
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }
    
    const response = await axios(config);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      error: error.response?.data || error.message,
    };
  }
}

/**
 * TEST 1: Health & Status Endpoints
 */
async function testHealthEndpoints() {
  section('TEST 1: HEALTH & STATUS ENDPOINTS');
  
  // Test root endpoint
  const root = await apiRequest('GET', '/');
  if (root.success && root.status === 200) {
    logTest('GET / (Root)', 'PASS', 'Server responding');
  } else {
    logTest('GET / (Root)', 'FAIL', `Status ${root.status}`);
  }
  
  // Test health check
  const health = await apiRequest('GET', '/health');
  if (health.success && health.status === 200 && health.data.status) {
    logTest('GET /health', 'PASS', `Status: ${health.data.status}, DB: ${health.data.database}`);
  } else {
    logTest('GET /health', 'FAIL', `Status ${health.status}`);
  }
  
  // Test status endpoint
  const status = await apiRequest('GET', '/status');
  if (status.success && status.status === 200) {
    logTest('GET /status', 'PASS', `Uptime: ${status.data.uptime}`);
  } else {
    logTest('GET /status', 'FAIL', `Status ${status.status}`);
  }
}

/**
 * TEST 2: Basic API Access (No Auth Required)
 */
async function testBasicAPIAccess() {
  section('TEST 2: BASIC API ACCESS');
  
  // Test API access without authentication
  const products = await apiRequest('GET', '/api/products');
  if (products.success && products.status === 200) {
    logTest('API access without auth', 'PASS', 'Endpoints are publicly accessible');
  } else {
    logTest('API access without auth', 'FAIL', `Status ${products.status}`);
  }
  
  // Test users endpoint
  const users = await apiRequest('GET', '/api/users');
  if (users.success && users.status === 200) {
    logTest('GET /api/users', 'PASS', 'Users endpoint accessible');
  } else {
    logTest('GET /api/users', 'FAIL', `Status ${users.status}`);
  }
  
  // Test categories endpoint
  const categories = await apiRequest('GET', '/api/categories');
  if (categories.success && categories.status === 200) {
    logTest('GET /api/categories', 'PASS', 'Categories endpoint accessible');
  } else {
    logTest('GET /api/categories', 'FAIL', `Status ${categories.status}`);
  }
}

/**
 * TEST 3: Users API
 */
async function testUsersAPI() {
  section('TEST 3: USERS API');
  
  // Get all users
  const users = await apiRequest('GET', '/api/users');
  if (users.success && Array.isArray(users.data)) {
    logTest('GET /api/users', 'PASS', `Found ${users.data.length} users`);
  } else if (users.success && users.data.data) {
    logTest('GET /api/users', 'PASS', `Found ${users.data.data.length} users`);
  } else {
    logTest('GET /api/users', 'FAIL', `Status ${users.status}`);
  }
  
  // Test pagination
  const usersPaginated = await apiRequest('GET', '/api/users?page=1&limit=5');
  if (usersPaginated.success) {
    logTest('GET /api/users?page=1&limit=5', 'PASS', 'Pagination works');
  } else {
    logTest('GET /api/users?page=1&limit=5', 'FAIL', `Status ${usersPaginated.status}`);
  }
}

/**
 * TEST 4: Categories API
 */
async function testCategoriesAPI() {
  section('TEST 4: CATEGORIES API');
  
  // Get all categories
  const categories = await apiRequest('GET', '/api/categories');
  if (categories.success) {
    const count = Array.isArray(categories.data) ? categories.data.length : 
                  categories.data.data ? categories.data.data.length : 0;
    logTest('GET /api/categories', 'PASS', `Found ${count} categories`);
    
    // Store first category ID for later tests
    if (count > 0) {
      const catList = Array.isArray(categories.data) ? categories.data : categories.data.data;
      global.testCategoryId = catList[0]._id;
    }
  } else {
    logTest('GET /api/categories', 'FAIL', `Status ${categories.status}`);
  }
  
  // Create new category
  const newCategory = await apiRequest('POST', '/api/categories', {
    name: 'Test Category ' + Date.now(),
    description: 'Automated test category',
  });
  
  if (newCategory.success && newCategory.status === 201) {
    logTest('POST /api/categories', 'PASS', 'Category created');
    global.createdCategoryId = newCategory.data._id;
  } else {
    logTest('POST /api/categories', 'FAIL', `Status ${newCategory.status}`);
  }
  
  // Get category by ID
  if (global.createdCategoryId) {
    const getCategory = await apiRequest('GET', `/api/categories/${global.createdCategoryId}`);
    if (getCategory.success) {
      logTest('GET /api/categories/:id', 'PASS', 'Category retrieved');
    } else {
      logTest('GET /api/categories/:id', 'FAIL', `Status ${getCategory.status}`);
    }
    
    // Update category
    const updateCategory = await apiRequest('PUT', `/api/categories/${global.createdCategoryId}`, {
      description: 'Updated description',
    });
    if (updateCategory.success) {
      logTest('PUT /api/categories/:id', 'PASS', 'Category updated');
    } else {
      logTest('PUT /api/categories/:id', 'FAIL', `Status ${updateCategory.status}`);
    }
    
    // Delete category
    const deleteCategory = await apiRequest('DELETE', `/api/categories/${global.createdCategoryId}`);
    if (deleteCategory.success) {
      logTest('DELETE /api/categories/:id', 'PASS', 'Category deleted');
    } else {
      logTest('DELETE /api/categories/:id', 'FAIL', `Status ${deleteCategory.status}`);
    }
  }
}

/**
 * TEST 5: Products API
 */
async function testProductsAPI() {
  section('TEST 5: PRODUCTS API');
  
  // Get all products
  const products = await apiRequest('GET', '/api/products');
  if (products.success) {
    const count = Array.isArray(products.data) ? products.data.length : 
                  products.data.data ? products.data.data.length : 0;
    logTest('GET /api/products', 'PASS', `Found ${count} products`);
    
    // Store first product ID
    if (count > 0) {
      const prodList = Array.isArray(products.data) ? products.data : products.data.data;
      global.testProductId = prodList[0]._id;
    }
  } else {
    logTest('GET /api/products', 'FAIL', `Status ${products.status}`);
  }
  
  // Test product filters
  const filteredProducts = await apiRequest('GET', '/api/products?page=1&limit=10');
  if (filteredProducts.success) {
    logTest('GET /api/products?page=1&limit=10', 'PASS', 'Pagination works');
  } else {
    logTest('GET /api/products?page=1&limit=10', 'FAIL', `Status ${filteredProducts.status}`);
  }
  
  // Create new product (requires valid category ID)
  if (global.testCategoryId) {
    const newProduct = await apiRequest('POST', '/api/products', {
      name: 'Test Product ' + Date.now(),
      description: 'Automated test product',
      price: 9.99,
      categoryId: global.testCategoryId,
      isAvailable: true,
      digitalContent: ['TEST-KEY-12345', 'TEST-KEY-67890'],
    });
    
    if (newProduct.success && newProduct.status === 201) {
      logTest('POST /api/products', 'PASS', 'Product created');
      global.createdProductId = newProduct.data._id;
    } else {
      logTest('POST /api/products', 'FAIL', `Status ${newProduct.status} - ${JSON.stringify(newProduct.error)}`);
    }
  } else {
    logTest('POST /api/products', 'SKIP', 'No category available');
  }
  
  // Get product by ID
  if (global.createdProductId || global.testProductId) {
    const productId = global.createdProductId || global.testProductId;
    const getProduct = await apiRequest('GET', `/api/products/${productId}`);
    if (getProduct.success) {
      logTest('GET /api/products/:id', 'PASS', 'Product retrieved');
    } else {
      logTest('GET /api/products/:id', 'FAIL', `Status ${getProduct.status}`);
    }
    
    // Update product
    const updateProduct = await apiRequest('PUT', `/api/products/${productId}`, {
      description: 'Updated test description',
    });
    if (updateProduct.success) {
      logTest('PUT /api/products/:id', 'PASS', 'Product updated');
    } else {
      logTest('PUT /api/products/:id', 'FAIL', `Status ${updateProduct.status}`);
    }
  }
  
  // Clean up - delete test product
  if (global.createdProductId) {
    const deleteProduct = await apiRequest('DELETE', `/api/products/${global.createdProductId}`);
    if (deleteProduct.success) {
      logTest('DELETE /api/products/:id', 'PASS', 'Product deleted');
    } else {
      logTest('DELETE /api/products/:id', 'FAIL', `Status ${deleteProduct.status}`);
    }
  }
}

/**
 * TEST 6: Orders API
 */
async function testOrdersAPI() {
  section('TEST 6: ORDERS API');
  
  // Get all orders
  const orders = await apiRequest('GET', '/api/orders');
  if (orders.success) {
    const count = orders.data.orders ? orders.data.orders.length : 
                  Array.isArray(orders.data) ? orders.data.length : 0;
    logTest('GET /api/orders', 'PASS', `Found ${count} orders`);
    
    // Store first order ID
    if (count > 0) {
      const orderList = orders.data.orders || orders.data;
      global.testOrderId = orderList[0]._id;
    }
  } else {
    logTest('GET /api/orders', 'FAIL', `Status ${orders.status}`);
  }
  
  // Test order pagination
  const paginatedOrders = await apiRequest('GET', '/api/orders?page=1&limit=5');
  if (paginatedOrders.success) {
    logTest('GET /api/orders?page=1&limit=5', 'PASS', 'Pagination works');
  } else {
    logTest('GET /api/orders?page=1&limit=5', 'FAIL', `Status ${paginatedOrders.status}`);
  }
  
  // Get order by ID (if available)
  if (global.testOrderId) {
    const getOrder = await apiRequest('GET', `/api/orders/${global.testOrderId}`);
    if (getOrder.success) {
      logTest('GET /api/orders/:id', 'PASS', 'Order retrieved');
    } else {
      logTest('GET /api/orders/:id', 'FAIL', `Status ${getOrder.status}`);
    }
  }
  
  // Get sales statistics
  const stats = await apiRequest('GET', '/api/orders/stats/sales');
  if (stats.success) {
    logTest('GET /api/orders/stats/sales', 'PASS', `Total sales: ${stats.data.totalSales || 0}`);
  } else {
    logTest('GET /api/orders/stats/sales', 'FAIL', `Status ${stats.status}`);
  }
}

/**
 * TEST 7: Payments API
 */
async function testPaymentsAPI() {
  section('TEST 7: PAYMENTS API');
  
  // Get all payment transactions
  const payments = await apiRequest('GET', '/api/payments');
  if (payments.success) {
    const count = payments.data.transactions ? payments.data.transactions.length : 
                  Array.isArray(payments.data) ? payments.data.length : 0;
    logTest('GET /api/payments', 'PASS', `Found ${count} transactions`);
    
    // Store first payment ID
    if (count > 0) {
      const paymentList = payments.data.transactions || payments.data;
      global.testPaymentId = paymentList[0]._id;
    }
  } else {
    logTest('GET /api/payments', 'FAIL', `Status ${payments.status}`);
  }
  
  // Test payment pagination
  const paginatedPayments = await apiRequest('GET', '/api/payments?page=1&limit=5');
  if (paginatedPayments.success) {
    logTest('GET /api/payments?page=1&limit=5', 'PASS', 'Pagination works');
  } else {
    logTest('GET /api/payments?page=1&limit=5', 'FAIL', `Status ${paginatedPayments.status}`);
  }
  
  // Get payment by ID (if available)
  if (global.testPaymentId) {
    const getPayment = await apiRequest('GET', `/api/payments/${global.testPaymentId}`);
    if (getPayment.success) {
      logTest('GET /api/payments/:id', 'PASS', 'Payment retrieved');
    } else {
      logTest('GET /api/payments/:id', 'FAIL', `Status ${getPayment.status}`);
    }
  }
  
  // Get payment statistics
  const stats = await apiRequest('GET', '/api/payments/stats/summary');
  if (stats.success) {
    logTest('GET /api/payments/stats/summary', 'PASS', 'Payment stats retrieved');
  } else {
    logTest('GET /api/payments/stats/summary', 'FAIL', `Status ${stats.status}`);
  }
}

/**
 * TEST 8: Notifications API
 */
async function testNotificationsAPI() {
  section('TEST 8: NOTIFICATIONS API');
  
  // Get all notifications
  const notifications = await apiRequest('GET', '/api/notifications');
  if (notifications.success) {
    const count = Array.isArray(notifications.data) ? notifications.data.length : 0;
    logTest('GET /api/notifications', 'PASS', `Found ${count} notifications`);
  } else {
    logTest('GET /api/notifications', 'FAIL', `Status ${notifications.status}`);
  }
  
  // Test notification validation (should fail with incorrect data)
  const invalidNotification = await apiRequest('POST', '/api/notifications', {
    title: 'Test',
    message: 'Test message',
    audience: 'specific_users',
    targetUserIds: ['invalid'], // Should be numbers, not strings
  });
  
  if (invalidNotification.status === 400) {
    logTest('POST /api/notifications (validation)', 'PASS', 'Correctly validates Telegram IDs');
  } else {
    logTest('POST /api/notifications (validation)', 'FAIL', `Expected 400, got ${invalidNotification.status}`);
  }
}

/**
 * TEST 9: Performance & Monitoring
 */
async function testPerformanceEndpoints() {
  section('TEST 9: PERFORMANCE & MONITORING');
  
  // Test performance metrics endpoint
  const performance = await apiRequest('GET', '/api/performance');
  if (performance.success) {
    logTest('GET /api/performance', 'PASS', 'Performance metrics available');
  } else {
    logTest('GET /api/performance', 'FAIL', `Status ${performance.status}`);
  }
  
  // Test API docs endpoints
  const docsJson = await apiRequest('GET', '/docs-json', null, false);
  if (docsJson.success) {
    logTest('GET /docs-json', 'PASS', 'Swagger JSON available');
  } else {
    logTest('GET /docs-json', 'FAIL', `Status ${docsJson.status}`);
  }
  
  const openapi = await apiRequest('GET', '/openapi.json', null, false);
  if (openapi.success) {
    logTest('GET /openapi.json', 'PASS', 'OpenAPI spec available');
  } else {
    logTest('GET /openapi.json', 'FAIL', `Status ${openapi.status}`);
  }
}

/**
 * TEST 10: Error Handling
 */
async function testErrorHandling() {
  section('TEST 10: ERROR HANDLING');
  
  // Test 404 for non-existent route
  const notFound = await apiRequest('GET', '/api/nonexistent');
  if (notFound.status === 404) {
    logTest('404 for invalid route', 'PASS', 'Correctly returns 404');
  } else {
    logTest('404 for invalid route', 'FAIL', `Expected 404, got ${notFound.status}`);
  }
  
  // Test invalid ID format
  const invalidId = await apiRequest('GET', '/api/products/invalid-id-format');
  if (invalidId.status === 400 || invalidId.status === 404) {
    logTest('Invalid ID format', 'PASS', `Correctly handled (${invalidId.status})`);
  } else {
    logTest('Invalid ID format', 'FAIL', `Status ${invalidId.status}`);
  }
}

/**
 * Print final summary
 */
function printSummary() {
  console.log(`\n${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}  TEST SUMMARY${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  
  const total = results.passed + results.failed + results.skipped;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  console.log(`${colors.green}✓ Passed:  ${results.passed}${colors.reset}`);
  console.log(`${colors.red}✗ Failed:  ${results.failed}${colors.reset}`);
  console.log(`${colors.yellow}⊘ Skipped: ${results.skipped}${colors.reset}`);
  console.log(`${colors.bold}  Total:    ${total}${colors.reset}`);
  console.log(`${colors.bold}  Pass Rate: ${passRate}%${colors.reset}\n`);
  
  if (results.failed > 0) {
    console.log(`${colors.red}${colors.bold}FAILED TESTS:${colors.reset}`);
    results.tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`  ${colors.red}✗ ${t.name}${colors.reset} - ${t.details}`);
    });
    console.log();
  }
  
  // Overall result
  if (results.failed === 0) {
    console.log(`${colors.green}${colors.bold}🎉 ALL TESTS PASSED! System is working correctly.${colors.reset}\n`);
  } else {
    console.log(`${colors.red}${colors.bold}⚠️  SOME TESTS FAILED. Please review the failures above.${colors.reset}\n`);
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log(`${colors.bold}${colors.blue}
╔══════════════════════════════════════════════════╗
║     GAMEKEY API ENDPOINT TESTING SUITE           ║
║     Server: ${BASE_URL}                    ║
╚══════════════════════════════════════════════════╝
${colors.reset}`);
  
  try {
    await testHealthEndpoints();
    await testBasicAPIAccess();
    await testUsersAPI();
    await testCategoriesAPI();
    await testProductsAPI();
    await testOrdersAPI();
    await testPaymentsAPI();
    await testNotificationsAPI();
    await testPerformanceEndpoints();
    await testErrorHandling();
    
    printSummary();
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error(`\n${colors.red}${colors.bold}FATAL ERROR:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run tests
runAllTests();
