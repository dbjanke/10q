import { User } from '../types.js';
import { getUserStore } from '../stores/user.store.js';
import { logger } from '../utils/logger.js';

export interface OAuthProfile {
    email: string;
    name?: string;
    avatarUrl?: string;
}

export function handleOAuthLogin(profile: OAuthProfile): User | null {
    const email = profile.email.trim().toLowerCase();
    if (!email) {
        logger.warn('OAuth profile missing email address');
        return null;
    }

    const { name, avatarUrl } = profile;
    const userStore = getUserStore();

    const existing = userStore.getUserByEmail(email);
    if (existing) {
        if (existing.status === 'disabled') {
            return null;
        }

        const updated = userStore.updateUser(existing.id, {
            name: name ?? null,
            avatarUrl: avatarUrl ?? null,
            status: existing.status === 'invited' ? 'active' : existing.status,
            lastLoginAt: new Date(),
        });

        return updated ?? existing;
    }

    const bootstrapAdminEmail = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
    if (bootstrapAdminEmail && bootstrapAdminEmail === email) {
        const adminCount = userStore.getAdminCount();
        if (adminCount === 0) {
            return userStore.createUser({
                email,
                name,
                avatarUrl,
                role: 'admin',
                status: 'active',
            });
        }
    }

    logger.warn('Login denied: email not on allowlist');
    return null;
}
