import { Bot, InlineKeyboard } from 'grammy';
import { MyContext } from '../types/session';
import {
  showCategories,
  showProductsInCategory,
  showProductDetails,
  showPurchaseConfirmation,
} from '../commands/products';
import * as PaymentRepository from '../../repositories/PaymentRepository';
import * as ProductRepository from '../../repositories/ProductRepository';
import * as OrderRepository from '../../repositories/OrderRepository';
import * as UserRepository from '../../repositories/UserRepository';
import { nowPaymentsService } from '../../services/NowPaymentsService';
// Note: Payment handling functions are now in enhancedPaymentHandlers.ts

/**
 * Callback handlers for product navigation and purchase flow
 */
export function registerCallbackHandlers(bot: Bot<MyContext>): void {
  // Handle category selection
  bot.callbackQuery(/^category_(.+)$/, async ctx => {
    const categoryId = ctx.match[1];
    await showProductsInCategory(ctx, categoryId);
    await ctx.answerCallbackQuery();
  });

  // Handle back to categories
  bot.callbackQuery('back_to_categories', async ctx => {
    await showCategories(ctx);
    await ctx.answerCallbackQuery();
  });

  // Handle product selection
  bot.callbackQuery(/^product_(.+)$/, async ctx => {
    const productId = ctx.match[1];
    await showProductDetails(ctx, productId);
    await ctx.answerCallbackQuery();
  });

  // Handle purchase button
  bot.callbackQuery(/^purchase_(.+)$/, async ctx => {
    const productId = ctx.match[1];
    await showPurchaseConfirmation(ctx, productId);
    await ctx.answerCallbackQuery();
  });

  // Handle out of stock products
  bot.callbackQuery('out_of_stock', async ctx => {
    await ctx.answerCallbackQuery(
      'This product is currently out of stock. Please check back later!'
    );
  });

  // Handle purchase confirmation - AUTO USDT PAYMENT
  bot.callbackQuery(/^confirm_purchase_(.+)$/, async ctx => {
    const productId = ctx.match[1];

    if (!ctx.from) {
      await ctx.answerCallbackQuery('User not found');
      return;
    }

    try {
      const product = await ProductRepository.findProductById(productId);
      if (!product) {
        await ctx.editMessageText('❌ Product not found', { parse_mode: 'Markdown' });
        return;
      }

      // Check stock availability
      if (product.digitalContent.length === 0) {
        await ctx.editMessageText(
          `❌ **OUT OF STOCK**\n\n${product.name} is currently unavailable.\n\nPlease check back later!`,
          {
            parse_mode: 'Markdown',
            reply_markup: new InlineKeyboard().text('🔙 Back to Product', `product_${productId}`),
          }
        );
        return;
      }

      // Show crypto payment options - Let user choose
      await ctx.editMessageText(
        `💰 **SECURE CRYPTO PAYMENT**\n` +
          `════════════════════\n\n` +
          `🎯 **Product:** ${product.name}\n` +
          `� **Price:** $${product.price.toFixed(2)} USD\n\n` +
          `🌐 **Choose Your Preferred Payment Method:**\n` +
          `Select the cryptocurrency you want to use for payment.\n\n` +
          `⚡ **Instant Delivery** after payment confirmation`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .text('💎 USDT (Recommended)', `pay_usdt_${productId}`)
            .text('₿ Bitcoin (BTC)', `pay_btc_${productId}`)
            .row()
            .text('🔷 Ethereum (ETH)', `pay_eth_${productId}`)
            .text('🪙 Litecoin (LTC)', `pay_ltc_${productId}`)
            .row()
            .text('🔙 Back to Product', `product_${productId}`),
        }
      );

      await ctx.answerCallbackQuery('Choose your payment method');
    } catch (error) {
      console.error('Purchase confirmation error:', error);
      await ctx.editMessageText(
        '❌ **Error**\n\nSomething went wrong. Please try again.\n\n📞 Support: @jeogooussama',
        { parse_mode: 'Markdown' }
      );
      await ctx.answerCallbackQuery('❌ Error occurred');
    }
  });

  // REMOVED: Manual payment status check - relying on IPN webhooks only
  // Payments are automatically processed when NOWPayments sends webhook

  // Handle main menu callback (if any old inline keyboards are still around)
  bot.callbackQuery('main_menu', async ctx => {
    await ctx.editMessageText('🏠 *Main Menu*\n\nUse the menu buttons at the bottom to navigate!', {
      parse_mode: 'Markdown',
    });
    await ctx.answerCallbackQuery('Main menu');
  });

  // Handle contact support callback
  bot.callbackQuery('contact_support', async ctx => {
    await ctx.editMessageText(
      '📞 *Contact Support*\n\nFor help, contact: @jeogooussama\n\nUse the menu buttons below to navigate!',
      { parse_mode: 'Markdown' }
    );
    await ctx.answerCallbackQuery('Support info');
  });

  // Handle crypto payment selection - SECURE VERSION WITH REAL PAYMENT
  bot.callbackQuery(/^pay_(btc|eth|usdt|ltc)_(.+)$/, async ctx => {
    const crypto = ctx.match[1].toLowerCase();
    const productId = ctx.match[2];
    await handleCryptoPayment(ctx, crypto, productId);
  });

  // Handle any other callbacks with a generic response
  bot.on('callback_query', async ctx => {
    await ctx.answerCallbackQuery('Use the menu buttons at the bottom!');
  });

  // Handle order cancellation
  bot.callbackQuery(/^cancel_order_(.+)$/, async ctx => {
    const orderId = ctx.match[1];

    if (!ctx.from) {
      await ctx.answerCallbackQuery('User not found');
      return;
    }

    try {
      // Get order details
      const order = await OrderRepository.findOrderById(orderId);

      if (!order) {
        await ctx.editMessageText('❌ Order not found', { parse_mode: 'Markdown' });
        return;
      }

      // Check if order can be cancelled (only pending orders)
      if (order.status !== 'pending') {
        await ctx.editMessageText(
          `❌ **CANNOT CANCEL**\n\nThis order cannot be cancelled.\n\n` +
            `📊 **Status:** ${order.status}\n\n` +
            `${order.status === 'delivered' ? '✅ Order already delivered' : '💳 Payment already processed'}`,
          { parse_mode: 'Markdown' }
        );
        await ctx.answerCallbackQuery('Order cannot be cancelled');
        return;
      }

      // Cancel the order
      const cancelledOrder = await OrderRepository.updateOrderStatus(orderId, 'cancelled');

      if (!cancelledOrder) {
        await ctx.editMessageText('❌ Failed to cancel order. Please try again.', {
          parse_mode: 'Markdown',
        });
        return;
      }

      // Cancel associated payment transaction if exists
      const transactions = await PaymentRepository.findTransactionsByOrderId(orderId);
      for (const tx of transactions) {
        if (tx.status === 'pending') {
          await PaymentRepository.updateTransactionStatus(tx._id!, 'cancelled', {});
        }
      }

      await ctx.editMessageText(
        `✅ **ORDER CANCELLED**\n\n` +
          `📦 Order #${orderId.substring(0, 8)}... has been cancelled.\n\n` +
          `💡 You can browse other products anytime!\n\n` +
          `🛒 Use "Browse Products" to see available items.`,
        { parse_mode: 'Markdown' }
      );
      await ctx.answerCallbackQuery('✅ Order cancelled successfully');
    } catch (error) {
      console.error('Order cancellation error:', error);
      await ctx.editMessageText('❌ Error cancelling order. Please try again.', {
        parse_mode: 'Markdown',
      });
      await ctx.answerCallbackQuery('❌ Error occurred');
    }
  });
}

