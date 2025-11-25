# GameKey Database Population Script

## Overview
This script populates your GameKey bot database with realistic test data for development and testing purposes.

## What Gets Added

### 📂 Categories (4)
- 🎮 Gaming Subscriptions
- 🎵 Streaming Services  
- 🔑 Game Keys
- 👤 Gaming Accounts

### 🎯 Products (10)
- **Xbox Game Pass Ultimate** (1 & 3 months) - with fake account credentials
- **PlayStation Plus Premium** - with fake account credentials  
- **Netflix Premium** - with fake account credentials
- **Spotify Premium** - with fake account credentials
- **Popular Game Keys** (Cyberpunk 2077, COD, FIFA) - with fake activation keys
- **Premium Gaming Accounts** (Fortnite, Steam) - with fake account details

### 👥 Test Users (3)
- testgamer1, testgamer2, testgamer3 with sample Telegram IDs

### 📦 Sample Orders (3)
- Mix of completed and pending orders for testing the Historic section

## How to Use

### Run the Script
```bash
npm run populate-db
```

### What It Does
1. **Clears existing data** (categories, products, orders)
2. **Creates 4 categories** with gaming-focused names
3. **Adds 10 realistic products** with proper pricing and fake digital content
4. **Creates test users** for order testing
5. **Generates sample orders** to populate the Historic section

## Generated Content Examples

### Digital Content Format
- **Xbox accounts**: `xboxgamer1@outlook.com:XboxPass12024!`
- **Steam keys**: `ABCDE-FGHIJ-KLMNO` (random generated)
- **PlayStation accounts**: `psgamer1@gmail.com:PSN1Gaming2024`

### Product Pricing
- Gaming subscriptions: $9.99 - $39.99
- Streaming services: $9.99 - $19.99  
- Game keys: $29.99 - $49.99
- Premium accounts: $89.99 - $199.99

## Testing Your Bot

After running the script, you can:

1. **Test Products Section**: Browse through 4 categories with 10+ products
2. **Test Purchase Flow**: Use the fake digital content for testing
3. **Test Historic Section**: View sample orders for testgamer1 and testgamer2
4. **Test Profile**: See purchase statistics from sample orders

## Important Notes

⚠️ **WARNING**: This script clears ALL existing data before populating. Only use on development/test databases.

🔄 **Re-running**: You can run the script multiple times - it will clear and recreate all data each time.

🎮 **Realistic Data**: All products use gaming industry standard pricing and realistic descriptions.

## Commands Summary

```bash
# Populate database with test data
npm run populate-db

# Start the bot for testing
npm run dev

# Build the project
npm run build
```

Now you can test your GameKey bot with realistic gaming products! 🎮✨