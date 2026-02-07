import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import passport from 'passport';
import { initializeDatabase, getDatabase } from './config/database.js';
import { loadEnv, validateEnv, getCookieSecure, getFrontendUrl, getNodeEnv, getSessionSecret } from './config/env.js';
import routes from './routes.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import { configurePassport } from './auth/passport.js';
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
  console.error(`Configuration error: ${message}`);
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
  console.error('Failed to initialize database:', error);
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: COOKIE_SECURE,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// Request logging in development
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
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
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  if (NODE_ENV === 'production') {
    console.log('Serving frontend from backend');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});