// Separate function to handle crypto payment
async function handleCryptoPayment(ctx: MyContext, crypto: string, productId: string) {
  if (!ctx.from) {
    await ctx.answerCallbackQuery('User not found');
    return;
  }

  try {
    // Show processing message
    await ctx.editMessageText(
      `⏳ **SETTING UP PAYMENT**\n\n🔄 Creating secure ${crypto.toUpperCase()} payment link...\n\n💎 Connecting to NOWPayments gateway...\n\n⚡ Please wait a moment!`,
      { parse_mode: 'Markdown' }
    );

    // Get product and verify availability
    const product = await ProductRepository.findProductById(productId);
    if (!product) {
      await ctx.editMessageText(
        `❌ **PRODUCT NOT FOUND**\n\nThe requested product could not be found.\n\n🔄 Please try again.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Check availability
    if (product.digitalContent.length === 0) {
      await ctx.editMessageText(
        `❌ **OUT OF STOCK**\n\n${product.name} is currently unavailable.\n\n🔄 Please check back later!`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text('🔙 Back to Product', `product_${productId}`),
        }
      );
      return;
    }

    // Create user if needed
    let user = await UserRepository.findUserByTelegramId(ctx.from.id);
    if (!user) {
      user = await UserRepository.createOrUpdateUser({
        telegramId: ctx.from.id,
        username: ctx.from.username || 'Unknown',
      });
    }

    if (!user || !user._id) {
      await ctx.editMessageText(
        `❌ **USER ERROR**\n\nUnable to process user information.\n\n🔄 Please try again.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Create order
    const order = await OrderRepository.createOrder({
      userId: user._id,
      productId: product._id!,
      quantity: 1,
      unitPrice: product.price,
      // Simplified Order model - type and customerNote removed
    });

    if (!order || !order._id) {
      await ctx.editMessageText(
        `❌ **ORDER ERROR**\n\nFailed to create order.\n\n📞 Please try again.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Create REAL payment URL with NOWPayments
    const paymentOptions: any = {
      amount: product.price,
      currency: 'USD',
      description: `GameKey: ${product.name}`,
      orderId: order._id.toString(),
      productName: product.name,
      userId: user._id.toString(),
      cryptoCurrency: crypto.toUpperCase() as 'BTC' | 'ETH' | 'USDT' | 'LTC',
    };

    console.log('🔄 Creating payment with options:', paymentOptions);
    const paymentTransaction = await nowPaymentsService.createPayment(paymentOptions);

    if (!paymentTransaction || !paymentTransaction.paymentUrl) {
      await ctx.editMessageText(
        `❌ **PAYMENT SYSTEM ERROR**\n\nUnable to create payment URL.\n\n📞 Please contact support: @jeogooussama`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Store payment transaction in our database
    await PaymentRepository.createTransaction({
      userId: user._id.toString(),
      orderId: order._id.toString(),
      amount: product.price,
      currency: crypto.toLowerCase(),
      paymentProvider: 'nowpayments',
      status: 'pending',
      externalId: paymentTransaction.externalId || `temp-${Date.now()}`,
      paymentUrl: paymentTransaction.paymentUrl,
      // Simplified PaymentTransaction model - metadata removed
    });

    // Determine actual currency used (may be different from requested due to availability)
    const actualCurrency = paymentTransaction.currency || crypto.toUpperCase();

    // Create user-friendly display name for currency
    const displayCurrency = actualCurrency.toLowerCase().includes('usdt')
      ? 'USDT'
      : actualCurrency.toUpperCase();

    // Create payment URL keyboard without manual status check
    const keyboard = new InlineKeyboard()
      .url(`💳 Pay $${product.price} with ${displayCurrency}`, paymentTransaction.paymentUrl!)
      .row()
      .text('❌ Cancel Order', `cancel_order_${order._id}`)
      .row()
      .text('🔙 Back to Product', `product_${productId}`);

    // Send secure payment message with real URL
    const paymentMessage =
      `💰 **PAYMENT READY**\n` +
      `════════════════════\n\n` +
      `🎮 **Product:** ${product.name}\n` +
      `💵 **Price:** $${product.price} USD\n` +
      `💎 **Payment Method:** ${displayCurrency}${actualCurrency.toLowerCase().includes('erc20') ? ' (ERC20)' : ''}\n\n` +
      `${displayCurrency !== crypto.toUpperCase() ? `ℹ️ **Note:** Using ${displayCurrency} (most reliable option available)\n\n` : ''}` +
      `🔗 **Complete your payment using the link below:**\n\n` +
      `✅ **SECURE PAYMENT FEATURES:**\n` +
      `• Official NOWPayments gateway\n` +
      `• SSL encrypted transactions\n` +
      `• **🚀 Instant automatic delivery via IPN webhook**\n` +
      `• Real-time payment tracking\n` +
      `• Payment link expires in 24 hours\n\n` +
      `⚡ **After payment, your product will be delivered automatically!**\n\n` +
      `📌 **What Happens Next:**\n` +
      `• Complete payment in NOWPayments window\n` +
      `• Wait for blockchain confirmation (~15 min)\n` +
      `• Product keys sent automatically via IPN webhook\n` +
      `• You'll receive instant notification here!\n\n` +
      `📞 **Need Help?** Contact @jeogooussama`;

    await ctx.editMessageText(paymentMessage, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
    await ctx.answerCallbackQuery('Payment URL created! Please complete payment.');
  } catch (error) {
    console.error(`${crypto} payment creation error:`, error);
    await ctx.editMessageText(
      `❌ **PAYMENT SYSTEM ERROR**\n\n🚫 Unable to create ${crypto.toUpperCase()} payment.\n\n🔄 Please try again.\n\n📞 Support: @jeogooussama`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('🔄 Try Again', `confirm_purchase_${productId}`),
      }
    );
    await ctx.answerCallbackQuery('❌ Payment creation failed');
  }
}
