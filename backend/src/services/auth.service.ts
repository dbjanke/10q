import { Profile } from 'passport-google-oauth20';
import { User } from '../types.js';
import { getUserStore } from '../stores/user.store.js';
import { logger } from '../utils/logger.js';

export function handleGoogleLogin(profile: Profile): User | null {
    const rawEmail = profile.emails?.[0]?.value;
    const email = rawEmail?.trim().toLowerCase();
    if (!email) {
        logger.warn('Google profile missing email address');
        return null;
    }

    const name = profile.displayName || undefined;
    const avatarUrl = profile.photos?.[0]?.value || undefined;
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
