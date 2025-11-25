import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Simple API Key authentication middleware
 * Protects all API endpoints from unauthorized access
 */
export function apiAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip authentication for health check and webhook endpoints
  if (req.path === '/health' || req.path.includes('/webhook/')) {
    return next();
  }

  // Get API key from environment
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    logger.error('API_KEY not configured in environment', 'SECURITY');
    res.status(500).json({
      error: 'Server configuration error',
      code: 'CONFIG_ERROR',
    });
    return;
  }

  // Check for API key in header
  const providedKey = req.headers['x-api-key'] as string;

  if (!providedKey) {
    logger.warn('API request without authentication', 'SECURITY', {
      path: req.path,
      ip: req.ip,
    });
    res.status(401).json({
      error: 'Authentication required. Provide X-API-Key header.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  // Validate API key
  if (providedKey !== validApiKey) {
    logger.warn('Invalid API key attempted', 'SECURITY', {
      path: req.path,
      ip: req.ip,
      providedKey: providedKey.substring(0, 8) + '...',
    });
    res.status(403).json({
      error: 'Invalid API key',
      code: 'INVALID_API_KEY',
    });
    return;
  }

  // Authentication successful
  next();
}
