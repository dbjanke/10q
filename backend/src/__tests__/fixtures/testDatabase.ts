import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Create an in-memory database for testing
 * This ensures tests are isolated and don't affect the real database
 */
export function createTestDatabase(): Database.Database {
    const db = new Database(':memory:');

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Load and execute schema
    const schemaPath = join(__dirname, '../../../database/schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    db.exec(schema);

    return db;
}

/**
 * Clean up test database
 */
export function closeTestDatabase(db: Database.Database): void {
    db.close();
}

/**
 * Seed test database with sample data
 */
export function seedTestDatabase(db: Database.Database) {
    // Insert a test conversation
    const conversation = db
        .prepare('INSERT INTO conversations (title, current_question_number) VALUES (?, ?)')
        .run('Test conversation', 1);

    const conversationId = conversation.lastInsertRowid;

    // Insert a test question
    db.prepare(
        'INSERT INTO messages (conversation_id, type, content, question_number) VALUES (?, ?, ?, ?)'
    ).run(conversationId, 'question', 'What brings you here?', 1);

    return { conversationId };
}
