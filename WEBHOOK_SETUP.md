# 🔗 Webhook Setup Guide

## Current Configuration

✅ **Your ngrok URL**: `https://ba7152fb30bf.ngrok-free.app`  
✅ **Webhook endpoint**: `https://ba7152fb30bf.ngrok-free.app/api/payments/webhook/nowpayments`  
✅ **Sandbox Mode**: Enabled (safe for testing)

---

## 📋 What's Already Done

Your system is configured to accept webhooks from:
- ✅ NOWPayments (crypto payment gateway)
- ✅ All origins allowed (`ALLOWED_ORIGINS=*`)
- ✅ CORS headers properly set
- ✅ Webhook signature validation ready

---

## 🚀 How to Test the System

### 1. Make Sure Bot is Running

```powershell
# Start the bot (if not already running)
npm run dev
```

You should see:
```
✅ Connected to MongoDB successfully
✅ Bot started successfully
🌐 Express server is running on http://localhost:3001
```

### 2. Test Webhook Endpoint

Open PowerShell and test if webhook endpoint is accessible:

```powershell
# Test your webhook endpoint
Invoke-RestMethod -Uri "https://ba7152fb30bf.ngrok-free.app/health" -Method GET

# Should return: { "status": "ok" }
```

### 3. Test in Telegram Bot

1. **Open your Telegram bot**
2. **Send `/start`** command
3. **Click "Browse Products 🛍️"**
4. **Select a category** (e.g., Gaming)
5. **Click on any product** (e.g., Steam Gift Card $25)
6. **Click "🛒 Buy Now"**
7. **Select payment method** (e.g., USDT)

**What happens:**
- ✅ Bot creates order in database
- ✅ Bot generates payment link
- ✅ You get payment URL (NOWPayments)
- ✅ When payment is made → Webhook notification sent
- ✅ Bot delivers digital product automatically

---

## 🔧 Webhook Flow

```
User Pays → NOWPayments → Webhook → Your Server → Database → Bot → User Gets Product
```

**Step by step:**
1. User clicks payment link
2. User sends crypto to payment address
3. NOWPayments detects payment
4. NOWPayments sends webhook to: `https://ba7152fb30bf.ngrok-free.app/api/payments/webhook/nowpayments`
5. Your server validates webhook
6. Database updated: order status = "paid"
7. Bot sends product key to user
8. Order marked as "delivered"

---

## 🧪 Testing Payment Flow (Sandbox Mode)

### Current Sandbox Settings

```env
NOWPAYMENTS_API_KEY=S6J7M53-GE04NQ9-PFXBBK9-FGP9N5K
NOWPAYMENTS_SANDBOX=true
WEBHOOK_URL=https://ba7152fb30bf.ngrok-free.app
```

### How to Test

**Option 1: Simulate Webhook (Manual Test)**

```powershell
# Simulate a payment webhook
$body = @{
    payment_id = "test-payment-123"
    order_id = "691b33fa9dcf07e67dead60f"
    payment_status = "finished"
    pay_amount = 24.99
    pay_currency = "usdterc20"
    outcome_amount = 24.99
    outcome_currency = "usd"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/payments/webhook/nowpayments" -Method POST -Body $body -ContentType "application/json"
```

**Option 2: Use Real Payment (Sandbox)**

1. Create order in bot
2. Get payment link
3. Use NOWPayments sandbox to simulate payment
4. Check bot logs for webhook receipt

---

## 📊 Monitor Webhooks

### Check Webhook Logs

Watch your terminal where `npm run dev` is running. When webhook arrives, you'll see:

```
2025-11-17T14:40:59.369Z [INFO] [PAYMENT] NOWPayments webhook received
2025-11-17T14:40:59.370Z [INFO] [PAYMENT] Processing payment for order: 691b33fa...
2025-11-17T14:40:59.371Z [INFO] [PAYMENT] Order status updated: pending → paid
2025-11-17T14:40:59.372Z [INFO] [PAYMENT] Delivering product to user...
✅ Product delivered successfully!
```

### Check Database

```powershell
# Run full system test to verify everything works
node test/full-system-test.js
```

---

## 🔐 Security Features

Your webhook endpoint has:

✅ **Rate limiting** - Max 100 requests per 15 minutes per IP  
✅ **Signature validation** - Verifies webhook authenticity (production mode)  
✅ **CORS protection** - Allows all origins for testing  
✅ **Input sanitization** - Cleans all incoming data  
✅ **Error logging** - All webhook errors logged  

---

## ⚙️ Advanced Configuration

### To Use Real Payments (Production)

1. Get production API key from NOWPayments
2. Update `.env`:
   ```env
   NOWPAYMENTS_API_KEY=your_production_key_here
   NOWPAYMENTS_SANDBOX=false
   NODE_ENV=production
   ```
3. ⚠️ **Warning**: Real money will be processed!

### To Change Webhook URL

If your ngrok URL changes:

1. Open `.env`
2. Update `WEBHOOK_URL=https://your-new-ngrok-url.ngrok-free.app`
3. Restart bot: `npm run dev`

---

## 🐛 Troubleshooting

### Webhook Not Received

**Check 1: Is ngrok running?**
```powershell
# Test ngrok URL
Invoke-RestMethod -Uri "https://ba7152fb30bf.ngrok-free.app/health"
```

**Check 2: Is bot running?**
```powershell
Get-Process -Name node
# Should show node processes
```

**Check 3: Check logs**
Look at terminal for errors

### Payment Link Invalid

**Issue**: `INVALID_API_KEY` error

**Solution**: 
1. Get new sandbox API key from: https://account-sandbox.nowpayments.io/
2. Update `NOWPAYMENTS_API_KEY` in `.env`
3. Restart bot

### Webhook Signature Failed

**Issue**: Webhook rejected with 401

**Solution**:
- Sandbox mode: Signature validation is **disabled** ✅
- Production mode: Add `ipn` secret to `.env` (already set: `duWHtndynhG6nSZlPepUrFUQqp3jucSi`)

---

## ✅ Quick Test Checklist

- [ ] Bot running (`npm run dev`)
- [ ] No errors in terminal
- [ ] ngrok URL responds: `Invoke-RestMethod -Uri "https://ba7152fb30bf.ngrok-free.app/health"`
- [ ] Webhook endpoint configured in `.env`
- [ ] Can create order in Telegram bot
- [ ] Payment link generated successfully
- [ ] Webhook endpoint accepts POST requests

---

## 📞 Webhook Endpoint Details

**Full URL**: `https://ba7152fb30bf.ngrok-free.app/api/payments/webhook/nowpayments`

**Method**: POST  
**Content-Type**: application/json  
**Headers Accepted**:
- `x-nowpayments-sig` - Webhook signature
- `Content-Type` - Must be application/json

**Expected Payload**:
```json
{
  "payment_id": "123456",
  "order_id": "691b33fa9dcf07e67dead60f",
  "payment_status": "finished",
  "pay_amount": "24.99",
  "pay_currency": "usdterc20",
  "outcome_amount": "24.99",
  "outcome_currency": "usd"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "received": true,
    "processed": true
  }
}
```

---

## 🎉 You're All Set!

Your webhook system is configured and ready. Just:

1. ✅ Keep bot running
2. ✅ Keep ngrok running  
3. ✅ Test payments in Telegram
4. ✅ Monitor logs for webhook notifications

**Need help?** Check logs in terminal or run: `node test/full-system-test.js`
