import { getDatabase } from '../../config/database.js';
import { Group, Permission, User } from '../../types.js';
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

    listGroups(): Group[] {
        const db = getDatabase();
        const rows = db.prepare('SELECT * FROM groups ORDER BY name ASC').all() as any[];
        return rows.map((row) => ({ id: row.id, name: row.name, permissions: [] }));
    }

    listGroupsWithMembers(): Group[] {
        const db = getDatabase();
        const groupRows = db.prepare('SELECT * FROM groups ORDER BY name ASC').all() as any[];
        const permissionRows = db
            .prepare('SELECT group_id, permission FROM group_permissions')
            .all() as { group_id: number; permission: Permission }[];
        const memberRows = db
            .prepare('SELECT group_id, user_id FROM user_groups')
            .all() as { group_id: number; user_id: number }[];

        const permissionsByGroup = new Map<number, Permission[]>();
        for (const row of permissionRows) {
            const list = permissionsByGroup.get(row.group_id) || [];
            list.push(row.permission);
            permissionsByGroup.set(row.group_id, list);
        }

        const membersByGroup = new Map<number, number[]>();
        for (const row of memberRows) {
            const list = membersByGroup.get(row.group_id) || [];
            list.push(row.user_id);
            membersByGroup.set(row.group_id, list);
        }

        return groupRows.map((row) => ({
            id: row.id,
            name: row.name,
            permissions: permissionsByGroup.get(row.id) || [],
            memberIds: membersByGroup.get(row.id) || [],
        }));
    }

    createGroup(name: string): Group {
        const db = getDatabase();
        const result = db.prepare('INSERT INTO groups (name) VALUES (?)').run(name.trim());
        const row = db.prepare('SELECT * FROM groups WHERE id = ?').get(result.lastInsertRowid) as any;
        if (!row) {
            throw new Error('Failed to create group');
        }
        return { id: row.id, name: row.name, permissions: [], memberIds: [] };
    }

    updateGroup(id: number, name: string): Group | null {
        const db = getDatabase();
        db.prepare('UPDATE groups SET name = ? WHERE id = ?').run(name.trim(), id);
        const row = db.prepare('SELECT * FROM groups WHERE id = ?').get(id) as any;
        if (!row) {
            return null;
        }
        const permissions = this.getGroupPermissions(id);
        const memberIds = db
            .prepare('SELECT user_id FROM user_groups WHERE group_id = ?')
            .all(id)
            .map((r: any) => r.user_id) as number[];
        return { id: row.id, name: row.name, permissions, memberIds };
    }

    deleteGroup(id: number): boolean {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM groups WHERE id = ?').run(id);
        return result.changes > 0;
    }

    getGroupPermissions(groupId: number): Permission[] {
        const db = getDatabase();
        const rows = db
            .prepare('SELECT permission FROM group_permissions WHERE group_id = ?')
            .all(groupId) as { permission: Permission }[];
        return rows.map((row) => row.permission);
    }

    setGroupPermissions(groupId: number, permissions: Permission[]): void {
        const db = getDatabase();
        const transaction = db.transaction(() => {
            db.prepare('DELETE FROM group_permissions WHERE group_id = ?').run(groupId);
            const insert = db.prepare('INSERT INTO group_permissions (group_id, permission) VALUES (?, ?)');
            for (const permission of permissions) {
                insert.run(groupId, permission);
            }
        });
        transaction();
    }

    getUserGroupIds(userId: number): number[] {
        const db = getDatabase();
        const rows = db
            .prepare('SELECT group_id FROM user_groups WHERE user_id = ?')
            .all(userId) as { group_id: number }[];
        return rows.map((row) => row.group_id);
    }

    getUserGroupNames(userId: number): string[] {
        const db = getDatabase();
        const rows = db
            .prepare(
                `SELECT g.name
                 FROM groups g
                 INNER JOIN user_groups ug ON ug.group_id = g.id
                 WHERE ug.user_id = ?
                 ORDER BY g.name ASC`
            )
            .all(userId) as { name: string }[];
        return rows.map((row) => row.name);
    }

    getUserPermissions(userId: number): Permission[] {
        const db = getDatabase();
        const rows = db
            .prepare(
                `SELECT DISTINCT gp.permission
                 FROM group_permissions gp
                 INNER JOIN user_groups ug ON ug.group_id = gp.group_id
                 WHERE ug.user_id = ?`
            )
            .all(userId) as { permission: Permission }[];
        return rows.map((row) => row.permission);
    }

    setUserGroups(userId: number, groupIds: number[]): void {
        const db = getDatabase();
        const transaction = db.transaction(() => {
            db.prepare('DELETE FROM user_groups WHERE user_id = ?').run(userId);
            const insert = db.prepare('INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)');
            for (const groupId of groupIds) {
                insert.run(userId, groupId);
            }
        });
        transaction();
    }
}
