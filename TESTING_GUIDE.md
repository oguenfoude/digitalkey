# 🎮 GameKey Bot - Complete Testing Guide

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Current Status](#current-status)
3. [How to Start the Bot](#how-to-start-the-bot)
4. [Testing in Telegram (Sandbox Mode)](#testing-in-telegram-sandbox-mode)
5. [Complete User Flow](#complete-user-flow)
6. [Admin Features](#admin-features)
7. [API Testing](#api-testing)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 System Overview

**GameKey Bot** is a Telegram bot that sells digital products (game keys, gift cards, subscriptions) using cryptocurrency payments.

### Architecture
```
┌─────────────────┐
│  Telegram Bot   │ ← Users interact here
│   (Grammy)      │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Express API   │ ← Backend REST API
│   Port: 3001    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   MongoDB       │ ← Database
│   (Atlas)       │
└─────────────────┘
```

### Key Components
- **Bot Framework**: Grammy (Telegram)
- **Backend**: Express + TypeScript
- **Database**: MongoDB Atlas
- **Payments**: NOWPayments (Crypto gateway)
- **Current Mode**: ✅ **SANDBOX MODE** (Safe for testing)

---

## ✅ Current Status

### Database State
- ✅ **4 Categories** (Gaming, Streaming, Software, Crypto)
- ✅ **20 Products** (5 products per category)
- ✅ **58 Digital Keys** in stock
- ✅ **1 Registered User** (Jeogo - Telegram ID: 5565239578)

### Test Results
```
Total Tests: 29
✅ Passed: 29 (100%)
❌ Failed: 0
```

### API Endpoints Working
- ✅ GET /health - Health check
- ✅ GET /api/categories - List all categories
- ✅ GET /api/products - List all products
- ✅ GET /api/users - List users
- ✅ POST /api/orders - Create order
- ✅ POST /api/notifications - Send notification
- ✅ GET /api/payments - View payments

---

## 🚀 How to Start the Bot

### 1. Check if Already Running
```powershell
# Check running Node processes
Get-Process -Name node | Select-Object Id, ProcessName, StartTime
```

### 2. Start the Bot (if not running)
```powershell
# Navigate to project directory
cd C:\Users\Administrator\Desktop\gameKey

# Start in development mode (auto-reload on changes)
npm run dev
```

### Expected Output
```
✅ Connected to MongoDB successfully
✅ Bot @YourBotUsername started successfully
✅ Server listening on port 3001
📊 Database initialized with 7 collections
```

### 3. Verify Bot is Running
Open PowerShell and run:
```powershell
# Test API health
Invoke-RestMethod -Uri "http://localhost:3001/health"
# Should return: { status: "ok" }

# Test products API
Invoke-RestMethod -Uri "http://localhost:3001/api/products"
# Should return: { success: true, data: [...20 products...] }
```

---

## 📱 Testing in Telegram (Sandbox Mode)

### ⚠️ IMPORTANT: Sandbox Mode Settings

**Current Configuration:**
- ✅ `NOWPAYMENTS_SANDBOX=true` - Payments are in TEST MODE
- ✅ No real money will be charged
- ✅ Safe to test all features

### How to Access Your Bot

1. **Open Telegram** on your phone or desktop
2. **Search for your bot** (check `.env` file for `BOT_USERNAME`)
3. **Start chatting** with the bot

---

## 🧪 Complete User Flow Testing

### Test 1: New User Registration ✅

**What happens:**
```
User → /start → Bot asks for username → User provides username → Registration complete
```

**Steps to test:**
1. Send `/start` command to the bot
2. If new user: Bot will ask "Please enter your preferred username:"
3. Type any username (e.g., "TestUser123")
4. Bot will register you and show main menu

**Expected Response:**
```
🎮 Welcome back, TestUser123!

Browse our products, check orders, or manage your profile.

[Browse Products 🛍️] [My Orders 📦] [My Profile 👤]
```

---

### Test 2: Browse Products ✅

**Steps:**
1. Click **"Browse Products 🛍️"** button
2. You'll see 4 categories:
   - 🎮 Gaming Gift Cards
   - 🎬 Streaming Services
   - 💻 Software & Tools
   - 💰 Crypto & Digital Assets

3. Click any category (e.g., **Gaming Gift Cards**)
4. You'll see 5 products:
   - Steam Gift Card $25 - **$24.99** (5 keys available)
   - PlayStation Plus 12 Months - **$59.99** (3 keys available)
   - Xbox Game Pass Ultimate 3 Months - **$44.99** (4 keys available)
   - Nintendo eShop $50 - **$49.99** (3 keys available)
   - Roblox Gift Card $25 - **$24.99** (5 keys available)

**Expected Behavior:**
- ✅ Categories load instantly
- ✅ Products show correct prices
- ✅ Stock levels displayed
- ✅ Back button works

---

### Test 3: View Product Details ✅

**Steps:**
1. While viewing products, click any product (e.g., **Steam Gift Card $25**)
2. Bot shows product details:

**Expected Response:**
```
🎮 Steam Gift Card $25

💰 Price: $24.99
📦 Stock: 5 available
📝 Description: Add $25 to your Steam Wallet instantly. Works worldwide. Digital delivery within minutes.

[🛒 Buy Now] [⬅️ Back to Products]
```

---

### Test 4: Create Order (Sandbox Mode) ✅

**Steps:**
1. Click **"🛒 Buy Now"** on any product
2. Bot creates order and shows payment options

**Expected Response:**
```
✅ Order Created!

Order ID: 691b32b7...
Product: Steam Gift Card $25
Amount: $24.99
Status: Pending Payment

💳 Choose Payment Method:
- Bitcoin (BTC)
- Ethereum (ETH)
- USDT (TRC20)
- Litecoin (LTC)

⚠️ SANDBOX MODE: This is a test order, no real payment required
```

**What happens in database:**
- ✅ Order saved with status "pending"
- ✅ Product stock NOT deducted yet (waiting for payment)
- ✅ Order linked to your user ID

---

### Test 5: Check My Orders ✅

**Steps:**
1. Click **"My Orders 📦"** from main menu
2. You'll see all your orders

**Expected Response:**
```
📦 Your Orders:

Order #691b32b7
• Product: Steam Gift Card $25
• Amount: $24.99
• Status: ⏳ Pending Payment
• Created: Nov 17, 2025 3:35 PM

[View Details] [Cancel Order]
```

---

### Test 6: View Profile ✅

**Steps:**
1. Click **"My Profile 👤"** from main menu

**Expected Response:**
```
👤 Your Profile

Username: Jeogo
Telegram ID: 5565239578
Member since: Nov 17, 2025

📊 Statistics:
• Total Orders: 5
• Completed: 0
• Pending: 5

[Update Username] [View Order History]
```

---

### Test 7: Notifications ✅

**Steps:**
1. Bot automatically sends notifications for:
   - ✅ Order created
   - ✅ Payment received
   - ✅ Product delivered
   - ✅ Special promotions

**Test Notification:**
During automated test, you should have received:
```
🎉 Test Notification

This is a test notification from the full system test. 
If you receive this in your Telegram bot, the notification 
system is working perfectly!
```

---

## 👑 Admin Features

### Admin User IDs
Check `.env` file → `ADMIN_IDS=5565239578,6114544470`

### Admin Commands (Only for Admin IDs)
```
/admin - Show admin panel
/stats - View sales statistics
/users - List all users
/orders - View all orders
/products - Manage products
/broadcast - Send message to all users
```

### Test Admin Panel
1. Send `/admin` command
2. If you're admin, you'll see:
```
🔐 Admin Panel

[📊 Statistics] [👥 Users] [📦 Orders]
[🎁 Products] [📢 Broadcast] [⚙️ Settings]
```

---

## 🔧 API Testing

### Manual API Tests

**1. Health Check**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/health"
```

**2. Get All Products**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/products" | ConvertTo-Json -Depth 3
```

**3. Get Products by Category**
```powershell
$categoryId = "691b29af3df6738fbbdb8887"  # Gaming category
Invoke-RestMethod -Uri "http://localhost:3001/api/products?categoryId=$categoryId"
```

**4. Get User Info**
```powershell
$telegramId = 5565239578
Invoke-RestMethod -Uri "http://localhost:3001/api/users/telegram/$telegramId"
```

**5. Create Test Order**
```powershell
$body = @{
    userId = "691b2a9fdc0c7789fb7ca89b"
    productId = "691b29af3df6738fbbdb888b"
    quantity = 1
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/orders" -Method POST -Body $body -ContentType "application/json"
```

### Run Automated Tests
```powershell
# Full system test (29 tests)
node test/full-system-test.js

# API only tests
node test/api-tests.js
```

---

## 🐛 Troubleshooting

### Bot Not Responding

**Check 1: Is the bot running?**
```powershell
Get-Process -Name node
# Should show 3-4 node processes
```

**Check 2: Check logs**
Look at the terminal where `npm run dev` is running. Should see:
```
✅ Bot started successfully
```

**Check 3: Restart bot**
```powershell
# Find all node processes
Get-Process -Name node | Stop-Process -Force

# Start again
npm run dev
```

### Database Connection Issues

**Symptom:** Error: `ESERVFAIL _mongodb._tcp.storebot.uwnfq.mongodb.net`

**Solution:**
```powershell
# Wait a moment, then try again
Start-Sleep -Seconds 5
npm run dev
```

### No Products Showing in Bot

**Check 1: Verify products in database**
```powershell
node test/full-system-test.js
# Should show: "Found 20 products"
```

**Check 2: Repopulate database**
```powershell
npx ts-node scripts/populateTestData.ts
```

### Payment Not Working

**Remember:** You're in SANDBOX mode!
- ✅ No real payments will be processed
- ✅ Use test crypto addresses
- ✅ Check `NOWPAYMENTS_SANDBOX=true` in `.env`

**To test real payments:**
1. Set `NOWPAYMENTS_SANDBOX=false` in `.env`
2. Get real API key from NOWPayments
3. ⚠️ **WARNING: Real money will be involved!**

---

## 📊 Expected Test Results

### When Everything Works Correctly

**Telegram Bot:**
- ✅ Responds to /start immediately
- ✅ Shows 4 categories
- ✅ Displays 20 products with correct prices
- ✅ Creates orders successfully
- ✅ Sends notifications
- ✅ Shows user profile

**API (http://localhost:3001):**
- ✅ /health returns `{ status: "ok" }`
- ✅ /api/products returns 20 products
- ✅ /api/categories returns 4 categories
- ✅ /api/users returns registered users
- ✅ All endpoints respond in < 1 second

**Database:**
- ✅ MongoDB connected
- ✅ 7 collections exist
- ✅ Data persists between restarts

---

## 🎯 Quick Test Checklist

Use this checklist to verify everything works:

### Before Testing
- [ ] Bot is running (`npm run dev`)
- [ ] No errors in terminal
- [ ] MongoDB connected successfully
- [ ] Port 3001 available

### Basic Bot Tests
- [ ] Send /start → Get welcome message
- [ ] Click "Browse Products" → See 4 categories
- [ ] Select category → See 5 products
- [ ] Click product → See details and price
- [ ] Click "Buy Now" → Order created
- [ ] Click "My Orders" → See order list
- [ ] Click "My Profile" → See user info

### API Tests
- [ ] GET /health → Status 200
- [ ] GET /api/products → Returns 20 products
- [ ] GET /api/categories → Returns 4 categories
- [ ] POST /api/orders → Creates order successfully

### Edge Cases
- [ ] Bot handles unknown commands gracefully
- [ ] API returns proper error messages
- [ ] Back buttons work correctly
- [ ] Navigation is smooth

---

## 📝 Test Results Summary

After completing all tests, you should see:

```
✅ User Registration: Working
✅ Product Browsing: Working  
✅ Order Creation: Working
✅ Notifications: Working
✅ Profile Management: Working
✅ API Endpoints: Working (29/29 tests passed)
✅ Database: Connected and populated
✅ Sandbox Mode: Active (safe testing)

🎉 System is 100% functional and ready for testing!
```

---

## 🚀 Next Steps After Testing

1. **Test thoroughly in Telegram** - Use the bot as a real user would
2. **Check all buttons and commands** - Make sure navigation is smooth
3. **Create test orders** - Verify order flow works end-to-end
4. **Review notifications** - Ensure you receive all bot messages
5. **Test edge cases** - Try invalid inputs, rapid clicking, etc.

### When Ready for Production
- [ ] Change `NODE_ENV=production` in `.env`
- [ ] Set `NOWPAYMENTS_SANDBOX=false` for real payments
- [ ] Update `WEBHOOK_URL` to your domain
- [ ] Test with real crypto payments (small amounts first!)
- [ ] Monitor logs for any issues

---

## 💬 Need Help?

**Check Logs:**
- Bot logs: Terminal where `npm run dev` is running
- API logs: Same terminal (all requests logged)
- Database logs: MongoDB Atlas dashboard

**Run Tests:**
```powershell
node test/full-system-test.js
```

**Manual API Test:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/products"
```

---

**Last Updated:** November 17, 2025  
**Version:** 1.0.0  
**Status:** ✅ All systems operational (100% test pass rate)  
**Mode:** 🧪 Sandbox/Testing Mode (Safe for testing)
