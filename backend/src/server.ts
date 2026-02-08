import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import passport from 'passport';
import helmet from 'helmet';
import { initializeDatabase, getDatabase } from './config/database.js';
import { loadEnv, validateEnv, getCookieSecure, getFrontendUrl, getNodeEnv, getSessionSecret } from './config/env.js';
import routes from './routes.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import { configurePassport } from './auth/passport.js';
import { csrfProtection } from './middleware/csrf.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger, requestLogger } from './utils/logger.js';
// @ts-expect-error - package does not ship types
import SQLiteStoreFactory from 'better-sqlite3-session-store';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

loadEnv();
try {
  validateEnv();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  logger.error({ err: error }, `Configuration error: ${message}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = getNodeEnv();
const FRONTEND_URL = getFrontendUrl();
const COOKIE_SECURE = getCookieSecure();
const SESSION_SECRET = getSessionSecret();

// Initialize database
try {
  initializeDatabase();
} catch (error) {
  logger.error({ err: error }, 'Failed to initialize database');
  process.exit(1);
}

// Middleware
app.set('trust proxy', 1);
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);
app.use(requestLogger);
app.use((req, res, next) => {
  if (req.id) {
    res.setHeader('X-Request-Id', req.id);
  }
  next();
});
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "https:"],
        "font-src": ["'self'", "data:"],
        "connect-src": ["'self'"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "frame-ancestors": ["'none'"],
        "form-action": ["'self'"],
      },
    },
    referrerPolicy: { policy: 'no-referrer' },
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

const SQLiteStore = SQLiteStoreFactory(session);
app.use(
  session({
    store: new SQLiteStore({
      client: getDatabase(),
      expired: {
        clear: true,
        intervalMs: 15 * 60 * 1000,
      },
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: COOKIE_SECURE,
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

configurePassport();
app.use(passport.initialize());
app.use(passport.session());

app.use(csrfProtection);

// Request logging in development
if (NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    logger.debug({ method: req.method, path: req.path }, 'Incoming request');
    next();
  });
}

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', routes);

// Serve frontend static files in production
if (NODE_ENV === 'production') {
  const frontendPath = join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));

  // Fallback to index.html for client-side routing
  app.get(/.*/, (req, res) => {
    res.sendFile(join(frontendPath, 'index.html'));
  });
}

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info({ port: PORT, env: NODE_ENV }, 'Server started');
  if (NODE_ENV === 'production') {
    logger.info('Serving frontend from backend');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down gracefully');
  process.exit(0);
});
