import { Group, Permission, User } from '../types.js';
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
    listGroups(): Group[];
    listGroupsWithMembers(): Group[];
    createGroup(name: string): Group;
    updateGroup(id: number, name: string): Group | null;
    deleteGroup(id: number): boolean;
    getGroupPermissions(groupId: number): Permission[];
    setGroupPermissions(groupId: number, permissions: Permission[]): void;
    getUserGroupIds(userId: number): number[];
    getUserGroupNames(userId: number): string[];
    getUserPermissions(userId: number): Permission[];
    setUserGroups(userId: number, groupIds: number[]): void;
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
