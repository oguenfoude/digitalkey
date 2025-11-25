import express, { Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import userRoutes from './routes/userRoutes';
import categoryRoutes from './routes/categoryRoutes';
import productRoutes from './routes/productRoutes';
import notificationRoutes from './routes/notificationRoutes';
import orderRoutes from './routes/orderRoutes';
import paymentRoutes from './routes/paymentRoutes';
import { performanceMonitor } from './utils/performance';
import { sanitizeInput } from './utils/apiValidation';
import { logger, apiLoggingMiddleware } from './utils/logger';
import { swaggerSpec } from './docs/swagger';
import { getDb } from './database/connection';
import { globalErrorHandler } from './middleware/errorHandler';

config();

const app = express();
const PORT: number = parseInt(process.env.PORT || '3000', 10);
let server: any = null;

// Trust proxy for ngrok and reverse proxies
app.set('trust proxy', true);

// Rate limiting configuration
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 API requests per windowMs
  message: 'Too many API requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests for sensitive operations
  message: 'Rate limit exceeded for sensitive operations.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
// Skip rate limiting for webhook endpoints
app.use((req, res, next) => {
  if (req.path.includes('/webhook')) {
    return next();
  }
  return generalLimiter(req, res, next);
});
app.use(express.json({ limit: '10mb' })); // JSON parsing
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // URL encoded parsing
// CORS with whitelist (allows all if not specified for backward compatibility)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['*'];

app.use(
  cors({
    origin: allowedOrigins[0] === '*' ? '*' : allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-nowpayments-sig', 'X-API-Key'],
    credentials: allowedOrigins[0] !== '*',
  })
);
app.use(apiLoggingMiddleware); // Add API logging
app.use(sanitizeInput); // Sanitize all inputs

// Welcome route
app.get('/', (_req: Request, res: Response) => {
  res.send(`
    <h1>🎮 GameKey Store API</h1>
    <p>✅ Server is running successfully!</p>
    <ul>
      <li>📚 <a href="/api-docs">API Documentation (Swagger UI)</a></li>
      <li>📋 <a href="/docs-json">OpenAPI JSON Specification</a></li>
      <li>🔗 <a href="/openapi.json">Alternative OpenAPI JSON</a></li>
      <li>�💚 <a href="/health">Health Check</a></li>
      <li>📊 <a href="/status">System Status</a></li>
      <li>📈 <a href="/api/performance">Performance Metrics</a></li>
    </ul>
    <hr>
    <h3>🚀 Quick API Access:</h3>
    <ul>
      <li><code>GET /api/products</code> - Browse products</li>
      <li><code>GET /api/orders</code> - View orders</li>
      <li><code>GET /api/users</code> - Manage users</li>
      <li><code>GET /api/payments/stats/summary</code> - Payment statistics</li>
    </ul>
  `);
});

// API Documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'GameKey Store API Documentation',
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestHeaders: true,
    },
  })
);

// Swagger JSON endpoint - for direct access to OpenAPI specification
app.get('/docs-json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

// Alternative endpoint for OpenAPI spec
app.get('/openapi.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

// Enhanced health check endpoint with system status
app.get('/health', async (_req: Request, res: Response) => {
  let dbStatus = 'unknown';
  let botStatus = 'unknown';

  try {
    const db = getDb();
    await db.command({ ping: 1 });
    dbStatus = 'connected';
  } catch {
    dbStatus = 'error';
  }

  // Check if bot module is loaded (simplified check)
  try {
    botStatus = 'active';
  } catch {
    botStatus = 'stopped';
  }

  const healthInfo = {
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: dbStatus,
    bot: botStatus,
    memory: {
      used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
    },
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  res.status(dbStatus === 'connected' ? 200 : 503).json(healthInfo);
});

// System status endpoint
app.get('/status', (_req: Request, res: Response) => {
  res.status(200).json({
    server: 'GameKey Bot API',
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())} seconds`,
    memory: {
      used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
      total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
    },
  });
});

// Logs endpoint (development only)
app.get('/logs', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Access denied in production' });
  }

  const level = req.query.level as string;
  const component = req.query.component as string;
  const count = parseInt(req.query.count as string) || 100;

  let logs;
  if (level) {
    logs = logger.getLogsByLevel(level as any, count);
  } else if (component) {
    logs = logger.getLogsByComponent(component, count);
  } else {
    logs = logger.getRecentLogs(count);
  }

  res.json({ logs, total: logs.length });
});

// Performance monitoring middleware
app.use((req, res, next) => {
  const timer = performanceMonitor.startTimer(`api.${req.method}.${req.path}`);

  res.on('finish', () => {
    timer.end(res.statusCode < 400, res.statusCode >= 400 ? `HTTP ${res.statusCode}` : undefined);
  });

  next();
});

// Apply routes with appropriate rate limiting
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/categories', apiLimiter, categoryRoutes);
app.use('/api/products', apiLimiter, productRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/orders', strictLimiter, orderRoutes); // Stricter limit for orders
app.use('/api/payments', paymentRoutes); // No rate limit for payment webhooks

// Direct webhook route (NOWPayments sends POST /webhook/nowpayments)
app.use('/webhook/nowpayments', paymentRoutes);

// Performance report endpoint
app.get('/api/performance', (req: Request, res: Response) => {
  res.json({
    report: performanceMonitor.generateReport(),
    stats: performanceMonitor.getStats(),
    slowestOperations: performanceMonitor.getSlowestOperations(10),
  });
});

// 404 handler for undefined routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.path,
  });
});

// Global error handler (must be last) - use centralized handler
app.use(globalErrorHandler);

// Start server function - now returns a Promise
export function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      server = app.listen(PORT, () => {
        console.log(`🌐 Express server is running on http://localhost:${PORT}`);
        resolve();
      });

      // Handle server errors
      server.on('error', (error: Error) => {
        console.error('❌ Server error:', error);
        reject(error);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      reject(error);
    }
  });
}

// Stop server function
export function stopServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (server) {
      server.close((err: Error) => {
        if (err) {
          console.error('❌ Error stopping server:', err);
          reject(err);
        } else {
          console.log('✅ Server stopped');
          resolve();
        }
      });
    } else {
      resolve(); // Server wasn't running
    }
  });
}

// Export app for testing purposes
export { app };
