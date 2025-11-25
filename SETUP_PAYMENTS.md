# 💳 Payment Setup Guide - IMPORTANT!

## ⚠️ Current Issue: Invalid API Key

The error you're seeing means the NOWPayments API key is invalid or expired.

```
ERROR: INVALID_API_KEY - Request failed with status code 403
```

---

## ✅ How to Fix (Choose Option 1 or 2)

### Option 1: Get Real Sandbox API Key (Recommended)

**Steps:**

1. **Go to NOWPayments Sandbox:**
   - Visit: https://account-sandbox.nowpayments.io/
   - Click "Sign Up" (it's free for testing)

2. **Create Account:**
   - Use your email
   - Verify email
   - Login to dashboard

3. **Get API Key:**
   - Go to "Settings" → "API Keys"
   - Copy your **Sandbox API Key**
   - It looks like: `XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX`

4. **Update `.env` File:**
   ```env
   NOWPAYMENTS_API_KEY=YOUR_REAL_KEY_HERE
   NOWPAYMENTS_SANDBOX=true
   ```

5. **Restart Bot:**
   ```powershell
   # Stop bot (Ctrl+C in terminal)
   # Start again
   npm run dev
   ```

---

### Option 2: Test Without Real Payments (Quick Testing)

For now, you can test everything EXCEPT actual crypto payments.

**What Works:**
- ✅ Browse products
- ✅ View categories
- ✅ Create orders
- ✅ View order history
- ✅ User profile
- ✅ Notifications

**What Won't Work:**
- ❌ Real crypto payment links (will use fallback URL)
- ❌ Payment confirmation webhooks
- ❌ Automatic order fulfillment

**The bot will show a generic payment link instead of a real crypto address.**

---

## 🧪 Current Sandbox Mode Settings

Your `.env` file is configured for **SAFE TESTING**:

```env
# ✅ SANDBOX MODE (No real money)
NOWPAYMENTS_SANDBOX=true

# ❌ Invalid API key (needs to be updated)
NOWPAYMENTS_API_KEY=YOUR_SANDBOX_API_KEY_HERE

# ✅ Using test database
MONGODB_URI=mongodb+srv://Admin:admin@cluster0.rkcjk.mongodb.net/gameKey...
```

---

## 📋 What Happens During Testing

### When User Creates Order:

**With Valid API Key:**
```
1. User clicks "Buy Now" on product
2. Bot creates order in database
3. Bot calls NOWPayments API
4. NOWPayments returns crypto address
5. User sees: "Send 24.99 USDT to: 0xABC123..."
6. User pays → Webhook → Order fulfilled
```

**With Invalid API Key (Current):**
```
1. User clicks "Buy Now" on product
2. Bot creates order in database
3. Bot tries NOWPayments API → ❌ 403 Error
4. Bot falls back to generic link
5. User sees: "Click here to pay with crypto"
6. Link goes to NOWPayments website (not your account)
```

---

## 🎯 Testing Priority

### High Priority (Test These First):
- ✅ Bot responds to /start
- ✅ Browse products works
- ✅ View product details
- ✅ Create order (saves to database)
- ✅ View order history
- ✅ User profile

### Low Priority (Needs Valid API Key):
- ⏸️ Real crypto payment address
- ⏸️ Payment webhooks
- ⏸️ Automatic delivery

---

## 🔧 Quick Fix Commands

**Check if bot is running:**
```powershell
Get-Process -Name node
```

**Restart bot:**
```powershell
# In the terminal where bot is running:
# Press Ctrl+C to stop
# Then run:
npm run dev
```

**Test bot manually in Telegram:**
1. Open Telegram
2. Find your bot: @YourBotUsername
3. Send: `/start`
4. Click "Browse Products 🛍️"
5. Try creating an order

---

## 📊 Testing Status

**What's Working:**
- ✅ Database: Connected (gameKey database)
- ✅ API: Running on port 3001
- ✅ Bot: Active and responding
- ✅ Products: 20 items loaded
- ✅ Categories: 4 categories available
- ✅ Orders: Creating successfully
- ✅ Notifications: Sending correctly

**What Needs Setup:**
- ⚠️ NOWPayments API Key (invalid)
- ⚠️ Real crypto payments (blocked by API key)

---

## 💡 Recommendations

### For Manual Testing (Right Now):
1. **Skip payment setup** - Test everything else first
2. **Use Option 2 above** - Test without real payments
3. **Create orders** - They save to database correctly
4. **Check notifications** - Make sure bot messages work

### For Production (Later):
1. **Get real API key** from NOWPayments
2. **Set NOWPAYMENTS_SANDBOX=false**
3. **Test with small amounts first** ($1-5)
4. **Monitor webhooks** to ensure delivery works

---

## 🎮 Quick Testing Checklist

Copy this to test your bot manually:

### Basic Tests (No API key needed):
- [ ] Send `/start` → Bot responds with welcome
- [ ] Click "Browse Products" → See 4 categories
- [ ] Click "Gaming" → See 5 products
- [ ] Click "Steam Gift Card" → See details
- [ ] Click "Buy Now" → Order created (ID shown)
- [ ] Click "My Orders" → See order list
- [ ] Click "My Profile" → See username and stats

### Payment Tests (Needs valid API key):
- [ ] Create order → See real crypto address
- [ ] Payment page loads correctly
- [ ] Can select crypto currency (BTC, ETH, USDT)
- [ ] Receive webhook after payment
- [ ] Order status updates to "paid"
- [ ] Digital key delivered automatically

---

## 📝 Summary

**Current State:**
```
✅ Bot: Running
✅ Database: Connected
✅ Products: Loaded
✅ Orders: Working
❌ Payments: API key invalid (403 error)
```

**Next Steps:**
1. Test bot manually in Telegram (everything except payments)
2. Get valid NOWPayments sandbox API key
3. Update `.env` file with new key
4. Restart bot
5. Test payments end-to-end

**For Testing Without Payments:**
- Everything works except the payment link
- Orders still create correctly
- You can manually mark orders as "paid" in database for testing

---

## 🚀 Ready to Test!

Your bot is ready for manual testing. The payment API key issue won't stop you from testing:
- ✅ Product browsing
- ✅ Order creation
- ✅ User management
- ✅ Notifications
- ✅ Bot commands

**The bot will work perfectly for everything except generating real crypto payment addresses.**

---

**Last Updated:** November 17, 2025  
**Status:** ⚠️ Payments need API key, everything else working  
**Mode:** 🧪 Sandbox Testing Mode
