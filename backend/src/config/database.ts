import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { logger } from '../utils/logger.js';
import { fileURLToPath } from 'url';
import { PERMISSIONS } from './permissions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getDatabasePath(): string {
  return process.env.DATABASE_PATH || './data/10q.db';
}

let db: Database.Database | null = null;

export function initializeDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const DATABASE_PATH = getDatabasePath();
  logger.info({ path: DATABASE_PATH }, 'Initializing database');

  // Create data directory if it doesn't exist
  const dbDir = dirname(DATABASE_PATH);
  // dbDir is derived from DATABASE_PATH (config/env), not user input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  mkdirSync(dbDir, { recursive: true });

  db = new Database(DATABASE_PATH);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Read and execute schema
  const schemaPath = join(__dirname, '../../database/schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  db.exec(schema);

  // One-time migration: rename legacy permission to the new name
  const newPermission = PERMISSIONS[0];
  db.prepare(
    "UPDATE group_permissions SET permission = ? WHERE permission = 'prompt_tools'"
  ).run(newPermission);

  logger.info('Database initialized successfully');

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
