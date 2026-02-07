import { getDatabase } from '../../config/database.js';
import { User } from '../../types.js';
import { UserStore } from '../user.store.js';

function mapUser(row: any): User {
    return {
        id: row.id,
        email: row.email,
        name: row.name || undefined,
        avatarUrl: row.avatar_url || undefined,
        role: row.role,
        status: row.status,
        createdAt: new Date(row.created_at),
        lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
    };
}

export class SQLiteUserStore implements UserStore {
    getUserById(id: number): User | null {
        const db = getDatabase();
        const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        return row ? mapUser(row) : null;
    }

    getUserByEmail(email: string): User | null {
        const db = getDatabase();
        const row = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email);
        return row ? mapUser(row) : null;
    }

    listUsers(): User[] {
        const db = getDatabase();
        const rows = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
        return rows.map(mapUser);
    }

    createUser(input: {
        email: string;
        name?: string;
        avatarUrl?: string;
        role: 'admin' | 'user';
        status: 'invited' | 'active' | 'disabled';
    }): User {
        const db = getDatabase();
        const result = db
            .prepare(
                `INSERT INTO users (email, name, avatar_url, role, status)
         VALUES (?, ?, ?, ?, ?)`
            )
            .run(
                input.email.trim(),
                input.name ?? null,
                input.avatarUrl ?? null,
                input.role,
                input.status
            );

        const row = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
        if (!row) {
            throw new Error('Failed to create user');
        }
        return mapUser(row);
    }

    updateUser(
        id: number,
        updates: Partial<{
            name: string | null;
            avatarUrl: string | null;
            role: 'admin' | 'user';
            status: 'invited' | 'active' | 'disabled';
            lastLoginAt: Date | null;
        }>
    ): User | null {
        const db = getDatabase();

        const fields: string[] = [];
        const values: any[] = [];

        if (updates.name !== undefined) {
            fields.push('name = ?');
            values.push(updates.name);
        }
        if (updates.avatarUrl !== undefined) {
            fields.push('avatar_url = ?');
            values.push(updates.avatarUrl);
        }
        if (updates.role !== undefined) {
            fields.push('role = ?');
            values.push(updates.role);
        }
        if (updates.status !== undefined) {
            fields.push('status = ?');
            values.push(updates.status);
        }
        if (updates.lastLoginAt !== undefined) {
            fields.push('last_login_at = ?');
            values.push(updates.lastLoginAt ? updates.lastLoginAt.toISOString() : null);
        }

        if (fields.length === 0) {
            return this.getUserById(id);
        }

        values.push(id);
        db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

        return this.getUserById(id);
    }

    deleteUser(id: number): boolean {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
        return result.changes > 0;
    }

    getAdminCount(): number {
        const db = getDatabase();
        const row = db
            .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
            .get() as { count: number } | undefined;
        return Number(row?.count || 0);
    }
}
