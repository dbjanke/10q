import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { requireAuth } from '../middleware/auth.js';
import { getFrontendUrl, isGoogleConfigured } from '../config/env.js';
import { User } from '../types.js';
import { getUserStore } from '../stores/user.store.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

const AUTH_RATE_LIMIT_WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 60000);
const AUTH_RATE_LIMIT_MAX = Number(process.env.AUTH_RATE_LIMIT_MAX || 30);

const authRateLimit = rateLimit({
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    max: AUTH_RATE_LIMIT_MAX,
});

function sanitizeUser(user: User) {
    const userStore = getUserStore();
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: user.status,
        groups: userStore.getUserGroupNames(user.id),
        permissions: userStore.getUserPermissions(user.id),
    };
}

router.get('/google', authRateLimit, (req: Request, res: Response, next: NextFunction) => {
    if (!isGoogleConfigured()) {
        return res.status(500).json({ error: 'Google OAuth is not configured' });
    }
    return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback', authRateLimit, (req: Request, res: Response, next: NextFunction) => {
    if (!isGoogleConfigured()) {
        return res.status(500).json({ error: 'Google OAuth is not configured' });
    }
    passport.authenticate('google', (err: unknown, user: User | false, info?: { message?: string }) => {
        if (err) {
            console.error('Google OAuth error:', err);
            return res.redirect(`${getFrontendUrl()}/login?error=auth_failed`);
        }

        if (!user) {
            const error = info?.message === 'not_allowed' ? 'not_allowed' : 'auth_failed';
            return res.redirect(`${getFrontendUrl()}/login?error=${encodeURIComponent(error)}`);
        }

        const completeLogin = () =>
            req.logIn(user, (loginErr) => {
                if (loginErr) {
                    return next(loginErr);
                }
                return res.redirect(getFrontendUrl());
            });

        if (req.session) {
            req.session.regenerate((regenErr) => {
                if (regenErr) {
                    return next(regenErr);
                }
                return completeLogin();
            });
            return;
        }

        return completeLogin();
    })(req, res, next);
});

router.get('/me', (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    return res.json({ user: sanitizeUser(req.user as User) });
});

router.get('/csrf', (req: Request, res: Response) => {
    return res.json({ csrfToken: req.csrfToken() });
});

router.post('/logout', requireAuth, authRateLimit, (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }

        if (req.session) {
            req.session.destroy((destroyErr) => {
                if (destroyErr) {
                    return next(destroyErr);
                }
                res.status(204).send();
            });
            return;
        }

        res.status(204).send();
    });
});

export default router;
