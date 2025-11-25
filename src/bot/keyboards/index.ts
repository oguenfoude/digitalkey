import { InlineKeyboard } from 'grammy';

/**
 * Simple keyboard factory - Only contains methods that are actually used
 */
class KeyboardFactory {
  /**
   * Terms acceptance keyboard - only keyboard method actually used
   */
  static terms(): InlineKeyboard {
    return new InlineKeyboard()
      .text('✅ I Agree', 'accept_terms')
      .text('❌ Decline', 'decline_terms');
  }
}

export default KeyboardFactory;
