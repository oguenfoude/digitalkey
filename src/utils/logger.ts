/**
 * Enhanced structured logging system for GameKey Bot
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  component?: string;
  userId?: string;
  orderId?: string;
  transactionId?: string;
  error?: any;
  data?: any;
}

class Logger {
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 1000;

  /**
   * Log an error message
   */
  error(message: string, component?: string, data?: any): void {
    this.log('error', message, component, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, component?: string, data?: any): void {
    this.log('warn', message, component, data);
  }

  /**
   * Log an info message
   */
  info(message: string, component?: string, data?: any): void {
    this.log('info', message, component, data);
  }

  /**
   * Log a debug message
   */
  debug(message: string, component?: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, component, data);
    }
  }

  /**
   * Log a payment event
   */
  payment(message: string, transactionId?: string, data?: any): void {
    this.log('info', message, 'PAYMENT', { transactionId, ...data });
  }

  /**
   * Log an order event
   */
  order(message: string, orderId?: string, userId?: string, data?: any): void {
    this.log('info', message, 'ORDER', { orderId, userId, ...data });
  }

  /**
   * Log a bot event
   */
  bot(message: string, userId?: string, data?: any): void {
    this.log('info', message, 'BOT', { userId, ...data });
  }

  /**
   * Log an API event
   */
  api(message: string, endpoint?: string, method?: string, data?: any): void {
    this.log('info', message, 'API', { endpoint, method, ...data });
  }

  /**
   * Core logging method with sanitization
   */
  private log(level: LogLevel, message: string, component?: string, data?: any): void {
    // Sanitize sensitive data before logging
    const sanitizedData = this.sanitizeData(data);

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      component,
      ...sanitizedData,
    };

    // Add to history
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    // Console output with colors
    const colorCode = this.getColorCode(level);
    const resetCode = '\x1b[0m';
    const componentText = component ? `[${component}]` : '';

    console.log(
      `${colorCode}${entry.timestamp} [${level.toUpperCase()}] ${componentText} ${message}${resetCode}`,
      data ? JSON.stringify(data, null, 2) : ''
    );

    // In production, send only 5xx errors to external service (not 4xx client errors)
    if (process.env.NODE_ENV === 'production' && level === 'error') {
      // Only alert for server errors (5xx), not client errors (4xx)
      const statusCode = data?.statusCode;
      if (!statusCode || statusCode >= 500) {
        this.sendToErrorTracking(entry);
      }
    }
  }

  /**
   * Get color code for log level
   */
  private getColorCode(level: LogLevel): string {
    switch (level) {
      case 'error':
        return '\x1b[31m'; // Red
      case 'warn':
        return '\x1b[33m'; // Yellow
      case 'info':
        return '\x1b[36m'; // Cyan
      case 'debug':
        return '\x1b[37m'; // White
      default:
        return '\x1b[0m'; // Reset
    }
  }

  /**
   * Sanitize sensitive data from logs
   */
  private sanitizeData(data: any, depth: number = 0, seen = new WeakSet()): any {
    // Prevent infinite recursion
    if (depth > 5) {
      return '[Max Depth Reached]';
    }

    if (!data || typeof data !== 'object') {
      return data;
    }

    // Detect circular references
    if (seen.has(data)) {
      return '[Circular Reference]';
    }
    seen.add(data);

    const sanitized = { ...data };

    // List of sensitive field patterns
    const sensitiveFields = [
      'password',
      'apiKey',
      'api_key',
      'secret',
      'token',
      'privateKey',
      'private_key',
      'authorization',
      'x-api-key',
      'NOWPAYMENTS_API_KEY',
      'API_TOKEN',
    ];

    // Sanitize sensitive fields
    for (const key in sanitized) {
      const lowerKey = key.toLowerCase();

      // Check if field name contains sensitive patterns
      if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
        if (typeof sanitized[key] === 'string' && sanitized[key].length > 8) {
          // Show first 8 characters, hide the rest
          sanitized[key] = sanitized[key].substring(0, 8) + '...';
        } else {
          sanitized[key] = '[REDACTED]';
        }
      }

      // Mask crypto addresses (show last 4 chars only)
      if (
        (key === 'cryptoAddress' || key === 'paymentAddress' || key === 'address') &&
        typeof sanitized[key] === 'string'
      ) {
        const addr = sanitized[key];
        if (addr.length > 8) {
          sanitized[key] = '****' + addr.slice(-4);
        }
      }

      // Hash Telegram IDs for privacy
      if (
        (key === 'telegramId' || key === 'userId') &&
        typeof sanitized[key] === 'number'
      ) {
        // Keep last 3 digits for debugging
        const idStr = sanitized[key].toString();
        sanitized[key] = '***' + idStr.slice(-3);
      }

      // Recursively sanitize nested objects
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key], depth + 1, seen);
      }
    }

    return sanitized;
  }

  /**
   * Send error to external tracking service
   */
  private sendToErrorTracking(entry: LogEntry): void {
    // Placeholder for error tracking service (Sentry, LogRocket, etc.)
    // In production, implement actual error tracking
    console.error('🚨 Critical error logged:', entry);
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count = 100): LogEntry[] {
    return this.logHistory.slice(-count);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel, count = 100): LogEntry[] {
    return this.logHistory.filter(entry => entry.level === level).slice(-count);
  }

  /**
   * Get logs by component
   */
  getLogsByComponent(component: string, count = 100): LogEntry[] {
    return this.logHistory.filter(entry => entry.component === component).slice(-count);
  }
}

// Create singleton instance
export const logger = new Logger();

/**
 * Middleware to log API requests
 */
export function apiLoggingMiddleware(req: any, res: any, next: any) {
  const start = Date.now();

  logger.api(`${req.method} ${req.path} - Request received`, req.path, req.method, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined,
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    // 5xx = error (server problem), 4xx = warn (client problem), 2xx/3xx = info (success)
    let level: 'error' | 'warn' | 'info';
    if (res.statusCode >= 500) {
      level = 'error';
    } else if (res.statusCode >= 400) {
      level = 'warn';
    } else {
      level = 'info';
    }

    logger[level](`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`, 'API', {
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
    });
  });

  next();
}


