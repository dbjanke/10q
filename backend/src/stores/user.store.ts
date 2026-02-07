import { User } from '../types.js';
import { SQLiteUserStore } from './sqlite/user.store.js';

export interface UserStore {
    getUserById(id: number): User | null;
    getUserByEmail(email: string): User | null;
    listUsers(): User[];
    createUser(input: {
        email: string;
        name?: string;
        avatarUrl?: string;
        role: 'admin' | 'user';
        status: 'invited' | 'active' | 'disabled';
    }): User;
    updateUser(
        id: number,
        updates: Partial<{
            name: string | null;
            avatarUrl: string | null;
            role: 'admin' | 'user';
            status: 'invited' | 'active' | 'disabled';
            lastLoginAt: Date | null;
        }>
    ): User | null;
    deleteUser(id: number): boolean;
    getAdminCount(): number;
}

let store: UserStore | null = null;

export function getUserStore(): UserStore {
    if (store) {
        return store;
    }

    const backend = process.env.DATA_STORE || 'sqlite';

    switch (backend) {
        case 'sqlite':
        default:
            store = new SQLiteUserStore();
            return store as UserStore;
    }
}
